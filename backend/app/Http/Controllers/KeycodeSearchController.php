<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Búsqueda server-side de códigos de keycode.
 *
 * GET /herramientas/keycode-search
 *   profile_id  (requerido)
 *   codigo      búsqueda exacta por código
 *   positions   JSON: array de longitud = largo del bitting.
 *               Cada posición es null/"" (comodín) o un array de caracteres aceptados
 *               (para el modo ±1 se envían p.ej. ["3","2","4"]).
 *   limit/offset paginación (limit máx. 1000, por defecto 300)
 *
 * Respuesta: { total, limit, offset, results: [{ codigo, bitting: [..] }] }
 */
final class KeycodeSearchController
{
    private const MAX_LIMIT = 1000;

    public function handle(Request $request): JsonResponse
    {
        $profileId = (string) $request->query('profile_id', '');
        if ($profileId === '') {
            return ApiResponse::error('profile_id requerido');
        }

        $codigo = trim((string) $request->query('codigo', ''));
        if ($codigo !== '') {
            $row = DB::table('keycode_codes')
                ->where('profile_id', $profileId)
                ->where('codigo', strtoupper($codigo))
                ->first(['codigo', 'bitting']);

            return ApiResponse::success([
                'total'   => $row ? 1 : 0,
                'limit'   => 1,
                'offset'  => 0,
                'results' => $row ? [$this->serialize($row)] : [],
            ]);
        }

        $positions = $this->parsePositions($request->query('positions'));
        if ($positions === null) {
            return ApiResponse::error('Se requiere codigo o positions');
        }

        $limit  = min(max((int) $request->query('limit', 300), 1), self::MAX_LIMIT);
        $offset = max((int) $request->query('offset', 0), 0);

        $query = DB::table('keycode_codes')->where('profile_id', $profileId);
        $this->applyPositions($query, $positions);

        $total = (clone $query)->count();

        $rows = $query
            ->orderBy('codigo')
            ->offset($offset)
            ->limit($limit)
            ->get(['codigo', 'bitting']);

        return ApiResponse::success([
            'total'   => $total,
            'limit'   => $limit,
            'offset'  => $offset,
            'results' => $rows->map(fn ($r) => $this->serialize($r))->all(),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** @return array<int, array<int, string>>|null  Lista de sets aceptados ([] = comodín). */
    private function parsePositions(mixed $raw): ?array
    {
        if (!is_string($raw) || $raw === '') return null;

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || $decoded === []) return null;

        $positions   = [];
        $hasConstraint = false;

        foreach ($decoded as $item) {
            if ($item === null || $item === '' || $item === '?') {
                $positions[] = [];
                continue;
            }
            $chars = is_array($item) ? $item : [$item];
            $set   = [];
            foreach ($chars as $c) {
                $c = strtoupper(substr(trim((string) $c), 0, 1));
                if ($c !== '' && $c !== '?' && preg_match('/^[0-9A-Z]$/', $c)) {
                    $set[$c] = true;
                }
            }
            if ($set === []) {
                $positions[] = [];
                continue;
            }
            $hasConstraint = true;
            $positions[]   = array_keys($set);
        }

        return $hasConstraint ? $positions : null;
    }

    /** Aplica LIKE (aprovecha el índice profile_id+bitting) y REGEXP sólo si hay sets múltiples. */
    private function applyPositions(\Illuminate\Database\Query\Builder $query, array $positions): void
    {
        $like    = '';
        $regex   = '';
        $needsRe = false;

        foreach ($positions as $set) {
            if ($set === []) {
                $like  .= '_';
                $regex .= '.';
                continue;
            }
            if (count($set) === 1) {
                $like  .= $set[0];
                $regex .= preg_quote($set[0], '/');
                continue;
            }
            $needsRe = true;
            $like   .= '_';
            $regex  .= '[' . implode('', $set) . ']';
        }

        $query->where('bitting', 'like', $like);

        if ($needsRe) {
            $query->whereRaw('bitting REGEXP ?', ['^' . $regex . '$']);
        }
    }

    private function serialize(object $row): array
    {
        return [
            'codigo'  => $row->codigo,
            'bitting' => str_split($row->bitting),
        ];
    }
}
