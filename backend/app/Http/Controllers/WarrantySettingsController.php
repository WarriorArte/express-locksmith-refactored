<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WarrantySettingsController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->show($request),
            'PUT' => $request->query('action') ? ApiResponse::error('Metodo no permitido', 405) : $this->upsertSettings($request),
            'POST' => $request->query('action') === 'category' ? $this->upsertCategory($request) : ApiResponse::error('Metodo no permitido', 405),
            'DELETE' => $request->query('action') === 'category' ? $this->deleteCategory($request) : ApiResponse::error('Metodo no permitido', 405),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');
        if (!$user->canAccessWorkshop($workshopId)) return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);

        return ApiResponse::success([
            'warranty_settings' => DB::table('warranty_settings')->where('workshop_id', $workshopId)->first(),
            'warranty_category_settings' => DB::table('warranty_category_settings as wcs')
                ->join('categories as c', 'c.id', '=', 'wcs.category_id')
                ->where('wcs.workshop_id', $workshopId)
                ->orderBy('c.name')
                ->get(['wcs.*', 'c.name as category_name', 'c.color as category_color']),
        ]);
    }

    private function upsertSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);
        if (!$user->canAdminWorkshop($workshopId)) return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 403 : 400);

        $fields = ['default_warranty_days', 'default_service_warranty_days', 'terms_conditions', 'coverage_policy_products', 'coverage_policy_services'];
        $existing = DB::table('warranty_settings')->where('workshop_id', $workshopId)->first();
        if ($existing) {
            $updates = array_intersect_key($data, array_flip($fields));
            if ($updates === []) return ApiResponse::error('No hay campos para actualizar');
            DB::table('warranty_settings')->where('id', $existing->id)->update($updates);
        } else {
            DB::table('warranty_settings')->insert([
                'id' => (string) Str::uuid(),
                'workshop_id' => $workshopId,
                'default_warranty_days' => $data['default_warranty_days'] ?? 30,
                'default_service_warranty_days' => $data['default_service_warranty_days'] ?? 30,
                'terms_conditions' => $data['terms_conditions'] ?? null,
                'coverage_policy_products' => $data['coverage_policy_products'] ?? null,
                'coverage_policy_services' => $data['coverage_policy_services'] ?? null,
            ]);
        }

        return ApiResponse::success(DB::table('warranty_settings')->where('workshop_id', $workshopId)->first(), 'Configuracion de garantias actualizada');
    }

    private function upsertCategory(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);
        if (!$user->canAdminWorkshop($workshopId)) return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        if (empty($data['category_id'])) return ApiResponse::error('category_id es requerido');
        if (!isset($data['warranty_days'])) return ApiResponse::error('warranty_days es requerido');

        $existing = DB::table('warranty_category_settings')->where('category_id', $data['category_id'])->where('workshop_id', $workshopId)->first();
        if ($existing) {
            DB::table('warranty_category_settings')->where('id', $existing->id)->update(['warranty_days' => (int) $data['warranty_days']]);
        } else {
            DB::table('warranty_category_settings')->insert([
                'id' => (string) Str::uuid(),
                'category_id' => $data['category_id'],
                'workshop_id' => $workshopId,
                'warranty_days' => (int) $data['warranty_days'],
            ]);
        }

        return ApiResponse::success(null, 'Configuracion de categoria actualizada');
    }

    private function deleteCategory(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');
        $row = DB::table('warranty_category_settings')->where('id', $id)->first(['workshop_id']);
        if (!$row) return ApiResponse::error('Configuracion no encontrada', 404);
        if (!$user->canAdminWorkshop($row->workshop_id)) return ApiResponse::error('Se requiere rol de administrador en este taller', 403);
        DB::table('warranty_category_settings')->where('id', $id)->delete();
        return ApiResponse::success(null, 'Configuracion eliminada');
    }
}
