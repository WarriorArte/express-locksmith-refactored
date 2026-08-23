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
 *   codigo      búsqueda exacta por código (respeta multiPrefixes del perfil, ver findCodigo)
 *   positions   JSON: array de longitud = largo del bitting.
 *               Cada posición es null/"" (comodín) o un array de caracteres aceptados
 *               (para el modo ±1 se envían p.ej. ["3","2","4"]).
 *   partial     búsqueda parcial: secuencia de dígitos que debe aparecer de forma
 *               contigua en el bitting, en cualquier posición (p.ej. "13112433"
 *               encuentra bittings como "433131124332" o "413112433413").
 *   limit/offset paginación (limit máx. 1000, por defecto 300)
 *
 * Respuesta: { total, limit, offset, results: [{ codigo, bitting: [..], valetBitting: [..]|null }] }
 * valetBitting se llena (en cualquier tipo de búsqueda) cuando existe una
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
            $row = $this->findCodigo($profileId, $codigo);

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
                'results' => $this->serializeRows($profileId, $rows),
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
            'results' => $this->serializeRows($profileId, $rows),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Busca un código exacto respetando "multi-prefijo": si la serie tiene prefijos
     * registrados (multiPrefixes), los códigos se guardan "pelones" (sin prefijo).
     * Los niveles permisivos (numérico, sufijo) SOLO corren sobre la parte pelona:
     * si el texto tiene alguna letra, esa letra debe coincidir con uno de los
     * prefijos registrados (se quita y se procesa el resto); si no coincide con
     * ninguno, no hay match — nunca se procesan los dígitos ignorando una letra
     * no registrada, porque eso anularía la lista blanca. Sin multiPrefixes,
     * comportamiento de siempre (normalización numérica, sin distinguir prefijos).
     */
    private function findCodigo(string $profileId, string $codigo): ?object
    {
        $term = strtoupper(trim($codigo));
        $multiPrefixes = $this->getMultiPrefixes($profileId);

        if (empty($multiPrefixes)) {
            return $this->findCodigoTiers($profileId, $term);
        }

        // Match exacto tal cual siempre se prueba primero (por si el código
        // guardado coincide 1:1 con lo escrito).
        $exact = DB::table('keycode_codes')
            ->where('profile_id', $profileId)
            ->where('codigo', $term)
            ->first(['codigo', 'bitting']);
        if ($exact) return $exact;

        // Sin ninguna letra: es el código pelón tal cual (sin prefijo), se le
        // aplican los niveles permisivos completos.
        if (!preg_match('/[A-Z]/', $term)) {
            return $this->findCodigoTiers($profileId, $term);
        }

        // Con letras: solo es válido si son exactamente uno de los prefijos
        // registrados. Se prueban del más largo al más corto para prefijos
        // que se puedan solapar (p.ej. "T1" antes que "T").
        $sorted = $multiPrefixes;
        usort($sorted, fn ($a, $b) => strlen($b) <=> strlen($a));
        foreach ($sorted as $prefix) {
            if ($prefix !== '' && str_starts_with($term, $prefix)) {
                $bare = substr($term, strlen($prefix));
                if ($bare === '') continue;
                $row = $this->findCodigoTiers($profileId, $bare);
                if ($row) return $row;
            }
        }

        return null;
    }

    /** Los 3 niveles de normalización de siempre: exacto, numérico puro, sufijo único. */
    private function findCodigoTiers(string $profileId, string $term): ?object
    {
        $row = DB::table('keycode_codes')
            ->where('profile_id', $profileId)
            ->where('codigo', $term)
            ->first(['codigo', 'bitting']);
        if ($row) return $row;

        // Sin match exacto: compara por el valor numérico puro (ignora prefijos
        // de letras y ceros a la izquierda), p.ej. "8100" == "HA00008100".
        // Solo se paga este costo (sin usar el índice) cuando el match rápido falla.
        // Igual que el nivel 3: solo se acepta si hay una única coincidencia posible
        // (series como "K021/L021/M021/N021" comparten el mismo valor numérico con
        // prefijos que sí son parte real del código — ahí no hay que adivinar).
        $digits = preg_replace('/\D/', '', $term) ?? '';
        if ($digits === '') return null;

        $numeric = ltrim($digits, '0');
        if ($numeric === '') $numeric = '0';
        $numericCandidates = DB::table('keycode_codes')
            ->where('profile_id', $profileId)
            ->whereRaw("CAST(REGEXP_REPLACE(codigo, '[^0-9]', '') AS UNSIGNED) = ?", [$numeric])
            ->limit(2)
            ->get(['codigo', 'bitting']);
        if ($numericCandidates->count() === 1) return $numericCandidates->first();

        // Nivel 3: el prefijo también tiene dígitos (p.ej. "A70000-A75928",
        // prefijo "A7"): compara por sufijo exacto de dígitos. Solo se acepta
        // si hay una única coincidencia posible; si el usuario escribió muy
        // pocos dígitos y hay varias, no adivinamos (evitaría cortar la llave
        // equivocada).
        $len = strlen($digits);
        $candidates = DB::table('keycode_codes')
            ->where('profile_id', $profileId)
            ->whereRaw("RIGHT(REGEXP_REPLACE(codigo, '[^0-9]', ''), ?) = ?", [$len, $digits])
            ->limit(2)
            ->get(['codigo', 'bitting']);

        return $candidates->count() === 1 ? $candidates->first() : null;
    }

    /** @return string[] Prefijos registrados para la serie (mayúsculas, sin vacíos). */
    private function getMultiPrefixes(string $profileId): array
    {
        $json = DB::table('keycode_profiles')->where('id', $profileId)->value('data');
        if (!$json) return [];
        $data = json_decode((string) $json, true);
        $prefixes = $data['multiPrefixes'] ?? [];
        if (!is_array($prefixes)) return [];

        return array_values(array_unique(array_filter(array_map(
            fn ($p) => strtoupper(trim((string) $p)),
            $prefixes
        ), fn ($p) => $p !== '')));
    }

    /** Serializa una página de resultados adjuntando el bitting Valet (si existe) por código, en un solo query. */
    private function serializeRows(string $profileId, \Illuminate\Support\Collection $rows): array
    {
        $codigos = $rows->pluck('codigo')->all();
        $valetMap = $codigos === []
            ? []
            : DB::table('keycode_valet_codes')
                ->where('profile_id', $profileId)
                ->whereIn('codigo', $codigos)
                ->pluck('bitting', 'codigo')
                ->all();

        return $rows->map(fn ($r) => $this->serialize($r, $valetMap[$r->codigo] ?? null))->all();
    }

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
