<?php
/**
 * Settings API
 * Handles: store_settings, home_page_settings, footer_settings, menu_settings
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? 'store'; // store, home, about, footer, menu

try {
    switch ($method) {
        case 'GET':
            getSettings($conn, $type);
            break;
            
        case 'PUT':
        case 'POST':
            updateSettings($conn, $type);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getTableName($type) {
    $tables = [
        'store' => 'store_settings',
        'home' => 'home_page_settings',
        'about' => 'about_page_settings',
        'footer' => 'footer_settings',
        'menu' => 'menu_settings'
    ];
    
    if (!isset($tables[$type])) {
        Response::error('Tipo de configuración no válido');
    }
    
    return $tables[$type];
}

function getSettings($conn, $type) {
    $table = getTableName($type);
    
    $stmt = $conn->query("SELECT data FROM $table WHERE id = 1");
    $row = $stmt->fetch();
    
    if ($row && $row['data']) {
        $data = json_decode($row['data'], true);
        Response::success($data);
    } else {
        // Return empty object if no settings exist
        Response::success((object)[]);
    }
}

function updateSettings($conn, $type) {
    $table = getTableName($type);
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        Response::error('Datos de configuración requeridos');
    }

    if ($type === 'store') {
        $stmt = $conn->query("SELECT data FROM $table WHERE id = 1");
        $row = $stmt->fetch();
        if ($row && $row['data']) {
            $existing = json_decode($row['data'], true);
            if (is_array($existing) && !empty($existing['installed'])) {
                $data['installed'] = true;
            }
        }
    }
    
    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE);
    
    // Upsert: insert or update
    $stmt = $conn->prepare("
        INSERT INTO $table (id, data) 
        VALUES (1, ?)
        ON DUPLICATE KEY UPDATE data = ?
    ");
    
    $stmt->execute([$jsonData, $jsonData]);
    
    Response::success($data, 'Configuración guardada exitosamente');
}