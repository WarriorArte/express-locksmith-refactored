<?php
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();
start_session_if_needed();

$conn = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    if ($method === 'GET') {
        if ($id) {
            $stmt = $conn->prepare('SELECT * FROM categorias_proyectos WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                Response::notFound('Categoria no encontrada');
            }
            Response::success($row);
        }

        $stmt = $conn->query('SELECT * FROM categorias_proyectos ORDER BY nombre ASC');
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        require_admin();
        $data = get_json_input();
        if (empty($data['nombre'])) {
            Response::error('nombre es requerido');
        }

        $newId = make_uuid();
        $stmt = $conn->prepare('INSERT INTO categorias_proyectos (id, nombre) VALUES (?, ?)');
        $stmt->execute([$newId, trim($data['nombre'])]);

        $refetch = $conn->prepare('SELECT * FROM categorias_proyectos WHERE id = ? LIMIT 1');
        $refetch->execute([$newId]);
        Response::success($refetch->fetch(), 'Categoria creada');
    }

    if ($method === 'PUT') {
        require_admin();
        $data = get_json_input();
        $targetId = $id ?: ($data['id'] ?? null);
        if (!$targetId) {
            Response::error('ID requerido');
        }

        if (!array_key_exists('nombre', $data) || trim((string) $data['nombre']) === '') {
            Response::error('nombre es requerido');
        }

        $stmt = $conn->prepare('UPDATE categorias_proyectos SET nombre = ? WHERE id = ?');
        $stmt->execute([trim((string) $data['nombre']), $targetId]);

        $refetch = $conn->prepare('SELECT * FROM categorias_proyectos WHERE id = ? LIMIT 1');
        $refetch->execute([$targetId]);
        $row = $refetch->fetch();
        if (!$row) {
            Response::notFound('Categoria no encontrada');
        }

        Response::success($row, 'Categoria actualizada');
    }

    if ($method === 'DELETE') {
        require_admin();
        if (!$id) {
            Response::error('ID requerido');
        }

        $stmt = $conn->prepare('DELETE FROM categorias_proyectos WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Categoria eliminada');
    }

    Response::error('Metodo no permitido', 405);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
