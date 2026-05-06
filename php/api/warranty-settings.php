<?php
/**
 * warranty-settings.php — Configuración global y por categoría de garantías
 * GET  ?workshop_id=           → warranty_settings + warranty_category_settings
 * PUT  ?workshop_id=           → upsert warranty_settings { default_warranty_days, ... }
 * POST ?action=category        → upsert warranty_category_settings { category_id, warranty_days }
 * DELETE ?action=category&id=  → eliminar warranty_category_settings por id
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

    if ($method === 'GET') {
        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('SELECT * FROM warranty_settings WHERE workshop_id = ? LIMIT 1');
        $stmt->execute([$workshopId]);
        $settings = $stmt->fetch() ?: null;

        $catStmt = $conn->prepare('
            SELECT wcs.*, c.name AS category_name, c.color AS category_color
            FROM   warranty_category_settings wcs
            JOIN   categories c ON c.id = wcs.category_id
            WHERE  wcs.workshop_id = ?
            ORDER  BY c.name
        ');
        $catStmt->execute([$workshopId]);
        $categorySettings = $catStmt->fetchAll();

        Response::success([
            'warranty_settings'          => $settings,
            'warranty_category_settings' => $categorySettings,
        ]);
    }

    // PUT — upsert warranty_settings global
    if ($method === 'PUT' && !$action) {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        $check = $conn->prepare('SELECT id FROM warranty_settings WHERE workshop_id = ? LIMIT 1');
        $check->execute([$workshopId]);
        $existing = $check->fetch();

        $allowed = [
            'default_warranty_days', 'default_service_warranty_days',
            'terms_conditions', 'coverage_policy_products', 'coverage_policy_services',
        ];

        if ($existing) {
            $fields = [];
            $params = [];
            foreach ($allowed as $f) {
                if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
            }
            if (empty($fields)) Response::error('No hay campos para actualizar');
            $params[] = $existing['id'];
            $conn->prepare('UPDATE warranty_settings SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        } else {
            $newId = make_uuid();
            $conn->prepare('
                INSERT INTO warranty_settings
                    (id, workshop_id, default_warranty_days, default_service_warranty_days,
                     terms_conditions, coverage_policy_products, coverage_policy_services)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ')->execute([
                $newId, $workshopId,
                $data['default_warranty_days']         ?? 30,
                $data['default_service_warranty_days'] ?? 30,
                $data['terms_conditions']              ?? null,
                $data['coverage_policy_products']      ?? null,
                $data['coverage_policy_services']      ?? null,
            ]);
        }

        $stmt = $conn->prepare('SELECT * FROM warranty_settings WHERE workshop_id = ? LIMIT 1');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetch(), 'Configuracion de garantias actualizada');
    }

    // POST ?action=category — upsert por categoría
    if ($method === 'POST' && $action === 'category') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        if (empty($data['category_id']))   Response::error('category_id es requerido');
        if (!isset($data['warranty_days'])) Response::error('warranty_days es requerido');

        $check = $conn->prepare('SELECT id FROM warranty_category_settings WHERE category_id = ? AND workshop_id = ? LIMIT 1');
        $check->execute([$data['category_id'], $workshopId]);
        $existing = $check->fetch();

        if ($existing) {
            $conn->prepare('UPDATE warranty_category_settings SET warranty_days = ? WHERE id = ?')
                 ->execute([(int)$data['warranty_days'], $existing['id']]);
        } else {
            $conn->prepare('INSERT INTO warranty_category_settings (id, category_id, workshop_id, warranty_days) VALUES (?, ?, ?, ?)')
                 ->execute([make_uuid(), $data['category_id'], $workshopId, (int)$data['warranty_days']]);
        }

        Response::success(null, 'Configuracion de categoria actualizada');
    }

    // DELETE ?action=category&id=
    if ($method === 'DELETE' && $action === 'category') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM warranty_category_settings WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Configuracion no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM warranty_category_settings WHERE id = ?')->execute([$id]);
        Response::success(null, 'Configuracion eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
