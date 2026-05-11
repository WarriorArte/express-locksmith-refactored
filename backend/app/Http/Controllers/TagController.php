<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TagController
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
        $id = $request->query('id');

        if ($id) {
            $tag = Tag::query()->find($id);
            if (!$tag) {
                return ApiResponse::error('Etiqueta no encontrada', 404);
            }
            if (!$user->canAccessWorkshop($tag->workshop_id)) {
                return ApiResponse::error('Sin acceso al taller indicado', 403);
            }
            return ApiResponse::success($tag);
        }

        $workshopId = $request->query('workshop_id');
        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        return ApiResponse::success(Tag::query()->where('workshop_id', $workshopId)->orderBy('name')->get());
    }

    private function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!$user->canAdminWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        if (empty($data['name'])) {
            return ApiResponse::error('El campo name es requerido');
        }

        $tag = Tag::query()->create([
            'workshop_id' => $workshopId,
            'name' => $data['name'],
            'color' => $data['color'] ?? '#6366f1',
        ]);

        return ApiResponse::success($tag->refresh(), 'Etiqueta creada');
    }

    private function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');
        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $tag = Tag::query()->find($id);
        if (!$tag) {
            return ApiResponse::error('Etiqueta no encontrada', 404);
        }
        if (!$user->canAdminWorkshop($tag->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 403);
        }

        $updates = array_intersect_key($request->json()->all(), array_flip(['name', 'color']));
        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        $tag->fill($updates)->save();

        return ApiResponse::success($tag->refresh(), 'Etiqueta actualizada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');
        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $tag = Tag::query()->find($id);
        if (!$tag) {
            return ApiResponse::error('Etiqueta no encontrada', 404);
        }
        if (!$user->canAdminWorkshop($tag->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 403);
        }

        $tag->delete();

        return ApiResponse::success(null, 'Etiqueta eliminada');
    }
}
