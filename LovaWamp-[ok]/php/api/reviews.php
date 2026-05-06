<?php
/**
 * Reviews API
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
$productId = $_GET['product_id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($productId) {
                getReviewsByProduct($conn, $productId);
            } elseif ($id) {
                getReview($conn, $id);
            } else {
                getReviews($conn);
            }
            break;
            
        case 'POST':
            createReview($conn);
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de reseña requerido');
            }
            updateReview($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de reseña requerido');
            }
            deleteReview($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getReviews($conn) {
    $visibleOnly = isset($_GET['visible']) ? filter_var($_GET['visible'], FILTER_VALIDATE_BOOLEAN) : false;
    
    $sql = "SELECT r.*, p.name as product_name 
            FROM reviews r 
            LEFT JOIN products p ON r.product_id = p.id";
    
    if ($visibleOnly) {
        $sql .= " WHERE r.visible = 1";
    }
    
    $sql .= " ORDER BY r.created_at DESC";
    
    $stmt = $conn->query($sql);
    $reviews = $stmt->fetchAll();
    
    foreach ($reviews as &$review) {
        $review = transformReview($review);
    }
    
    Response::success($reviews);
}

function getReviewsByProduct($conn, $productId) {
    $visibleOnly = isset($_GET['visible']) ? filter_var($_GET['visible'], FILTER_VALIDATE_BOOLEAN) : true;
    
    $sql = "SELECT * FROM reviews WHERE product_id = ?";
    if ($visibleOnly) {
        $sql .= " AND visible = 1";
    }
    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$productId]);
    $reviews = $stmt->fetchAll();
    
    foreach ($reviews as &$review) {
        $review = transformReview($review);
    }
    
    Response::success($reviews);
}

function getReview($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM reviews WHERE id = ?");
    $stmt->execute([$id]);
    $review = $stmt->fetch();
    
    if (!$review) {
        Response::notFound('Reseña no encontrada');
    }
    
    Response::success(transformReview($review));
}

function createReview($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['productId']) || empty($data['customerName']) || !isset($data['rating'])) {
        Response::error('Datos incompletos');
    }
    
    $id = 'review-' . time();
    
    $stmt = $conn->prepare("
        INSERT INTO reviews (id, product_id, rating, comment, customer_name, visible)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $id,
        $data['productId'],
        $data['rating'],
        $data['comment'] ?? '',
        $data['customerName'],
        ($data['visible'] ?? true) ? 1 : 0
    ]);
    
    Response::success(['id' => $id], 'Reseña creada exitosamente');
}

function updateReview($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $fields = [];
    $params = [];
    
    $fieldMap = [
        'rating' => 'rating',
        'comment' => 'comment',
        'customerName' => 'customer_name',
        'visible' => 'visible'
    ];
    
    foreach ($fieldMap as $jsField => $dbField) {
        if (isset($data[$jsField])) {
            $fields[] = "$dbField = ?";
            $value = $data[$jsField];
            if ($jsField === 'visible') {
                $value = $value ? 1 : 0;
            }
            $params[] = $value;
        }
    }
    
    if (empty($fields)) {
        Response::error('No hay datos para actualizar');
    }
    
    $params[] = $id;
    $sql = "UPDATE reviews SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Reseña no encontrada');
    }
    
    Response::success(['id' => $id], 'Reseña actualizada exitosamente');
}

function deleteReview($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM reviews WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Reseña no encontrada');
    }
    
    Response::success(null, 'Reseña eliminada exitosamente');
}

function transformReview($review) {
    return [
        'id' => $review['id'],
        'productId' => $review['product_id'],
        'productName' => $review['product_name'] ?? null,
        'rating' => (int) $review['rating'],
        'comment' => $review['comment'],
        'customerName' => $review['customer_name'],
        'visible' => (bool) $review['visible'],
        'createdAt' => $review['created_at']
    ];
}