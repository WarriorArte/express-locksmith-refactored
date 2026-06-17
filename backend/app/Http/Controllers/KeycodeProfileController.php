<?php

namespace App\Http\Controllers;

use App\Models\KeycodeProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class KeycodeProfileController
{
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
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Se requieren permisos de SuperAdmin', 403);
        }
        return null;
    }

    // ── GET ──────────────────────────────────────────────────────────────────

    private function showOrList(Request $request): JsonResponse
    {
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

        // Dos queries para las muestras: ids mínimos → filas
        $minIds = DB::table('keycode_codes')
            ->whereIn('profile_id', $profileIds)
            ->selectRaw('MIN(id) as min_id')
            ->groupBy('profile_id')
            ->pluck('min_id');

        $sampleRows = DB::table('keycode_codes')
            ->whereIn('id', $minIds)
            ->select('profile_id', 'codigo', 'bitting')
            ->get()
            ->keyBy('profile_id');

        return ApiResponse::success(
            $profiles->map(function ($p) use ($counts, $sampleRows) {
                $count  = (int) $counts->get($p->id, 0);
                $row    = $sampleRows->get($p->id);
                $sample = $row ? [['codigo' => $row->codigo, 'bitting' => str_split($row->bitting)]] : [];
                return $this->serializeList($p, $count, $sample);
            })
        );
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    private function store(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;

        $payload   = $request->json()->all();
        $codesData = $payload['codesData'] ?? [];
        unset($payload['codesData'], $payload['codesCount'], $payload['codeSample']);

        $profile       = new KeycodeProfile();
        if (!empty($payload['id'])) $profile->id = $payload['id'];
        $profile->name = $payload['series'] ?? null;
        $profile->data = $payload;
        $profile->save();

        $this->replaceCodes($profile->id, $codesData);

        $count  = count($codesData);
        $sample = $this->buildSampleFromArray($codesData);
        return ApiResponse::success($this->serializeList($profile->refresh(), $count, $sample), 'Creado');
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    private function update(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeWrite($request)) return $resp;

        $id = $request->query('id') ?? $request->json('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $profile = KeycodeProfile::query()->find($id);
        if (!$profile) return ApiResponse::error('No encontrado', 404);

        $payload   = $request->json()->all();
        $codesData = $payload['codesData'] ?? null;
        unset($payload['codesData'], $payload['codesCount'], $payload['codeSample']);

        $profile->name = $payload['series'] ?? $profile->name;
        $profile->data = $payload;
        $profile->save();

        if ($codesData !== null) {
            $this->replaceCodes($id, $codesData);
        }

        $count  = DB::table('keycode_codes')->where('profile_id', $id)->count();
        $minRow = DB::table('keycode_codes')->where('profile_id', $id)->orderBy('id')->first(['codigo', 'bitting']);
        $sample = $minRow ? [['codigo' => $minRow->codigo, 'bitting' => str_split($minRow->bitting)]] : [];

        return ApiResponse::success($this->serializeList($profile->refresh(), $count, $sample), 'Actualizado');
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
        $profile->delete();

        return ApiResponse::success(null, 'Eliminado');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function replaceCodes(string $profileId, array $codesData): void
    {
        DB::table('keycode_codes')->where('profile_id', $profileId)->delete();

        $rows = [];
        foreach ($codesData as $c) {
            $bitting = is_array($c['bitting']) ? implode('', $c['bitting']) : ($c['bitting'] ?? '');
            $rows[]  = ['profile_id' => $profileId, 'codigo' => $c['codigo'] ?? '', 'bitting' => $bitting];
            if (count($rows) >= 500) {
                DB::table('keycode_codes')->insert($rows);
                $rows = [];
            }
        }
        if (!empty($rows)) DB::table('keycode_codes')->insert($rows);
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

        $data               = $profile->getAttribute('data') ?? [];
        $data['id']         = $profile->getKey();
        $data['codesData']  = $codes;
        $data['codesCount'] = $count;
        $data['codeSample'] = $count > 0 ? [$codes[intdiv($count, 2)]] : [];
        return $data;
    }

    private function serializeList(KeycodeProfile $profile, int $count, array $sample): array
    {
        $data               = $profile->getAttribute('data') ?? [];
        $data['id']         = $profile->getKey();
        $data['codesData']  = [];
        $data['codesCount'] = $count;
        $data['codeSample'] = $sample;
        return $data;
    }
}
