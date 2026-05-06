<?php
/**
 * sales.php — CRUD de ventas con ítems
 * GET    ?workshop_id=   → lista con cliente + items
 * GET    ?id=            → venta completa
 * POST                   → crear { ..., items: [] }
 * PUT    ?id=            → actualizar
 * DELETE ?id=            → eliminar
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id'] ?? null;

function fetch_sale_full(PDO $conn, string $saleId): ?array {
    $stmt = $conn->prepare('
        SELECT s.*,
               c.id AS cust_id, c.name AS cust_name, c.phone AS cust_phone, c.email AS cust_email
        FROM   sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE  s.id = ?
        LIMIT  1
    ');
    $stmt->execute([$saleId]);
    $sale = $stmt->fetch();
    if (!$sale) return null;

    $sale['customer'] = $sale['cust_id'] ? [
        'id' => $sale['cust_id'], 'name' => $sale['cust_name'],
        'phone' => $sale['cust_phone'], 'email' => $sale['cust_email'],
    ] : null;
    foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email'] as $k) unset($sale[$k]);

    $iStmt = $conn->prepare('
        SELECT si.*, p.name AS p_name
        FROM   sale_items si
        LEFT JOIN products p ON p.id = si.product_id
        WHERE  si.sale_id = ?
    ');
    $iStmt->execute([$saleId]);
    $sale['sale_items'] = $iStmt->fetchAll();

    return $sale;
}

function upsert_sale_items(PDO $conn, string $saleId, array $items): void {
    $conn->prepare('DELETE FROM sale_items WHERE sale_id = ?')->execute([$saleId]);
    foreach ($items as $item) {
        $conn->prepare('
            INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            make_uuid(), $saleId,
            $item['product_id']   ?? null,
            $item['product_name'] ?? ($item['name'] ?? ''),
            (int)($item['quantity']    ?? 1),
            (float)($item['unit_price'] ?? 0),
            (float)($item['subtotal']   ?? 0),
        ]);
    }
}

try {

    if ($method === 'GET') {
        if ($id) {
            $sale = fetch_sale_full($conn, $id);
            if (!$sale) Response::notFound('Venta no encontrada');
            require_workshop_access($conn, $authUser['user_id'], $sale['workshop_id']);
            Response::success($sale);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT s.*, c.name AS cust_name, c.phone AS cust_phone
            FROM   sales s
            LEFT JOIN customers c ON c.id = s.customer_id
            WHERE  s.workshop_id = ?
            ORDER  BY s.created_at DESC
        ');
        $stmt->execute([$workshopId]);
        $sales = $stmt->fetchAll();

        if (!empty($sales)) {
            $sIds = array_column($sales, 'id');
            $ph   = implode(',', array_fill(0, count($sIds), '?'));
            $iStmt = $conn->prepare("
                SELECT si.*, p.name AS p_name
                FROM   sale_items si
                LEFT JOIN products p ON p.id = si.product_id
                WHERE  si.sale_id IN ($ph)
            ");
            $iStmt->execute($sIds);
            $itemsMap = [];
            foreach ($iStmt->fetchAll() as $item) {
                $itemsMap[$item['sale_id']][] = $item;
            }
            foreach ($sales as &$s) {
                $s['sale_items'] = $itemsMap[$s['id']] ?? [];
                $s['customer']   = $s['cust_name'] ? ['name' => $s['cust_name'], 'phone' => $s['cust_phone']] : null;
                unset($s['cust_name'], $s['cust_phone']);
            }
            unset($s);
        }

        Response::success($sales);
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        if (empty($data['sale_number'])) Response::error('sale_number es requerido');

        $newId = make_uuid();
        $conn->prepare('
            INSERT INTO sales
                (id, workshop_id, sale_number, customer_id, customer_name,
                 subtotal, discount, total, payment_method, notes, has_warranty, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId, $workshopId,
            $data['sale_number'],
            $data['customer_id']     ?? null,
            $data['customer_name']   ?? null,
            (float)($data['subtotal']    ?? 0),
            (float)($data['discount']    ?? 0),
            (float)($data['total']       ?? 0),
            $data['payment_method']  ?? 'cash',
            $data['notes']           ?? null,
            (int)($data['has_warranty']  ?? 0),
            $authUser['user_id'],
        ]);

        if (!empty($data['items'])) upsert_sale_items($conn, $newId, $data['items']);

        // Actualizar stats del cliente
        if (!empty($data['customer_id'])) {
            $conn->prepare('
                UPDATE customers
                SET    total_purchases = total_purchases + ?
                WHERE  id = ?
            ')->execute([(float)($data['total'] ?? 0), $data['customer_id']]);
        }

        Response::success(fetch_sale_full($conn, $newId), 'Venta creada');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM sales WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Venta no encontrada');
        require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);

        $allowed = ['customer_id', 'customer_name', 'subtotal', 'discount', 'total', 'payment_method', 'notes', 'has_warranty'];
        $fields  = [];
        $params  = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (!empty($fields)) {
            $params[] = $id;
            $conn->prepare('UPDATE sales SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }

        if (array_key_exists('items', $data)) upsert_sale_items($conn, $id, $data['items']);

        Response::success(fetch_sale_full($conn, $id), 'Venta actualizada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id, customer_id, total FROM sales WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Venta no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM sales WHERE id = ?')->execute([$id]);

        if ($row['customer_id']) {
            $conn->prepare('
                UPDATE customers
                SET    total_purchases = GREATEST(0, total_purchases - ?)
                WHERE  id = ?
            ')->execute([(float)$row['total'], $row['customer_id']]);
        }

        Response::success(null, 'Venta eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
