<?php
/**
 * profiles.php — Gestión de perfiles de usuario y roles en talleres
 * GET  ?workshop_id=     → usuarios del taller con su rol
 * GET  ?id=              → perfil individual
 * PUT  ?id=              → actualizar perfil (full_name, avatar_url)
 * POST ?action=invite    → crear usuario + asignarlo al taller { email, password, full_name, role }
 * POST ?action=assign    → asignar usuario existente al taller { user_id, role }
 * DELETE ?id=&workshop_id= → quitar usuario del taller (admin del taller)
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$action   = $_GET['action'] ?? null;
$id       = $_GET['id']     ?? null;

try {

    // ── GET ───────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        if ($action === 'system-roles') {
            require_superadmin($authUser);

            $stmt = $conn->query('
                SELECT ur.user_id, ur.workshop_id, ur.role AS workshop_role, COALESCE(gur.role, "user") AS global_role
                FROM user_roles ur
                LEFT JOIN global_user_roles gur ON gur.user_id = ur.user_id
                ORDER BY ur.created_at DESC
            ');
            Response::success($stmt->fetchAll());
        }

        if ($action === 'find-by-email') {
            require_superadmin($authUser);
            $email = strtolower(trim($_GET['email'] ?? ''));
            if (!$email) Response::error('email es requerido');

            $stmt = $conn->prepare('SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1');
            $stmt->execute([$email]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Usuario no encontrado con ese email');
            Response::success($row);
        }

        // Perfil individual
        if ($id) {
            $stmt = $conn->prepare('
                SELECT p.*, au.email AS user_email, au.is_active, COALESCE(gur.role, "user") AS global_role
                FROM   profiles p
                JOIN   app_users au ON au.id = p.user_id
                LEFT JOIN global_user_roles gur ON gur.user_id = p.user_id
                WHERE  p.id = ?
                LIMIT  1
            ');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Perfil no encontrado');
            Response::success($row);
        }

        // Lista por taller
        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT p.*, ur.role AS workshop_role, ur.workshop_id, au.is_active, COALESCE(gur.role, "user") AS global_role
            FROM   user_roles ur
            JOIN   profiles p  ON p.user_id    = ur.user_id
            JOIN   app_users au ON au.id        = p.user_id
            LEFT JOIN global_user_roles gur ON gur.user_id = p.user_id
            WHERE  ur.workshop_id = ?
            ORDER  BY p.full_name
        ');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetchAll());
    }

    // ── PUT — actualizar perfil ───────────────────────────────────────────────
    if ($method === 'PUT' && !$action) {
        if (!$id) Response::error('ID del perfil requerido');
        $data = get_json_input();

        // Solo puede editarse a sí mismo o superadmin puede editar a cualquiera
        $stmt = $conn->prepare('SELECT user_id FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $profile = $stmt->fetch();
        if (!$profile) Response::notFound('Perfil no encontrado');

        if ($profile['user_id'] !== $authUser['user_id'] && $authUser['global_role'] !== 'superadmin') {
            Response::unauthorized('Solo puedes editar tu propio perfil');
        }

        $fields = [];
        $params = [];
        foreach (['full_name', 'avatar_url', 'locksmith_id'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $params[] = $data[$f];
            }
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $id;
        $conn->prepare('UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?')
             ->execute($params);

        $stmt = $conn->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success($stmt->fetch(), 'Perfil actualizado');
    }

    // ── POST — invite (crear usuario nuevo y asignarlo al taller) ─────────────
    if ($method === 'POST' && $action === 'invite') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        $email    = strtolower(trim($data['email']    ?? ''));
        $password = $data['password']  ?? '';
        $fullName = trim($data['full_name'] ?? '');
        $role     = $data['role'] ?? 'employee';

        if (!$email || !$password || !$fullName) Response::error('email, password y full_name son requeridos');
        if (!in_array($role, ['admin', 'employee'], true)) Response::error('Rol invalido');
        if (strlen($password) < 8) Response::error('La contrasena debe tener al menos 8 caracteres');

        // Verificar email único
        $chk = $conn->prepare('SELECT id FROM app_users WHERE LOWER(email) = ? LIMIT 1');
        $chk->execute([$email]);
        if ($chk->fetch()) Response::error('El email ya está registrado');

        $conn->beginTransaction();
        try {
            $userId      = make_uuid();
            $profileId   = make_uuid();
            $roleId      = make_uuid();
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);

            $conn->prepare('INSERT INTO app_users (id, email, password_hash, is_active) VALUES (?, ?, ?, 1)')
                 ->execute([$userId, $email, $passwordHash]);

            $conn->prepare('INSERT INTO profiles (id, user_id, full_name, email, current_workshop_id) VALUES (?, ?, ?, ?, ?)')
                 ->execute([$profileId, $userId, $fullName, $email, $workshopId]);

            $conn->prepare('INSERT INTO user_roles (id, user_id, role, workshop_id) VALUES (?, ?, ?, ?)')
                 ->execute([$roleId, $userId, $role, $workshopId]);

            $conn->commit();
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }

        $stmt = $conn->prepare('SELECT p.*, ur.role AS workshop_role FROM profiles p JOIN user_roles ur ON ur.user_id = p.user_id WHERE p.user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        Response::success($stmt->fetch(), 'Usuario creado y asignado al taller');
    }

    // ── POST — change-password (superadmin) ──────────────────────────────────
    if ($method === 'POST' && $action === 'change-password') {
        require_superadmin($authUser);
        $data = get_json_input();

        $targetUserId = $data['user_id'] ?? '';
        $newPassword  = $data['new_password'] ?? '';

        if (!$targetUserId || !$newPassword) Response::error('user_id y new_password son requeridos');
        if (strlen($newPassword) < 8) Response::error('La contrasena debe tener al menos 8 caracteres');

        $stmt = $conn->prepare('SELECT id FROM app_users WHERE id = ? LIMIT 1');
        $stmt->execute([$targetUserId]);
        if (!$stmt->fetch()) Response::notFound('Usuario no encontrado');

        $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $conn->prepare('UPDATE app_users SET password_hash = ? WHERE id = ?')->execute([$passwordHash, $targetUserId]);

        Response::success(null, 'Contrasena actualizada');
    }

    // ── POST — delete-user (superadmin) ──────────────────────────────────────
    if ($method === 'POST' && $action === 'delete-user') {
        require_superadmin($authUser);
        $data = get_json_input();

        $targetUserId = $data['user_id'] ?? '';
        if (!$targetUserId) Response::error('user_id es requerido');
        if ($targetUserId === $authUser['user_id']) Response::error('No puedes eliminar tu propia cuenta');

        $stmt = $conn->prepare('SELECT id FROM app_users WHERE id = ? LIMIT 1');
        $stmt->execute([$targetUserId]);
        if (!$stmt->fetch()) Response::notFound('Usuario no encontrado');

        // ON DELETE CASCADE en perfiles/roles limpia tablas relacionadas.
        $conn->prepare('DELETE FROM app_users WHERE id = ?')->execute([$targetUserId]);
        Response::success(null, 'Usuario eliminado permanentemente');
    }

    // ── POST — user consistency check (superadmin) ───────────────────────────
    if ($method === 'POST' && $action === 'consistency') {
        require_superadmin($authUser);
        $data  = get_json_input();
        $email = strtolower(trim($data['email'] ?? ''));
        if (!$email) Response::error('email es requerido');

        $authStmt = $conn->prepare('SELECT id, email, updated_at FROM app_users WHERE LOWER(email) = ? LIMIT 1');
        $authStmt->execute([$email]);
        $authUserRow = $authStmt->fetch() ?: null;

        $profileStmt = $conn->prepare('SELECT id, user_id, email FROM profiles WHERE LOWER(email) = ? LIMIT 1');
        $profileStmt->execute([$email]);
        $profileRow = $profileStmt->fetch() ?: null;

        $matches = null;
        if ($authUserRow && $profileRow) {
            $matches = $authUserRow['id'] === $profileRow['user_id'];
        }

        Response::success([
            'matches'         => $matches,
            'profile_user_id' => $profileRow['user_id'] ?? null,
            'auth_user'       => $authUserRow ? [
                'id' => $authUserRow['id'],
                'email' => $authUserRow['email'],
                'updated_at' => $authUserRow['updated_at'] ?? null,
                'last_sign_in_at' => null,
            ] : null,
        ]);
    }

    // ── POST — repair profile consistency (superadmin) ───────────────────────
    if ($method === 'POST' && $action === 'repair') {
        require_superadmin($authUser);
        $data  = get_json_input();
        $email = strtolower(trim($data['email'] ?? ''));
        if (!$email) Response::error('email es requerido');

        $authStmt = $conn->prepare('SELECT id, email FROM app_users WHERE LOWER(email) = ? LIMIT 1');
        $authStmt->execute([$email]);
        $authUserRow = $authStmt->fetch();
        if (!$authUserRow) Response::notFound('No existe usuario auth con ese email');

        $profileStmt = $conn->prepare('SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1');
        $profileStmt->execute([$email]);
        $profileRow = $profileStmt->fetch();

        if ($profileRow) {
            $conn->prepare('UPDATE profiles SET user_id = ? WHERE id = ?')
                 ->execute([$authUserRow['id'], $profileRow['id']]);

            $refetch = $conn->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
            $refetch->execute([$profileRow['id']]);
            Response::success([
                'message' => 'Perfil sincronizado correctamente',
                'profile' => $refetch->fetch(),
            ], 'Cuenta reparada');
        }

        $fullName = trim(explode('@', $email)[0] ?? 'Usuario');
        $newProfileId = make_uuid();
        $conn->prepare('INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)')
             ->execute([$newProfileId, $authUserRow['id'], $fullName ?: 'Usuario', $email]);

        $refetch = $conn->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
        $refetch->execute([$newProfileId]);
        Response::success([
            'message' => 'Perfil creado y sincronizado correctamente',
            'profile' => $refetch->fetch(),
        ], 'Cuenta reparada');
    }

    // ── POST — assign (asignar usuario existente al taller) ──────────────────
    if ($method === 'POST' && $action === 'assign') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        $targetUserId = $data['user_id'] ?? '';
        $role         = $data['role']    ?? 'employee';

        if (!$targetUserId) Response::error('user_id es requerido');
        if (!in_array($role, ['admin', 'employee'], true)) Response::error('Rol invalido');

        // Upsert role
        $chk = $conn->prepare('SELECT id FROM user_roles WHERE user_id = ? AND workshop_id = ? LIMIT 1');
        $chk->execute([$targetUserId, $workshopId]);
        $existing = $chk->fetch();

        if ($existing) {
            $conn->prepare('UPDATE user_roles SET role = ? WHERE id = ?')
                 ->execute([$role, $existing['id']]);
        } else {
            $conn->prepare('INSERT INTO user_roles (id, user_id, role, workshop_id) VALUES (?, ?, ?, ?)')
                 ->execute([make_uuid(), $targetUserId, $role, $workshopId]);
        }

        Response::success(['user_id' => $targetUserId, 'role' => $role, 'workshop_id' => $workshopId], 'Usuario asignado al taller');
    }

    // ── DELETE — quitar del taller ────────────────────────────────────────────
    if ($method === 'DELETE') {
        $workshopId = get_workshop_id_param();
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);
        if (!$id) Response::error('ID de perfil requerido');

        $stmt = $conn->prepare('SELECT user_id FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $profile = $stmt->fetch();
        if (!$profile) Response::notFound('Perfil no encontrado');

        $conn->prepare('DELETE FROM user_roles WHERE user_id = ? AND workshop_id = ?')
             ->execute([$profile['user_id'], $workshopId]);

        Response::success(null, 'Usuario removido del taller');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
