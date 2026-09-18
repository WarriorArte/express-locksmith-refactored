<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class MaintenanceController
{
    private const VALID_MODULES = ['keycode', 'alarmas', 'immo', 'assignments', 'vehicles'];

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

    /**
     * Acepta uno o varios modulos en una sola llamada, todos en una misma
     * transaccion: ?modules=keycode,assignments o body JSON {"modules": [...]}.
     * Tambien soporta ?module=x (un solo modulo) por simplicidad.
     */
    private function purge(Request $request): JsonResponse
    {
        if ($resp = $this->authorize($request)) return $resp;

        $modules = $this->resolveModules($request);
        if (empty($modules)) {
            return ApiResponse::error('Selecciona al menos un modulo. Usa: '.implode(', ', self::VALID_MODULES));
        }

        $unknown = array_diff($modules, self::VALID_MODULES);
        if (!empty($unknown)) {
            return ApiResponse::error('Modulo invalido: '.implode(', ', $unknown).'. Usa: '.implode(', ', self::VALID_MODULES));
        }

        $deleted = [];
        DB::transaction(function () use ($modules, &$deleted): void {
            $moduleSet = array_flip($modules);
            if (isset($moduleSet['keycode'])) $deleted['keycode'] = $this->purgeKeycode();
            if (isset($moduleSet['alarmas'])) $deleted['alarmas'] = $this->purgeAlarmas();
            if (isset($moduleSet['immo'])) $deleted['immo'] = $this->purgeImmo();
            if (isset($moduleSet['assignments'])) $deleted['assignments'] = $this->purgeAssignments();
            if (isset($moduleSet['vehicles'])) $deleted['vehicles'] = $this->purgeVehicles();
        });

        return ApiResponse::success([
            'modules' => $modules,
            'deleted' => $deleted,
        ], count($modules) === 1
            ? 'Módulo purgado correctamente'
            : count($modules).' módulos purgados correctamente');
    }

    private function resolveModules(Request $request): array
    {
        $body = $request->json()->all();
        if (is_array($body['modules'] ?? null)) {
            return array_values(array_unique(array_filter(array_map('strval', $body['modules']))));
        }

        $queryModules = $request->query('modules');
        if (is_string($queryModules) && $queryModules !== '') {
            return array_values(array_unique(array_filter(array_map('trim', explode(',', $queryModules)))));
        }

        $single = $request->query('module');
        return $single ? [$single] : [];
    }

    private function purgeKeycode(): array
    {
        $codes    = DB::table('keycode_codes')->count();
        $profiles = DB::table('keycode_profiles')->count();

        DB::table('keycode_codes')->delete();
        DB::table('keycode_profiles')->delete();

        return ['profiles' => $profiles, 'codes' => $codes];
    }

    private function purgeAlarmas(): array
    {
        $profiles = DB::table('alarma_profiles')->count();
        DB::table('alarma_profiles')->delete();

        return ['profiles' => $profiles];
    }

    private function purgeImmo(): array
    {
        $profiles = DB::table('immo_profiles')->count();
        $catalog  = DB::table('immo_catalog_items')->count();

        DB::table('immo_profiles')->delete();
        DB::table('immo_catalog_items')->delete();

        return ['profiles' => $profiles, 'catalogItems' => $catalog];
    }

    private function purgeAssignments(): array
    {
        $count = DB::table('tool_assignments')->count();
        DB::table('tool_assignments')->delete();

        return ['assignments' => $count];
    }

    private function purgeVehicles(): array
    {
        $count = DB::table('vehicle_database_records')->count();
        DB::table('vehicle_database_records')->delete();

        return ['records' => $count];
    }
}
