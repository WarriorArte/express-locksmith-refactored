<?php
/**
 * Discount Codes API
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
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getDiscountCode($conn, $id);
            } else {
                getDiscountCodes($conn);
            }
            break;
            
        case 'POST':
            if ($action === 'validate') {
                validateDiscountCode($conn);
            } else {
                createDiscountCode($conn);
            }
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de código requerido');
            }
            updateDiscountCode($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de código requerido');
            }
            deleteDiscountCode($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getDiscountCodes($conn) {
    $activeOnly = isset($_GET['active']) ? filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN) : false;
    
    $sql = "SELECT * FROM discount_codes";
    if ($activeOnly) {
        $sql .= " WHERE active = 1";
    }
    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $conn->query($sql);
    $codes = $stmt->fetchAll();
    
    // Transform to frontend format
    foreach ($codes as &$code) {
        $code['usageCount'] = (int) $code['usage_count'];
        $code['maxUsage'] = $code['max_usage'] ? (int) $code['max_usage'] : null;
        $code['expiresAt'] = $code['expires_at'];
        $code['active'] = (bool) $code['active'];
        unset($code['usage_count'], $code['max_usage'], $code['expires_at']);
    }
    
    Response::success($codes);
}

function getDiscountCode($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM discount_codes WHERE id = ?");
    $stmt->execute([$id]);
    $code = $stmt->fetch();
    
    if (!$code) {
        Response::notFound('Código de descuento no encontrado');
    }
    
    $code['usageCount'] = (int) $code['usage_count'];
    $code['maxUsage'] = $code['max_usage'] ? (int) $code['max_usage'] : null;
    $code['expiresAt'] = $code['expires_at'];
    $code['active'] = (bool) $code['active'];
    unset($code['usage_count'], $code['max_usage'], $code['expires_at']);
    
    Response::success($code);
}

function validateDiscountCode($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['code'])) {
        Response::error('Código requerido');
    }
    
    $stmt = $conn->prepare("SELECT * FROM discount_codes WHERE UPPER(code) = UPPER(?)");
    $stmt->execute([$data['code']]);
    $code = $stmt->fetch();
    
    if (!$code) {
        Response::json(['success' => false, 'message' => 'Código no válido']);
        return;
    }
    
    if (!$code['active']) {
        Response::json(['success' => false, 'message' => 'Este código ya no está activo']);
        return;
    }
    
    if ($code['max_usage'] && $code['usage_count'] >= $code['max_usage']) {
        Response::json(['success' => false, 'message' => 'Este código ha alcanzado su límite de uso']);
        return;
    }
    
    if ($code['expires_at'] && strtotime($code['expires_at']) < time()) {
        Response::json(['success' => false, 'message' => 'Este código ha expirado']);
        return;
    }
    
    $discountText = $code['type'] === 'percentage' 
        ? "{$code['value']}%" 
        : "Q{$code['value']}";
    
    Response::json([
        'success' => true,
        'message' => "¡Descuento aplicado! $discountText de descuento",
        'discount' => [
            'code' => $code['code'],
            'type' => $code['type'],
            'value' => (float) $code['value']
        ]
    ]);
}

function createDiscountCode($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['code']) || empty($data['type']) || !isset($data['value'])) {
        Response::error('Datos incompletos');
    }
    
    // Check if code already exists
    $checkStmt = $conn->prepare("SELECT id FROM discount_codes WHERE UPPER(code) = UPPER(?)");
    $checkStmt->execute([$data['code']]);
    if ($checkStmt->fetch()) {
        Response::error('Este código ya existe');
    }
    
    $id = 'disc-' . time();
    
    $stmt = $conn->prepare("
        INSERT INTO discount_codes (id, code, type, value, active, max_usage, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $id,
        strtoupper($data['code']),
        $data['type'],
        $data['value'],
        ($data['active'] ?? true) ? 1 : 0,
        $data['maxUsage'] ?? null,
        $data['expiresAt'] ?? null
    ]);
    
    Response::success(['id' => $id], 'Código de descuento creado exitosamente');
}

function updateDiscountCode($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $fields = [];
    $params = [];
    
    $fieldMap = [
        'code' => 'code',
        'type' => 'type',
        'value' => 'value',
        'active' => 'active',
        'maxUsage' => 'max_usage',
        'expiresAt' => 'expires_at'
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
    $sql = "UPDATE discount_codes SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Código no encontrado');
    }
    
    Response::success(['id' => $id], 'Código actualizado exitosamente');
}

function deleteDiscountCode($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM discount_codes WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Código no encontrado');
    }
    
    Response::success(null, 'Código eliminado exitosamente');
}