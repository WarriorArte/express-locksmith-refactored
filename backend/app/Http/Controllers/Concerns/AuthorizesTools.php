<?php

namespace App\Http\Controllers\Concerns;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Autorizacion compartida para el modulo Herramientas.
 *
 * Escritura: solo SuperAdmin.
 * Lectura:   SuperAdmin, o usuarios de un taller que tenga al menos una
 *            herramienta (keycode/immo/alarmas) habilitada en workshop_features.
 *            No depende de que ya existan asignaciones de vehiculos: un taller
 *            recien habilitado, o sin asignaciones todavia, debe poder entrar
 *            al modulo y ver el estado vacio.
 */
trait AuthorizesTools
{
    private const TOOL_FEATURE_KEYS = ['tool_keycode', 'tool_alarmas', 'tool_immo'];

    protected function authorizeToolsWrite(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::error('No autenticado', 401);
        }
        if (!$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de SuperAdmin', 403);
        }
        return null;
    }

    protected function authorizeToolsRead(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::error('No autenticado', 401);
        }
        if ($user->isSuperadmin()) {
            return null;
        }

        $workshopIds = $this->callerWorkshopIds($request);
        if ($workshopIds === []) {
            return ApiResponse::error('Sin acceso al modulo de herramientas', 403);
        }

        $hasToolFeature = DB::table('workshop_features')
            ->whereIn('workshop_id', $workshopIds)
            ->whereIn('feature_key', self::TOOL_FEATURE_KEYS)
            ->where('is_enabled', 1)
            ->exists();

        return $hasToolFeature ? null : ApiResponse::error('Sin acceso al modulo de herramientas', 403);
    }

    /** @return string[] */
    protected function callerWorkshopIds(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            return [];
        }

        return DB::table('user_roles')
            ->where('user_id', $user->id)
            ->pluck('workshop_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
