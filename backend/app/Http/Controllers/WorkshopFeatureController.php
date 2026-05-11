<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WorkshopFeatureController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->index($request),
            'PUT' => $this->upsert($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');
        if (!$user->canAccessWorkshop($workshopId)) return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);

        return ApiResponse::success(DB::table('workshop_features')->where('workshop_id', $workshopId)->orderBy('feature_key')->get(['id', 'feature_key', 'is_enabled', 'settings', 'created_at']));
    }

    private function upsert(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');
        if (!$user->canAdminWorkshop($workshopId)) return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 403 : 400);

        $data = $request->json()->all();
        if (empty($data['feature_key'])) return ApiResponse::error('feature_key es requerido');

        $payload = [
            'is_enabled' => isset($data['is_enabled']) ? (int) (bool) $data['is_enabled'] : 1,
            'settings' => isset($data['settings']) ? json_encode($data['settings']) : null,
        ];

        $existing = DB::table('workshop_features')->where('workshop_id', $workshopId)->where('feature_key', $data['feature_key'])->first(['id']);
        if ($existing) {
            DB::table('workshop_features')->where('id', $existing->id)->update($payload);
        } else {
            DB::table('workshop_features')->insert($payload + [
                'id' => (string) Str::uuid(),
                'workshop_id' => $workshopId,
                'feature_key' => $data['feature_key'],
            ]);
        }

        return ApiResponse::success(DB::table('workshop_features')->where('workshop_id', $workshopId)->where('feature_key', $data['feature_key'])->first(), 'Feature actualizada');
    }
}
