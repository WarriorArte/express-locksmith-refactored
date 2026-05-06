<?php
/**
 * Login Logs API
 * Endpoint: list
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    Response::error('Método no permitido', 405);
}

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 200;
$offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;

$limit = max(1, min($limit, 500));
$offset = max(0, $offset);

$stmt = $conn->prepare(
    "SELECT l.id, l.user_id, l.email, l.success, l.ip_address, l.user_agent, l.created_at, u.name AS user_name
     FROM login_logs l
     LEFT JOIN users u ON l.user_id = u.id
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?"
);
$stmt->bindValue(1, $limit, PDO::PARAM_INT);
$stmt->bindValue(2, $offset, PDO::PARAM_INT);
$stmt->execute();

$rows = $stmt->fetchAll();

$logs = array_map(function ($row) {
    return [
        'id' => (int) $row['id'],
        'userId' => $row['user_id'],
        'userName' => $row['user_name'],
        'email' => $row['email'],
        'success' => (bool) $row['success'],
        'ipAddress' => $row['ip_address'],
        'userAgent' => $row['user_agent'],
        'createdAt' => $row['created_at'],
    ];
}, $rows);

Response::success($logs);
