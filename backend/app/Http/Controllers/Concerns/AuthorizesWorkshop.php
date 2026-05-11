<?php

namespace App\Http\Controllers\Concerns;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Centraliza los chequeos de autorización de taller para evitar repetición en cada controller.
 *
 * Uso:
 *   if ($err = $this->requireAccess($request, $workshopId)) return $err;
 *   if ($err = $this->requireAdmin($request, $workshopId)) return $err;
 */
trait AuthorizesWorkshop
{
    protected function requireAccess(Request $request, ?string $workshopId): ?JsonResponse
    {
        if (!$request->user()->canAccessWorkshop($workshopId)) {
            return ApiResponse::error(
                $workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido',
                $workshopId ? 403 : 400
            );
        }

        return null;
    }

    protected function requireAdmin(Request $request, ?string $workshopId): ?JsonResponse
    {
        if (!$request->user()->canAdminWorkshop($workshopId)) {
            return ApiResponse::error(
                $workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido',
                $workshopId ? 403 : 400
            );
        }

        return null;
    }
}
