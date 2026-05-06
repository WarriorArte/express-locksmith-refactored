<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateLegacyToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = LegacyAuth::tokenFromHeader($request->headers->get('Authorization'));

        if (!$token) {
            return ApiResponse::error('Token de autorizacion requerido', 401);
        }

        $authUser = LegacyAuth::userForToken($token);

        if (!$authUser) {
            return ApiResponse::error('Token invalido o expirado', 401);
        }

        $request->attributes->set('legacy_user', $authUser);
        $request->attributes->set('legacy_token', $token);

        return $next($request);
    }
}
