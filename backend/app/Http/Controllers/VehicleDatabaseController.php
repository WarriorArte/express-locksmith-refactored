<?php

namespace App\Http\Controllers;

use App\Models\VehicleDatabaseRecord;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class VehicleDatabaseController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->index(),
            'POST' => $this->bulkReplace($request),
            'DELETE' => $this->truncate($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function index(): JsonResponse
    {
        $rows = VehicleDatabaseRecord::query()
            ->orderBy('make')->orderBy('model')->orderBy('year')
            ->get(['make as Make', 'model as Model', 'year as Year', 'category as Category']);

        return ApiResponse::success(['results' => $rows]);
    }

    private function authorize(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de SuperAdmin', 403);
        }
        return null;
    }

    private function bulkReplace(Request $request): JsonResponse
    {
        if ($resp = $this->authorize($request)) return $resp;

        $records = $request->json('results');
        if (!is_array($records)) {
            return ApiResponse::error('Campo results[] requerido');
        }

        DB::transaction(function () use ($records): void {
            VehicleDatabaseRecord::query()->delete();

            $rows = [];
            $seen = [];
            foreach ($records as $r) {
                $make = trim((string)($r['Make'] ?? ''));
                if ($make === '') continue;
                $model = trim((string)($r['Model'] ?? ''));
                $year = (int)($r['Year'] ?? 0);
                $key = strtolower($make.'|'.$model.'|'.$year);
                if (isset($seen[$key])) continue;
                $seen[$key] = true;
                $rows[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'make' => $make,
                    'model' => $model,
                    'year' => $year,
                    'category' => $r['Category'] ?? null,
                    'created_at' => now(),
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                VehicleDatabaseRecord::query()->insert($chunk);
            }
        });

        return ApiResponse::success(['count' => VehicleDatabaseRecord::query()->count()], 'Base de vehiculos sincronizada');
    }

    private function truncate(Request $request): JsonResponse
    {
        if ($resp = $this->authorize($request)) return $resp;
        VehicleDatabaseRecord::query()->delete();
        return ApiResponse::success(null, 'Base de vehiculos vaciada');
    }
}
