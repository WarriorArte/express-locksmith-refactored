<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class MaintenanceController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET'    => $this->stats($request),
            'DELETE' => $this->purge($request),
            default  => ApiResponse::error('Método no permitido', 405),
        };
    }

    private function authorize(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de SuperAdmin', 403);
        }
        return null;
    }

    private function stats(Request $request): JsonResponse
    {
        if ($resp = $this->authorize($request)) return $resp;

        return ApiResponse::success([
            'keycode' => [
                'profiles' => DB::table('keycode_profiles')->count(),
                'codes'    => DB::table('keycode_codes')->count(),
            ],
            'alarmas' => [
                'profiles' => DB::table('alarma_profiles')->count(),
            ],
            'immo' => [
                'profiles'     => DB::table('immo_profiles')->count(),
                'catalogItems' => DB::table('immo_catalog_items')->count(),
            ],
            'assignments' => DB::table('tool_assignments')->count(),
            'vehicles'    => DB::table('vehicle_database_records')->count(),
        ]);
    }

    private function purge(Request $request): JsonResponse
    {
        if ($resp = $this->authorize($request)) return $resp;

        $module = $request->query('module');

        return match ($module) {
            'keycode' => $this->purgeKeycode(),
            'alarmas' => $this->purgeAlarmas(),
            'immo'    => $this->purgeImmo(),
            'assignments' => $this->purgeAssignments(),
            'vehicles'    => $this->purgeVehicles(),
            default   => ApiResponse::error('Módulo inválido. Usa: keycode, alarmas, immo, assignments, vehicles'),
        };
    }

    private function purgeKeycode(): JsonResponse
    {
        $codes    = DB::table('keycode_codes')->count();
        $profiles = DB::table('keycode_profiles')->count();

        DB::table('keycode_codes')->delete();
        DB::table('keycode_profiles')->delete();

        return ApiResponse::success([
            'deleted' => ['profiles' => $profiles, 'codes' => $codes],
        ], "Keycode purgado: {$profiles} perfiles y {$codes} códigos eliminados");
    }

    private function purgeAlarmas(): JsonResponse
    {
        $profiles = DB::table('alarma_profiles')->count();
        DB::table('alarma_profiles')->delete();

        return ApiResponse::success([
            'deleted' => ['profiles' => $profiles],
        ], "Alarmas purgado: {$profiles} perfiles eliminados");
    }

    private function purgeImmo(): JsonResponse
    {
        $profiles = DB::table('immo_profiles')->count();
        $catalog  = DB::table('immo_catalog_items')->count();

        DB::table('immo_profiles')->delete();
        DB::table('immo_catalog_items')->delete();

        return ApiResponse::success([
            'deleted' => ['profiles' => $profiles, 'catalogItems' => $catalog],
        ], "Immo purgado: {$profiles} perfiles y {$catalog} items de catálogo eliminados");
    }

    private function purgeAssignments(): JsonResponse
    {
        $count = DB::table('tool_assignments')->count();
        DB::table('tool_assignments')->delete();

        return ApiResponse::success([
            'deleted' => ['assignments' => $count],
        ], "Asignaciones purgadas: {$count} registros eliminados");
    }

    private function purgeVehicles(): JsonResponse
    {
        $count = DB::table('vehicle_database_records')->count();
        DB::table('vehicle_database_records')->delete();

        return ApiResponse::success([
            'deleted' => ['records' => $count],
        ], "Base de vehículos purgada: {$count} registros eliminados");
    }
}
