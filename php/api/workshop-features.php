<?php
/**
 * workshop-features.php — Features/flags por taller
 * GET  ?workshop_id=  → lista features del taller
 * PUT  ?workshop_id=  → activa o desactiva una feature { feature_key, is_enabled, settings? }
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn       = get_db_connection();
$method     = $_SERVER['REQUEST_METHOD'];
$authUser   = require_auth();
$workshopId = get_workshop_id_param();

try {

    if ($method === 'GET') {
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT id, feature_key, is_enabled, settings, created_at
            FROM   workshop_features
            WHERE  workshop_id = ?
            ORDER  BY feature_key
        ');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetchAll());
    }

    if ($method === 'PUT') {
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);
        $data = get_json_input();

        if (empty($data['feature_key'])) Response::error('feature_key es requerido');

        $featureKey = $data['feature_key'];
        $isEnabled  = isset($data['is_enabled']) ? (int)(bool)$data['is_enabled'] : 1;
        $settings   = isset($data['settings']) ? json_encode($data['settings']) : null;

        // Upsert
        $check = $conn->prepare('SELECT id FROM workshop_features WHERE workshop_id = ? AND feature_key = ? LIMIT 1');
        $check->execute([$workshopId, $featureKey]);
        $existing = $check->fetch();

        if ($existing) {
            $conn->prepare('
                UPDATE workshop_features
                SET    is_enabled = ?, settings = ?
                WHERE  id = ?
            ')->execute([$isEnabled, $settings, $existing['id']]);
        } else {
            $newId = make_uuid();
            $conn->prepare('
                INSERT INTO workshop_features (id, workshop_id, feature_key, is_enabled, settings)
                VALUES (?, ?, ?, ?, ?)
            ')->execute([$newId, $workshopId, $featureKey, $isEnabled, $settings]);
        }

        $stmt = $conn->prepare('
            SELECT * FROM workshop_features
            WHERE workshop_id = ? AND feature_key = ?
            LIMIT 1
        ');
        $stmt->execute([$workshopId, $featureKey]);
        Response::success($stmt->fetch(), 'Feature actualizada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
