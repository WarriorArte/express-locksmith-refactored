<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class QuoteController
{
    private const FIELDS = [
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_address',
        'description',
        'location',
        'status',
        'subtotal',
        'discount',
        'total',
        'validity_days',
        'valid_until',
        'policies',
        'notes',
    ];

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
            $quote = $this->fetchFull($id);
            if (!$quote) {
                return ApiResponse::error('Cotizacion no encontrada', 404);
            }
            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $quote['workshop_id'])) {
                return ApiResponse::error('Sin acceso al taller indicado', 401);
            }
            return ApiResponse::success($quote);
        }

        $workshopId = $request->query('workshop_id');
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $quotes = DB::table('quotes as q')
            ->leftJoin('customers as c', 'c.id', '=', 'q.customer_id')
            ->where('q.workshop_id', $workshopId)
            ->orderByDesc('q.created_at')
            ->get(['q.*', 'c.name as cust_name', 'c.phone as cust_phone'])
            ->map(fn ($row) => (array) $row)
            ->all();

        if ($quotes !== []) {
            $itemsMap = $this->itemsByQuoteIds(array_column($quotes, 'id'));
            foreach ($quotes as &$quote) {
                $quote['quote_items'] = $itemsMap[$quote['id']] ?? [];
                $quote['customer'] = $quote['cust_name'] ? ['name' => $quote['cust_name'], 'phone' => $quote['cust_phone']] : null;
                unset($quote['cust_name'], $quote['cust_phone']);
            }
            unset($quote);
        }

        return ApiResponse::success($quotes);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }
        if (empty($data['quote_number'])) {
            return ApiResponse::error('quote_number es requerido');
        }

        $id = (string) Str::uuid();
        DB::transaction(function () use ($id, $workshopId, $data, $authUser): void {
            DB::table('quotes')->insert([
                'id' => $id,
                'workshop_id' => $workshopId,
                'quote_number' => $data['quote_number'],
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_email' => $data['customer_email'] ?? null,
                'customer_address' => $data['customer_address'] ?? null,
                'description' => $data['description'] ?? null,
                'location' => $data['location'] ?? null,
                'status' => $data['status'] ?? 'pending',
                'subtotal' => (float) ($data['subtotal'] ?? 0),
                'discount' => (float) ($data['discount'] ?? 0),
                'total' => (float) ($data['total'] ?? 0),
                'validity_days' => (int) ($data['validity_days'] ?? 15),
                'valid_until' => $data['valid_until'] ?? null,
                'policies' => $data['policies'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $authUser['user_id'],
            ]);

            if (!empty($data['items']) && is_array($data['items'])) {
                $this->replaceItems($id, $data['items']);
            }
        });

        return ApiResponse::success($this->fetchFull($id), 'Cotizacion creada');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $quote = DB::table('quotes')->where('id', $id)->first(['workshop_id']);
        if (!$quote) {
            return ApiResponse::error('Cotizacion no encontrada', 404);
        }
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $quote->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 401);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(self::FIELDS));

        DB::transaction(function () use ($id, $updates, $data): void {
            if ($updates !== []) {
                DB::table('quotes')->where('id', $id)->update($updates);
            }
            if (array_key_exists('items', $data)) {
                $this->replaceItems($id, is_array($data['items']) ? $data['items'] : []);
            }
        });

        return ApiResponse::success($this->fetchFull($id), 'Cotizacion actualizada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $quote = DB::table('quotes')->where('id', $id)->first(['workshop_id']);
        if (!$quote) {
            return ApiResponse::error('Cotizacion no encontrada', 404);
        }
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $quote->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        DB::table('quotes')->where('id', $id)->delete();

        return ApiResponse::success(null, 'Cotizacion eliminada');
    }

    private function fetchFull(string $id): ?array
    {
        $row = DB::table('quotes as q')
            ->leftJoin('customers as c', 'c.id', '=', 'q.customer_id')
            ->where('q.id', $id)
            ->first(['q.*', 'c.id as cust_id', 'c.name as cust_name', 'c.phone as cust_phone', 'c.email as cust_email', 'c.address as cust_address']);

        if (!$row) {
            return null;
        }

        $quote = (array) $row;
        $quote['customer'] = $quote['cust_id'] ? [
            'id' => $quote['cust_id'],
            'name' => $quote['cust_name'],
            'phone' => $quote['cust_phone'],
            'email' => $quote['cust_email'],
            'address' => $quote['cust_address'],
        ] : null;
        foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email', 'cust_address'] as $key) {
            unset($quote[$key]);
        }

        $quote['quote_items'] = $this->itemsByQuoteIds([$id])[$id] ?? [];

        return $quote;
    }

    private function itemsByQuoteIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $map = [];
        $rows = DB::table('quote_items as qi')
            ->leftJoin('products as p', 'p.id', '=', 'qi.product_id')
            ->whereIn('qi.quote_id', $ids)
            ->orderBy('qi.sort_order')
            ->orderBy('qi.created_at')
            ->get(['qi.*', 'p.name as product_name', 'p.sale_price_min', 'p.sale_price_max']);

        foreach ($rows as $row) {
            $item = (array) $row;
            $map[$item['quote_id']][] = $item;
        }

        return $map;
    }

    private function replaceItems(string $quoteId, array $items): void
    {
        DB::table('quote_items')->where('quote_id', $quoteId)->delete();
        foreach ($items as $index => $item) {
            DB::table('quote_items')->insert([
                'id' => (string) Str::uuid(),
                'quote_id' => $quoteId,
                'product_id' => $item['product_id'] ?? null,
                'description' => $item['description'] ?? '',
                'quantity' => (int) ($item['quantity'] ?? 1),
                'unit_price' => (float) ($item['unit_price'] ?? 0),
                'subtotal' => (float) ($item['subtotal'] ?? 0),
                'sort_order' => (int) ($item['sort_order'] ?? $index),
            ]);
        }
    }
}
