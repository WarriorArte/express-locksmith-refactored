<?php
/**
 * Review Tokens API
 * Public endpoint for token-based post-purchase reviews (no auth required)
 * 
 * GET    ?token=xxx           → Get order info + products to review
 * POST   ?token=xxx           → Submit a review for a product
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$token = $_GET['token'] ?? null;

if (!$token) {
    Response::error('Token requerido', 400);
}

try {
    switch ($method) {
        case 'GET':
            getTokenInfo($conn, $token);
            break;
        case 'POST':
            submitReview($conn, $token);
            break;
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getTokenInfo($conn, $token) {
    // Fetch token with order data
    $stmt = $conn->prepare("
        SELECT rt.*, o.order_number, o.customer_name, o.created_at as order_date
        FROM review_tokens rt
        JOIN orders o ON rt.order_id = o.id
        WHERE rt.token = ?
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch();

    if (!$tokenData) {
        Response::error('Token inválido o no encontrado', 404);
    }

    // Check expiry
    if (strtotime($tokenData['expires_at']) < time()) {
        Response::error('Este enlace de calificación ha expirado', 410);
    }

    // Get order items with review status
    $itemsStmt = $conn->prepare("
        SELECT oi.product_id, oi.product_name, oi.quantity, oi.unit_price,
               rti.reviewed,
               (SELECT pi.image_url FROM product_images pi 
                WHERE pi.product_id = oi.product_id 
                ORDER BY pi.sort_order ASC LIMIT 1) as product_image
        FROM order_items oi
        LEFT JOIN review_token_items rti ON rti.token_id = ? AND rti.product_id = oi.product_id
        WHERE oi.order_id = ?
    ");
    $itemsStmt->execute([$tokenData['id'], $tokenData['order_id']]);
    $items = $itemsStmt->fetchAll();

    $products = [];
    foreach ($items as $item) {
        $products[] = [
            'productId' => $item['product_id'],
            'productName' => $item['product_name'],
            'quantity' => (int)$item['quantity'],
            'unitPrice' => (float)$item['unit_price'],
            'reviewed' => (bool)$item['reviewed'],
            'image' => $item['product_image'] ?? null,
        ];
    }

    $allReviewed = count(array_filter($products, fn($p) => !$p['reviewed'])) === 0;

    Response::success([
        'orderNumber' => $tokenData['order_number'],
        'customerName' => $tokenData['customer_name'],
        'orderDate' => $tokenData['order_date'],
        'expiresAt' => $tokenData['expires_at'],
        'allReviewed' => $allReviewed,
        'products' => $products,
    ]);
}

function submitReview($conn, $token) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || empty($data['productId']) || !isset($data['rating'])) {
        Response::error('Datos incompletos: productId y rating son requeridos');
    }

    $rating = (int)$data['rating'];
    if ($rating < 1 || $rating > 5) {
        Response::error('La calificación debe estar entre 1 y 5');
    }

    // Validate token
    $stmt = $conn->prepare("
        SELECT rt.*, o.customer_name
        FROM review_tokens rt
        JOIN orders o ON rt.order_id = o.id
        WHERE rt.token = ?
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch();

    if (!$tokenData) {
        Response::error('Token inválido', 404);
    }

    if (strtotime($tokenData['expires_at']) < time()) {
        Response::error('Este enlace ha expirado', 410);
    }

    // Verify product belongs to the order
    $itemStmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = ? AND product_id = ?");
    $itemStmt->execute([$tokenData['order_id'], $data['productId']]);
    if (!$itemStmt->fetch()) {
        Response::error('Este producto no pertenece a este pedido');
    }

    // Check if already reviewed via this token
    $checkStmt = $conn->prepare("SELECT reviewed FROM review_token_items WHERE token_id = ? AND product_id = ?");
    $checkStmt->execute([$tokenData['id'], $data['productId']]);
    $existing = $checkStmt->fetch();
    if ($existing && $existing['reviewed']) {
        Response::error('Ya calificaste este producto');
    }

    $conn->beginTransaction();
    try {
        // Create the review (visible by default since it's a verified purchase)
        $reviewId = 'review-' . time() . '-' . bin2hex(random_bytes(4));
        $comment = trim($data['comment'] ?? '');
        $customerName = $tokenData['customer_name'];

        $reviewStmt = $conn->prepare("
            INSERT INTO reviews (id, product_id, rating, comment, customer_name, visible)
            VALUES (?, ?, ?, ?, ?, 1)
        ");
        $reviewStmt->execute([
            $reviewId,
            $data['productId'],
            $rating,
            $comment,
            $customerName,
        ]);

        // Mark product as reviewed in token items
        if ($existing) {
            $updateStmt = $conn->prepare("UPDATE review_token_items SET reviewed = 1, reviewed_at = NOW() WHERE token_id = ? AND product_id = ?");
            $updateStmt->execute([$tokenData['id'], $data['productId']]);
        } else {
            $insertStmt = $conn->prepare("INSERT INTO review_token_items (token_id, product_id, reviewed, reviewed_at) VALUES (?, ?, 1, NOW())");
            $insertStmt->execute([$tokenData['id'], $data['productId']]);
        }

        // Check if all items are now reviewed → mark token as used
        $pendingStmt = $conn->prepare("
            SELECT COUNT(*) as pending FROM order_items oi
            LEFT JOIN review_token_items rti ON rti.token_id = ? AND rti.product_id = oi.product_id AND rti.reviewed = 1
            WHERE oi.order_id = ? AND rti.id IS NULL
        ");
        $pendingStmt->execute([$tokenData['id'], $tokenData['order_id']]);
        $pending = $pendingStmt->fetch();

        if ((int)$pending['pending'] === 0) {
            $markUsed = $conn->prepare("UPDATE review_tokens SET used = 1 WHERE id = ?");
            $markUsed->execute([$tokenData['id']]);
        }

        $conn->commit();

        Response::success([
            'reviewId' => $reviewId,
            'message' => '¡Gracias por tu calificación!'
        ]);
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
}
