<?php
/**
 * workshops.php — CRUD de talleres
 * GET                     → lista talleres del usuario (o todos si superadmin)
 * GET  ?id=               → taller por ID
 * POST                    → crear taller (superadmin)
 * PUT  ?id=               → actualizar taller (superadmin o admin del taller)
 * DELETE ?id=             → eliminar taller (superadmin)
 * PUT  ?action=switch&id= → cambiar current_workshop_id en el perfil del usuario
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn   = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$action = $_GET['action'] ?? null;
$id     = $_GET['id']     ?? null;

try {

    // ── SWITCH WORKSHOP ───────────────────────────────────────────────────────
    if ($action === 'switch' && $method === 'PUT') {
        if (!$id) Response::error('id del taller requerido');
        require_workshop_access($conn, $authUser['user_id'], $id);

        $conn->prepare('UPDATE profiles SET current_workshop_id = ? WHERE user_id = ?')
             ->execute([$id, $authUser['user_id']]);

        $stmt = $conn->prepare('SELECT * FROM workshops WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success($stmt->fetch(), 'Taller activo actualizado');
    }

    // ── GET ───────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        if ($id) {
            require_workshop_access($conn, $authUser['user_id'], $id);
            $stmt = $conn->prepare('SELECT * FROM workshops WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Taller no encontrado');
            Response::success($row);
        }

        // Lista de talleres según rol
        if ($authUser['global_role'] === 'superadmin') {
            $stmt = $conn->query('SELECT * FROM workshops ORDER BY name');
        } else {
            $stmt = $conn->prepare('
                SELECT w.*, ur.role AS workshop_role
                FROM   user_roles ur
                JOIN   workshops w ON w.id = ur.workshop_id
                WHERE  ur.user_id = ?
                ORDER  BY w.name
            ');
            $stmt->execute([$authUser['user_id']]);
        }
        Response::success($stmt->fetchAll());
    }

    // ── POST — crear ──────────────────────────────────────────────────────────
    if ($method === 'POST') {
        require_superadmin($authUser);
        $data = get_json_input();

        if (empty($data['name'])) Response::error('El campo name es requerido');
        if (empty($data['code'])) Response::error('El campo code es requerido');

        // Verificar code único
        $chk = $conn->prepare('SELECT id FROM workshops WHERE code = ? LIMIT 1');
        $chk->execute([$data['code']]);
        if ($chk->fetch()) Response::error('El codigo de taller ya existe');

        $newId    = make_uuid();
        $settings = isset($data['settings']) ? json_encode($data['settings']) : null;

        $conn->prepare('
            INSERT INTO workshops (id, code, name, is_active, settings)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([
            $newId,
            $data['code'],
            $data['name'],
            isset($data['is_active']) ? (int)$data['is_active'] : 1,
            $settings,
        ]);

        $stmt = $conn->prepare('SELECT * FROM workshops WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success($stmt->fetch(), 'Taller creado');
    }

    // ── PUT — actualizar ──────────────────────────────────────────────────────
    if ($method === 'PUT') {
        if (!$id) Response::error('ID del taller requerido');
        require_workshop_admin($conn, $authUser['user_id'], $id);
        $data = get_json_input();

        $fields = [];
        $params = [];
        foreach (['name', 'code', 'is_active'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $params[] = $data[$f];
            }
        }
        if (array_key_exists('settings', $data)) {
            $fields[] = 'settings = ?';
            $params[] = json_encode($data['settings']);
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $id;
        $conn->prepare('UPDATE workshops SET ' . implode(', ', $fields) . ' WHERE id = ?')
             ->execute($params);

        $stmt = $conn->prepare('SELECT * FROM workshops WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success($stmt->fetch(), 'Taller actualizado');
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if ($method === 'DELETE') {
        if (!$id) Response::error('ID del taller requerido');
        require_superadmin($authUser);

        $conn->prepare('DELETE FROM workshops WHERE id = ?')->execute([$id]);
        Response::success(null, 'Taller eliminado');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
