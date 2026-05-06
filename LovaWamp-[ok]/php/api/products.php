<?php
/**
 * Products API
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getProduct($conn, $id);
            } else {
                getProducts($conn);
            }
            break;
            
        case 'POST':
            createProduct($conn);
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de producto requerido');
            }
            updateProduct($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de producto requerido');
            }
            deleteProduct($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getProducts($conn) {
    $categoryId = $_GET['category_id'] ?? null;
    $featured = isset($_GET['featured']) ? filter_var($_GET['featured'], FILTER_VALIDATE_BOOLEAN) : null;
    $search = $_GET['search'] ?? null;
    $status = $_GET['status'] ?? null;
    
    $sql = "SELECT p.*, c.name as category_name,
            (SELECT GROUP_CONCAT(image_url ORDER BY sort_order) 
             FROM product_images WHERE product_id = p.id) as images
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1";
    
    $params = [];
    
    if ($categoryId) {
        $sql .= " AND p.category_id = ?";
        $params[] = $categoryId;
    }
    
    if ($featured !== null) {
        $sql .= " AND p.featured = ?";
        $params[] = $featured ? 1 : 0;
    }
    
    if ($status) {
        $sql .= " AND p.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $sql .= " AND (p.name LIKE ? OR p.description LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $sql .= " ORDER BY p.created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();
    
    // Parse images string to array
    foreach ($products as &$product) {
        $product['images'] = $product['images'] ? explode(',', $product['images']) : ['/placeholder.svg'];
        $product['featured'] = (bool) $product['featured'];
    }
    
    Response::success($products);
}

function getProduct($conn, $id) {
    $stmt = $conn->prepare("
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    
    if (!$product) {
        Response::notFound('Producto no encontrado');
    }
    
    // Get images
    $imgStmt = $conn->prepare("SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order");
    $imgStmt->execute([$id]);
    $images = $imgStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $product['images'] = $images ?: ['/placeholder.svg'];
    $product['featured'] = (bool) $product['featured'];
    
    Response::success($product);
}

function createProduct($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['name'])) {
        Response::error('Nombre del producto requerido');
    }
    
    $id = 'prod-' . time();
    
    $stmt = $conn->prepare("
        INSERT INTO products (id, name, description, price, category_id, stock, status, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $id,
        $data['name'],
        $data['description'] ?? '',
        $data['price'] ?? 0,
        $data['categoryId'] ?? null,
        $data['stock'] ?? 0,
        $data['status'] ?? 'active',
        ($data['featured'] ?? false) ? 1 : 0
    ]);
    
    // Save images
    if (!empty($data['images'])) {
        saveProductImages($conn, $id, $data['images']);
    }
    
    Response::success(['id' => $id], 'Producto creado exitosamente');
}

function updateProduct($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if product exists
    $checkStmt = $conn->prepare("SELECT id FROM products WHERE id = ?");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        Response::notFound('Producto no encontrado');
    }
    
    $fields = [];
    $params = [];
    
    $allowedFields = [
        'name' => 'name',
        'description' => 'description',
        'price' => 'price',
        'categoryId' => 'category_id',
        'stock' => 'stock',
        'status' => 'status',
        'featured' => 'featured'
    ];
    
    foreach ($allowedFields as $jsField => $dbField) {
        if (isset($data[$jsField])) {
            $fields[] = "$dbField = ?";
            $value = $data[$jsField];
            if ($jsField === 'featured') {
                $value = $value ? 1 : 0;
            }
            $params[] = $value;
        }
    }
    
    if (!empty($fields)) {
        $params[] = $id;
        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
    }
    
    // Update images if provided
    if (isset($data['images'])) {
        $conn->prepare("DELETE FROM product_images WHERE product_id = ?")->execute([$id]);
        saveProductImages($conn, $id, $data['images']);
    }
    
    Response::success(['id' => $id], 'Producto actualizado exitosamente');
}

function deleteProduct($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Producto no encontrado');
    }
    
    Response::success(null, 'Producto eliminado exitosamente');
}

function saveProductImages($conn, $productId, $images) {
    $stmt = $conn->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
    foreach ($images as $index => $url) {
        $stmt->execute([$productId, $url, $index]);
    }
}