<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WarrantyController
{
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->showOrList($request),
            'POST' => $this->store($request),
            'PUT' => $this->update($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function showOrList(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if ($id) {
            $warranty = $this->fetchFull($id);
            if (!$warranty) return ApiResponse::error('Garantia no encontrada', 404);
            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $warranty['workshop_id'])) return ApiResponse::error('Sin acceso al taller indicado', 401);
            return ApiResponse::success($warranty);
        }

        $workshopId = $request->query('workshop_id');
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);

        $rows = $this->baseQuery()->where('w.workshop_id', $workshopId)->orderByDesc('w.created_at')->get()->map(fn ($row) => $this->shape((array) $row))->all();
        return ApiResponse::success($rows);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);

        foreach (['warranty_code', 'warranty_type', 'warranty_days', 'end_date'] as $field) {
            if (empty($data[$field])) return ApiResponse::error("{$field} es requerido");
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
            'created_by' => $authUser['user_id'],
        ]);

        return ApiResponse::success($this->fetchFull($id), 'Garantia creada');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');
        $row = DB::table('warranties')->where('id', $id)->first(['workshop_id']);
        if (!$row) return ApiResponse::error('Garantia no encontrada', 404);
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $row->workshop_id)) return ApiResponse::error('Sin acceso al taller indicado', 401);

        $data = $request->json()->all();
        if (!empty($data['void']) || !empty($data['is_voided'])) {
            DB::table('warranties')->where('id', $id)->update(['is_voided' => 1, 'voided_at' => now(), 'voided_reason' => $data['voided_reason'] ?? null]);
            return ApiResponse::success($this->fetchFull($id), 'Garantia anulada');
        }

        $updates = array_intersect_key($data, array_flip(['customer_name', 'product_name', 'service_description', 'warranty_days', 'end_date', 'notes']));
        if ($updates === []) return ApiResponse::error('No hay campos para actualizar');
        DB::table('warranties')->where('id', $id)->update($updates);

        return ApiResponse::success($this->fetchFull($id), 'Garantia actualizada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');
        $row = DB::table('warranties')->where('id', $id)->first(['workshop_id']);
        if (!$row) return ApiResponse::error('Garantia no encontrada', 404);
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $row->workshop_id)) return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        DB::table('warranties')->where('id', $id)->delete();
        return ApiResponse::success(null, 'Garantia eliminada');
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
        foreach (['cust_id', 'cust_name', 'cust_phone', 'sale_number', 'service_number'] as $key) unset($row[$key]);
        return $row;
    }
}
