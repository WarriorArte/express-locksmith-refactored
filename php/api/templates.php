<?php
/**
 * templates.php — Plantillas de impresión (globales + por taller)
 * GET  ?workshop_id=      → lista templates globales + del taller
 * GET  ?id=               → template individual
 * POST                    → crear template personalizado { workshop_id, name, template_type, html_content, css_content }
 * PUT  ?id=               → actualizar template propio del taller
 * DELETE ?id=             → eliminar template (no globales)
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
            $stmt = $conn->prepare('SELECT * FROM templates WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Plantilla no encontrada');
            Response::success($row);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);
        $templateType = $_GET['template_type'] ?? null;

        // Templates globales + los del taller
        if ($templateType) {
            $stmt = $conn->prepare('
                SELECT * FROM templates
                WHERE  (is_global = 1 OR workshop_id = ?)
                  AND  template_type = ?
                ORDER  BY is_global DESC, template_type, name
            ');
            $stmt->execute([$workshopId, $templateType]);
        } else {
            $stmt = $conn->prepare('
                SELECT * FROM templates
                WHERE  is_global = 1
                   OR  workshop_id = ?
                ORDER  BY is_global DESC, template_type, name
            ');
            $stmt->execute([$workshopId]);
        }
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $isGlobalCreate = !empty($data['is_global']);
        $workshopId = get_workshop_id_param($data);

        if ($isGlobalCreate) {
            require_superadmin($authUser);
            $workshopId = null;
        } else {
            require_workshop_admin($conn, $authUser['user_id'], $workshopId);
        }

        foreach (['name', 'template_type'] as $req) {
            if (empty($data[$req])) Response::error("$req es requerido");
        }

        $newId = make_uuid();
        $conn->prepare('
            INSERT INTO templates
                (id, workshop_id, name, template_type, html_content, css_content,
                 thumbnail_url, is_default, is_global)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId, $workshopId,
            $data['name'],
            $data['template_type'],
            $data['html_content']  ?? null,
            $data['css_content']   ?? null,
            $data['thumbnail_url'] ?? null,
            (int)($data['is_default'] ?? 0),
            $isGlobalCreate ? 1 : 0,
        ]);

        $stmt = $conn->prepare('SELECT * FROM templates WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success($stmt->fetch(), 'Plantilla creada');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id, is_global FROM templates WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Plantilla no encontrada');

        if ((int)$row['is_global']) {
            require_superadmin($authUser);
        } else {
            require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);
        }

        $allowed = ['name', 'template_type', 'html_content', 'css_content', 'thumbnail_url', 'is_default'];
        $fields  = [];
        $params  = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $id;
        $conn->prepare('UPDATE templates SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

        $stmt = $conn->prepare('SELECT * FROM templates WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success($stmt->fetch(), 'Plantilla actualizada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id, is_global FROM templates WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Plantilla no encontrada');

        if ((int)$row['is_global']) {
            require_superadmin($authUser);
        } else {
            require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);
        }

        $conn->prepare('DELETE FROM templates WHERE id = ?')->execute([$id]);
        Response::success(null, 'Plantilla eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
