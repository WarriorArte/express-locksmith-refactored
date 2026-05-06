<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class EnvDiagnosticController
{
    public function handle(): JsonResponse
    {
        $keys = [
            'DB_HOST' => false,
            'DB_PORT' => false,
            'DB_DATABASE' => false,
            'DB_USERNAME' => false,
            'DB_PASSWORD' => true,
            'CORS_ALLOWED_ORIGINS' => false,
        ];

        $availability = [];
        $masked = [];

        foreach ($keys as $key => $secret) {
            $value = env($key);
            $availability[$key] = [
                'has_getenv' => getenv($key) !== false && getenv($key) !== '',
                'has__ENV' => isset($_ENV[$key]) && $_ENV[$key] !== '',
                'has__SERVER' => isset($_SERVER[$key]) && $_SERVER[$key] !== '',
            ];
            $masked[$key] = [
                'getenv' => $this->mask(getenv($key) === false ? null : (string) getenv($key), $secret),
                '_ENV' => $this->mask(isset($_ENV[$key]) ? (string) $_ENV[$key] : null, $secret),
                '_SERVER' => $this->mask(isset($_SERVER[$key]) ? (string) $_SERVER[$key] : null, $secret),
                'resolved' => $this->mask($value !== null ? (string) $value : null, $secret),
            ];
        }

        $connection = ['ok' => false, 'message' => null];
        try {
            DB::connection()->getPdo();
            $connection = ['ok' => true, 'message' => 'Conexion OK'];
        } catch (\Throwable $e) {
            $connection = ['ok' => false, 'message' => $e->getMessage()];
        }

        return ApiResponse::success([
            'php' => ['version' => PHP_VERSION, 'sapi' => php_sapi_name()],
            'env_availability' => $availability,
            'env_masked_values' => $masked,
            'resolved_db_settings_masked' => [
                'host' => $this->mask((string) config('database.connections.mysql.host')),
                'port' => (int) config('database.connections.mysql.port'),
                'db_name' => $this->mask((string) config('database.connections.mysql.database')),
                'username' => $this->mask((string) config('database.connections.mysql.username')),
                'password' => '********',
            ],
            'db_connection' => $connection,
            'note' => 'Eliminar este endpoint despues del diagnostico.',
        ]);
    }

    private function mask(?string $value, bool $secret = false): ?string
    {
        if ($value === null || $value === '') return $value;
        if ($secret) return '********';
        $length = strlen($value);
        if ($length <= 3) return str_repeat('*', $length);
        return substr($value, 0, 2).str_repeat('*', max(1, $length - 3)).substr($value, -1);
    }
}
