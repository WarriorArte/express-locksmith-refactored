<?php
/**
 * Reset API (dangerous)
 * Endpoint: POST /reset.php?action=seed&confirm=RESET
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return $needle === '' || strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        $length = strlen($needle);
        if ($length === 0) {
            return true;
        }
        return substr($haystack, -$length) === $needle;
    }
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$confirm = $_GET['confirm'] ?? null;

if ($method !== 'POST') {
    Response::error('Metodo no permitido', 405);
}

if ($confirm !== 'RESET') {
    Response::error('Confirmacion requerida');
}

try {
    $db = new Database();
    $conn = $db->getConnection();

    if ($action === 'seed') {
        resetWithSeed($conn);
    } else {
        Response::error('Accion no valida');
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function resetWithSeed($conn) {
    $tables = [
        'order_items',
        'orders',
        'product_images',
        'products',
        'categories',
        'discount_codes',
        'shipping_options',
        'reviews',
        'custom_pages',
        'media_gallery',
        'store_settings',
        'home_page_settings',
        'about_page_settings',
        'footer_settings',
        'menu_settings',
        'order_counter'
    ];

    $conn->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach ($tables as $table) {
        $conn->exec("TRUNCATE TABLE `$table`");
    }
    $conn->exec('SET FOREIGN_KEY_CHECKS = 1');

    $seedFile = __DIR__ . '/../schema/seed_data.sql';
    if (is_file($seedFile)) {
        runSqlFile($conn, $seedFile);
    }

    Response::success(null, 'Reset completado');
}

function runSqlFile($conn, $filePath) {
    $sql = file_get_contents($filePath);
    if (!$sql) return;

    $lines = explode("\n", $sql);
    $statement = '';

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '--')) {
            continue;
        }
        $statement .= $line . "\n";
        if (str_ends_with(trim($line), ';')) {
            $conn->exec($statement);
            $statement = '';
        }
    }
}
