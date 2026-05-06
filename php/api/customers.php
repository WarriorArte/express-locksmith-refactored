<?php
/**
 * customers.php — CRUD de clientes
 * GET    ?workshop_id=   → lista
 * GET    ?id=            → individual
 * POST                   → crear
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

/** Campos editables */
const CUSTOMER_FIELDS = [
    'name', 'customer_type', 'phone', 'phone_secondary', 'email', 'address', 'notes',
    'is_vip', 'is_frequent', 'is_normal', 'has_debt', 'no_work_again', 'no_work_reason',
];

try {

    if ($method === 'GET') {
        if ($id) {
            $stmt = $conn->prepare('SELECT * FROM customers WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Cliente no encontrado');
            // Validar que el usuario tenga acceso al taller del cliente (evita IDOR cross-tenant)
            require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);
            Response::success($row);
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $stmt = $conn->prepare('
            SELECT * FROM customers
            WHERE  workshop_id = ?
            ORDER  BY created_at DESC
        ');
        $stmt->execute([$workshopId]);
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        if (empty($data['name'])) Response::error('El campo name es requerido');

        $newId = make_uuid();
        $conn->prepare('
            INSERT INTO customers
                (id, workshop_id, name, customer_type, phone, phone_secondary, email,
                 address, notes, is_vip, is_frequent, is_normal, has_debt, no_work_again, no_work_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId,
            $workshopId,
            $data['name'],
            $data['customer_type']   ?? 'person',
            $data['phone']           ?? null,
            $data['phone_secondary'] ?? null,
            $data['email']           ?? null,
            $data['address']         ?? null,
            $data['notes']           ?? null,
            (int)($data['is_vip']       ?? 0),
            (int)($data['is_frequent']  ?? 0),
            (int)($data['is_normal']    ?? 0),
            (int)($data['has_debt']     ?? 0),
            (int)($data['no_work_again'] ?? 0),
            $data['no_work_reason'] ?? null,
        ]);

        $stmt = $conn->prepare('SELECT * FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success($stmt->fetch(), 'Cliente creado');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Cliente no encontrado');
        require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);

        $fields = [];
        $params = [];
        foreach (CUSTOMER_FIELDS as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) Response::error('No hay campos para actualizar');

        $params[] = $id;
        $conn->prepare('UPDATE customers SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

        $stmt = $conn->prepare('SELECT * FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success($stmt->fetch(), 'Cliente actualizado');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Cliente no encontrado');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $conn->prepare('DELETE FROM customers WHERE id = ?')->execute([$id]);
        Response::success(null, 'Cliente eliminado');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
