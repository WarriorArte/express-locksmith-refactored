<?php
/**
 * Categories API
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
                getCategory($conn, $id);
            } else {
                getCategories($conn);
            }
            break;
            
        case 'POST':
            createCategory($conn);
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de categoría requerido');
            }
            updateCategory($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de categoría requerido');
            }
            deleteCategory($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getCategories($conn) {
    $stmt = $conn->query("SELECT * FROM categories ORDER BY name");
    $categories = $stmt->fetchAll();
    
    // Transform to match frontend format
    foreach ($categories as &$cat) {
        $cat['productCount'] = (int) $cat['product_count'];
        unset($cat['product_count']);
    }
    
    Response::success($categories);
}

function getCategory($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM categories WHERE id = ?");
    $stmt->execute([$id]);
    $category = $stmt->fetch();
    
    if (!$category) {
        Response::notFound('Categoría no encontrada');
    }
    
    $category['productCount'] = (int) $category['product_count'];
    unset($category['product_count']);
    
    Response::success($category);
}

function createCategory($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['name'])) {
        Response::error('Nombre de categoría requerido');
    }
    
    $id = 'cat-' . time();
    
    $stmt = $conn->prepare("
        INSERT INTO categories (id, name, description, image)
        VALUES (?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $id,
        $data['name'],
        $data['description'] ?? '',
        $data['image'] ?? '/placeholder.svg'
    ]);
    
    Response::success(['id' => $id], 'Categoría creada exitosamente');
}

function updateCategory($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $checkStmt = $conn->prepare("SELECT id FROM categories WHERE id = ?");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        Response::notFound('Categoría no encontrada');
    }
    
    $fields = [];
    $params = [];
    
    $allowedFields = ['name', 'description', 'image'];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    
    if (!empty($fields)) {
        $params[] = $id;
        $sql = "UPDATE categories SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
    }
    
    Response::success(['id' => $id], 'Categoría actualizada exitosamente');
}

function deleteCategory($conn, $id) {
    // Check for products in this category
    $checkStmt = $conn->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?");
    $checkStmt->execute([$id]);
    $count = $checkStmt->fetchColumn();
    
    if ($count > 0) {
        Response::error('No se puede eliminar una categoría con productos');
    }
    
    $stmt = $conn->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Categoría no encontrada');
    }
    
    Response::success(null, 'Categoría eliminada exitosamente');
}