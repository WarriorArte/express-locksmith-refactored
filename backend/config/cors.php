<?php

$envFileValue = static function (string $key): ?string {
    $path = base_path('.env');

    if (! is_file($path) || ! is_readable($path)) {
        return null;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return null;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = array_map('trim', explode('=', $line, 2));
        if ($name !== $key) {
            continue;
        }

        if (
            strlen($value) >= 2 &&
            (($value[0] === "'" && $value[-1] === "'") || ($value[0] === '"' && $value[-1] === '"'))
        ) {
            $value = substr($value, 1, -1);
        }

        return $value;
    }

    return null;
};

$value = static fn (string $key, string $default = ''): string => (string) ($envFileValue($key) ?? env($key, $default));
$csv = static fn (string $raw): array => array_values(array_filter(array_map('trim', explode(',', $raw))));

$allowedOrigins = $csv($value('CORS_ALLOWED_ORIGINS'));
$allowedOriginPatterns = $csv($value('CORS_ALLOWED_ORIGIN_PATTERNS'));
$allowedMethods = $csv($value('CORS_ALLOWED_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'));
$allowedHeaders = $csv($value('CORS_ALLOWED_HEADERS', 'Content-Type,Authorization,X-Workshop-Id,X-Requested-With,Accept'));

return [
    'paths' => ['api/*'],
    'allowed_methods' => array_values($allowedMethods),
    'allowed_origins' => array_values($allowedOrigins),
    'allowed_origins_patterns' => array_values($allowedOriginPatterns),
    'allowed_headers' => array_values($allowedHeaders),
    'exposed_headers' => [],
    'max_age' => 600,
    'supports_credentials' => false,
];
