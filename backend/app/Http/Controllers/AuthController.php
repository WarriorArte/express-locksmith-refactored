<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AppUser;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

final class AuthController
{
    /** Punto de entrada legacy — mantiene compatibilidad con el frontend actual */
    public function handle(Request $request): JsonResponse
    {
        $action = $request->query('action', 'check');

        return match ($action) {
            'login' => $this->login(LoginRequest::createFrom($request)),
            'logout' => $this->logout($request),
            'check' => $this->me($request),
            'change-password' => $this->changePassword(ChangePasswordRequest::createFrom($request)),
            default => ApiResponse::error('Accion no reconocida', 400),
        };
    }

    /** POST /api/auth/login */
    public function login(LoginRequest $request): JsonResponse
    {
        $key = 'login:' . Str::lower($request->input('email', '')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);

            return ApiResponse::error("Demasiados intentos. Intenta en {$seconds} segundos.", 429);
        }

        $email = Str::lower(trim($request->input('email', '')));

        $user = AppUser::query()
            ->where(DB::raw('LOWER(email)'), $email)
            ->first();

        if (!$user || !$user->is_active || !password_verify($request->input('password', ''), $user->password_hash)) {
            RateLimiter::hit($key, 60);

            return ApiResponse::error('Credenciales incorrectas', 401);
        }

        RateLimiter::clear($key);

        $profile = $user->profile;
        $globalRole = $user->global_role;

        if ($user->isSuperadmin()) {
            $workshops = DB::table('workshops')->orderBy('name')->get(['id', 'name', 'code', 'is_active']);
        } else {
            $workshops = DB::table('user_roles as ur')
                ->join('workshops as w', 'w.id', '=', 'ur.workshop_id')
                ->where('ur.user_id', $user->id)
                ->orderBy('w.name')
                ->get(['w.id', 'w.name', 'w.code', 'w.is_active', 'ur.role as workshop_role']);
        }

        $token = $user->createToken('api', ['*'], now()->addDays(30));

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at->format('Y-m-d H:i:s'),
            'user' => ['id' => $user->id, 'email' => $user->email],
            'profile' => $profile,
            'global_role' => $globalRole,
            'workshops' => $workshops,
        ], 'Login exitoso');
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()->delete();
        }

        return ApiResponse::success(null, 'Sesion cerrada');
    }

    /** GET /api/auth/me */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return ApiResponse::error('Token de autorizacion requerido', 401);
        }

        $isAdmin = $user->workshopRoles()->where('role', 'admin')->exists();

        return ApiResponse::success([
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'global_role' => $user->global_role,
                'is_admin' => $isAdmin,
            ],
            'profile' => $user->profile,
        ]);
    }

    /** POST /api/auth/change-password */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return ApiResponse::error('Token de autorizacion requerido', 401);
        }

        if (!password_verify($request->input('current_password', ''), $user->password_hash)) {
            return ApiResponse::error('Contrasena actual incorrecta', 401);
        }

        $user->update(['password_hash' => password_hash($request->input('new_password'), PASSWORD_BCRYPT)]);

        // Revocar todos los otros tokens (cierra sesiones en otros dispositivos)
        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        return ApiResponse::success(null, 'Contrasena actualizada');
    }
}
