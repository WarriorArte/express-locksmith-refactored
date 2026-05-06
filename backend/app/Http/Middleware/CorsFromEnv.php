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
        $allowed = array_filter(array_map('trim', explode(',', (string) env(
            'CORS_ALLOWED_ORIGINS',
            'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:8080,http://127.0.0.1:8080'
        ))));
        $patterns = array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))));

        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204);
        } else {
            $response = $next($request);
        }

        $response->headers->set('Vary', 'Origin');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workshop-Id');
        $response->headers->set('Access-Control-Max-Age', '600');

        if ($origin && ($this->isAllowedOrigin($origin, $allowed) || $this->matchesAllowedPattern($origin, $patterns))) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
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
