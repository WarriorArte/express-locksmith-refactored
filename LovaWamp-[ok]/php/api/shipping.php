<?php
/**
 * Shipping Options API
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
                getShippingOption($conn, $id);
            } else {
                getShippingOptions($conn);
            }
            break;
            
        case 'POST':
            createShippingOption($conn);
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de opción requerido');
            }
            updateShippingOption($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de opción requerido');
            }
            deleteShippingOption($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getShippingOptions($conn) {
    $activeOnly = isset($_GET['active']) ? filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN) : false;
    
    $sql = "SELECT * FROM shipping_options";
    if ($activeOnly) {
        $sql .= " WHERE active = 1";
    }
    $sql .= " ORDER BY price ASC";
    
    $stmt = $conn->query($sql);
    $options = $stmt->fetchAll();
    
    // Transform to frontend format
    foreach ($options as &$opt) {
        $opt['estimatedDays'] = $opt['estimated_days'];
        $opt['active'] = (bool) $opt['active'];
        $opt['price'] = (float) $opt['price'];
        unset($opt['estimated_days']);
    }
    
    Response::success($options);
}

function getShippingOption($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM shipping_options WHERE id = ?");
    $stmt->execute([$id]);
    $option = $stmt->fetch();
    
    if (!$option) {
        Response::notFound('Opción de envío no encontrada');
    }
    
    $option['estimatedDays'] = $option['estimated_days'];
    $option['active'] = (bool) $option['active'];
    $option['price'] = (float) $option['price'];
    unset($option['estimated_days']);
    
    Response::success($option);
}

function createShippingOption($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['name'])) {
        Response::error('Nombre de opción requerido');
    }
    
    $id = 'ship-' . time();
    
    $stmt = $conn->prepare("
        INSERT INTO shipping_options (id, name, description, price, estimated_days, active)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $id,
        $data['name'],
        $data['description'] ?? '',
        $data['price'] ?? 0,
        $data['estimatedDays'] ?? '',
        ($data['active'] ?? true) ? 1 : 0
    ]);
    
    Response::success(['id' => $id], 'Opción de envío creada exitosamente');
}

function updateShippingOption($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $fields = [];
    $params = [];
    
    $fieldMap = [
        'name' => 'name',
        'description' => 'description',
        'price' => 'price',
        'estimatedDays' => 'estimated_days',
        'active' => 'active'
    ];
    
    foreach ($fieldMap as $jsField => $dbField) {
        if (isset($data[$jsField])) {
            $fields[] = "$dbField = ?";
            $value = $data[$jsField];
            if ($jsField === 'active') {
                $value = $value ? 1 : 0;
            }
            $params[] = $value;
        }
    }
    
    if (empty($fields)) {
        Response::error('No hay datos para actualizar');
    }
    
    $params[] = $id;
    $sql = "UPDATE shipping_options SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Opción no encontrada');
    }
    
    Response::success(['id' => $id], 'Opción actualizada exitosamente');
}

function deleteShippingOption($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM shipping_options WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Opción no encontrada');
    }
    
    Response::success(null, 'Opción eliminada exitosamente');
}