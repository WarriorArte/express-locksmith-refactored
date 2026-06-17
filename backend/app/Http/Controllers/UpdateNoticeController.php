<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class UpdateNoticeController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->show($request),
            'PUT' => $this->publish($request),
            'DELETE' => $this->deactivate($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $includeInactive = (bool) $request->boolean('include_inactive');

        if ($includeInactive && (!$user || !$user->isSuperadmin())) {
            return ApiResponse::error('Se requieren permisos de superadmin', 403);
        }

        $query = DB::table('update_notices')->where('singleton_guard', 1);

        if (!$includeInactive) {
            $query->where('is_active', 1);
        }

        return ApiResponse::success($query->first());
    }

    private function publish(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de superadmin', 403);
        }

        $data = $request->json()->all();
        $title = trim((string) ($data['title'] ?? ''));
        $body = trim((string) ($data['body'] ?? ''));

        if ($title === '') {
            return ApiResponse::error('El titulo es requerido');
        }

        $payload = [
            'title' => Str::limit($title, 160, ''),
            'body' => $body !== '' ? $body : null,
            'is_active' => isset($data['is_active']) ? (int) (bool) $data['is_active'] : 1,
            'force_refresh' => isset($data['force_refresh']) ? (int) (bool) $data['force_refresh'] : 0,
            'notice_key' => (string) Str::uuid(),
            'created_by' => $user->id,
            'published_at' => now(),
            'updated_at' => now(),
        ];

        $existing = DB::table('update_notices')->where('singleton_guard', 1)->first(['id']);

        if ($existing) {
            DB::table('update_notices')->where('id', $existing->id)->update($payload);
        } else {
            DB::table('update_notices')->insert($payload + [
                'id' => (string) Str::uuid(),
                'singleton_guard' => 1,
                'created_at' => now(),
            ]);
        }

        return ApiResponse::success(
            DB::table('update_notices')->where('singleton_guard', 1)->first(),
            'Aviso de actualizacion publicado',
        );
    }

    private function deactivate(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de superadmin', 403);
        }

        DB::table('update_notices')->where('singleton_guard', 1)->update([
            'is_active' => 0,
            'updated_at' => now(),
        ]);

        return ApiResponse::success(null, 'Aviso de actualizacion desactivado');
    }
}
