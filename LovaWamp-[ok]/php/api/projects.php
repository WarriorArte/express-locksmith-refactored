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
            $sql = 'SELECT p.*, cp.nombre AS categoria_nombre
                    FROM proyectos p
                    LEFT JOIN categorias_proyectos cp ON cp.id = p.categoria_id
                    WHERE p.id = ?';
            if ($forcePublic) {
                $sql .= " AND p.estado = 'publicado'";
            }
            $stmt = $conn->prepare($sql . ' LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                Response::notFound('Proyecto no encontrado');
            }
            Response::success(format_project($row));
        }

        $sql = 'SELECT p.*, cp.nombre AS categoria_nombre
                FROM proyectos p
                LEFT JOIN categorias_proyectos cp ON cp.id = p.categoria_id';
        $params = [];
        if ($forcePublic) {
            $sql .= " WHERE p.estado = 'publicado'";
        }
        $sql .= ' ORDER BY p.fecha_creacion DESC';

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $items = array_map('format_project', $rows);
        Response::success($items);
    }

    if ($method === 'POST') {
        require_admin();
        $data = get_json_input();

        if (empty($data['titulo'])) {
            Response::error('El titulo es requerido');
        }

        $idValue = make_uuid();
        $stmt = $conn->prepare('INSERT INTO proyectos (id, titulo, descripcion, thumbnail_url, imagenes_galeria, categoria_id, estado) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $idValue,
            $data['titulo'],
            $data['descripcion'] ?? null,
            $data['thumbnail_url'] ?? null,
            json_encode_or_null($data['imagenes_galeria'] ?? []),
            $data['categoria_id'] ?? null,
            $data['estado'] ?? 'borrador',
        ]);

        $select = $conn->prepare('SELECT p.*, cp.nombre AS categoria_nombre FROM proyectos p LEFT JOIN categorias_proyectos cp ON cp.id = p.categoria_id WHERE p.id = ?');
        $select->execute([$idValue]);
        Response::success(format_project($select->fetch()), 'Proyecto creado');
    }

    if ($method === 'PUT') {
        require_admin();
        $data = get_json_input();
        $targetId = $id ?: ($data['id'] ?? null);
        if (!$targetId) {
            Response::error('ID requerido');
        }

        $fields = [];
        $params = [];
        $allowed = ['titulo', 'descripcion', 'thumbnail_url', 'categoria_id', 'estado'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = $field . ' = ?';
                $params[] = $data[$field];
            }
        }

        if (array_key_exists('imagenes_galeria', $data)) {
            $fields[] = 'imagenes_galeria = ?';
            $params[] = json_encode_or_null($data['imagenes_galeria']);
        }

        if (empty($fields)) {
            Response::error('No hay cambios para guardar');
        }

        $params[] = $targetId;
        $stmt = $conn->prepare('UPDATE proyectos SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        $select = $conn->prepare('SELECT p.*, cp.nombre AS categoria_nombre FROM proyectos p LEFT JOIN categorias_proyectos cp ON cp.id = p.categoria_id WHERE p.id = ?');
        $select->execute([$targetId]);
        $row = $select->fetch();
        if (!$row) {
            Response::notFound('Proyecto no encontrado');
        }

        Response::success(format_project($row), 'Proyecto actualizado');
    }

    if ($method === 'DELETE') {
        require_admin();
        if (!$id) {
            Response::error('ID requerido');
        }

        $stmt = $conn->prepare('DELETE FROM proyectos WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Proyecto eliminado');
    }

    Response::error('Metodo no permitido', 405);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

function format_project($row) {
    $row['imagenes_galeria'] = json_decode_array($row['imagenes_galeria']);
    $row['categorias_proyectos'] = $row['categoria_nombre'] ? ['nombre' => $row['categoria_nombre']] : null;
    unset($row['categoria_nombre']);
    return $row;
}
