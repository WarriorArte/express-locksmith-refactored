<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/Response.php';

function set_cors_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

function handle_preflight() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        set_cors_headers();
        http_response_code(204);
        exit;
    }
}

function start_session_if_needed() {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'secure' => isset($_SERVER['HTTPS']),
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function get_db_connection() {
    $db = new Database();
    return $db->getConnection();
}

function get_json_input() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        Response::error('JSON invalido');
    }
    return $data;
}

function make_uuid() {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function json_encode_or_null($value) {
    if ($value === null) {
        return null;
    }
    return json_encode($value, JSON_UNESCAPED_UNICODE);
}

function json_decode_array($value) {
    if ($value === null || $value === '') {
        return [];
    }
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function require_admin() {
    if (empty($_SESSION['admin_user_id'])) {
        Response::unauthorized('Sesion no valida');
    }
}

function is_admin_authenticated() {
    return !empty($_SESSION['admin_user_id']);
}
