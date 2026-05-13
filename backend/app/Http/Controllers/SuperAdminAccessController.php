<?php

namespace App\Http\Controllers;

use App\Models\AppUser;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SuperAdminAccessController
{
    public function publicConfig(): JsonResponse
    {
        $settings = $this->settings();

        return ApiResponse::success([
            'login_path' => $settings?->login_path ?? '/auth_su',
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $settings = $this->settings();

        if (!$settings) {
            return ApiResponse::error('Acceso SuperAdmin no configurado', 500);
        }

        $requestPath = $this->normalizeLoginPath((string) $request->input('login_path', $settings->login_path));
        if ($requestPath !== $settings->login_path) {
            return ApiResponse::error('Ruta SuperAdmin no valida', 404);
        }

        $email = strtolower(trim((string) $request->input('email', '')));
        $workshopCode = strtoupper(trim((string) $request->input('workshop_code', '')));
        $password = (string) $request->input('password', '');

        if (
            $email !== strtolower((string) $settings->email)
            || $workshopCode !== strtoupper((string) $settings->workshop_code)
            || !password_verify($password, (string) $settings->password_hash)
        ) {
            return ApiResponse::error('Credenciales incorrectas', 401);
        }

        $user = $this->syncSuperadminUser($settings->email, $settings->password_hash, $settings->workshop_code);
        $workshops = DB::table('workshops')->orderBy('name')->get(['id', 'name', 'code', 'is_active']);
        $token = $user->createToken('superadmin-api', ['*'], now()->addDays(30));

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at->format('Y-m-d H:i:s'),
            'user' => ['id' => $user->id, 'email' => $user->email],
            'profile' => $user->profile,
            'global_role' => 'superadmin',
            'workshops' => $workshops,
        ], 'Login SuperAdmin exitoso');
    }

    public function handle(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de superadmin', 403);
        }

        return match ($request->method()) {
            'GET' => ApiResponse::success($this->safeSettings()),
            'PUT' => $this->update($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function update(Request $request): JsonResponse
    {
        $settings = $this->settings();
        $data = $request->json()->all();

        $workshopCode = strtoupper(trim((string) ($data['workshop_code'] ?? $settings?->workshop_code ?? '')));
        $email = strtolower(trim((string) ($data['email'] ?? $settings?->email ?? '')));
        $loginPath = $this->normalizeLoginPath((string) ($data['login_path'] ?? $settings?->login_path ?? '/auth_su'));
        $password = (string) ($data['password'] ?? '');

        $errors = [];
        if ($workshopCode === '') $errors['workshop_code'] = 'El codigo es requerido';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Email invalido';
        if (!preg_match('/^\/[a-zA-Z0-9][a-zA-Z0-9_-]{2,119}$/', $loginPath)) $errors['login_path'] = 'La ruta debe verse como /auth_su';
        if ($password !== '' && strlen($password) < 8) $errors['password'] = 'La contrasena debe tener al menos 8 caracteres';

        if ($errors !== []) {
            return ApiResponse::error('Datos invalidos', 422, $errors);
        }

        $passwordHash = $password !== '' ? password_hash($password, PASSWORD_BCRYPT) : (string) ($settings?->password_hash ?? password_hash(Str::random(32), PASSWORD_BCRYPT));

        DB::transaction(function () use ($settings, $workshopCode, $email, $loginPath, $passwordHash): void {
            $payload = [
                'workshop_code' => $workshopCode,
                'email' => $email,
                'password_hash' => $passwordHash,
                'login_path' => $loginPath,
                'singleton_guard' => 1,
                'updated_at' => now(),
            ];

            if ($settings) {
                DB::table('superadmin_access_settings')->where('id', $settings->id)->update($payload);
            } else {
                DB::table('superadmin_access_settings')->insert($payload + [
                    'id' => (string) Str::uuid(),
                    'created_at' => now(),
                ]);
            }

            $this->syncSuperadminUser($email, $passwordHash, $workshopCode);
        });

        return ApiResponse::success($this->safeSettings(), 'Acceso SuperAdmin actualizado');
    }

    private function settings(): ?object
    {
        return DB::table('superadmin_access_settings')->where('singleton_guard', 1)->first();
    }

    private function safeSettings(): ?array
    {
        $settings = $this->settings();
        if (!$settings) {
            return null;
        }

        return [
            'id' => $settings->id,
            'workshop_code' => $settings->workshop_code,
            'email' => $settings->email,
            'login_path' => $settings->login_path,
            'created_at' => $settings->created_at ?? null,
            'updated_at' => $settings->updated_at ?? null,
        ];
    }

    private function normalizeLoginPath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '/auth_su';
        }

        $path = '/' . ltrim($path, '/');
        return rtrim($path, '/') ?: '/auth_su';
    }

    private function syncSuperadminUser(string $email, string $passwordHash, string $workshopCode): AppUser
    {
        return DB::transaction(function () use ($email, $passwordHash, $workshopCode): AppUser {
            $user = AppUser::query()->whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
            $userId = $user?->id ?? (string) Str::uuid();

            if ($user) {
                $user->update([
                    'password_hash' => $passwordHash,
                    'is_active' => 1,
                ]);
            } else {
                DB::table('app_users')->insert([
                    'id' => $userId,
                    'email' => strtolower($email),
                    'password_hash' => $passwordHash,
                    'is_active' => 1,
                ]);
            }

            $profile = DB::table('profiles')->where('user_id', $userId)->first(['id']);
            $profileData = [
                'full_name' => 'SuperAdmin',
                'email' => strtolower($email),
                'locksmith_id' => $workshopCode,
                'current_workshop_id' => null,
                'updated_at' => now(),
            ];

            if ($profile) {
                DB::table('profiles')->where('id', $profile->id)->update($profileData);
            } else {
                DB::table('profiles')->insert($profileData + [
                    'id' => (string) Str::uuid(),
                    'user_id' => $userId,
                    'created_at' => now(),
                ]);
            }

            DB::table('global_user_roles')->where('role', 'superadmin')->where('user_id', '!=', $userId)->delete();

            $globalRole = DB::table('global_user_roles')->where('user_id', $userId)->first(['id']);
            if ($globalRole) {
                DB::table('global_user_roles')->where('id', $globalRole->id)->update(['role' => 'superadmin']);
            } else {
                DB::table('global_user_roles')->insert([
                    'id' => (string) Str::uuid(),
                    'user_id' => $userId,
                    'role' => 'superadmin',
                ]);
            }

            return AppUser::query()->with(['profile', 'globalRole'])->findOrFail($userId);
        });
    }
}
