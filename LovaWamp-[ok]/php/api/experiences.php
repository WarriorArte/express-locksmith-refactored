<?php
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();
start_session_if_needed();

$conn = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$isPublic = isset($_GET['public']) && $_GET['public'] === '1';
$isAdmin = is_admin_authenticated();
$forcePublic = $isPublic || !$isAdmin;

try {
    if ($method === 'GET') {
        if ($id) {
            $sql = 'SELECT * FROM experiencias WHERE id = ?';
            if ($forcePublic) {
                $sql .= ' AND es_visible_publico = 1';
            }
            $stmt = $conn->prepare($sql . ' LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                Response::notFound('Experiencia no encontrada');
            }
            Response::success(format_experience($row));
        }

        $sql = 'SELECT * FROM experiencias';
        if ($forcePublic) {
            $sql .= ' WHERE es_visible_publico = 1';
        }
        $sql .= ' ORDER BY created_at DESC';

        $stmt = $conn->query($sql);
        $rows = $stmt->fetchAll();
        $items = array_map('format_experience', $rows);
        Response::success($items);
    }

    if ($method === 'POST') {
        require_admin();
        $data = get_json_input();

        if (empty($data['titulo_cargo']) || empty($data['empresa']) || empty($data['fechas_rango'])) {
            Response::error('titulo_cargo, empresa y fechas_rango son requeridos');
        }

        $newId = make_uuid();
        $stmt = $conn->prepare('INSERT INTO experiencias (id, titulo_cargo, empresa, fechas_rango, funciones_lista, es_visible_publico) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $newId,
            $data['titulo_cargo'],
            $data['empresa'],
            $data['fechas_rango'],
            json_encode_or_null($data['funciones_lista'] ?? []),
            !empty($data['es_visible_publico']) ? 1 : 0,
        ]);

        $refetch = $conn->prepare('SELECT * FROM experiencias WHERE id = ? LIMIT 1');
        $refetch->execute([$newId]);
        Response::success(format_experience($refetch->fetch()), 'Experiencia creada');
    }

    if ($method === 'PUT') {
        require_admin();
        $data = get_json_input();
        $targetId = $id ?: ($data['id'] ?? null);
        if (!$targetId) {
            Response::error('ID requerido');
        }

        $allowed = ['titulo_cargo', 'empresa', 'fechas_rango'];
        $sets = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = $field . ' = ?';
                $params[] = $data[$field];
            }
        }

        if (array_key_exists('funciones_lista', $data)) {
            $sets[] = 'funciones_lista = ?';
            $params[] = json_encode_or_null($data['funciones_lista']);
        }

        if (array_key_exists('es_visible_publico', $data)) {
            $sets[] = 'es_visible_publico = ?';
            $params[] = $data['es_visible_publico'] ? 1 : 0;
        }

        if (empty($sets)) {
            Response::error('No hay cambios para guardar');
        }

        $params[] = $targetId;
        $stmt = $conn->prepare('UPDATE experiencias SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);

        $refetch = $conn->prepare('SELECT * FROM experiencias WHERE id = ? LIMIT 1');
        $refetch->execute([$targetId]);
        $row = $refetch->fetch();
        if (!$row) {
            Response::notFound('Experiencia no encontrada');
        }
        Response::success(format_experience($row), 'Experiencia actualizada');
    }

    if ($method === 'DELETE') {
        require_admin();
        if (!$id) {
            Response::error('ID requerido');
        }

        $stmt = $conn->prepare('DELETE FROM experiencias WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Experiencia eliminada');
    }

    Response::error('Metodo no permitido', 405);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

function format_experience($row) {
    $row['funciones_lista'] = json_decode_array($row['funciones_lista']);
    $row['es_visible_publico'] = (bool) $row['es_visible_publico'];
    return $row;
}
