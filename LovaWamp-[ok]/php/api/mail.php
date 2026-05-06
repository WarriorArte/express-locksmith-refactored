<?php
/**
 * Mail Settings API
 * Endpoints: GET settings, PUT settings, POST test, GET logs
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Mailer.php';

// Handle CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($action === 'logs') {
                getEmailLogs($conn);
            } else {
                getEmailSettings($conn);
            }
            break;
            
        case 'PUT':
            updateEmailSettings($conn);
            break;
            
        case 'POST':
            if ($action === 'test') {
                testEmailConnection($conn);
            } elseif ($action === 'send-test') {
                sendTestEmail($conn);
            } else {
                Response::error('Acción no válida');
            }
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getEmailSettings($conn) {
    // Ensure table exists
    ensureTable($conn);
    
    $settings = Mailer::getSettings($conn);
    
    if (!$settings) {
        Response::success([
            'enabled' => false,
            'smtpHost' => '',
            'smtpPort' => 465,
            'smtpUser' => '',
            'smtpEncryption' => 'ssl',
            'fromEmail' => '',
            'fromName' => '',
            'replyTo' => '',
            'adminEmail' => '',
            'notifyNewOrderAdmin' => true,
            'notifyNewOrderCustomer' => true,
            'notifyStatusChange' => true,
            'notifyReviewLink' => true,
        ]);
        return;
    }
    
    // Transform to camelCase for frontend, never send password
    Response::success([
        'enabled' => (bool)$settings['enabled'],
        'smtpHost' => $settings['smtp_host'],
        'smtpPort' => (int)$settings['smtp_port'],
        'smtpUser' => $settings['smtp_user'],
        'smtpEncryption' => $settings['smtp_encryption'],
        'fromEmail' => $settings['from_email'],
        'fromName' => $settings['from_name'],
        'replyTo' => $settings['reply_to'] ?? '',
        'adminEmail' => $settings['admin_email'] ?? '',
        'notifyNewOrderAdmin' => (bool)$settings['notify_new_order_admin'],
        'notifyNewOrderCustomer' => (bool)$settings['notify_new_order_customer'],
        'notifyStatusChange' => (bool)$settings['notify_status_change'],
        'notifyReviewLink' => (bool)$settings['notify_review_link'],
        'hasPassword' => !empty($settings['smtp_password_encrypted']),
    ]);
}

function updateEmailSettings($conn) {
    ensureTable($conn);
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        Response::error('Datos requeridos');
    }
    
    // Encrypt password if provided
    $passwordSql = '';
    $params = [
        $data['smtpHost'] ?? '',
        (int)($data['smtpPort'] ?? 465),
        $data['smtpUser'] ?? '',
        $data['smtpEncryption'] ?? 'ssl',
        $data['fromEmail'] ?? '',
        $data['fromName'] ?? '',
        $data['replyTo'] ?? null,
        (int)($data['enabled'] ?? 0),
        (int)($data['notifyNewOrderAdmin'] ?? 1),
        (int)($data['notifyNewOrderCustomer'] ?? 1),
        (int)($data['notifyStatusChange'] ?? 1),
        (int)($data['notifyReviewLink'] ?? 1),
        $data['adminEmail'] ?? null,
    ];
    
    if (!empty($data['smtpPassword'])) {
        $encryptedPassword = Mailer::encrypt($data['smtpPassword']);
        $passwordSql = ", smtp_password_encrypted = ?";
        $params[] = $encryptedPassword;
    }
    
    $stmt = $conn->prepare("
        INSERT INTO email_settings (id, smtp_host, smtp_port, smtp_user, smtp_encryption, from_email, from_name, reply_to, enabled, notify_new_order_admin, notify_new_order_customer, notify_status_change, notify_review_link, admin_email)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_encryption = ?,
            from_email = ?, from_name = ?, reply_to = ?, enabled = ?,
            notify_new_order_admin = ?, notify_new_order_customer = ?,
            notify_status_change = ?, notify_review_link = ?, admin_email = ?
            {$passwordSql}
    ");
    
    // Duplicate params for ON DUPLICATE KEY UPDATE
    $allParams = array_merge($params, $params);
    $stmt->execute($allParams);
    
    Response::success(null, 'Configuración de correo guardada');
}

function testEmailConnection($conn) {
    $result = Mailer::testConnection($conn);
    if ($result['success']) {
        Response::success(null, $result['message']);
    } else {
        Response::error($result['message']);
    }
}

function sendTestEmail($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $to = $data['to'] ?? '';
    
    if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        Response::error('Email de destino requerido');
    }
    
    require_once __DIR__ . '/helpers/EmailTemplates.php';
    
    // Build a fake order for the test
    $testOrder = [
        'order_number' => 'TEST-001',
        'customer_name' => 'Cliente de Prueba',
        'total' => 150.00,
    ];
    $testItems = [
        ['product_name' => 'Producto de ejemplo', 'quantity' => 2, 'total' => 150.00],
    ];
    
    $html = EmailTemplates::orderConfirmation($conn, $testOrder, $testItems);
    $sent = Mailer::send($conn, $to, '✅ Correo de prueba - Configuración exitosa', $html);
    
    if ($sent) {
        Response::success(null, 'Correo de prueba enviado exitosamente');
    } else {
        Response::error('No se pudo enviar el correo de prueba. Revisa la configuración SMTP.');
    }
}

function getEmailLogs($conn) {
    ensureTable($conn);
    
    $limit = (int)($_GET['limit'] ?? 50);
    $stmt = $conn->prepare("SELECT * FROM email_log ORDER BY created_at DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($logs as &$log) {
        $log['toEmail'] = $log['to_email'];
        $log['errorMessage'] = $log['error_message'];
        $log['createdAt'] = $log['created_at'];
        unset($log['to_email'], $log['error_message'], $log['created_at']);
    }
    
    Response::success($logs);
}

function ensureTable($conn) {
    try {
        $conn->query("SELECT 1 FROM email_settings LIMIT 1");
    } catch (Exception $e) {
        // Table doesn't exist, create it
        $sql = file_get_contents(__DIR__ . '/../../schema/migrate_email_settings.sql');
        if ($sql) {
            $conn->exec($sql);
        }
    }
}
