<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CorsFromEnv
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->headers->get('Origin');
        $allowed = $this->setting('cors.allowed_origins', 'CORS_ALLOWED_ORIGINS');
        $patterns = $this->setting('cors.allowed_origins_patterns', 'CORS_ALLOWED_ORIGIN_PATTERNS');
        $methods = $this->setting('cors.allowed_methods', 'CORS_ALLOWED_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        $headers = $this->setting('cors.allowed_headers', 'CORS_ALLOWED_HEADERS', 'Content-Type,Authorization,X-Workshop-Id,X-Requested-With,Accept');

        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204);
        } else {
            $response = $next($request);
        }

        $response->headers->set('Vary', 'Origin');
        $response->headers->set('Access-Control-Allow-Methods', implode(', ', $methods));
        $response->headers->set('Access-Control-Allow-Headers', implode(', ', $headers));
        $response->headers->set('Access-Control-Max-Age', '600');

        if ($origin && ($this->isAllowedOrigin($origin, $allowed) || $this->matchesAllowedPattern($origin, $patterns))) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
        }

        return $response;
    }

    /**
     * @return array<int, string>
     */
    private function csv(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }

    /**
     * @return array<int, string>
     */
    private function setting(string $configKey, string $envKey, string $default = ''): array
    {
        $value = config($configKey, []);

        if (is_string($value)) {
            $fromConfig = $this->csv($value);
        } elseif (is_array($value)) {
            $fromConfig = $this->normalizeArray($value);
        } else {
            $fromConfig = [];
        }

        if ($fromConfig !== []) {
            return $fromConfig;
        }

        foreach ($this->envValues($envKey) as $envValue) {
            $items = $this->csv($envValue);
            if ($items !== []) {
                return $items;
            }
        }

        return $this->csv($default);
    }

    /**
     * @param array<int|string, mixed> $value
     * @return array<int, string>
     */
    private function normalizeArray(array $value): array
    {
        return array_values(array_filter(array_map(
            static fn ($item): string => trim((string) $item),
            $value
        )));
    }

    /**
     * @return array<int, string>
     */
    private function envValues(string $key): array
    {
        $values = [
            env($key),
            getenv($key) === false ? null : getenv($key),
            $_ENV[$key] ?? null,
            $_SERVER[$key] ?? null,
        ];

        return array_values(array_filter(array_map(
            static fn ($value): string => trim((string) $value),
            $values
        )));
    }

    /**
     * @param array<int, string> $allowed
     */
    private function isAllowedOrigin(string $origin, array $allowed): bool
    {
        return in_array($origin, $allowed, true);
    }

    /**
     * @param array<int, string> $patterns
     */
    private function matchesAllowedPattern(string $origin, array $patterns): bool
    {
        foreach ($patterns as $pattern) {
            if (@preg_match($pattern, $origin) === 1) {
                return true;
            }
        }

        return false;
    }
}
