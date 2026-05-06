<?php
/**
 * Bootstrap — funciones utilitarias compartidas por todos los endpoints
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/Response.php';

// ── CORS ──────────────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de orígenes permitidos.
 * Configurable vía env CORS_ALLOWED_ORIGINS (CSV) o constante CORS_ALLOWED_ORIGINS en config.
 * Por defecto solo orígenes locales de desarrollo.
 */
function cors_allowed_origins(): array {
    static $cached = null;
    if ($cached !== null) return $cached;

    $defaults = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ];

    $env = getenv('CORS_ALLOWED_ORIGINS');
    if (!$env && defined('CORS_ALLOWED_ORIGINS')) $env = constant('CORS_ALLOWED_ORIGINS');

    if ($env) {
        $extra = array_filter(array_map('trim', explode(',', $env)));
        $cached = array_values(array_unique(array_merge($defaults, $extra)));
    } else {
        $cached = $defaults;
    }
    return $cached;
}

function set_cors_headers(): void {
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = cors_allowed_origins();

    if ($origin && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    // Si el origen no está en la lista no se emite el header → el navegador bloquea.
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Workshop-Id');
    header('Access-Control-Max-Age: 600');
}

function handle_preflight(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        set_cors_headers();
        http_response_code(204);
        exit;
    }
}

// ── DATABASE ──────────────────────────────────────────────────────────────────

function get_db_connection(): PDO {
    static $conn = null;
    if ($conn === null) {
        $db   = new Database();
        $conn = $db->getConnection();
    }
    return $conn;
}

// ── INPUT ─────────────────────────────────────────────────────────────────────

function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) Response::error('JSON invalido en el cuerpo de la solicitud');
    return $data;
}

function get_workshop_id_param(array $data = []): ?string {
    $id = $_GET['workshop_id'] ?? $data['workshop_id'] ?? null;
    return $id ? (string)$id : null;
}

// ── UUID ──────────────────────────────────────────────────────────────────────

function make_uuid(): string {
    $d    = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

// ── TOKEN AUTH ────────────────────────────────────────────────────────────────

function get_bearer_token(): ?string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $headers = array_change_key_case($headers, CASE_LOWER);
    $auth    = $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        return trim($m[1]);
    }
    return null;
}

/**
 * Valida el token Bearer y retorna el array del usuario autenticado:
 * ['user_id', 'is_active', 'global_role']
 */
function require_auth(): array {
    $token = get_bearer_token();
    if (!$token) Response::unauthorized('Token de autorizacion requerido');

    $conn = get_db_connection();
    $stmt = $conn->prepare('
        SELECT at.user_id,
               au.is_active,
               COALESCE(gur.role, "user") AS global_role
        FROM   auth_tokens at
        JOIN   app_users au  ON au.id  = at.user_id
        LEFT JOIN global_user_roles gur ON gur.user_id = at.user_id
        WHERE  at.token = ?
          AND  at.expires_at > NOW()
        LIMIT  1
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user || !(int)$user['is_active']) {
        Response::unauthorized('Token invalido o expirado');
    }
    return $user;
}

/**
 * Requiere rol global superadmin.
 */
function require_superadmin(array $user): void {
    if ($user['global_role'] !== 'superadmin') {
        Response::unauthorized('Se requieren permisos de superadmin');
    }
}

/**
 * Verifica que el usuario tenga acceso al taller indicado.
 * Retorna el rol: 'superadmin' | 'admin' | 'employee'
 */
function require_workshop_access(PDO $conn, string $user_id, ?string $workshop_id): string {
    if (!$workshop_id) Response::error('workshop_id es requerido');

    // Superadmin tiene acceso a todo
    $stmt = $conn->prepare('SELECT role FROM global_user_roles WHERE user_id = ? LIMIT 1');
    $stmt->execute([$user_id]);
    $global = $stmt->fetch();
    if ($global && $global['role'] === 'superadmin') return 'superadmin';

    // Verificar rol en el taller
    $stmt = $conn->prepare('SELECT role FROM user_roles WHERE user_id = ? AND workshop_id = ? LIMIT 1');
    $stmt->execute([$user_id, $workshop_id]);
    $role = $stmt->fetch();
    if (!$role) Response::unauthorized('Sin acceso al taller indicado');

    return $role['role'];
}

/**
 * Requiere rol admin o superadmin en el taller.
 */
function require_workshop_admin(PDO $conn, string $user_id, ?string $workshop_id): string {
    $role = require_workshop_access($conn, $user_id, $workshop_id);
    if ($role !== 'admin' && $role !== 'superadmin') {
        Response::unauthorized('Se requiere rol de administrador en este taller');
    }
    return $role;
}
