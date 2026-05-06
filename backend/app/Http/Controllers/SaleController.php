<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SaleController
{
    private const FIELDS = ['customer_id', 'customer_name', 'subtotal', 'discount', 'total', 'payment_method', 'notes', 'has_warranty'];

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
            $sale = $this->fetchFull($id);
            if (!$sale) return ApiResponse::error('Venta no encontrada', 404);
            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $sale['workshop_id'])) {
                return ApiResponse::error('Sin acceso al taller indicado', 401);
            }
            return ApiResponse::success($sale);
        }

        $workshopId = $request->query('workshop_id');
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $sales = DB::table('sales as s')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->where('s.workshop_id', $workshopId)
            ->orderByDesc('s.created_at')
            ->get(['s.*', 'c.name as cust_name', 'c.phone as cust_phone'])
            ->map(fn ($row) => (array) $row)
            ->all();

        if ($sales !== []) {
            $itemsMap = $this->itemsBySaleIds(array_column($sales, 'id'));
            foreach ($sales as &$sale) {
                $sale['sale_items'] = $itemsMap[$sale['id']] ?? [];
                $sale['customer'] = $sale['cust_name'] ? ['name' => $sale['cust_name'], 'phone' => $sale['cust_phone']] : null;
                unset($sale['cust_name'], $sale['cust_phone']);
            }
            unset($sale);
        }

        return ApiResponse::success($sales);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }
        if (empty($data['sale_number'])) return ApiResponse::error('sale_number es requerido');

        $id = (string) Str::uuid();
        DB::transaction(function () use ($id, $workshopId, $data, $authUser): void {
            DB::table('sales')->insert([
                'id' => $id,
                'workshop_id' => $workshopId,
                'sale_number' => $data['sale_number'],
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'] ?? null,
                'subtotal' => (float) ($data['subtotal'] ?? 0),
                'discount' => (float) ($data['discount'] ?? 0),
                'total' => (float) ($data['total'] ?? 0),
                'payment_method' => $data['payment_method'] ?? 'cash',
                'notes' => $data['notes'] ?? null,
                'has_warranty' => (int) ($data['has_warranty'] ?? 0),
                'created_by' => $authUser['user_id'],
            ]);

            if (!empty($data['items']) && is_array($data['items'])) {
                $this->replaceItems($id, $data['items']);
            }

            if (!empty($data['customer_id'])) {
                DB::table('customers')->where('id', $data['customer_id'])->increment('total_purchases', (float) ($data['total'] ?? 0));
            }
        });

        return ApiResponse::success($this->fetchFull($id), 'Venta creada');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $sale = DB::table('sales')->where('id', $id)->first(['workshop_id']);
        if (!$sale) return ApiResponse::error('Venta no encontrada', 404);
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $sale->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 401);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(self::FIELDS));

        DB::transaction(function () use ($id, $updates, $data): void {
            if ($updates !== []) {
                DB::table('sales')->where('id', $id)->update($updates);
            }
            if (array_key_exists('items', $data)) {
                $this->replaceItems($id, is_array($data['items']) ? $data['items'] : []);
            }
        });

        return ApiResponse::success($this->fetchFull($id), 'Venta actualizada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $sale = DB::table('sales')->where('id', $id)->first(['workshop_id', 'customer_id', 'total']);
        if (!$sale) return ApiResponse::error('Venta no encontrada', 404);
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $sale->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        DB::transaction(function () use ($id, $sale): void {
            DB::table('sales')->where('id', $id)->delete();
            if ($sale->customer_id) {
                DB::table('customers')->where('id', $sale->customer_id)->update([
                    'total_purchases' => DB::raw('GREATEST(0, total_purchases - '.(float) $sale->total.')'),
                ]);
            }
        });

        return ApiResponse::success(null, 'Venta eliminada');
    }

    private function fetchFull(string $id): ?array
    {
        $row = DB::table('sales as s')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->where('s.id', $id)
            ->first(['s.*', 'c.id as cust_id', 'c.name as cust_name', 'c.phone as cust_phone', 'c.email as cust_email']);

        if (!$row) return null;
        $sale = (array) $row;
        $sale['customer'] = $sale['cust_id'] ? [
            'id' => $sale['cust_id'],
            'name' => $sale['cust_name'],
            'phone' => $sale['cust_phone'],
            'email' => $sale['cust_email'],
        ] : null;
        foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email'] as $key) unset($sale[$key]);

        $sale['sale_items'] = $this->itemsBySaleIds([$id])[$id] ?? [];
        return $sale;
    }

    private function itemsBySaleIds(array $ids): array
    {
        if ($ids === []) return [];
        $map = [];
        $rows = DB::table('sale_items as si')
            ->leftJoin('products as p', 'p.id', '=', 'si.product_id')
            ->whereIn('si.sale_id', $ids)
            ->get(['si.*', 'p.name as p_name']);
        foreach ($rows as $row) {
            $item = (array) $row;
            $map[$item['sale_id']][] = $item;
        }
        return $map;
    }

    private function replaceItems(string $saleId, array $items): void
    {
        DB::table('sale_items')->where('sale_id', $saleId)->delete();
        foreach ($items as $item) {
            DB::table('sale_items')->insert([
                'id' => (string) Str::uuid(),
                'sale_id' => $saleId,
                'product_id' => $item['product_id'] ?? null,
                'product_name' => $item['product_name'] ?? ($item['name'] ?? ''),
                'quantity' => (int) ($item['quantity'] ?? 1),
                'unit_price' => (float) ($item['unit_price'] ?? 0),
                'subtotal' => (float) ($item['subtotal'] ?? 0),
            ]);
        }
    }
}
