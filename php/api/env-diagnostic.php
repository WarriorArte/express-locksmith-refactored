<?php
/**
 * env-diagnostic.php
 * Diagnostico de variables de entorno para runtime PHP.
 * El password siempre se enmascara.
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

function mask_value(?string $value, bool $isSecret = false): ?string {
    if ($value === null || $value === '') {
        return $value;
    }

    if ($isSecret) {
        return str_repeat('*', 8);
    }

    $len = strlen($value);
    if ($len <= 3) {
        return str_repeat('*', $len);
    }

    return substr($value, 0, 2) . str_repeat('*', max(1, $len - 3)) . substr($value, -1);
}

function read_from_all_sources(string $key): array {
    $fromGetenv = getenv($key);
    $fromEnv = $_ENV[$key] ?? null;
    $fromServer = $_SERVER[$key] ?? null;

    return [
        'getenv' => $fromGetenv === false ? null : (string)$fromGetenv,
        '_ENV' => $fromEnv !== null ? (string)$fromEnv : null,
        '_SERVER' => $fromServer !== null ? (string)$fromServer : null,
    ];
}

$keys = [
    'DB_HOST' => false,
    'DB_PORT' => false,
    'DB_NAME' => false,
    'DB_USER' => false,
    'DB_PASSWORD' => true,
    'CORS_ALLOWED_ORIGINS' => false,
];

$raw = [];
$masked = [];
$availability = [];

foreach ($keys as $key => $isSecret) {
    $sources = read_from_all_sources($key);
    $raw[$key] = $sources;

    $masked[$key] = [
        'getenv' => mask_value($sources['getenv'], $isSecret),
        '_ENV' => mask_value($sources['_ENV'], $isSecret),
        '_SERVER' => mask_value($sources['_SERVER'], $isSecret),
    ];

    $availability[$key] = [
        'has_getenv' => $sources['getenv'] !== null && $sources['getenv'] !== '',
        'has__ENV' => $sources['_ENV'] !== null && $sources['_ENV'] !== '',
        'has__SERVER' => $sources['_SERVER'] !== null && $sources['_SERVER'] !== '',
    ];
}

$dbSettingsMasked = null;
$dbConnection = [
    'ok' => false,
    'message' => null,
];

try {
    $db = new Database();
    $settings = $db->getSettings();

    $dbSettingsMasked = [
        'host' => mask_value((string)($settings['host'] ?? '')),
        'port' => (int)($settings['port'] ?? 0),
        'db_name' => mask_value((string)($settings['db_name'] ?? '')),
        'username' => mask_value((string)($settings['username'] ?? '')),
        'password' => '********',
    ];

    $db->getConnection();
    $dbConnection['ok'] = true;
    $dbConnection['message'] = 'Conexion OK';
} catch (Throwable $e) {
    $dbConnection['ok'] = false;
    $dbConnection['message'] = $e->getMessage();
}

Response::success([
    'php' => [
        'version' => PHP_VERSION,
        'sapi' => php_sapi_name(),
    ],
    'env_availability' => $availability,
    'env_masked_values' => $masked,
    'resolved_db_settings_masked' => $dbSettingsMasked,
    'db_connection' => $dbConnection,
    'note' => 'Eliminar este endpoint despues del diagnostico.',
]);
