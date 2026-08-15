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
 * Lectura:   SuperAdmin, o usuarios de un taller que tenga herramientas asignadas.
 *            Un usuario sin taller (o sin asignacion) no puede leer las bases de
 *            keycodes / immo / alarmas.
 */
trait AuthorizesTools
{
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

        $hasAssignment = DB::table('tool_assignments')
            ->whereIn('workshop_id', $workshopIds)
            ->exists();

        return $hasAssignment ? null : ApiResponse::error('Sin acceso al modulo de herramientas', 403);
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
