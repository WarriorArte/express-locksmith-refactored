<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AuthController
{
    public function handle(Request $request): JsonResponse
    {
        $action = $request->query('action', 'check');

        return match ($action) {
            'login' => $this->login($request),
            'logout' => $this->logout($request),
            'check' => $this->check($request),
            'change-password' => $this->changePassword($request),
            default => ApiResponse::error('Accion no reconocida', 400),
        };
    }

    private function login(Request $request): JsonResponse
    {
        if (!$request->isMethod('POST')) {
            return ApiResponse::error('Metodo no permitido', 405);
        }

        $data = $request->json()->all();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');

        if ($email === '' || $password === '') {
            return ApiResponse::error('Email y contrasena son requeridos');
        }

        $user = DB::table('app_users')
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first(['id', 'email', 'password_hash', 'is_active']);

        if (!$user || !(int) $user->is_active || !password_verify($password, (string) $user->password_hash)) {
            return ApiResponse::error('Credenciales incorrectas', 401);
        }

        $profile = DB::table('profiles')
            ->where('user_id', $user->id)
            ->first(['id', 'user_id', 'full_name', 'email', 'avatar_url', 'current_workshop_id', 'locksmith_id']);

        $globalRole = DB::table('global_user_roles')
            ->where('user_id', $user->id)
            ->value('role') ?: 'user';

        if ($globalRole === 'superadmin') {
            $workshops = DB::table('workshops')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'is_active']);
        } else {
            $workshops = DB::table('user_roles as ur')
                ->join('workshops as w', 'w.id', '=', 'ur.workshop_id')
                ->where('ur.user_id', $user->id)
                ->orderBy('w.name')
                ->get(['w.id', 'w.name', 'w.code', 'w.is_active', 'ur.role as workshop_role']);
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = now()->addDays(30);

        DB::table('auth_tokens')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'token' => LegacyAuth::hashToken($token),
            'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        ]);

        return ApiResponse::success([
            'token' => $token,
            'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
            'user' => ['id' => $user->id, 'email' => $user->email],
            'profile' => $profile,
            'global_role' => $globalRole,
            'workshops' => $workshops,
        ], 'Login exitoso');
    }

    private function logout(Request $request): JsonResponse
    {
        $token = LegacyAuth::tokenFromHeader($request->headers->get('Authorization'));

        if ($token) {
            DB::table('auth_tokens')->where('token', LegacyAuth::hashToken($token))->delete();
        }

        return ApiResponse::success(null, 'Sesion cerrada');
    }

    private function check(Request $request): JsonResponse
    {
        $token = LegacyAuth::tokenFromHeader($request->headers->get('Authorization'));

        if (!$token) {
            return ApiResponse::error('Token de autorizacion requerido', 401);
        }

        $authUser = LegacyAuth::userForToken($token);

        if (!$authUser) {
            return ApiResponse::error('Token invalido o expirado', 401);
        }

        $profile = DB::table('profiles')
            ->where('user_id', $authUser['user_id'])
            ->first(['id', 'user_id', 'full_name', 'email', 'avatar_url', 'current_workshop_id', 'locksmith_id']);

        $isAdmin = DB::table('user_roles')
            ->where('user_id', $authUser['user_id'])
            ->where('role', 'admin')
            ->exists();

        return ApiResponse::success([
            'authenticated' => true,
            'user' => [
                'id' => $authUser['user_id'],
                'global_role' => $authUser['global_role'],
                'is_admin' => $isAdmin,
            ],
            'profile' => $profile,
        ]);
    }

    private function changePassword(Request $request): JsonResponse
    {
        if (!$request->isMethod('POST')) {
            return ApiResponse::error('Metodo no permitido', 405);
        }

        $token = LegacyAuth::tokenFromHeader($request->headers->get('Authorization'));
        $authUser = $token ? LegacyAuth::userForToken($token) : null;

        if (!$token || !$authUser) {
            return ApiResponse::error('Token invalido o expirado', 401);
        }

        $data = $request->json()->all();
        $currentPassword = (string) ($data['current_password'] ?? '');
        $newPassword = (string) ($data['new_password'] ?? '');

        if ($currentPassword === '' || $newPassword === '') {
            return ApiResponse::error('Se requieren contrasena actual y nueva');
        }

        if (strlen($newPassword) < 8) {
            return ApiResponse::error('La nueva contrasena debe tener al menos 8 caracteres');
        }

        $hash = DB::table('app_users')->where('id', $authUser['user_id'])->value('password_hash');

        if (!$hash || !password_verify($currentPassword, (string) $hash)) {
            return ApiResponse::error('Contrasena actual incorrecta', 401);
        }

        DB::table('app_users')
            ->where('id', $authUser['user_id'])
            ->update(['password_hash' => password_hash($newPassword, PASSWORD_BCRYPT)]);

        DB::table('auth_tokens')
            ->where('user_id', $authUser['user_id'])
            ->where('token', '!=', LegacyAuth::hashToken($token))
            ->delete();

        return ApiResponse::success(null, 'Contrasena actualizada');
    }
}
