<?php
/**
 * inventory-movements.php — Movimientos de inventario
 * GET  ?workshop_id=         → lista de movimientos (con filtros opcionales ?product_id=)
 * POST                       → crear movimiento y actualizar stock del producto
 *                              { workshop_id, product_id, quantity, movement_type,
 *                                from_location?, to_location?, reference_type?,
 *                                reference_id?, notes? }
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();

// Tipos de movimiento válidos
const MOVEMENT_TYPES = ['sale', 'service', 'adjustment', 'purchase', 'return', 'transfer'];

try {

    if ($method === 'GET') {
        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $productId = $_GET['product_id'] ?? null;

        if ($productId) {
            $stmt = $conn->prepare('
                SELECT im.*, p.name AS product_name
                FROM   inventory_movements im
                JOIN   products p ON p.id = im.product_id
                WHERE  im.workshop_id = ? AND im.product_id = ?
                ORDER  BY im.created_at DESC
            ');
            $stmt->execute([$workshopId, $productId]);
        } else {
            $stmt = $conn->prepare('
                SELECT im.*, p.name AS product_name
                FROM   inventory_movements im
                JOIN   products p ON p.id = im.product_id
                WHERE  im.workshop_id = ?
                ORDER  BY im.created_at DESC
                LIMIT  500
            ');
            $stmt->execute([$workshopId]);
        }

        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        if (empty($data['product_id']))     Response::error('product_id es requerido');
        if (!isset($data['quantity']))      Response::error('quantity es requerido');
        if (empty($data['movement_type']))  Response::error('movement_type es requerido');

        $movType = $data['movement_type'];
        if (!in_array($movType, MOVEMENT_TYPES, true)) {
            Response::error('movement_type invalido. Valores: ' . implode(', ', MOVEMENT_TYPES));
        }

        $productId = $data['product_id'];
        $quantity  = (int)$data['quantity'];
        $from      = $data['from_location'] ?? null;
        $to        = $data['to_location']   ?? null;

        // Obtener stock actual
        $pStmt = $conn->prepare('SELECT stock_store, stock_warehouse FROM products WHERE id = ? AND workshop_id = ? LIMIT 1');
        $pStmt->execute([$productId, $workshopId]);
        $product = $pStmt->fetch();
        if (!$product) Response::notFound('Producto no encontrado en este taller');

        $stockStore     = (int)$product['stock_store'];
        $stockWarehouse = (int)$product['stock_warehouse'];

        // Calcular nuevo stock según tipo de movimiento
        switch ($movType) {
            case 'sale':
            case 'service':
                $stockStore = max(0, $stockStore - $quantity);
                break;
            case 'purchase':
                if ($to === 'warehouse') {
                    $stockWarehouse += $quantity;
                } else {
                    $stockStore += $quantity;
                }
                break;
            case 'return':
                if ($from === 'warehouse') {
                    $stockWarehouse = max(0, $stockWarehouse - $quantity);
                } else {
                    $stockStore += $quantity;
                }
                break;
            case 'transfer':
                if ($from === 'warehouse' && $to === 'store') {
                    $stockWarehouse = max(0, $stockWarehouse - $quantity);
                    $stockStore    += $quantity;
                } elseif ($from === 'store' && $to === 'warehouse') {
                    $stockStore     = max(0, $stockStore - $quantity);
                    $stockWarehouse += $quantity;
                }
                break;
            case 'adjustment':
                // Ajuste manual: quantity puede ser negativo
                if ($to === 'warehouse') {
                    $stockWarehouse = max(0, $stockWarehouse + $quantity);
                } else {
                    $stockStore = max(0, $stockStore + $quantity);
                }
                break;
        }

        $conn->beginTransaction();
        try {
            // Registrar movimiento
            $newId = make_uuid();
            $conn->prepare('
                INSERT INTO inventory_movements
                    (id, workshop_id, product_id, movement_type,
                     from_location, to_location, quantity,
                     reference_type, reference_id, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ')->execute([
                $newId, $workshopId, $productId, $movType,
                $from, $to, $quantity,
                $data['reference_type'] ?? null,
                $data['reference_id']   ?? null,
                $data['notes']          ?? null,
                $authUser['user_id'],
            ]);

            // Actualizar stock del producto
            $conn->prepare('UPDATE products SET stock_store = ?, stock_warehouse = ? WHERE id = ?')
                 ->execute([$stockStore, $stockWarehouse, $productId]);

            $conn->commit();
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }

        $stmt = $conn->prepare('SELECT im.*, p.name AS product_name FROM inventory_movements im JOIN products p ON p.id = im.product_id WHERE im.id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success([
            'movement'       => $stmt->fetch(),
            'stock_store'    => $stockStore,
            'stock_warehouse' => $stockWarehouse,
        ], 'Movimiento registrado y stock actualizado');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
