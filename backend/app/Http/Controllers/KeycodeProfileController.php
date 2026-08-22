<?php

namespace App\Http\Controllers;

use App\Models\KeycodeProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class KeycodeProfileController
{
    use \App\Http\Controllers\Concerns\AuthorizesTools;

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET'    => $this->showOrList($request),
            'POST'   => $this->store($request),
            'PUT'    => $this->update($request),
            'DELETE' => $this->destroy($request),
            default  => ApiResponse::error('Método no permitido', 405),
        };
    }

    private function authorizeWrite(Request $request): ?JsonResponse
    {
        return $this->authorizeToolsWrite($request);
    }

    // ── GET ──────────────────────────────────────────────────────────────────

    private function showOrList(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeToolsRead($request)) return $resp;

        $id = $request->query('id');

        if ($id) {
            $profile = KeycodeProfile::query()->find($id);
            if (!$profile) return ApiResponse::error('No encontrado', 404);
            return ApiResponse::success($this->serializeFull($profile));
        }

        $profiles   = KeycodeProfile::query()->orderBy('created_at', 'desc')->get();
        $profileIds = $profiles->pluck('id')->all();

        if (empty($profileIds)) {
            return ApiResponse::success([]);
        }

        // Un query para los conteos
        $counts = DB::table('keycode_codes')
            ->whereIn('profile_id', $profileIds)
            ->selectRaw('profile_id, COUNT(*) as total')
            ->groupBy('profile_id')
            ->pluck('total', 'profile_id');

        $valetCounts = DB::table('keycode_valet_codes')
            ->whereIn('profile_id', $profileIds)
            ->selectRaw('profile_id, COUNT(*) as total')
            ->groupBy('profile_id')
            ->pluck('total', 'profile_id');

        // Muestra: el código más bajo de cada perfil, en un solo query (evita
        // hacer una consulta por perfil, que no escala con catálogos grandes).
        $placeholders = implode(',', array_fill(0, count($profileIds), '?'));
        $sampleRows   = collect(DB::select("
            SELECT profile_id, codigo, bitting FROM (
                SELECT profile_id, codigo, bitting,
                       ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY codigo) AS rn
                FROM keycode_codes
                WHERE profile_id IN ($placeholders)
            ) ranked
            WHERE rn = 1
        ", $profileIds))->keyBy('profile_id');


        return ApiResponse::success(
            $profiles->map(function ($p) use ($counts, $valetCounts, $sampleRows) {
                $count      = (int) $counts->get($p->id, 0);
                $valetCount = (int) $valetCounts->get($p->id, 0);
                $row        = $sampleRows->get($p->id);
                $sample     = $row ? [['codigo' => $row->codigo, 'bitting' => str_split($row->bitting)]] : [];
                return $this->serializeList($p, $count, $sample, $valetCount);
            })
        );
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    private function store(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;

        $payload        = $request->json()->all();
        $codesData      = $payload['codesData'] ?? [];
        $valetCodesData = $payload['valetCodesData'] ?? [];
        unset($payload['codesData'], $payload['codesCount'], $payload['codeSample']);
        unset($payload['valetCodesData'], $payload['valetCodesCount']);

        $profile       = new KeycodeProfile();
        if (!empty($payload['id'])) $profile->id = $payload['id'];
        $profile->name = $payload['series'] ?? null;
        $profile->data = $payload;
        $profile->save();

        $this->replaceCodes($profile->id, $codesData);
        if (!empty($valetCodesData)) $this->replaceValetCodes($profile->id, $valetCodesData);

        $count      = count($codesData);
        $valetCount = count($valetCodesData);
        $sample     = $this->buildSampleFromArray($codesData);
        return ApiResponse::success($this->serializeList($profile->refresh(), $count, $sample, $valetCount), 'Creado');
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    private function update(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;

        $id = $request->query('id') ?? $request->json('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $profile = KeycodeProfile::query()->find($id);
        if (!$profile) return ApiResponse::error('No encontrado', 404);

        $payload        = $request->json()->all();
        $codesData      = $payload['codesData'] ?? null;
        $valetCodesData = $payload['valetCodesData'] ?? null;
        unset($payload['codesData'], $payload['codesCount'], $payload['codeSample']);
        unset($payload['valetCodesData'], $payload['valetCodesCount']);

        $profile->name = $payload['series'] ?? $profile->name;
        $profile->data = $payload;
        $profile->save();

        if ($codesData !== null) {
            $this->replaceCodes($id, $codesData);
        }
        if ($valetCodesData !== null) {
            $this->replaceValetCodes($id, $valetCodesData);
        }

        $count      = DB::table('keycode_codes')->where('profile_id', $id)->count();
        $valetCount = DB::table('keycode_valet_codes')->where('profile_id', $id)->count();
        $minRow     = DB::table('keycode_codes')->where('profile_id', $id)->orderBy('codigo')->first(['codigo', 'bitting']);
        $sample     = $minRow ? [['codigo' => $minRow->codigo, 'bitting' => str_split($minRow->bitting)]] : [];

        return ApiResponse::success($this->serializeList($profile->refresh(), $count, $sample, $valetCount), 'Actualizado');
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    private function destroy(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;

        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $profile = KeycodeProfile::query()->find($id);
        if (!$profile) return ApiResponse::error('No encontrado', 404);

        DB::table('keycode_codes')->where('profile_id', $id)->delete();
        DB::table('keycode_valet_codes')->where('profile_id', $id)->delete();
        $profile->delete();

        return ApiResponse::success(null, 'Eliminado');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function replaceCodes(string $profileId, array $codesData): void
    {
        // delete + inserts en una transacción: evita que un lector concurrente
        // vea el perfil momentáneamente vacío entre el borrado y la reinserción.
        DB::transaction(function () use ($profileId, $codesData) {
            DB::table('keycode_codes')->where('profile_id', $profileId)->delete();
            $this->insertCodes('keycode_codes', $profileId, $codesData);
        });
    }

    private function replaceValetCodes(string $profileId, array $codesData): void
    {
        DB::transaction(function () use ($profileId, $codesData) {
            DB::table('keycode_valet_codes')->where('profile_id', $profileId)->delete();
            $this->insertCodes('keycode_valet_codes', $profileId, $codesData);
        });
    }

    /** Inserta ignorando duplicados de la PK compuesta (profile_id, codigo). */
    private function insertCodes(string $table, string $profileId, array $codesData): void
    {
        $rows = [];
        foreach ($codesData as $c) {
            $codigo = (string) ($c['codigo'] ?? '');
            if ($codigo === '') continue;
            $bitting = is_array($c['bitting'] ?? null) ? implode('', $c['bitting']) : (string) ($c['bitting'] ?? '');
            $rows[]  = ['profile_id' => $profileId, 'codigo' => $codigo, 'bitting' => $bitting];
            if (count($rows) >= 2000) {
                DB::table($table)->insertOrIgnore($rows);
                $rows = [];
            }
        }
        if (!empty($rows)) DB::table($table)->insertOrIgnore($rows);
    }


    private function buildSampleFromArray(array $codesData): array
    {
        if (empty($codesData)) return [];
        $c       = $codesData[0];
        $bitting = is_array($c['bitting']) ? $c['bitting'] : str_split($c['bitting'] ?? '');
        return [['codigo' => $c['codigo'] ?? '', 'bitting' => $bitting]];
    }

    private function serializeFull(KeycodeProfile $profile): array
    {
        $rows  = DB::table('keycode_codes')
            ->where('profile_id', $profile->id)
            ->orderBy('codigo')
            ->get(['codigo', 'bitting']);

        $codes = $rows->map(fn($r) => ['codigo' => $r->codigo, 'bitting' => str_split($r->bitting)])->all();
        $count = count($codes);

        $valetRows = DB::table('keycode_valet_codes')
            ->where('profile_id', $profile->id)
            ->orderBy('codigo')
            ->get(['codigo', 'bitting']);
        $valetCodes = $valetRows->map(fn($r) => ['codigo' => $r->codigo, 'bitting' => str_split($r->bitting)])->all();

        $data                    = $profile->getAttribute('data') ?? [];
        $data['id']              = $profile->getKey();
        $data['codesData']       = $codes;
        $data['codesCount']      = $count;
        $data['codeSample']      = $count > 0 ? [$codes[intdiv($count, 2)]] : [];
        $data['valetCodesData']  = $valetCodes;
        $data['valetCodesCount'] = count($valetCodes);
        return $data;
    }

    private function serializeList(KeycodeProfile $profile, int $count, array $sample, int $valetCount = 0): array
    {
        $data                    = $profile->getAttribute('data') ?? [];
        $data['id']              = $profile->getKey();
        $data['codesData']       = [];
        $data['codesCount']      = $count;
        $data['codeSample']      = $sample;
        $data['valetCodesData']  = [];
        $data['valetCodesCount'] = $valetCount;
        return $data;
    }
}
