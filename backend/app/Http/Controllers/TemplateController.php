<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class TemplateController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->showOrList($request),
            'POST' => $this->store($request),
            'PUT' => $this->update($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function showOrList(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($id = $request->query('id')) {
            $row = DB::table('templates')->where('id', $id)->first();
            return $row ? ApiResponse::success($row) : ApiResponse::error('Plantilla no encontrada', 404);
        }
        $workshopId = $request->query('workshop_id');
        if (!$user->canAccessWorkshop($workshopId)) return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        $query = DB::table('templates')->where(fn ($q) => $q->where('is_global', 1)->orWhere('workshop_id', $workshopId));
        if ($type = $request->query('template_type')) $query->where('template_type', $type);
        return ApiResponse::success($query->orderByDesc('is_global')->orderBy('template_type')->orderBy('name')->get());
    }

    private function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $isGlobal = !empty($data['is_global']);
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);
        if ($isGlobal) {
            if (!$user->isSuperadmin()) return ApiResponse::error('Se requieren permisos de superadmin', 403);
            $workshopId = null;
        } elseif (!$user->canAdminWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }
        foreach (['name', 'template_type'] as $field) if (empty($data[$field])) return ApiResponse::error("{$field} es requerido");
        $id = (string) Str::uuid();
        DB::table('templates')->insert([
            'id' => $id, 'workshop_id' => $workshopId, 'name' => $data['name'], 'template_type' => $data['template_type'],
            'html_content' => $data['html_content'] ?? null, 'css_content' => $data['css_content'] ?? null,
            'thumbnail_url' => $data['thumbnail_url'] ?? null, 'is_default' => (int) ($data['is_default'] ?? 0), 'is_global' => $isGlobal ? 1 : 0,
        ]);
        return ApiResponse::success(DB::table('templates')->where('id', $id)->first(), 'Plantilla creada');
    }

    private function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');
        $row = DB::table('templates')->where('id', $id)->first(['workshop_id', 'is_global']);
        if (!$row) return ApiResponse::error('Plantilla no encontrada', 404);
        $hasAccess = (int) $row->is_global ? $user->isSuperadmin() : $user->canAdminWorkshop($row->workshop_id);
        if (!$hasAccess) return ApiResponse::error((int) $row->is_global ? 'Se requieren permisos de superadmin' : 'Se requiere rol de administrador en este taller', 403);
        $updates = array_intersect_key($request->json()->all(), array_flip(['name', 'template_type', 'html_content', 'css_content', 'thumbnail_url', 'is_default']));
        if ($updates === []) return ApiResponse::error('No hay campos para actualizar');
        DB::table('templates')->where('id', $id)->update($updates);
        return ApiResponse::success(DB::table('templates')->where('id', $id)->first(), 'Plantilla actualizada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');
        $row = DB::table('templates')->where('id', $id)->first(['workshop_id', 'is_global']);
        if (!$row) return ApiResponse::error('Plantilla no encontrada', 404);
        $hasAccess = (int) $row->is_global ? $user->isSuperadmin() : $user->canAdminWorkshop($row->workshop_id);
        if (!$hasAccess) return ApiResponse::error((int) $row->is_global ? 'Se requieren permisos de superadmin' : 'Se requiere rol de administrador en este taller', 403);
        DB::table('templates')->where('id', $id)->delete();
        return ApiResponse::success(null, 'Plantilla eliminada');
    }
}
