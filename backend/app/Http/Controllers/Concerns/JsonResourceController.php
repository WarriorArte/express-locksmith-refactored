<?php

namespace App\Http\Controllers\Concerns;

use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class JsonResourceController
{
    /** @return class-string<Model> */
    abstract protected function modelClass(): string;

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

    protected function authorizeWrite(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de SuperAdmin', 403);
        }
        return null;
    }

    private function showOrList(Request $request): JsonResponse
    {
        $model = $this->modelClass();
        $id = $request->query('id');
        if ($id) {
            $row = $model::query()->find($id);
            return $row ? ApiResponse::success($this->serialize($row)) : ApiResponse::error('No encontrado', 404);
        }
        $rows = $model::query()->orderBy('created_at', 'desc')->get()
            ->map(fn ($r) => $this->serialize($r));
        return ApiResponse::success($rows);
    }

    private function store(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;
        $payload = $request->json()->all();
        $model = $this->modelClass();
        $row = new $model();
        if (!empty($payload['id'])) $row->id = $payload['id'];
        $row->name = $payload['name'] ?? ($payload['nombre'] ?? null);
        $row->data = $payload;
        if (in_array('workshop_id', $row->getFillable(), true)) {
            $row->workshop_id = $payload['workshop_id'] ?? ($payload['workshopId'] ?? null);
        }
        $row->save();
        return ApiResponse::success($this->serialize($row->refresh()), 'Creado');
    }

    private function update(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;
        $id = $request->query('id') ?? ($request->json('id'));
        if (!$id) return ApiResponse::error('ID requerido');
        $model = $this->modelClass();
        $row = $model::query()->find($id);
        if (!$row) return ApiResponse::error('No encontrado', 404);
        $payload = $request->json()->all();
        $row->name = $payload['name'] ?? ($payload['nombre'] ?? $row->name);
        $row->data = $payload;
        if (in_array('workshop_id', $row->getFillable(), true) && array_key_exists('workshop_id', $payload)) {
            $row->workshop_id = $payload['workshop_id'];
        }
        $row->save();
        return ApiResponse::success($this->serialize($row->refresh()), 'Actualizado');
    }

    private function destroy(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');
        $model = $this->modelClass();
        $row = $model::query()->find($id);
        if (!$row) return ApiResponse::error('No encontrado', 404);
        $row->delete();
        return ApiResponse::success(null, 'Eliminado');
    }

    /** Devuelve el JSON completo + id, para que el frontend reciba la misma forma que guarda. */
    protected function serialize(Model $row): array
    {
        $data = $row->getAttribute('data') ?? [];
        if (!is_array($data)) $data = [];
        $data['id'] = $row->getKey();
        return $data;
    }
}
