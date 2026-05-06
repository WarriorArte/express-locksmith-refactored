<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class TemplateSelectionController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->index($request),
            'POST' => $this->upsert($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function index(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $workshopId = $request->query('workshop_id');
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        return ApiResponse::success(DB::table('workshop_template_selections as wts')
            ->join('templates as t', 't.id', '=', 'wts.template_id')
            ->where('wts.workshop_id', $workshopId)
            ->get(['wts.*', 't.name as template_name', 't.template_type as type']));
    }

    private function upsert(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        foreach (['template_type', 'template_id'] as $field) {
            if (empty($data[$field])) return ApiResponse::error("{$field} es requerido");
        }

        $template = DB::table('templates')->where('id', $data['template_id'])->first(['id', 'is_global', 'workshop_id']);
        if (!$template) return ApiResponse::error('Plantilla no encontrada', 404);
        if (!(int) $template->is_global && $template->workshop_id !== $workshopId) {
            return ApiResponse::error('Plantilla no disponible para este taller', 401);
        }

        $existing = DB::table('workshop_template_selections')
            ->where('workshop_id', $workshopId)
            ->where('template_type', $data['template_type'])
            ->first(['id']);

        if ($existing) {
            DB::table('workshop_template_selections')->where('id', $existing->id)->update([
                'template_id' => $data['template_id'],
                'custom_css' => $data['custom_css'] ?? null,
            ]);
            $id = $existing->id;
        } else {
            $id = (string) Str::uuid();
            DB::table('workshop_template_selections')->insert([
                'id' => $id,
                'workshop_id' => $workshopId,
                'template_type' => $data['template_type'],
                'template_id' => $data['template_id'],
                'custom_css' => $data['custom_css'] ?? null,
            ]);
        }

        return ApiResponse::success(DB::table('workshop_template_selections')->where('id', $id)->first(), 'Seleccion de plantilla actualizada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $row = DB::table('workshop_template_selections')->where('id', $id)->first(['workshop_id']);
        if (!$row) return ApiResponse::error('Seleccion no encontrada', 404);
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $row->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        DB::table('workshop_template_selections')->where('id', $id)->delete();

        return ApiResponse::success(null, 'Seleccion eliminada');
    }
}
