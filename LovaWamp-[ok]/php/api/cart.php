<?php
/**
 * Cart API (session-based)
 * Endpoints: GET, POST, PUT, DELETE
 * Actions:
 * - GET: returns cart summary
 * - POST action=add|apply-discount|set-shipping
 * - PUT action=update|remove-discount
 * - DELETE action=remove|clear
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

session_start();

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            Response::success(buildCart($conn));
            break;
        case 'POST':
            if ($action === 'add') {
                addToCart($conn);
            } elseif ($action === 'apply-discount') {
                applyDiscount($conn);
            } elseif ($action === 'set-shipping') {
                setShipping($conn);
            } else {
                Response::error('Accion no valida');
            }
            break;
        case 'PUT':
            if ($action === 'update') {
                updateQuantity($conn);
            } elseif ($action === 'remove-discount') {
                removeDiscount($conn);
            } else {
                Response::error('Accion no valida');
            }
            break;
        case 'DELETE':
            if ($action === 'remove') {
                removeItem($conn);
            } elseif ($action === 'clear') {
                clearCart($conn);
            } else {
                Response::error('Accion no valida');
            }
            break;
        default:
            Response::error('Metodo no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getSessionCart() {
    if (!isset($_SESSION['cart'])) {
        $_SESSION['cart'] = [
            'items' => [],
            'discountCode' => null,
            'shippingId' => null,
        ];
    }
    return $_SESSION['cart'];
}

function saveSessionCart($cart) {
    $_SESSION['cart'] = $cart;
}

function buildCart($conn) {
    $cart = getSessionCart();
    $items = [];
    $subtotal = 0;

    foreach ($cart['items'] as $item) {
        $product = getProductById($conn, $item['productId']);
        if (!$product || $product['status'] !== 'active') {
            continue;
        }
        $quantity = min($item['quantity'], (int) $product['stock']);
        $lineTotal = $product['price'] * $quantity;
        $subtotal += $lineTotal;
        $items[] = [
            'productId' => $item['productId'],
            'quantity' => $quantity,
            'product' => $product,
        ];
    }

    $discount = 0;
    if (!empty($cart['discountCode'])) {
        $discount = calculateDiscount($conn, $cart['discountCode'], $subtotal);
    }

    $shipping = 0;
    if (!empty($cart['shippingId'])) {
        $shipping = getShippingPrice($conn, $cart['shippingId']);
    }

    return [
        'items' => $items,
        'subtotal' => round($subtotal, 2),
        'discount' => round($discount, 2),
        'shipping' => round($shipping, 2),
        'total' => round($subtotal - $discount + $shipping, 2),
        'discountCode' => $cart['discountCode'],
    ];
}

function addToCart($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['productId'])) {
        Response::error('productId requerido');
    }
    $quantity = isset($data['quantity']) ? (int) $data['quantity'] : 1;
    if ($quantity < 1) $quantity = 1;

    $product = getProductById($conn, $data['productId']);
    if (!$product || $product['status'] !== 'active') {
        Response::error('Producto no disponible');
    }

    $cart = getSessionCart();
    $found = false;
    foreach ($cart['items'] as &$item) {
        if ($item['productId'] === $data['productId']) {
            $item['quantity'] = min($item['quantity'] + $quantity, (int) $product['stock']);
            $found = true;
            break;
        }
    }
    if (!$found) {
        $cart['items'][] = [
            'productId' => $data['productId'],
            'quantity' => min($quantity, (int) $product['stock'])
        ];
    }

    saveSessionCart($cart);
    Response::success(buildCart($conn), 'Item agregado');
}

function updateQuantity($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['productId']) || !isset($data['quantity'])) {
        Response::error('productId y quantity requeridos');
    }

    $quantity = (int) $data['quantity'];
    $cart = getSessionCart();
    $product = getProductById($conn, $data['productId']);
    if (!$product) {
        Response::error('Producto no encontrado');
    }

    foreach ($cart['items'] as &$item) {
        if ($item['productId'] === $data['productId']) {
            $item['quantity'] = max(1, min($quantity, (int) $product['stock']));
            break;
        }
    }

    saveSessionCart($cart);
    Response::success(buildCart($conn), 'Cantidad actualizada');
}

function removeItem($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['productId'])) {
        Response::error('productId requerido');
    }

    $cart = getSessionCart();
    $cart['items'] = array_values(array_filter($cart['items'], function($item) use ($data) {
        return $item['productId'] !== $data['productId'];
    }));

    saveSessionCart($cart);
    Response::success(buildCart($conn), 'Item eliminado');
}

function clearCart($conn) {
    $cart = getSessionCart();
    $cart['items'] = [];
    $cart['discountCode'] = null;
    $cart['shippingId'] = null;
    saveSessionCart($cart);
    Response::success(buildCart($conn), 'Carrito limpio');
}

function applyDiscount($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['code'])) {
        Response::error('Codigo requerido');
    }

    $stmt = $conn->prepare("SELECT * FROM discount_codes WHERE UPPER(code) = UPPER(?)");
    $stmt->execute([$data['code']]);
    $code = $stmt->fetch();

    if (!$code) {
        Response::success(['success' => false, 'message' => 'Codigo no valido']);
    }
    if (!$code['active']) {
        Response::success(['success' => false, 'message' => 'Codigo inactivo']);
    }
    if ($code['max_usage'] && $code['usage_count'] >= $code['max_usage']) {
        Response::success(['success' => false, 'message' => 'Codigo sin cupo']);
    }
    if ($code['expires_at'] && strtotime($code['expires_at']) < time()) {
        Response::success(['success' => false, 'message' => 'Codigo expirado']);
    }

    $cart = getSessionCart();
    $cart['discountCode'] = $code['code'];
    saveSessionCart($cart);

    Response::success(['success' => true, 'message' => 'Descuento aplicado', 'code' => $code['code']], 'Descuento aplicado');
}

function removeDiscount($conn) {
    $cart = getSessionCart();
    $cart['discountCode'] = null;
    saveSessionCart($cart);
    Response::success(buildCart($conn), 'Descuento eliminado');
}

function setShipping($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['shippingId'])) {
        Response::error('shippingId requerido');
    }

    $stmt = $conn->prepare("SELECT id FROM shipping_options WHERE id = ? AND active = 1");
    $stmt->execute([$data['shippingId']]);
    $row = $stmt->fetch();
    if (!$row) {
        Response::error('Opcion de envio no valida');
    }

    $cart = getSessionCart();
    $cart['shippingId'] = $data['shippingId'];
    saveSessionCart($cart);
    Response::success(buildCart($conn), 'Envio actualizado');
}

function calculateDiscount($conn, $code, $subtotal) {
    $stmt = $conn->prepare("SELECT * FROM discount_codes WHERE UPPER(code) = UPPER(?) AND active = 1");
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    if (!$row) return 0;

    if ($row['max_usage'] && $row['usage_count'] >= $row['max_usage']) return 0;
    if ($row['expires_at'] && strtotime($row['expires_at']) < time()) return 0;

    $value = (float) $row['value'];
    if ($row['type'] === 'percentage') {
        return $subtotal * ($value / 100);
    }
    return min($value, $subtotal);
}

function getShippingPrice($conn, $shippingId) {
    $stmt = $conn->prepare("SELECT price FROM shipping_options WHERE id = ? AND active = 1");
    $stmt->execute([$shippingId]);
    $row = $stmt->fetch();
    return $row ? (float) $row['price'] : 0;
}

function getProductById($conn, $id) {
    $stmt = $conn->prepare("SELECT p.*, (SELECT GROUP_CONCAT(image_url ORDER BY sort_order) FROM product_images WHERE product_id = p.id) as images FROM products p WHERE p.id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) return null;

    $product['images'] = $product['images'] ? explode(',', $product['images']) : ['/placeholder.svg'];
    $product['featured'] = (bool) $product['featured'];
    $product['price'] = (float) $product['price'];
    $product['stock'] = (int) $product['stock'];
    return $product;
}
