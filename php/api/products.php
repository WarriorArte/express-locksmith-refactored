<?php
/**
 * products.php — CRUD de productos con categoría y etiquetas
 * GET    ?workshop_id=   → lista con categoría + tags
 * GET    ?id=            → producto individual con categoría + tags
 * POST                   → crear { workshop_id, name, ... , tag_ids?: [] }
 * PUT    ?id=            → actualizar { ..., tag_ids?: [] }
 * DELETE ?id=            → eliminar (soft: is_active = 0)
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();
$id       = $_GET['id'] ?? null;

/** Adjunta categoría y tags a cada producto */
function enrich_product(PDO $conn, array $product): array {
    // Categoría
    if ($product['category_id']) {
        $stmt = $conn->prepare('SELECT id, name, color FROM categories WHERE id = ? LIMIT 1');
        $stmt->execute([$product['category_id']]);
        $product['category'] = $stmt->fetch() ?: null;
    } else {
        $product['category'] = null;
    }

    // Tags
    $stmt = $conn->prepare('
        SELECT pt.tag_id, t.id, t.name, t.color
        FROM   product_tags pt
        JOIN   tags t ON t.id = pt.tag_id
        WHERE  pt.product_id = ?
    ');
    $stmt->execute([$product['id']]);
    $product['product_tags'] = $stmt->fetchAll();

    return $product;
}

/** Sincroniza la tabla product_tags para un producto */
function sync_product_tags(PDO $conn, string $productId, array $tagIds): void {
    $conn->prepare('DELETE FROM product_tags WHERE product_id = ?')->execute([$productId]);
    foreach ($tagIds as $tagId) {
        $conn->prepare('INSERT IGNORE INTO product_tags (id, product_id, tag_id) VALUES (?, ?, ?)')
             ->execute([make_uuid(), $productId, $tagId]);
    }
}

try {

    if ($method === 'GET') {
        if ($id) {
            $stmt = $conn->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) Response::notFound('Producto no encontrado');
            require_workshop_access($conn, $authUser['user_id'], $row['workshop_id']);
            Response::success(enrich_product($conn, $row));
        }

        $workshopId = get_workshop_id_param();
        require_workshop_access($conn, $authUser['user_id'], $workshopId);

        $includeInactive = ($_GET['include_inactive'] ?? '0') === '1';
        $activeFilter    = $includeInactive ? '' : 'AND p.is_active = 1';

        $stmt = $conn->prepare("
            SELECT p.*, c.name AS category_name, c.color AS category_color
            FROM   products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE  p.workshop_id = ?
            $activeFilter
            ORDER  BY p.created_at DESC
        ");
        $stmt->execute([$workshopId]);
        $products = $stmt->fetchAll();

        // Tags en un solo query para todos los productos
        if (!empty($products)) {
            $ids       = array_column($products, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $tStmt = $conn->prepare("
                SELECT pt.product_id, pt.tag_id, t.name AS tag_name, t.color AS tag_color
                FROM   product_tags pt
                JOIN   tags t ON t.id = pt.tag_id
                WHERE  pt.product_id IN ($placeholders)
            ");
            $tStmt->execute($ids);
            $tagsByProduct = [];
            foreach ($tStmt->fetchAll() as $tRow) {
                $tagsByProduct[$tRow['product_id']][] = $tRow;
            }
            foreach ($products as &$p) {
                $p['product_tags'] = $tagsByProduct[$p['id']] ?? [];
            }
            unset($p);
        }

        Response::success($products);
    }

    if ($method === 'POST') {
        $data       = get_json_input();
        $workshopId = get_workshop_id_param($data);
        require_workshop_admin($conn, $authUser['user_id'], $workshopId);

        if (empty($data['name'])) Response::error('El campo name es requerido');

        $newId   = make_uuid();
        $tagIds  = $data['tag_ids'] ?? [];

        $conn->prepare('
            INSERT INTO products
                (id, workshop_id, category_id, name, description, instructions, notes,
                 image_url, stock_store, stock_warehouse, min_stock,
                 purchase_price_imported, purchase_price_local,
                 sale_price_min, sale_price_max, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $newId,
            $workshopId,
            $data['category_id']             ?? null,
            $data['name'],
            $data['description']             ?? null,
            $data['instructions']            ?? null,
            $data['notes']                   ?? null,
            $data['image_url']               ?? null,
            (int)($data['stock_store']       ?? 0),
            (int)($data['stock_warehouse']   ?? 0),
            (int)($data['min_stock']         ?? 5),
            $data['purchase_price_imported'] ?? null,
            $data['purchase_price_local']    ?? 0,
            $data['sale_price_min']          ?? 0,
            $data['sale_price_max']          ?? 0,
            isset($data['is_active']) ? (int)$data['is_active'] : 1,
        ]);

        if (!empty($tagIds)) sync_product_tags($conn, $newId, $tagIds);

        $stmt = $conn->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
        $stmt->execute([$newId]);
        Response::success(enrich_product($conn, $stmt->fetch()), 'Producto creado');
    }

    if ($method === 'PUT') {
        if (!$id) Response::error('ID requerido');
        $data = get_json_input();

        $stmt = $conn->prepare('SELECT workshop_id FROM products WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Producto no encontrado');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        $allowed = [
            'category_id', 'name', 'description', 'instructions', 'notes', 'image_url',
            'stock_store', 'stock_warehouse', 'min_stock',
            'purchase_price_imported', 'purchase_price_local',
            'sale_price_min', 'sale_price_max', 'is_active',
        ];
        $fields = [];
        $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (!empty($fields)) {
            $params[] = $id;
            $conn->prepare('UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }

        if (array_key_exists('tag_ids', $data)) {
            sync_product_tags($conn, $id, $data['tag_ids']);
        }

        $stmt = $conn->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::success(enrich_product($conn, $stmt->fetch()), 'Producto actualizado');
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('ID requerido');
        $stmt = $conn->prepare('SELECT workshop_id FROM products WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::notFound('Producto no encontrado');
        require_workshop_admin($conn, $authUser['user_id'], $row['workshop_id']);

        // Soft delete — preservar historial en ventas/servicios
        $conn->prepare('UPDATE products SET is_active = 0 WHERE id = ?')->execute([$id]);
        Response::success(null, 'Producto desactivado');
    }

    Response::error('Metodo no permitido', 405);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
