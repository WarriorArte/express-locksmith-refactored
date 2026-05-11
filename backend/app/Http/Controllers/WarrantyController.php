<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WarrantyController
{
    /** Punto de entrada legacy — mantiene compatibilidad con el frontend actual */
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->legacyList($request),
            'POST' => $this->store($request),
            'PUT' => $this->update($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    /** GET /api/warranties?workshop_id=&page=1&per_page=50 */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error(
                $workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido',
                $workshopId ? 403 : 400
            );
        }

        $perPage = min((int) $request->query('per_page', 50), 200);

        $paginator = $this->baseQuery()
            ->where('w.workshop_id', $workshopId)
            ->orderByDesc('w.created_at')
            ->paginate($perPage);

        $items = collect($paginator->items())->map(fn ($row) => $this->shape((array) $row))->all();

        return ApiResponse::paginated($paginator, $items);
    }

    /** GET /api/warranties/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $warranty = $this->fetchFull($id);

        if (!$warranty) {
            return ApiResponse::error('Garantia no encontrada', 404);
        }

        if (!$user->canAccessWorkshop($warranty['workshop_id'])) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        return ApiResponse::success($warranty);
    }

    /** POST — compartido entre legacy y REST */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        foreach (['warranty_code', 'warranty_type', 'warranty_days', 'end_date'] as $field) {
            if (empty($data[$field])) {
                return ApiResponse::error("{$field} es requerido");
            }
        }

        $id = (string) Str::uuid();
        DB::table('warranties')->insert([
            'id' => $id,
            'warranty_code' => $data['warranty_code'],
            'sale_id' => $data['sale_id'] ?? null,
            'service_id' => $data['service_id'] ?? null,
            'customer_id' => $data['customer_id'] ?? null,
            'customer_name' => $data['customer_name'] ?? null,
            'product_name' => $data['product_name'] ?? null,
            'service_description' => $data['service_description'] ?? null,
            'warranty_type' => $data['warranty_type'],
            'warranty_days' => (int) $data['warranty_days'],
            'start_date' => $data['start_date'] ?? now()->format('Y-m-d H:i:s'),
            'end_date' => $data['end_date'],
            'notes' => $data['notes'] ?? null,
            'is_voided' => 0,
            'workshop_id' => $workshopId,
            'created_by' => $user->id,
        ]);

        return ApiResponse::success($this->fetchFull($id), 'Garantia creada');
    }

    /** PUT — compartido entre legacy y REST */
    public function update(Request $request, string $id = ''): JsonResponse
    {
        $user = $request->user();
        $id = $id ?: $request->query('id', '');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $row = DB::table('warranties')->where('id', $id)->first(['workshop_id']);
        if (!$row) {
            return ApiResponse::error('Garantia no encontrada', 404);
        }
        if (!$user->canAccessWorkshop($row->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        $data = $request->json()->all();
        if (!empty($data['void']) || !empty($data['is_voided'])) {
            DB::table('warranties')->where('id', $id)->update([
                'is_voided' => 1,
                'voided_at' => now(),
                'voided_reason' => $data['voided_reason'] ?? null,
            ]);
            return ApiResponse::success($this->fetchFull($id), 'Garantia anulada');
        }

        $updates = array_intersect_key($data, array_flip(['customer_name', 'product_name', 'service_description', 'warranty_days', 'end_date', 'notes']));
        if ($updates === []) {
            return ApiResponse::error('No hay campos para actualizar');
        }

        DB::table('warranties')->where('id', $id)->update($updates);

        return ApiResponse::success($this->fetchFull($id), 'Garantia actualizada');
    }

    /** DELETE — compartido entre legacy y REST */
    public function destroy(Request $request, string $id = ''): JsonResponse
    {
        $user = $request->user();
        $id = $id ?: $request->query('id', '');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $row = DB::table('warranties')->where('id', $id)->first(['workshop_id']);
        if (!$row) {
            return ApiResponse::error('Garantia no encontrada', 404);
        }
        if (!$user->canAdminWorkshop($row->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 403);
        }

        DB::table('warranties')->where('id', $id)->delete();

        return ApiResponse::success(null, 'Garantia eliminada');
    }

    /** Lista legacy con cap de seguridad */
    private function legacyList(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');

        if ($id) {
            return $this->show($request, $id);
        }

        $workshopId = $request->query('workshop_id');
        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        $rows = $this->baseQuery()
            ->where('w.workshop_id', $workshopId)
            ->orderByDesc('w.created_at')
            ->limit(500)
            ->get()
            ->map(fn ($row) => $this->shape((array) $row))
            ->all();

        return ApiResponse::success($rows);
    }

    private function fetchFull(string $id): ?array
    {
        $row = $this->baseQuery()->where('w.id', $id)->first();
        return $row ? $this->shape((array) $row) : null;
    }

    private function baseQuery()
    {
        return DB::table('warranties as w')
            ->leftJoin('customers as c', 'c.id', '=', 'w.customer_id')
            ->leftJoin('sales as s', 's.id', '=', 'w.sale_id')
            ->leftJoin('services as sv', 'sv.id', '=', 'w.service_id')
            ->select('w.*', 'c.id as cust_id', 'c.name as cust_name', 'c.phone as cust_phone', 's.sale_number', 'sv.service_number');
    }

    private function shape(array $row): array
    {
        $row['customer'] = $row['cust_id'] ? ['id' => $row['cust_id'], 'name' => $row['cust_name'], 'phone' => $row['cust_phone']] : null;
        $row['sale'] = $row['sale_number'] ? ['sale_number' => $row['sale_number']] : null;
        $row['service'] = $row['service_number'] ? ['service_number' => $row['service_number']] : null;
        foreach (['cust_id', 'cust_name', 'cust_phone', 'sale_number', 'service_number'] as $key) {
            unset($row[$key]);
        }
        return $row;
    }
}
