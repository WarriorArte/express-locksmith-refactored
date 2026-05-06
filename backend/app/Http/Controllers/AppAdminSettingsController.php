<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AppAdminSettingsController
{
    public function handle(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        if (!LegacyAuth::isSuperadmin($authUser)) return ApiResponse::error('Se requieren permisos de superadmin', 401);

        return match ($request->method()) {
            'GET' => ApiResponse::success(DB::table('appadmin_settings')->first()),
            'PUT' => $this->update($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function update(Request $request): JsonResponse
    {
        $data = $request->json()->all();
        $existing = DB::table('appadmin_settings')->first(['id']);

        if (!$existing) {
            DB::table('appadmin_settings')->insert([
                'id' => (string) Str::uuid(),
                'storage_endpoint' => $data['storage_endpoint'] ?? null,
                'storage_api_key_encrypted' => null,
            ]);
        } else {
            DB::table('appadmin_settings')->where('id', $existing->id)->update([
                'storage_endpoint' => array_key_exists('storage_endpoint', $data) ? $data['storage_endpoint'] : DB::raw('storage_endpoint'),
                'storage_api_key_encrypted' => null,
            ]);
        }

        return ApiResponse::success(DB::table('appadmin_settings')->first(), 'Configuracion global actualizada');
    }
}
