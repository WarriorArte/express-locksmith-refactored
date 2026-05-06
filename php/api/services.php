<?php
/**
 * services.php — CRUD de órdenes de servicio con productos
 * GET    ?workshop_id=   → lista con cliente + productos
 * GET    ?id=            → servicio completo con imágenes
 * POST                   → crear { ..., service_products?: [] }
 * PUT    ?id=            → actualizar { ..., service_products?: [] }
 * DELETE ?id=            → eliminar
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id'] ?? null;

function fetch_service_full(PDO $conn, string $serviceId): ?array {
    $stmt = $conn->prepare('
        SELECT sv.*,
               c.id AS cust_id, c.name AS cust_name, c.phone AS cust_phone,
               c.email AS cust_email, c.address AS cust_address
        FROM   services sv
        LEFT JOIN customers c ON c.id = sv.customer_id
        WHERE  sv.id = ?
        LIMIT  1
    ');
    $stmt->execute([$serviceId]);
    $svc = $stmt->fetch();
    if (!$svc) return null;

    $svc['customer'] = $svc['cust_id'] ? [
        'id' => $svc['cust_id'], 'name' => $svc['cust_name'],
        'phone' => $svc['cust_phone'], 'email' => $svc['cust_email'],
        'address' => $svc['cust_address'],
    ] : null;
    foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email', 'cust_address'] as $k) unset($svc[$k]);

    // Productos del servicio
    $pStmt = $conn->prepare('
        SELECT sp.*, p.name AS p_name
        FROM   service_products sp
        LEFT JOIN products p ON p.id = sp.product_id
        WHERE  sp.service_id = ?
    ');
    $pStmt->execute([$serviceId]);
    $svc['service_products'] = $pStmt->fetchAll();

    // Imágenes
    $iStmt = $conn->prepare('SELECT * FROM service_images WHERE service_id = ? ORDER BY created_at');
    $iStmt->execute([$serviceId]);
    $svc['service_images'] = $iStmt->fetchAll();

    // Decode JSON fields
    if (isset($svc['custom_fields']) && is_string($svc['custom_fields'])) {
        $svc['custom_fields'] = json_decode($svc['custom_fields'], true) ?? [];
    }

    return $svc;
}

function upsert_service_products(PDO $conn, string $serviceId, array $items): void {
    $conn->prepare('DELETE FROM service_products WHERE service_id = ?')->execute([$serviceId]);
    foreach ($items as $item) {
        $conn->prepare('
            INSERT INTO service_products
                (id, service_id, product_id, product_name, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            make_uuid(), $serviceId,
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
            $svc = fetch_service_full($conn, $id);
            if (!$svc) Response::notFound('Servicio no encontrado');
            require_workshop_access($conn, $authUser['user_id'], $svc['workshop_id']);
            Response::success($svc);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT sv.*, c.name AS cust_name, c.phone AS cust_phone, c.address AS cust_address
            FROM   services sv
            LEFT JOIN customers c ON c.id = sv.customer_id
            WHERE  sv.workshop_id = ?
            ORDER  BY sv.created_at DESC
        ');
        $stmt->execute([$workshopId]);
        $services = $stmt->fetchAll();

        if (!empty($services)) {
            $sIds = array_column($services, 'id');
            $ph   = implode(',', array_fill(0, count($sIds), '?'));

            // Productos
            $pStmt = $conn->prepare("
                SELECT sp.*, p.name AS p_name
                FROM   service_products sp
                LEFT JOIN products p ON p.id = sp.product_id
                WHERE  sp.service_id IN ($ph)
            ");
            $pStmt->execute($sIds);
            $prodsMap = [];
            foreach ($pStmt->fetchAll() as $pr) {
                $prodsMap[$pr['service_id']][] = $pr;
            }

            // Imágenes
            $iStmt = $conn->prepare("
                SELECT * FROM service_images WHERE service_id IN ($ph) ORDER BY created_at
            ");
            $iStmt->execute($sIds);
            $imgsMap = [];
            foreach ($iStmt->fetchAll() as $img) {
                $imgsMap[$img['service_id']][] = $img;
            }

            foreach ($services as &$svc) {
                $svc['service_products'] = $prodsMap[$svc['id']] ?? [];
                $svc['service_images']   = $imgsMap[$svc['id']]  ?? [];
                $svc['customer'] = $svc['cust_name'] ? [
                    'name' => $svc['cust_name'], 'phone' => $svc['cust_phone'], 'address' => $svc['cust_address'],
                ] : null;
                unset($svc['cust_name'], $svc['cust_phone'], $svc['cust_address']);
                if (isset($svc['custom_fields']) && is_string($svc['custom_fields'])) {
                    $svc['custom_fields'] = json_decode($svc['custom_fields'], true) ?? [];
                }
            }
            unset($svc);
        }

        Response::success($services);
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        if (empty($data['service_number'])) Response::error('service_number es requerido');
        if (empty($data['description']))    Response::error('description es requerido');

        $newId       = make_uuid();
        $customFields = isset($data['custom_fields']) ? json_encode($data['custom_fields']) : json_encode([]);

        $conn->prepare('
            INSERT INTO services
                (id, workshop_id, service_number, customer_id, quote_id,
                 service_type, status, description, problem, location, address,
                 estimated_price, final_price, labor_cost, discount,
                 internal_notes, policies, custom_fields,
                 assigned_to, created_by,
                 started_at, completed_at, delivered_at,
                 has_warranty, warranty_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId, $workshopId,
            $data['service_number'],
            $data['customer_id']      ?? null,
            $data['quote_id']         ?? null,
            $data['service_type']     ?? 'residential',
            $data['status']           ?? 'pending',
            $data['description'],
            $data['problem']          ?? null,
            $data['location']         ?? null,
            $data['address']          ?? null,
            (float)($data['estimated_price'] ?? 0),
            isset($data['final_price']) ? (float)$data['final_price'] : null,
            (float)($data['labor_cost'] ?? 0),
            (float)($data['discount']   ?? 0),
            $data['internal_notes']   ?? null,
            $data['policies']         ?? null,
            $customFields,
            $data['assigned_to']      ?? null,
            $authUser['user_id'],
            $data['started_at']       ?? null,
            $data['completed_at']     ?? null,
            $data['delivered_at']     ?? null,
            (int)($data['has_warranty']  ?? 0),
            $data['warranty_days']    ?? null,
        ]);

        if (!empty($data['service_products'])) {
            upsert_service_products($conn, $newId, $data['service_products']);
        }

        // Actualizar stats del cliente
        if (!empty($data['customer_id'])) {
            $conn->prepare('UPDATE customers SET total_services = total_services + 1 WHERE id = ?')
                 ->execute([$data['customer_id']]);
        }

        Response::success(fetch_service_full($conn, $newId), 'Servicio creado');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM services WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Servicio no encontrado');
        require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);

        $allowed = [
            'customer_id', 'quote_id', 'service_type', 'status', 'description',
            'problem', 'location', 'address', 'estimated_price', 'final_price',
            'labor_cost', 'discount', 'internal_notes', 'policies',
            'assigned_to', 'started_at', 'completed_at', 'delivered_at',
            'has_warranty', 'warranty_days',
        ];
        $fields = [];
        $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (array_key_exists('custom_fields', $data)) {
            $fields[] = 'custom_fields = ?';
            $params[] = json_encode($data['custom_fields']);
        }
        if (!empty($fields)) {
            $params[] = $id;
            $conn->prepare('UPDATE services SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }

        if (array_key_exists('service_products', $data)) {
            upsert_service_products($conn, $id, $data['service_products']);
        }

        Response::success(fetch_service_full($conn, $id), 'Servicio actualizado');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id, customer_id FROM services WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Servicio no encontrado');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM services WHERE id = ?')->execute([$id]);

        if ($row['customer_id']) {
            $conn->prepare('
                UPDATE customers
                SET    total_services = GREATEST(0, total_services - 1)
                WHERE  id = ?
            ')->execute([$row['customer_id']]);
        }

        Response::success(null, 'Servicio eliminado');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
