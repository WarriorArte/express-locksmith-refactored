<?php
/**
 * warranties.php — CRUD de garantías
 * GET    ?workshop_id=   → lista con cliente / venta / servicio vinculados
 * GET    ?id=            → garantía individual
 * POST                   → crear
 * PUT    ?id=            → actualizar / anular (void)
 * DELETE ?id=            → eliminar
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id'] ?? null;

function fetch_warranty_full(PDO $conn, string $wId): ?array {
    $stmt = $conn->prepare('
        SELECT w.*,
               c.id AS cust_id, c.name AS cust_name, c.phone AS cust_phone,
               s.sale_number,
               sv.service_number
        FROM   warranties w
        LEFT JOIN customers c  ON c.id  = w.customer_id
        LEFT JOIN sales s      ON s.id  = w.sale_id
        LEFT JOIN services sv  ON sv.id = w.service_id
        WHERE  w.id = ?
        LIMIT  1
    ');
    $stmt->execute([$wId]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $row['customer'] = $row['cust_id'] ? ['id' => $row['cust_id'], 'name' => $row['cust_name'], 'phone' => $row['cust_phone']] : null;
    $row['sale']     = $row['sale_number']    ? ['sale_number'    => $row['sale_number']]    : null;
    $row['service']  = $row['service_number'] ? ['service_number' => $row['service_number']] : null;

    foreach (['cust_id', 'cust_name', 'cust_phone', 'sale_number', 'service_number'] as $k) unset($row[$k]);
    return $row;
}

try {

    if ($method === 'GET') {
        if ($id) {
            $w = fetch_warranty_full($conn, $id);
            if (!$w) Response::notFound('Garantia no encontrada');
            require_workshop_access($conn, $authUser['user_id'], $w['workshop_id']);
            Response::success($w);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT w.*,
                   c.name AS cust_name, c.phone AS cust_phone,
                   s.sale_number, sv.service_number
            FROM   warranties w
            LEFT JOIN customers c  ON c.id  = w.customer_id
            LEFT JOIN sales s      ON s.id  = w.sale_id
            LEFT JOIN services sv  ON sv.id = w.service_id
            WHERE  w.workshop_id = ?
            ORDER  BY w.created_at DESC
        ');
        $stmt->execute([$workshopId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['customer'] = $r['cust_name'] ? ['name' => $r['cust_name'], 'phone' => $r['cust_phone']] : null;
            $r['sale']     = $r['sale_number']    ? ['sale_number' => $r['sale_number']] : null;
            $r['service']  = $r['service_number'] ? ['service_number' => $r['service_number']] : null;
            foreach (['cust_name', 'cust_phone', 'sale_number', 'service_number'] as $k) unset($r[$k]);
        }
        unset($r);
        Response::success($rows);
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        foreach (['warranty_code', 'warranty_type', 'warranty_days', 'end_date'] as $req) {
            if (empty($data[$req])) Response::error("$req es requerido");
        }

        $newId = make_uuid();
        $conn->prepare('
            INSERT INTO warranties
                (id, warranty_code, sale_id, service_id, customer_id,
                 customer_name, product_name, service_description,
                 warranty_type, warranty_days, start_date, end_date,
                 notes, is_voided, workshop_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId,
            $data['warranty_code'],
            $data['sale_id']             ?? null,
            $data['service_id']          ?? null,
            $data['customer_id']         ?? null,
            $data['customer_name']       ?? null,
            $data['product_name']        ?? null,
            $data['service_description'] ?? null,
            $data['warranty_type'],
            (int)$data['warranty_days'],
            $data['start_date'] ?? date('Y-m-d H:i:s'),
            $data['end_date'],
            $data['notes']   ?? null,
            0,
            $workshopId,
            $authUser['user_id'],
        ]);

        Response::success(fetch_warranty_full($conn, $newId), 'Garantia creada');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM warranties WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Garantia no encontrada');
        require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);

        // Acción de anulación
        if (!empty($data['void']) || !empty($data['is_voided'])) {
            $conn->prepare('
                UPDATE warranties
                SET    is_voided = 1, voided_at = NOW(), voided_reason = ?
                WHERE  id = ?
            ')->execute([$data['voided_reason'] ?? null, $id]);
            Response::success(fetch_warranty_full($conn, $id), 'Garantia anulada');
        }

        $allowed = ['customer_name', 'product_name', 'service_description', 'warranty_days', 'end_date', 'notes'];
        $fields  = [];
        $params  = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $id;
        $conn->prepare('UPDATE warranties SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        Response::success(fetch_warranty_full($conn, $id), 'Garantia actualizada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM warranties WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Garantia no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM warranties WHERE id = ?')->execute([$id]);
        Response::success(null, 'Garantia eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
