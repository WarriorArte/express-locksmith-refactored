<?php
/**
 * auth.php — Login / Logout / Check
 * POST ?action=login   { email, password }  → { token, user, profile, global_role }
 * POST ?action=logout                        → vacía el token
 * GET  ?action=check                         → verifica token activo
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn   = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'check';

try {

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    if ($action === 'login') {
        if ($method !== 'POST') Response::error('Metodo no permitido', 405);

        $data     = get_json_input();
        $email    = strtolower(trim($data['email'] ?? ''));
        $password = $data['password'] ?? '';

        if (!$email || !$password) Response::error('Email y contrasena son requeridos');

        $stmt = $conn->prepare('
            SELECT id, email, password_hash, is_active
            FROM   app_users
            WHERE  LOWER(email) = ?
            LIMIT  1
        ');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !(int)$user['is_active'] || !password_verify($password, $user['password_hash'])) {
            Response::unauthorized('Credenciales incorrectas');
        }

        // Perfil del usuario
        $pStmt = $conn->prepare('
            SELECT id, user_id, full_name, email, avatar_url, current_workshop_id, locksmith_id
            FROM   profiles
            WHERE  user_id = ?
            LIMIT  1
        ');
        $pStmt->execute([$user['id']]);
        $profile = $pStmt->fetch() ?: null;

        // Rol global
        $rStmt = $conn->prepare('SELECT role FROM global_user_roles WHERE user_id = ? LIMIT 1');
        $rStmt->execute([$user['id']]);
        $globalRoleRow = $rStmt->fetch();
        $globalRole    = $globalRoleRow['role'] ?? 'user';

        // Talleres asignados (para que el frontend pueda seleccionar)
        if ($globalRole === 'superadmin') {
            $wStmt = $conn->query('SELECT id, name, code, is_active FROM workshops ORDER BY name');
        } else {
            $wStmt = $conn->prepare('
                SELECT w.id, w.name, w.code, w.is_active, ur.role AS workshop_role
                FROM   user_roles ur
                JOIN   workshops w ON w.id = ur.workshop_id
                WHERE  ur.user_id = ?
                ORDER  BY w.name
            ');
            $wStmt->execute([$user['id']]);
        }
        $workshops = $wStmt->fetchAll();

        // Generar token plano (devuelto al cliente UNA sola vez) y guardar SHA-256 en DB.
        $tokenStr  = bin2hex(random_bytes(32));   // 64 hex chars
        $tokenHash = hash_token($tokenStr);        // 64 hex chars (sha256)
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        $tokenId   = make_uuid();

        $tStmt = $conn->prepare('
            INSERT INTO auth_tokens (id, user_id, token, expires_at)
            VALUES (?, ?, ?, ?)
        ');
        $tStmt->execute([$tokenId, $user['id'], $tokenHash, $expiresAt]);

        Response::success([
            'token'       => $tokenStr,
            'expires_at'  => $expiresAt,
            'user'        => ['id' => $user['id'], 'email' => $user['email']],
            'profile'     => $profile,
            'global_role' => $globalRole,
            'workshops'   => $workshops,
        ], 'Login exitoso');
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    if ($action === 'logout') {
        $token = get_bearer_token();
        if ($token) {
            $conn->prepare('DELETE FROM auth_tokens WHERE token = ?')->execute([hash_token($token)]);
        }
        Response::success(null, 'Sesion cerrada');
    }

    // ── CHECK ─────────────────────────────────────────────────────────────────
    if ($action === 'check') {
        $authUser = require_auth();

        $pStmt = $conn->prepare('
            SELECT id, user_id, full_name, email, avatar_url, current_workshop_id, locksmith_id
            FROM   profiles
            WHERE  user_id = ?
            LIMIT  1
        ');
        $pStmt->execute([$authUser['user_id']]);
        $profile = $pStmt->fetch() ?: null;

        $aStmt = $conn->prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1');
        $aStmt->execute([$authUser['user_id'], 'admin']);
        $isAdmin = (bool)$aStmt->fetchColumn();

        Response::success([
            'authenticated' => true,
            'user'          => [
                'id'          => $authUser['user_id'],
                'global_role' => $authUser['global_role'],
                'is_admin'    => $isAdmin,
            ],
            'profile' => $profile,
        ]);
    }

    // ── CHANGE PASSWORD ───────────────────────────────────────────────────────
    if ($action === 'change-password') {
        if ($method !== 'POST') Response::error('Metodo no permitido', 405);
        $authUser = require_auth();
        $data     = get_json_input();

        $currentPassword = $data['current_password'] ?? '';
        $newPassword     = $data['new_password']     ?? '';

        if (!$currentPassword || !$newPassword) {
            Response::error('Se requieren contrasena actual y nueva');
        }
        if (strlen($newPassword) < 8) {
            Response::error('La nueva contrasena debe tener al menos 8 caracteres');
        }

        $stmt = $conn->prepare('SELECT password_hash FROM app_users WHERE id = ? LIMIT 1');
        $stmt->execute([$authUser['user_id']]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
            Response::unauthorized('Contrasena actual incorrecta');
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $conn->prepare('UPDATE app_users SET password_hash = ? WHERE id = ?')
             ->execute([$newHash, $authUser['user_id']]);

        // Invalidar todos los tokens excepto el actual
        $token = get_bearer_token();
        $conn->prepare('DELETE FROM auth_tokens WHERE user_id = ? AND token != ?')
             ->execute([$authUser['user_id'], hash_token($token)]);

        Response::success(null, 'Contrasena actualizada');
    }

    Response::error('Accion no reconocida', 400);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
