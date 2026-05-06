<?php

namespace App\Http\Controllers;

use App\Models\AppUser;
use App\Models\Profile;
use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ProfileController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->get($request),
            'PUT' => $request->query('action') ? ApiResponse::error('Metodo no permitido', 405) : $this->update($request),
            'POST' => $this->postAction($request),
            'DELETE' => $this->delete($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function get(Request $request): JsonResponse
    {
        $action = $request->query('action');
        $authUser = $request->attributes->get('legacy_user');

        if ($action === 'system-roles') {
            if (!LegacyAuth::isSuperadmin($authUser)) {
                return ApiResponse::error('Se requieren permisos de superadmin', 401);
            }

            $rows = DB::table('profiles as p')
                ->join('app_users as au', 'au.id', '=', 'p.user_id')
                ->leftJoin('user_roles as ur', 'ur.user_id', '=', 'p.user_id')
                ->leftJoin('global_user_roles as gur', 'gur.user_id', '=', 'p.user_id')
                ->orderByDesc('ur.created_at')
                ->orderBy('p.full_name')
                ->get([
                    'p.id',
                    'ur.user_id',
                    'ur.workshop_id',
                    'ur.role as workshop_role',
                    'p.full_name',
                    'p.email',
                    'au.is_active',
                    DB::raw('COALESCE(gur.role, "user") as global_role'),
                ]);

            return ApiResponse::success($rows);
        }

        if ($action === 'find-by-email') {
            if (!LegacyAuth::isSuperadmin($authUser)) {
                return ApiResponse::error('Se requieren permisos de superadmin', 401);
            }

            $email = strtolower(trim((string) $request->query('email', '')));

            if ($email === '') {
                return ApiResponse::error('email es requerido');
            }

            $profile = Profile::query()->whereRaw('LOWER(email) = ?', [$email])->first();

            if (!$profile) {
                return ApiResponse::error('Usuario no encontrado con ese email', 404);
            }

            return ApiResponse::success($profile);
        }

        $id = $request->query('id');

        if ($id) {
            return $this->show($request, $id);
        }

        $workshopId = $request->query('workshop_id');

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $rows = DB::table('user_roles as ur')
            ->join('profiles as p', 'p.user_id', '=', 'ur.user_id')
            ->join('app_users as au', 'au.id', '=', 'p.user_id')
            ->leftJoin('global_user_roles as gur', 'gur.user_id', '=', 'p.user_id')
            ->where('ur.workshop_id', $workshopId)
            ->orderBy('p.full_name')
            ->select('p.*', 'ur.role as workshop_role', 'ur.workshop_id', 'au.is_active', DB::raw('COALESCE(gur.role, "user") as global_role'))
            ->get();

        return ApiResponse::success($rows);
    }

    private function show(Request $request, string $id): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $row = DB::table('profiles as p')
            ->join('app_users as au', 'au.id', '=', 'p.user_id')
            ->leftJoin('global_user_roles as gur', 'gur.user_id', '=', 'p.user_id')
            ->where('p.id', $id)
            ->select('p.*', 'au.email as user_email', 'au.is_active', DB::raw('COALESCE(gur.role, "user") as global_role'))
            ->first();

        if (!$row) {
            return ApiResponse::error('Perfil no encontrado', 404);
        }

        $isSelf = $row->user_id === $authUser['user_id'];
        $isSuperadmin = LegacyAuth::isSuperadmin($authUser);
        $isAllowed = $isSelf || $isSuperadmin;

        if (!$isAllowed) {
            $isAllowed = DB::table('user_roles as req')
                ->join('user_roles as tgt', 'tgt.workshop_id', '=', 'req.workshop_id')
                ->where('req.user_id', $authUser['user_id'])
                ->where('req.role', 'admin')
                ->where('tgt.user_id', $row->user_id)
                ->exists();
        }

        if (!$isAllowed) {
            return ApiResponse::error('Sin permisos para ver este perfil', 401);
        }

        $payload = (array) $row;

        if (!$isSelf && !$isSuperadmin) {
            unset($payload['user_email'], $payload['is_active'], $payload['global_role']);
        }

        return ApiResponse::success($payload);
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID del perfil requerido');
        }

        $profile = Profile::query()->find($id);

        if (!$profile) {
            return ApiResponse::error('Perfil no encontrado', 404);
        }

        if ($profile->user_id !== $authUser['user_id'] && !LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Solo puedes editar tu propio perfil', 401);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(['full_name', 'avatar_url', 'locksmith_id']));

        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $profile->fill($updates)->save();

        return ApiResponse::success($profile->refresh(), 'Perfil actualizado');
    }

    private function postAction(Request $request): JsonResponse
    {
        return match ($request->query('action')) {
            'invite' => $this->invite($request),
            'assign' => $this->assign($request),
            'change-password' => $this->changePassword($request),
            'delete-user' => $this->deleteUser($request),
            'consistency' => $this->consistency($request),
            'repair' => $this->repair($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function invite(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $fullName = trim((string) ($data['full_name'] ?? ''));
        $role = $data['role'] ?? 'employee';

        if ($email === '' || $password === '' || $fullName === '') {
            return ApiResponse::error('email, password y full_name son requeridos');
        }

        if (!in_array($role, ['admin', 'employee'], true)) {
            return ApiResponse::error('Rol invalido');
        }

        if (strlen($password) < 8) {
            return ApiResponse::error('La contrasena debe tener al menos 8 caracteres');
        }

        if (AppUser::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return ApiResponse::error('El email ya está registrado');
        }

        $userId = (string) Str::uuid();

        DB::transaction(function () use ($userId, $email, $password, $fullName, $workshopId, $role): void {
            DB::table('app_users')->insert([
                'id' => $userId,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'is_active' => 1,
            ]);

            DB::table('profiles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'full_name' => $fullName,
                'email' => $email,
                'current_workshop_id' => $workshopId,
            ]);

            DB::table('user_roles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'role' => $role,
                'workshop_id' => $workshopId,
            ]);
        });

        $profile = DB::table('profiles as p')
            ->join('user_roles as ur', 'ur.user_id', '=', 'p.user_id')
            ->where('p.user_id', $userId)
            ->select('p.*', 'ur.role as workshop_role')
            ->first();

        return ApiResponse::success($profile, 'Usuario creado y asignado al taller');
    }

    private function assign(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $targetUserId = $data['user_id'] ?? '';
        $role = $data['role'] ?? 'employee';

        if (!$targetUserId) {
            return ApiResponse::error('user_id es requerido');
        }

        if (!in_array($role, ['admin', 'employee'], true)) {
            return ApiResponse::error('Rol invalido');
        }

        $existing = DB::table('user_roles')
            ->where('user_id', $targetUserId)
            ->where('workshop_id', $workshopId)
            ->first();

        if ($existing) {
            DB::table('user_roles')->where('id', $existing->id)->update(['role' => $role]);
        } else {
            DB::table('user_roles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $targetUserId,
                'role' => $role,
                'workshop_id' => $workshopId,
            ]);
        }

        return ApiResponse::success(['user_id' => $targetUserId, 'role' => $role, 'workshop_id' => $workshopId], 'Usuario asignado al taller');
    }

    private function changePassword(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');

        if (!LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Se requieren permisos de superadmin', 401);
        }

        $data = $request->json()->all();
        $targetUserId = $data['user_id'] ?? '';
        $newPassword = (string) ($data['new_password'] ?? '');

        if (!$targetUserId || $newPassword === '') {
            return ApiResponse::error('user_id y new_password son requeridos');
        }

        if (strlen($newPassword) < 8) {
            return ApiResponse::error('La contrasena debe tener al menos 8 caracteres');
        }

        if (!AppUser::query()->whereKey($targetUserId)->exists()) {
            return ApiResponse::error('Usuario no encontrado', 404);
        }

        AppUser::query()->whereKey($targetUserId)->update(['password_hash' => password_hash($newPassword, PASSWORD_BCRYPT)]);

        return ApiResponse::success(null, 'Contrasena actualizada');
    }

    private function deleteUser(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');

        if (!LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Se requieren permisos de superadmin', 401);
        }

        $targetUserId = $request->json('user_id', '');

        if (!$targetUserId) {
            return ApiResponse::error('user_id es requerido');
        }

        if ($targetUserId === $authUser['user_id']) {
            return ApiResponse::error('No puedes eliminar tu propia cuenta');
        }

        if (!AppUser::query()->whereKey($targetUserId)->exists()) {
            return ApiResponse::error('Usuario no encontrado', 404);
        }

        AppUser::query()->whereKey($targetUserId)->delete();

        return ApiResponse::success(null, 'Usuario eliminado permanentemente');
    }

    private function consistency(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');

        if (!LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Se requieren permisos de superadmin', 401);
        }

        $email = strtolower(trim((string) $request->json('email', '')));

        if ($email === '') {
            return ApiResponse::error('email es requerido');
        }

        $authUserRow = DB::table('app_users')->whereRaw('LOWER(email) = ?', [$email])->first(['id', 'email', 'updated_at']);
        $profileRow = DB::table('profiles')->whereRaw('LOWER(email) = ?', [$email])->first(['id', 'user_id', 'email']);

        $matches = null;
        if ($authUserRow && $profileRow) {
            $matches = $authUserRow->id === $profileRow->user_id;
        }

        return ApiResponse::success([
            'matches' => $matches,
            'profile_user_id' => $profileRow->user_id ?? null,
            'auth_user' => $authUserRow ? [
                'id' => $authUserRow->id,
                'email' => $authUserRow->email,
                'updated_at' => $authUserRow->updated_at ?? null,
                'last_sign_in_at' => null,
            ] : null,
        ]);
    }

    private function repair(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');

        if (!LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Se requieren permisos de superadmin', 401);
        }

        $email = strtolower(trim((string) $request->json('email', '')));

        if ($email === '') {
            return ApiResponse::error('email es requerido');
        }

        $authUserRow = DB::table('app_users')->whereRaw('LOWER(email) = ?', [$email])->first(['id', 'email']);

        if (!$authUserRow) {
            return ApiResponse::error('No existe usuario auth con ese email', 404);
        }

        $profile = Profile::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if ($profile) {
            $profile->user_id = $authUserRow->id;
            $profile->save();

            return ApiResponse::success([
                'message' => 'Perfil sincronizado correctamente',
                'profile' => $profile->refresh(),
            ], 'Cuenta reparada');
        }

        $newProfile = Profile::query()->create([
            'user_id' => $authUserRow->id,
            'full_name' => trim(explode('@', $email)[0] ?? 'Usuario') ?: 'Usuario',
            'email' => $email,
        ]);

        return ApiResponse::success([
            'message' => 'Perfil creado y sincronizado correctamente',
            'profile' => $newProfile,
        ], 'Cuenta reparada');
    }

    private function delete(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $workshopId = $request->query('workshop_id');
        $id = $request->query('id');

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        if (!$id) {
            return ApiResponse::error('ID de perfil requerido');
        }

        $profile = Profile::query()->find($id);

        if (!$profile) {
            return ApiResponse::error('Perfil no encontrado', 404);
        }

        DB::table('user_roles')
            ->where('user_id', $profile->user_id)
            ->where('workshop_id', $workshopId)
            ->delete();

        return ApiResponse::success(null, 'Usuario removido del taller');
    }
}
