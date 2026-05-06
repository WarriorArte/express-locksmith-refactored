<?php
/**
 * categories.php — CRUD de categorías por taller
 * GET    ?workshop_id=   → lista
 * GET    ?id=            → individual
 * POST                   → crear { name, color?, workshop_id }
 * PUT    ?id=            → actualizar { name?, color? }
 * DELETE ?id=            → eliminar
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id'] ?? null;

try {

    if ($method === 'GET') {
        if ($id) {
            $stmt = $conn->prepare('SELECT * FROM categories WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Categoria no encontrada');
            require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);
            Response::success($row);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('SELECT * FROM categories WHERE workshop_id = ? ORDER BY name');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        if (empty($data['name'])) Response::error('El campo name es requerido');

        $newId = make_uuid();
        $conn->prepare('INSERT INTO categories (id, workshop_id, name, color) VALUES (?, ?, ?, ?)')
             ->execute([$newId, $workshopId, $data['name'], $data['color'] ?? '#2563eb']);

        $stmt = $conn->prepare('SELECT * FROM categories WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success($stmt->fetch(), 'Categoria creada');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM categories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Categoria no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $fields = [];
        $params = [];
        foreach (['name', 'color'] as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $id;
        $conn->prepare('UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

        $stmt = $conn->prepare('SELECT * FROM categories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success($stmt->fetch(), 'Categoria actualizada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM categories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Categoria no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
        Response::success(null, 'Categoria eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
