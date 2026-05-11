<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateLegacyToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return ApiResponse::error('Token de autorizacion requerido', 401);
        }

        if (!$user->is_active) {
            return ApiResponse::error('Usuario inactivo', 403);
        }

        // Pre-cargar relaciones para evitar N+1 en controllers (canAccessWorkshop, canAdminWorkshop, etc.)
        $user->load(['globalRole', 'workshopRoles']);

        // Compatibilidad con controladores legacy que usan $request->attributes->get('legacy_user')
        $request->attributes->set('legacy_user', [
            'user_id'     => $user->id,
            'is_active'   => (int) $user->is_active,
            'global_role' => $user->global_role,
        ]);

        return $next($request);
    }
}
