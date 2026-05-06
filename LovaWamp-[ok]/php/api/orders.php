<?php
/**
 * Orders API
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Mailer.php';
require_once __DIR__ . '/helpers/EmailTemplates.php';

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
                getOrder($conn, $id);
            } else {
                getOrders($conn);
            }
            break;
            
        case 'POST':
            createOrder($conn);
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de pedido requerido');
            }
            updateOrderStatus($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de pedido requerido');
            }
            deleteOrder($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getOrders($conn) {
    $status = $_GET['status'] ?? null;
    $q = trim($_GET['q'] ?? '');
    
    $sql = "SELECT o.*, 
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'productId', oi.product_id,
                    'productName', oi.product_name,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unit_price,
                    'total', oi.total
                )
            ) FROM order_items oi WHERE oi.order_id = o.id) as items,
            (SELECT rt.token FROM review_tokens rt WHERE rt.order_id = o.id LIMIT 1) as review_token
            FROM orders o
            WHERE 1=1";
    
    $params = [];
    
    if ($status) {
        $sql .= " AND o.status = ?";
        $params[] = $status;
    }

    if ($q !== '') {
        $sql .= " AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)";
        $like = "%{$q}%";
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    
    $sql .= " ORDER BY o.created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();
    
    // Transform to frontend format
    foreach ($orders as &$order) {
        $order['orderNumber'] = $order['order_number'];
        $order['customer'] = [
            'name' => $order['customer_name'],
            'phone' => $order['customer_phone'],
            'email' => $order['customer_email'],
            'address' => $order['customer_address'],
            'notes' => $order['customer_notes']
        ];
        $order['discountCode'] = $order['discount_code'];
        $order['shippingOption'] = $order['shipping_option'];
        $order['createdAt'] = $order['created_at'];
        $order['updatedAt'] = $order['updated_at'];
        $order['items'] = $order['items'] ? json_decode($order['items'], true) : [];
        if (!empty($order['review_token'])) {
            $order['reviewToken'] = $order['review_token'];
        }
        
        // Clean up
          unset($order['order_number'], $order['customer_name'], $order['customer_phone'],
              $order['customer_email'], $order['customer_address'], $order['customer_notes'], $order['discount_code'],
              $order['shipping_option'], $order['created_at'], $order['updated_at'], $order['review_token']);
    }
    
    Response::success($orders);
}

function getOrder($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->execute([$id]);
    $order = $stmt->fetch();
    
    if (!$order) {
        Response::notFound('Pedido no encontrado');
    }
    
    // Get items
    $itemsStmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = ?");
    $itemsStmt->execute([$id]);
    $items = $itemsStmt->fetchAll();
    
    // Transform items
    foreach ($items as &$item) {
        $item['productId'] = $item['product_id'];
        $item['productName'] = $item['product_name'];
        $item['unitPrice'] = (float) $item['unit_price'];
        unset($item['product_id'], $item['product_name'], $item['unit_price'], $item['order_id']);
    }
    
    // Transform order
    $order['orderNumber'] = $order['order_number'];
    $order['customer'] = [
        'name' => $order['customer_name'],
        'phone' => $order['customer_phone'],
        'email' => $order['customer_email'],
        'address' => $order['customer_address'],
        'notes' => $order['customer_notes']
    ];
    $order['discountCode'] = $order['discount_code'];
    $order['shippingOption'] = $order['shipping_option'];
    $order['createdAt'] = $order['created_at'];
    $order['updatedAt'] = $order['updated_at'];
    $order['items'] = $items;
    
        unset($order['order_number'], $order['customer_name'], $order['customer_phone'],
            $order['customer_email'], $order['customer_address'], $order['customer_notes'], $order['discount_code'],
          $order['shipping_option'], $order['created_at'], $order['updated_at']);
    
    Response::success($order);
}

function createOrder($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['customer']) || empty($data['items'])) {
        Response::error('Datos de pedido incompletos');
    }

    if (empty($data['customer']['email'])) {
        Response::error('Correo electrónico requerido');
    }
    
    $conn->beginTransaction();
    
    try {
        // Generate order number
        $orderNumber = generateOrderNumber($conn);
        $id = 'order-' . time();
        
        // Insert order
        $stmt = $conn->prepare("
            INSERT INTO orders (
                id, order_number, customer_name, customer_phone, customer_email, customer_address,
                customer_notes, subtotal, discount, discount_code, shipping,
                shipping_option, total, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
        ");
        
        $stmt->execute([
            $id,
            $orderNumber,
            $data['customer']['name'],
            $data['customer']['phone'] ?? '',
            $data['customer']['email'] ?? '',
            $data['customer']['address'] ?? '',
            $data['customer']['notes'] ?? '',
            $data['subtotal'] ?? 0,
            $data['discount'] ?? 0,
            $data['discountCode'] ?? null,
            $data['shipping'] ?? 0,
            $data['shippingOption'] ?? '',
            $data['total'] ?? 0
        ]);
        
        // Insert items and update stock
        $itemStmt = $conn->prepare("
            INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stockStmt = $conn->prepare("CALL decrease_stock(?, ?)");
        
        foreach ($data['items'] as $item) {
            $itemStmt->execute([
                $id,
                $item['productId'],
                $item['productName'],
                $item['quantity'],
                $item['unitPrice'],
                $item['total']
            ]);
            
            $stockStmt->execute([$item['productId'], $item['quantity']]);
        }
        
        // Increment discount usage if applied
        if (!empty($data['discountCode'])) {
            $discountStmt = $conn->prepare("
                UPDATE discount_codes SET usage_count = usage_count + 1 
                WHERE code = ?
            ");
            $discountStmt->execute([$data['discountCode']]);
        }
        
        $conn->commit();
        
        // Send email notifications (non-blocking)
        try {
            $emailSettings = Mailer::getSettings($conn);
            if ($emailSettings && $emailSettings['enabled']) {
                $orderData = [
                    'order_number' => $orderNumber,
                    'customer_name' => $data['customer']['name'],
                    'customer_email' => $data['customer']['email'] ?? '',
                    'customer_phone' => $data['customer']['phone'] ?? '',
                    'total' => $data['total'] ?? 0,
                ];
                
                // Customer confirmation
                if ($emailSettings['notify_new_order_customer'] && !empty($data['customer']['email'])) {
                    $html = EmailTemplates::orderConfirmation($conn, $orderData, $data['items']);
                    Mailer::send($conn, $data['customer']['email'], "Pedido {$orderNumber} confirmado", $html);
                }
                
                // Admin notification
                if ($emailSettings['notify_new_order_admin'] && !empty($emailSettings['admin_email'])) {
                    $html = EmailTemplates::newOrderAdmin($conn, $orderData, $data['items']);
                    Mailer::send($conn, $emailSettings['admin_email'], "🛒 Nuevo pedido {$orderNumber}", $html);
                }
            }
        } catch (Exception $emailErr) {
            error_log("Email send error: " . $emailErr->getMessage());
        }
        
        Response::success([
            'id' => $id,
            'orderNumber' => $orderNumber
        ], 'Pedido creado exitosamente');
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
}

function updateOrderStatus($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['status'])) {
        Response::error('Estado requerido');
    }
    
    $validStatuses = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!in_array($data['status'], $validStatuses)) {
        Response::error('Estado no válido');
    }
    
    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->execute([$data['status'], $id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Pedido no encontrado');
    }
    
    $reviewToken = null;
    
    // Generate review token when order is marked as delivered
    if ($data['status'] === 'delivered') {
        $reviewToken = generateReviewToken($conn, $id);
    }
    
    // Send email notifications
    try {
        $emailSettings = Mailer::getSettings($conn);
        if ($emailSettings && $emailSettings['enabled']) {
            // Get order details for email
            $orderStmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
            $orderStmt->execute([$id]);
            $order = $orderStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($order) {
                $customerEmail = $order['customer_email'];
                
                // Status change notification to customer
                if ($emailSettings['notify_status_change'] && !empty($customerEmail)) {
                    $html = EmailTemplates::statusChange($conn, $order, $data['status']);
                    Mailer::send($conn, $customerEmail, "Pedido {$order['order_number']} - Actualización", $html);
                }
                
                // Review link on delivery
                if ($data['status'] === 'delivered' && $emailSettings['notify_review_link'] && !empty($customerEmail) && $reviewToken) {
                    $siteUrl = rtrim($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_HOST'] ?? '', '/');
                    $reviewUrl = "{$siteUrl}/review/{$reviewToken}";
                    $html = EmailTemplates::reviewLink($conn, $order, $reviewUrl);
                    Mailer::send($conn, $customerEmail, "⭐ Califica tu pedido {$order['order_number']}", $html);
                }
            }
        }
    } catch (Exception $emailErr) {
        error_log("Email send error on status change: " . $emailErr->getMessage());
    }
    
    $responseData = ['id' => $id];
    if ($reviewToken) {
        $responseData['reviewToken'] = $reviewToken;
    }
    
    Response::success($responseData, 'Estado actualizado exitosamente');
}

function generateReviewToken($conn, $orderId) {
    try {
        // Check if token already exists for this order
        $checkStmt = $conn->prepare("SELECT token FROM review_tokens WHERE order_id = ?");
        $checkStmt->execute([$orderId]);
        $existing = $checkStmt->fetch();
        if ($existing) {
            return $existing['token'];
        }
        
        $tokenId = 'rt-' . time() . '-' . bin2hex(random_bytes(4));
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $stmt = $conn->prepare("
            INSERT INTO review_tokens (id, order_id, token, expires_at)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$tokenId, $orderId, $token, $expiresAt]);
        
        // Pre-populate review_token_items for each product in the order
        $itemsStmt = $conn->prepare("SELECT product_id FROM order_items WHERE order_id = ?");
        $itemsStmt->execute([$orderId]);
        $items = $itemsStmt->fetchAll();
        
        if (empty($items)) {
            // No items in order, still return token but no items to review
            return $token;
        }
        
        $insertItem = $conn->prepare("INSERT INTO review_token_items (token_id, product_id) VALUES (?, ?)");
        foreach ($items as $item) {
            $insertItem->execute([$tokenId, $item['product_id']]);
        }
        
        return $token;
    } catch (Exception $e) {
        error_log("Error generating review token for order $orderId: " . $e->getMessage());
        return null;
    }
}

function deleteOrder($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM orders WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Pedido no encontrado');
    }
    
    Response::success(null, 'Pedido eliminado exitosamente');
}

function generateOrderNumber($conn) {
    $stmt = $conn->prepare("CALL generate_order_number(@order_num)");
    $stmt->execute();
    
    $result = $conn->query("SELECT @order_num as order_num")->fetch();
    return $result['order_num'];
}