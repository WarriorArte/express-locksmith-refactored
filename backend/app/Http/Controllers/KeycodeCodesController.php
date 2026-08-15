<?php

namespace App\Http\Controllers;

use App\Models\KeycodeProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Carga por lotes (chunks) de códigos de una serie keycode.
 *
 * POST /herramientas/keycode-codes
 * body: {
 *   profile_id: string,
 *   mode: "replace" | "append",   // replace borra los códigos previos antes de insertar
 *   codes: [{ codigo: string, bitting: string|string[] }, ...]
 * }
 *
 * Permite subir series de 100k+ registros en fragmentos pequeños
 * sin superar límites de payload / tiempo de ejecución de PHP.
 */
final class KeycodeCodesController
{
    use \App\Http\Controllers\Concerns\AuthorizesTools;

    public function handle(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeToolsWrite($request)) return $resp;

        $profileId = (string) ($request->json('profile_id') ?? '');
        $mode      = (string) ($request->json('mode') ?? 'append');
        $codes     = $request->json('codes') ?? [];

        if ($profileId === '') return ApiResponse::error('profile_id requerido');
        if (!is_array($codes)) return ApiResponse::error('codes debe ser un arreglo');

        if (!KeycodeProfile::query()->whereKey($profileId)->exists()) {
            return ApiResponse::error('Perfil no encontrado', 404);
        }

        if ($mode === 'replace') {
            DB::table('keycode_codes')->where('profile_id', $profileId)->delete();
        }

        $inserted = 0;
        $rows     = [];
        foreach ($codes as $c) {
            $codigo = (string) ($c['codigo'] ?? '');
            if ($codigo === '') continue;
            $bitting = is_array($c['bitting'] ?? null)
                ? implode('', $c['bitting'])
                : (string) ($c['bitting'] ?? '');
            $rows[] = ['profile_id' => $profileId, 'codigo' => $codigo, 'bitting' => $bitting];
            if (count($rows) >= 2000) {
                DB::table('keycode_codes')->insertOrIgnore($rows);
                $inserted += count($rows);
                $rows = [];
            }
        }
        if (!empty($rows)) {
            DB::table('keycode_codes')->insertOrIgnore($rows);
            $inserted += count($rows);
        }

        $total = DB::table('keycode_codes')->where('profile_id', $profileId)->count();

        return ApiResponse::success(['inserted' => $inserted, 'total' => $total], 'OK');
    }
}
