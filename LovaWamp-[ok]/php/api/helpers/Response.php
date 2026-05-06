<?php
/**
 * API response helper
 */

class Response {
    public static function json($data, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data, $message = 'Operacion exitosa') {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ]);
    }

    public static function error($message, $status = 400, $errors = null) {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        self::json($payload, $status);
    }

    public static function unauthorized($message = 'No autorizado') {
        self::error($message, 401);
    }

    public static function notFound($message = 'Recurso no encontrado') {
        self::error($message, 404);
    }

    public static function serverError($message = 'Error interno del servidor') {
        self::error($message, 500);
    }
}
