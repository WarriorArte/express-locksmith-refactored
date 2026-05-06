<?php
/**
 * business-settings.php — Configuración del negocio por taller
 * GET  ?workshop_id=  → obtener (o null si no existe)
 * POST                → crear { workshop_id, name, ... }
 * PUT  ?workshop_id=  → actualizar (upsert por workshop_id)
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();

const BS_FIELDS = [
    'name', 'phone', 'phone_country_code', 'address', 'email', 'website',
    'logo_url', 'facebook', 'instagram', 'whatsapp',
    'printer_size', 'printer_model', 'currency_symbol',
    'print_logo', 'auto_cut', 'storage_endpoint', 'storage_secret_key',
];

try {

    if ($method === 'GET') {
        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('SELECT * FROM business_settings WHERE workshop_id = ? LIMIT 1');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetch() ?: null);
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        // Verificar si ya existe
        $chk = $conn->prepare('SELECT id FROM business_settings WHERE workshop_id = ? LIMIT 1');
        $chk->execute([$workshopId]);
        if ($chk->fetch()) Response::error('Ya existe una configuracion para este taller. Usa PUT para actualizar.');

        $newId = make_uuid();
        $conn->prepare('
            INSERT INTO business_settings
                (id, workshop_id, name, phone, phone_country_code, address, email, website,
                 logo_url, facebook, instagram, whatsapp,
                 printer_size, printer_model, currency_symbol, print_logo, auto_cut,
                 storage_endpoint, storage_secret_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId, $workshopId,
            $data['name']               ?? 'Mi Cerrajeria',
            $data['phone']              ?? null,
            $data['phone_country_code'] ?? '+52',
            $data['address']            ?? null,
            $data['email']              ?? null,
            $data['website']            ?? null,
            $data['logo_url']           ?? null,
            $data['facebook']           ?? null,
            $data['instagram']          ?? null,
            $data['whatsapp']           ?? null,
            $data['printer_size']       ?? '80mm',
            $data['printer_model']      ?? 'generic',
            $data['currency_symbol']    ?? '$',
            (int)($data['print_logo']   ?? 1),
            (int)($data['auto_cut']     ?? 1),
            $data['storage_endpoint']   ?? null,
            $data['storage_secret_key'] ?? null,
        ]);

        $stmt = $conn->prepare('SELECT * FROM business_settings WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success($stmt->fetch(), 'Configuracion creada');
    }

    if ($method === 'PUT') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        $chk = $conn->prepare('SELECT id FROM business_settings WHERE workshop_id = ? LIMIT 1');
        $chk->execute([$workshopId]);
        $existing = $chk->fetch();

        if (!$existing) {
            // Auto-crear si no existe
            $newId = make_uuid();
            $conn->prepare('INSERT INTO business_settings (id, workshop_id, name) VALUES (?, ?, ?)')
                 ->execute([$newId, $workshopId, $data['name'] ?? 'Mi Cerrajeria']);
            $existingId = $newId;
        } else {
            $existingId = $existing['id'];
        }

        $fields = [];
        $params = [];
        foreach (BS_FIELDS as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $existingId;
        $conn->prepare('UPDATE business_settings SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

        $stmt = $conn->prepare('SELECT * FROM business_settings WHERE id = ? LIMIT 1');
        $stmt->execute([$existingId]);
        Response::success($stmt->fetch(), 'Configuracion actualizada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
