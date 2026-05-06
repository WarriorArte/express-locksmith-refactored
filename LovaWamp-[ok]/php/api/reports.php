<?php
/**
 * Reports API
 * Sales reports and statistics
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$type = $_GET['type'] ?? 'sales';

try {
    switch ($type) {
        case 'sales':
            getSalesReport($conn);
            break;
            
        case 'dashboard':
            getDashboardStats($conn);
            break;
            
        default:
            Response::error('Tipo de reporte no válido');
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getSalesReport($conn) {
    // Total orders count
    $totalOrders = $conn->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    
    // Total revenue (excluding cancelled)
    $totalRevenue = $conn->query("
        SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'
    ")->fetchColumn();
    
    // Orders by status
    $statusStmt = $conn->query("
        SELECT status, COUNT(*) as count FROM orders GROUP BY status
    ");
    $ordersByStatus = [
        'new' => 0,
        'processing' => 0,
        'shipped' => 0,
        'delivered' => 0,
        'cancelled' => 0
    ];
    while ($row = $statusStmt->fetch()) {
        $ordersByStatus[$row['status']] = (int) $row['count'];
    }
    
    // Non-cancelled orders for average
    $nonCancelledCount = $totalOrders - $ordersByStatus['cancelled'];
    $averageOrderValue = $nonCancelledCount > 0 ? $totalRevenue / $nonCancelledCount : 0;
    
    // Top products
    $topProductsStmt = $conn->query("
        SELECT 
            oi.product_id as productId,
            oi.product_name as name,
            SUM(oi.quantity) as quantity,
            SUM(oi.total) as revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_id, oi.product_name
        ORDER BY revenue DESC
        LIMIT 5
    ");
    $topProducts = $topProductsStmt->fetchAll();
    
    foreach ($topProducts as &$product) {
        $product['quantity'] = (int) $product['quantity'];
        $product['revenue'] = (float) $product['revenue'];
    }
    
    Response::success([
        'totalOrders' => (int) $totalOrders,
        'totalRevenue' => (float) $totalRevenue,
        'averageOrderValue' => round($averageOrderValue, 2),
        'ordersByStatus' => $ordersByStatus,
        'topProducts' => $topProducts
    ]);
}

function getDashboardStats($conn) {
    // Products count
    $productsCount = $conn->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $activeProducts = $conn->query("SELECT COUNT(*) FROM products WHERE status = 'active'")->fetchColumn();
    $outOfStock = $conn->query("SELECT COUNT(*) FROM products WHERE stock = 0")->fetchColumn();
    
    // Orders today
    $ordersToday = $conn->query("
        SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()
    ")->fetchColumn();
    
    // Revenue today
    $revenueToday = $conn->query("
        SELECT COALESCE(SUM(total), 0) FROM orders 
        WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'
    ")->fetchColumn();
    
    // Categories count
    $categoriesCount = $conn->query("SELECT COUNT(*) FROM categories")->fetchColumn();
    
    // Reviews count
    $reviewsCount = $conn->query("SELECT COUNT(*) FROM reviews")->fetchColumn();
    $avgRating = $conn->query("SELECT COALESCE(AVG(rating), 0) FROM reviews")->fetchColumn();
    
    Response::success([
        'products' => [
            'total' => (int) $productsCount,
            'active' => (int) $activeProducts,
            'outOfStock' => (int) $outOfStock
        ],
        'orders' => [
            'today' => (int) $ordersToday,
            'revenueToday' => (float) $revenueToday
        ],
        'categories' => (int) $categoriesCount,
        'reviews' => [
            'total' => (int) $reviewsCount,
            'avgRating' => round((float) $avgRating, 1)
        ]
    ]);
}