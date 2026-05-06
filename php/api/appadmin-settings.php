<?php
/**
 * appadmin-settings.php — Configuración global de la aplicación (solo superadmin)
 * GET  → obtener
 * PUT  → actualizar { storage_endpoint? }
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
require_superadmin($authUser);

try {

    if ($method === 'GET') {
        $stmt = $conn->query('SELECT * FROM appadmin_settings LIMIT 1');
        Response::success($stmt->fetch() ?: null);
    }

    if ($method === 'PUT') {
        $data = get_json_input();

        $stmt     = $conn->query('SELECT id FROM appadmin_settings LIMIT 1');
        $existing = $stmt->fetch();

        if (!$existing) {
            $newId = make_uuid();
            $conn->prepare('
                INSERT INTO appadmin_settings (id, storage_endpoint, storage_api_key_encrypted)
                VALUES (?, ?, ?)
            ')->execute([
                $newId,
                $data['storage_endpoint']        ?? null,
                null,
            ]);
        } else {
            $fields = [];
            $params = [];
            foreach (['storage_endpoint'] as $f) {
                if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
            }
            // Limpieza de campo legacy: la API key deja de utilizarse.
            $fields[] = 'storage_api_key_encrypted = NULL';
            if (empty($fields)) Response::error('No hay campos para actualizar');
            $params[] = $existing['id'];
            $conn->prepare('UPDATE appadmin_settings SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }

        $stmt = $conn->query('SELECT * FROM appadmin_settings LIMIT 1');
        Response::success($stmt->fetch(), 'Configuracion global actualizada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
