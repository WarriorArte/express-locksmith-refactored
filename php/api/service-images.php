<?php
/**
 * service-images.php — Imágenes adjuntas a servicios
 * GET    ?service_id=  → lista de imágenes del servicio
 * POST                 → agregar imagen { service_id, image_url, description? }
 * DELETE ?id=          → eliminar imagen
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id']         ?? null;
$serviceId = $_GET['service_id'] ?? null;

function get_service_workshop(PDO $conn, string $serviceId): ?string {
    $stmt = $conn->prepare('SELECT workshop_id FROM services WHERE id = ? LIMIT 1');
    $stmt->execute([$serviceId]);
    $row = $stmt->fetch();
    return $row ? $row['workshop_id'] : null;
}

try {

    if ($method === 'GET') {
        if (!$serviceId) Response::error('service_id es requerido');
        $workshopId = get_service_workshop($conn, $serviceId);
        if (!$workshopId) Response::notFound('Servicio no encontrado');
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('SELECT * FROM service_images WHERE service_id = ? ORDER BY created_at');
        $stmt->execute([$serviceId]);
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data = get_json_input();
        $sid  = $data['service_id'] ?? $serviceId;
        if (!$sid) Response::error('service_id es requerido');
        if (empty($data['image_url'])) Response::error('image_url es requerido');

        $workshopId = get_service_workshop($conn, $sid);
        if (!$workshopId) Response::notFound('Servicio no encontrado');
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $newId = make_uuid();
        $conn->prepare('INSERT INTO service_images (id, service_id, image_url, description) VALUES (?, ?, ?, ?)')
             ->execute([$newId, $sid, $data['image_url'], $data['description'] ?? null]);

        $stmt = $conn->prepare('SELECT * FROM service_images WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success($stmt->fetch(), 'Imagen agregada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID de imagen requerido');

        $stmt = $conn->prepare('
            SELECT si.service_id, s.workshop_id
            FROM   service_images si
            JOIN   services s ON s.id = si.service_id
            WHERE  si.id = ?
            LIMIT  1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Imagen no encontrada');
        require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM service_images WHERE id = ?')->execute([$id]);
        Response::success(null, 'Imagen eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
