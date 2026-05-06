<?php
/**
 * template-selections.php — Selecciones de plantillas activas por taller
 * GET  ?workshop_id=          → selecciones del taller (con template_type como clave)
 * POST                        → upsert selección { workshop_id, template_type, template_id, custom_css? }
 * DELETE ?id=                 → eliminar selección
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
        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT wts.*, t.name AS template_name, t.template_type AS type
            FROM   workshop_template_selections wts
            JOIN   templates t ON t.id = wts.template_id
            WHERE  wts.workshop_id = ?
        ');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        foreach (['template_type', 'template_id'] as $req) {
            if (empty($data[$req])) Response::error("$req es requerido");
        }

        // Verificar que la plantilla existe y es accesible
        $tStmt = $conn->prepare('SELECT id, is_global, workshop_id FROM templates WHERE id = ? LIMIT 1');
        $tStmt->execute([$data['template_id']]);
        $template = $tStmt->fetch();
        if (!$template) Response::notFound('Plantilla no encontrada');
        if (!(int)$template['is_global'] && $template['workshop_id'] !== $workshopId) {
            Response::unauthorized('Plantilla no disponible para este taller');
        }

        // Upsert por (workshop_id, template_type)
        $chk = $conn->prepare('SELECT id FROM workshop_template_selections WHERE workshop_id = ? AND template_type = ? LIMIT 1');
        $chk->execute([$workshopId, $data['template_type']]);
        $existing = $chk->fetch();

        if ($existing) {
            $conn->prepare('
                UPDATE workshop_template_selections
                SET    template_id = ?, custom_css = ?
                WHERE  id = ?
            ')->execute([$data['template_id'], $data['custom_css'] ?? null, $existing['id']]);
            $selId = $existing['id'];
        } else {
            $selId = make_uuid();
            $conn->prepare('
                INSERT INTO workshop_template_selections
                    (id, workshop_id, template_type, template_id, custom_css)
                VALUES (?, ?, ?, ?, ?)
            ')->execute([
                $selId, $workshopId,
                $data['template_type'],
                $data['template_id'],
                $data['custom_css'] ?? null,
            ]);
        }

        $stmt = $conn->prepare('SELECT * FROM workshop_template_selections WHERE id = ? LIMIT 1');
        $stmt->execute([$selId]);
        Response::success($stmt->fetch(), 'Seleccion de plantilla actualizada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM workshop_template_selections WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Seleccion no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM workshop_template_selections WHERE id = ?')->execute([$id]);
        Response::success(null, 'Seleccion eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
