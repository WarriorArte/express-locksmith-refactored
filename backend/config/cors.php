<?php

$allowedOrigins = array_filter(array_map('trim', explode(',', (string) env(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:8080,http://127.0.0.1:8080'
))));
$allowedOriginPatterns = array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))));

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values($allowedOrigins),
    'allowed_origins_patterns' => array_values($allowedOriginPatterns),
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Workshop-Id'],
    'exposed_headers' => [],
    'max_age' => 600,
    'supports_credentials' => false,
];
