<?php
/**
 * Response helper — formato estándar { success, message, data }
 */
class Response {
    public static function json(mixed $data, int $status = 200): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(mixed $data, string $message = 'Operacion exitosa'): never {
        self::json(['success' => true, 'message' => $message, 'data' => $data]);
    }

    public static function error(string $message, int $status = 400, mixed $errors = null): never {
        $payload = ['success' => false, 'message' => $message];
        if ($errors !== null) $payload['errors'] = $errors;
        self::json($payload, $status);
    }

    public static function unauthorized(string $message = 'No autorizado'): never {
        self::error($message, 401);
    }

    public static function notFound(string $message = 'Recurso no encontrado'): never {
        self::error($message, 404);
    }

    public static function serverError(string $message = 'Error interno del servidor'): never {
        self::error($message, 500);
    }
}
