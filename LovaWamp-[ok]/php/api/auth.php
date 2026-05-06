<?php
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();
start_session_if_needed();

$conn = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'check';

try {
    if ($action === 'login') {
        if ($method !== 'POST') {
            Response::error('Metodo no permitido', 405);
        }
        $data = get_json_input();
        $login = strtolower(trim($data['login'] ?? ($data['email'] ?? '')));
        $password = $data['password'] ?? '';

        if ($login === '' || $password === '') {
            Response::error('Usuario/correo y contrasena requeridos');
        }

        $stmt = $conn->prepare('SELECT id, name, email, password_hash, is_active FROM admin_users WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1');
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch();

        $ok = $user && (int) $user['is_active'] === 1 && password_verify($password, $user['password_hash']);
        log_login($conn, $user['id'] ?? null, $login, $ok);

        if (!$ok) {
            Response::unauthorized('Credenciales incorrectas');
        }

        session_regenerate_id(true);
        $_SESSION['admin_user_id'] = $user['id'];
        $_SESSION['admin_user_email'] = $user['email'];

        $update = $conn->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?');
        $update->execute([$user['id']]);

        Response::success([
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
        ], 'Login exitoso');
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'] ?? false, $params['httponly'] ?? true);
        }
        session_destroy();
        Response::success(null, 'Sesion cerrada');
    }

    if ($action === 'check') {
        if (empty($_SESSION['admin_user_id'])) {
            Response::json(['authenticated' => false]);
        }

        $stmt = $conn->prepare('SELECT id, name, email, is_active FROM admin_users WHERE id = ? LIMIT 1');
        $stmt->execute([$_SESSION['admin_user_id']]);
        $user = $stmt->fetch();

        if (!$user || (int) $user['is_active'] !== 1) {
            $_SESSION = [];
            session_destroy();
            Response::json(['authenticated' => false]);
        }

        Response::json([
            'authenticated' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
            ],
        ]);
    }

    if ($action === 'update-email') {
        if ($method !== 'POST') {
            Response::error('Metodo no permitido', 405);
        }
        require_admin_session();

        $data = get_json_input();
        $newEmail = strtolower(trim($data['email'] ?? ''));
        if ($newEmail === '' || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            Response::error('Email invalido');
        }

        $currentId = $_SESSION['admin_user_id'];

        $check = $conn->prepare('SELECT COUNT(*) FROM admin_users WHERE email = ? AND id <> ?');
        $check->execute([$newEmail, $currentId]);
        if ((int) $check->fetchColumn() > 0) {
            Response::error('El email ya esta en uso', 409);
        }

        $update = $conn->prepare('UPDATE admin_users SET email = ? WHERE id = ?');
        $update->execute([$newEmail, $currentId]);
        $_SESSION['admin_user_email'] = $newEmail;

        Response::success(['email' => $newEmail], 'Correo actualizado');
    }

    if ($action === 'update-password') {
        if ($method !== 'POST') {
            Response::error('Metodo no permitido', 405);
        }
        require_admin_session();

        $data = get_json_input();
        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword = $data['newPassword'] ?? '';

        if ($currentPassword === '' || $newPassword === '') {
            Response::error('currentPassword y newPassword son requeridos');
        }
        if (strlen($newPassword) < 6) {
            Response::error('La nueva contrasena debe tener al menos 6 caracteres');
        }

        $currentId = $_SESSION['admin_user_id'];
        $stmt = $conn->prepare('SELECT password_hash, is_active FROM admin_users WHERE id = ? LIMIT 1');
        $stmt->execute([$currentId]);
        $user = $stmt->fetch();

        if (!$user || (int) $user['is_active'] !== 1) {
            Response::unauthorized('Sesion no valida');
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            Response::error('La contrasena actual es incorrecta', 401);
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $update = $conn->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?');
        $update->execute([$newHash, $currentId]);

        Response::success(null, 'Contrasena actualizada');
    }

    Response::error('Accion no valida', 400);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

function require_admin_session() {
    if (empty($_SESSION['admin_user_id'])) {
        Response::unauthorized('Sesion no valida');
    }
}

function log_login($conn, $userId, $email, $success) {
    try {
        $stmt = $conn->prepare('INSERT INTO login_logs (user_id, email, success, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId,
            $email,
            $success ? 1 : 0,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        ]);
    } catch (Exception $e) {
        // Ignore logging failures.
    }
}
