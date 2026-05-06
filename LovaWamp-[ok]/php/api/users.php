<?php
/**
 * Users API
 * Endpoints: list, create, update, delete
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            getUsers($conn);
            break;
        case 'POST':
            createUser($conn);
            break;
        case 'PUT':
            updateUser($conn);
            break;
        case 'DELETE':
            deleteUser($conn);
            break;
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

function getUsers($conn) {
    $id = $_GET['id'] ?? null;

    if ($id) {
        $stmt = $conn->prepare("SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::notFound('Usuario no encontrado');
        }

        Response::success(formatUser($user));
    }

    $stmt = $conn->query("SELECT id, name, email, created_at, updated_at FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll();

    $formatted = array_map('formatUser', $users);
    Response::success($formatted);
}

function createUser($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        Response::error('Nombre, email y contraseña son requeridos');
    }

    $email = strtolower(trim($data['email']));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Email inválido');
    }

    $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        Response::error('El email ya está registrado', 409);
    }

    $id = uniqid('user-');
    $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)");
    $stmt->execute([$id, $data['name'], $email, $passwordHash]);

    $stmt = $conn->prepare("SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    Response::success(formatUser($user), 'Usuario creado');
}

function updateUser($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id'])) {
        Response::error('ID requerido');
    }

    $id = $data['id'];
    $fields = [];
    $params = [];

    if (!empty($data['name'])) {
        $fields[] = 'name = ?';
        $params[] = $data['name'];
    }

    if (!empty($data['email'])) {
        $email = strtolower(trim($data['email']));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Email inválido');
        }

        $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE email = ? AND id <> ?");
        $stmt->execute([$email, $id]);
        if ($stmt->fetchColumn() > 0) {
            Response::error('El email ya está registrado', 409);
        }

        $fields[] = 'email = ?';
        $params[] = $email;
    }

    if (!empty($data['password'])) {
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    if (empty($fields)) {
        Response::error('No hay cambios para guardar');
    }

    $params[] = $id;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);

    $stmt = $conn->prepare("SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    Response::success(formatUser($user), 'Usuario actualizado');
}

function deleteUser($conn) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        Response::error('ID requerido');
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Usuario eliminado');
}

function formatUser($user) {
    return [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'createdAt' => $user['created_at'],
        'updatedAt' => $user['updated_at'],
    ];
}
