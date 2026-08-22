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
 *   partial     búsqueda parcial: secuencia de dígitos que debe aparecer de forma
 *               contigua en el bitting, en cualquier posición (p.ej. "13112433"
 *               encuentra bittings como "433131124332" o "413112433413").
 *   limit/offset paginación (limit máx. 1000, por defecto 300)
 *
 * Respuesta: { total, limit, offset, results: [{ codigo, bitting: [..], valetBitting: [..]|null }] }
 * valetBitting solo se llena en búsqueda por "codigo" cuando existe una
 * contraparte Valet para ese mismo código.
 */
final class KeycodeSearchController
{
    use \App\Http\Controllers\Concerns\AuthorizesTools;

    private const MAX_LIMIT = 1000;

    public function handle(Request $request): JsonResponse
    {
        if ($resp = $this->authorizeToolsRead($request)) return $resp;

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

            // Sin match exacto: compara por el valor numérico puro (ignora prefijos
            // de letras y ceros a la izquierda), p.ej. "8100" == "HA00008100".
            // Solo se paga este costo (sin usar el índice) cuando el match rápido falla.
            if (!$row) {
                $digits = preg_replace('/\D/', '', $codigo) ?? '';
                if ($digits !== '') {
                    $numeric = ltrim($digits, '0');
                    if ($numeric === '') $numeric = '0';
                    $row = DB::table('keycode_codes')
                        ->where('profile_id', $profileId)
                        ->whereRaw("CAST(REGEXP_REPLACE(codigo, '[^0-9]', '') AS UNSIGNED) = ?", [$numeric])
                        ->first(['codigo', 'bitting']);

                    // Nivel 3: el prefijo también tiene dígitos (p.ej. "A70000-A75928",
                    // prefijo "A7"): compara por sufijo exacto de dígitos. Solo se acepta
                    // si hay una única coincidencia posible; si el usuario escribió muy
                    // pocos dígitos y hay varias, no adivinamos (evitaría cortar la llave
                    // equivocada).
                    if (!$row) {
                        $len = strlen($digits);
                        $candidates = DB::table('keycode_codes')
                            ->where('profile_id', $profileId)
                            ->whereRaw("RIGHT(REGEXP_REPLACE(codigo, '[^0-9]', ''), ?) = ?", [$len, $digits])
                            ->limit(2)
                            ->get(['codigo', 'bitting']);
                        if ($candidates->count() === 1) {
                            $row = $candidates->first();
                        }
                    }
                }
            }

            // El código Valet es el mismo texto que el normal, con bitting distinto:
            // si hay match normal, se busca su contraparte valet (si existe) y se
            // adjunta al resultado, marcada como tal.
            $valetBitting = null;
            if ($row) {
                $valetRow = DB::table('keycode_valet_codes')
                    ->where('profile_id', $profileId)
                    ->where('codigo', $row->codigo)
                    ->first(['bitting']);
                $valetBitting = $valetRow->bitting ?? null;
            }

            return ApiResponse::success([
                'total'   => $row ? 1 : 0,
                'limit'   => 1,
                'offset'  => 0,
                'results' => $row ? [$this->serialize($row, $valetBitting)] : [],
            ]);
        }

        $partial = trim((string) $request->query('partial', ''));
        if ($partial !== '') {
            $digits = preg_replace('/\D/', '', $partial) ?? '';
            if ($digits === '') {
                return ApiResponse::error('Se requiere al menos un dígito');
            }

            $limit  = min(max((int) $request->query('limit', 300), 1), self::MAX_LIMIT);
            $offset = max((int) $request->query('offset', 0), 0);

            // Sin índice utilizable (comodín al inicio del LIKE): acotado por profile_id,
            // recorre solo los códigos de esta serie, no toda la tabla.
            $query = DB::table('keycode_codes')
                ->where('profile_id', $profileId)
                ->where('bitting', 'like', '%' . $digits . '%');

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

        $positions = $this->parsePositions($request->query('positions'));
        if ($positions === null) {
            return ApiResponse::error('Se requiere codigo, partial o positions');
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

    private function serialize(object $row, ?string $valetBitting = null): array
    {
        return [
            'codigo'  => $row->codigo,
            'bitting' => str_split($row->bitting),
            'valetBitting' => $valetBitting !== null ? str_split($valetBitting) : null,
        ];
    }
}
