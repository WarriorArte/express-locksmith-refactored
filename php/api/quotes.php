<?php
/**
 * quotes.php — CRUD de cotizaciones con ítems
 * GET    ?workshop_id=   → lista con cliente + items
 * GET    ?id=            → cotización completa
 * POST                   → crear { ..., items: [] }
 * PUT    ?id=            → actualizar { ..., items?: [] }
 * DELETE ?id=            → eliminar
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id'] ?? null;

function fetch_quote_full(PDO $conn, string $quoteId): ?array {
    $stmt = $conn->prepare('
        SELECT q.*,
               c.id AS cust_id, c.name AS cust_name, c.phone AS cust_phone,
               c.email AS cust_email, c.address AS cust_address
        FROM   quotes q
        LEFT JOIN customers c ON c.id = q.customer_id
        WHERE  q.id = ?
        LIMIT  1
    ');
    $stmt->execute([$quoteId]);
    $quote = $stmt->fetch();
    if (!$quote) return null;

    // Inyectar objeto customer anidado
    $quote['customer'] = $quote['cust_id'] ? [
        'id' => $quote['cust_id'], 'name' => $quote['cust_name'],
        'phone' => $quote['cust_phone'], 'email' => $quote['cust_email'],
        'address' => $quote['cust_address'],
    ] : null;
    foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email', 'cust_address'] as $k) unset($quote[$k]);

    // Items
    $iStmt = $conn->prepare('
        SELECT qi.*, p.name AS product_name, p.sale_price_min, p.sale_price_max
        FROM   quote_items qi
        LEFT JOIN products p ON p.id = qi.product_id
        WHERE  qi.quote_id = ?
        ORDER  BY qi.sort_order, qi.created_at
    ');
    $iStmt->execute([$quoteId]);
    $quote['quote_items'] = $iStmt->fetchAll();

    return $quote;
}

function upsert_quote_items(PDO $conn, string $quoteId, array $items): void {
    // Eliminar items anteriores y reinsertar (más simple que diff)
    $conn->prepare('DELETE FROM quote_items WHERE quote_id = ?')->execute([$quoteId]);
    foreach ($items as $i => $item) {
        $conn->prepare('
            INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, subtotal, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            make_uuid(),
            $quoteId,
            $item['product_id'] ?? null,
            $item['description'] ?? '',
            (int)($item['quantity']    ?? 1),
            (float)($item['unit_price'] ?? 0),
            (float)($item['subtotal']   ?? 0),
            (int)($item['sort_order']   ?? $i),
        ]);
    }
}

try {

    if ($method === 'GET') {
        if ($id) {
            $quote = fetch_quote_full($conn, $id);
            if (!$quote) Response::notFound('Cotizacion no encontrada');
            require_workshop_access($conn, $authUser['user_id'], $quote['workshop_id']);
            Response::success($quote);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT q.*,
                   c.name AS cust_name, c.phone AS cust_phone
            FROM   quotes q
            LEFT JOIN customers c ON c.id = q.customer_id
            WHERE  q.workshop_id = ?
            ORDER  BY q.created_at DESC
        ');
        $stmt->execute([$workshopId]);
        $quotes = $stmt->fetchAll();

        // Añadir items a cada cotización
        if (!empty($quotes)) {
            $qIds = array_column($quotes, 'id');
            $ph   = implode(',', array_fill(0, count($qIds), '?'));
            $iStmt = $conn->prepare("
                SELECT qi.*, p.name AS product_name
                FROM   quote_items qi
                LEFT JOIN products p ON p.id = qi.product_id
                WHERE  qi.quote_id IN ($ph)
                ORDER  BY qi.sort_order
            ");
            $iStmt->execute($qIds);
            $itemsMap = [];
            foreach ($iStmt->fetchAll() as $item) {
                $itemsMap[$item['quote_id']][] = $item;
            }
            foreach ($quotes as &$q) {
                $q['quote_items'] = $itemsMap[$q['id']] ?? [];
                $q['customer']    = $q['cust_name'] ? ['name' => $q['cust_name'], 'phone' => $q['cust_phone']] : null;
                unset($q['cust_name'], $q['cust_phone']);
            }
            unset($q);
        }

        Response::success($quotes);
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        if (empty($data['quote_number'])) Response::error('quote_number es requerido');

        $newId = make_uuid();
        $conn->prepare('
            INSERT INTO quotes
                (id, workshop_id, quote_number, customer_id,
                 customer_name, customer_phone, customer_email, customer_address,
                 description, location, status,
                 subtotal, discount, total, validity_days, valid_until,
                 policies, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId, $workshopId,
            $data['quote_number'],
            $data['customer_id']      ?? null,
            $data['customer_name']    ?? null,
            $data['customer_phone']   ?? null,
            $data['customer_email']   ?? null,
            $data['customer_address'] ?? null,
            $data['description']      ?? null,
            $data['location']         ?? null,
            $data['status']           ?? 'pending',
            (float)($data['subtotal']      ?? 0),
            (float)($data['discount']      ?? 0),
            (float)($data['total']         ?? 0),
            (int)($data['validity_days']   ?? 15),
            $data['valid_until']      ?? null,
            $data['policies']         ?? null,
            $data['notes']            ?? null,
            $authUser['user_id'],
        ]);

        if (!empty($data['items'])) upsert_quote_items($conn, $newId, $data['items']);

        Response::success(fetch_quote_full($conn, $newId), 'Cotizacion creada');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM quotes WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Cotizacion no encontrada');
        require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);

        $allowed = [
            'customer_id', 'customer_name', 'customer_phone', 'customer_email', 'customer_address',
            'description', 'location', 'status', 'subtotal', 'discount', 'total',
            'validity_days', 'valid_until', 'policies', 'notes',
        ];
        $fields = [];
        $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (!empty($fields)) {
            $params[] = $id;
            $conn->prepare('UPDATE quotes SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }

        if (array_key_exists('items', $data)) upsert_quote_items($conn, $id, $data['items']);

        Response::success(fetch_quote_full($conn, $id), 'Cotizacion actualizada');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM quotes WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Cotizacion no encontrada');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM quotes WHERE id = ?')->execute([$id]);
        Response::success(null, 'Cotizacion eliminada');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
