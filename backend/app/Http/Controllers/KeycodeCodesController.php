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
 *   dataset: "normal" | "valet",  // opcional, default "normal"
 *   codes: [{ codigo: string, bitting: string|string[] }, ...]
 * }
 *
 * Permite subir series de 100k+ registros en fragmentos pequeños
 * sin superar límites de payload / tiempo de ejecución de PHP.
 */
final class KeycodeCodesController
{
    use \App\Http\Controllers\Concerns\AuthorizesTools;

    private const TABLES = [
        'normal' => 'keycode_codes',
        'valet'  => 'keycode_valet_codes',
    ];

    public function handle(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeToolsWrite($request)) return $resp;

        $profileId = (string) ($request->json('profile_id') ?? '');
        $mode      = (string) ($request->json('mode') ?? 'append');
        $codes     = $request->json('codes') ?? [];
        $dataset   = (string) ($request->json('dataset') ?? 'normal');
        $table     = self::TABLES[$dataset] ?? null;

        if ($profileId === '') return ApiResponse::error('profile_id requerido');
        if (!is_array($codes)) return ApiResponse::error('codes debe ser un arreglo');
        if (!$table) return ApiResponse::error('dataset invalido');

        if (!KeycodeProfile::query()->whereKey($profileId)->exists()) {
            return ApiResponse::error('Perfil no encontrado', 404);
        }

        // El delete (si aplica) y los inserts del lote van en una sola transacción:
        // así un lector concurrente nunca ve el perfil momentáneamente sin códigos
        // entre el "replace" y el insert que le sigue.
        $inserted = 0;
        DB::transaction(function () use ($mode, $profileId, $codes, $table, &$inserted) {
            if ($mode === 'replace') {
                DB::table($table)->where('profile_id', $profileId)->delete();
            }

            $rows = [];
            foreach ($codes as $c) {
                $codigo = (string) ($c['codigo'] ?? '');
                if ($codigo === '') continue;
                $bitting = is_array($c['bitting'] ?? null)
                    ? implode('', $c['bitting'])
                    : (string) ($c['bitting'] ?? '');
                $rows[] = ['profile_id' => $profileId, 'codigo' => $codigo, 'bitting' => $bitting];
                if (count($rows) >= 2000) {
                    DB::table($table)->insertOrIgnore($rows);
                    $inserted += count($rows);
                    $rows = [];
                }
            }
            if (!empty($rows)) {
                DB::table($table)->insertOrIgnore($rows);
                $inserted += count($rows);
            }
        });

        $total = DB::table($table)->where('profile_id', $profileId)->count();

        return ApiResponse::success(['inserted' => $inserted, 'total' => $total], 'OK');
    }
}
