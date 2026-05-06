<?php

namespace App\Http\Controllers;

use App\Models\Workshop;
use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class WorkshopController
{
    public function handle(Request $request): JsonResponse
    {
        if ($request->query('action') === 'switch' && $request->isMethod('PUT')) {
            return $this->switch($request);
        }

        return match ($request->method()) {
            'GET' => $this->showOrList($request),
            'POST' => $this->store($request),
            'PUT' => $this->update($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function switch(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('id del taller requerido');
        }

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 401);
        }

        DB::table('profiles')
            ->where('user_id', $authUser['user_id'])
            ->update(['current_workshop_id' => $id]);

        return ApiResponse::success(Workshop::query()->find($id), 'Taller activo actualizado');
    }

    private function showOrList(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if ($id) {
            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $id)) {
                return ApiResponse::error('Sin acceso al taller indicado', 401);
            }

            $workshop = Workshop::query()->find($id);

            if (!$workshop) {
                return ApiResponse::error('Taller no encontrado', 404);
            }

            return ApiResponse::success($workshop);
        }

        if (LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::success(Workshop::query()->orderBy('name')->get());
        }

        $workshops = DB::table('user_roles as ur')
            ->join('workshops as w', 'w.id', '=', 'ur.workshop_id')
            ->where('ur.user_id', $authUser['user_id'])
            ->orderBy('w.name')
            ->select('w.*', 'ur.role as workshop_role')
            ->get();

        return ApiResponse::success($workshops);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');

        if (!LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Se requieren permisos de superadmin', 401);
        }

        $data = $request->json()->all();

        if (empty($data['name'])) {
            return ApiResponse::error('El campo name es requerido');
        }

        if (empty($data['code'])) {
            return ApiResponse::error('El campo code es requerido');
        }

        if (Workshop::query()->where('code', $data['code'])->exists()) {
            return ApiResponse::error('El codigo de taller ya existe');
        }

        $workshop = Workshop::query()->create([
            'code' => $data['code'],
            'name' => $data['name'],
            'is_active' => array_key_exists('is_active', $data) ? (int) $data['is_active'] : 1,
            'settings' => $data['settings'] ?? null,
        ]);

        return ApiResponse::success($workshop->refresh(), 'Taller creado');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID del taller requerido');
        }

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        $workshop = Workshop::query()->find($id);

        if (!$workshop) {
            return ApiResponse::error('Taller no encontrado', 404);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(['name', 'code', 'is_active', 'settings']));

        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $workshop->fill($updates)->save();

        return ApiResponse::success($workshop->refresh(), 'Taller actualizado');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID del taller requerido');
        }

        if (!LegacyAuth::isSuperadmin($authUser)) {
            return ApiResponse::error('Se requieren permisos de superadmin', 401);
        }

        Workshop::query()->whereKey($id)->delete();

        return ApiResponse::success(null, 'Taller eliminado');
    }
}
