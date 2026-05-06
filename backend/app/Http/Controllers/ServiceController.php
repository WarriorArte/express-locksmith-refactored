<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ServiceController
{
    private const FIELDS = [
        'customer_id', 'quote_id', 'service_type', 'status', 'description',
        'problem', 'location', 'address', 'estimated_price', 'final_price',
        'labor_cost', 'discount', 'internal_notes', 'policies',
        'assigned_to', 'started_at', 'completed_at', 'delivered_at',
        'has_warranty', 'warranty_days',
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
            $service = $this->fetchFull($id);
            if (!$service) return ApiResponse::error('Servicio no encontrado', 404);
            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $service['workshop_id'])) {
                return ApiResponse::error('Sin acceso al taller indicado', 401);
            }
            return ApiResponse::success($service);
        }

        $workshopId = $request->query('workshop_id');
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $services = DB::table('services as sv')
            ->leftJoin('customers as c', 'c.id', '=', 'sv.customer_id')
            ->where('sv.workshop_id', $workshopId)
            ->orderByDesc('sv.created_at')
            ->get(['sv.*', 'c.name as cust_name', 'c.phone as cust_phone', 'c.address as cust_address'])
            ->map(fn ($row) => (array) $row)
            ->all();

        if ($services !== []) {
            $ids = array_column($services, 'id');
            $productsMap = $this->productsByServiceIds($ids);
            $imagesMap = $this->imagesByServiceIds($ids);

            foreach ($services as &$service) {
                $service['service_products'] = $productsMap[$service['id']] ?? [];
                $service['service_images'] = $imagesMap[$service['id']] ?? [];
                $service['customer'] = $service['cust_name'] ? [
                    'name' => $service['cust_name'],
                    'phone' => $service['cust_phone'],
                    'address' => $service['cust_address'],
                ] : null;
                unset($service['cust_name'], $service['cust_phone'], $service['cust_address']);
                $service['custom_fields'] = $this->decodeJson($service['custom_fields'] ?? null);
            }
            unset($service);
        }

        return ApiResponse::success($services);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }
        if (empty($data['service_number'])) return ApiResponse::error('service_number es requerido');
        if (empty($data['description'])) return ApiResponse::error('description es requerido');

        $id = (string) Str::uuid();
        DB::transaction(function () use ($id, $workshopId, $data, $authUser): void {
            DB::table('services')->insert([
                'id' => $id,
                'workshop_id' => $workshopId,
                'service_number' => $data['service_number'],
                'customer_id' => $data['customer_id'] ?? null,
                'quote_id' => $data['quote_id'] ?? null,
                'service_type' => $data['service_type'] ?? 'residential',
                'status' => $data['status'] ?? 'pending',
                'description' => $data['description'],
                'problem' => $data['problem'] ?? null,
                'location' => $data['location'] ?? null,
                'address' => $data['address'] ?? null,
                'estimated_price' => (float) ($data['estimated_price'] ?? 0),
                'final_price' => isset($data['final_price']) ? (float) $data['final_price'] : null,
                'labor_cost' => (float) ($data['labor_cost'] ?? 0),
                'discount' => (float) ($data['discount'] ?? 0),
                'internal_notes' => $data['internal_notes'] ?? null,
                'policies' => $data['policies'] ?? null,
                'custom_fields' => json_encode($data['custom_fields'] ?? []),
                'assigned_to' => $data['assigned_to'] ?? null,
                'created_by' => $authUser['user_id'],
                'started_at' => $data['started_at'] ?? null,
                'completed_at' => $data['completed_at'] ?? null,
                'delivered_at' => $data['delivered_at'] ?? null,
                'has_warranty' => (int) ($data['has_warranty'] ?? 0),
                'warranty_days' => $data['warranty_days'] ?? null,
            ]);

            if (!empty($data['service_products']) && is_array($data['service_products'])) {
                $this->replaceProducts($id, $data['service_products']);
            }

            if (!empty($data['customer_id'])) {
                DB::table('customers')->where('id', $data['customer_id'])->increment('total_services');
            }
        });

        return ApiResponse::success($this->fetchFull($id), 'Servicio creado');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $row = DB::table('services')->where('id', $id)->first(['workshop_id']);
        if (!$row) return ApiResponse::error('Servicio no encontrado', 404);
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $row->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 401);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(self::FIELDS));
        if (array_key_exists('custom_fields', $data)) {
            $updates['custom_fields'] = json_encode($data['custom_fields']);
        }

        DB::transaction(function () use ($id, $updates, $data): void {
            if ($updates !== []) {
                DB::table('services')->where('id', $id)->update($updates);
            }
            if (array_key_exists('service_products', $data)) {
                $this->replaceProducts($id, is_array($data['service_products']) ? $data['service_products'] : []);
            }
        });

        return ApiResponse::success($this->fetchFull($id), 'Servicio actualizado');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID requerido');

        $row = DB::table('services')->where('id', $id)->first(['workshop_id', 'customer_id']);
        if (!$row) return ApiResponse::error('Servicio no encontrado', 404);
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $row->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        DB::transaction(function () use ($id, $row): void {
            DB::table('services')->where('id', $id)->delete();
            if ($row->customer_id) {
                DB::table('customers')->where('id', $row->customer_id)->update([
                    'total_services' => DB::raw('GREATEST(0, total_services - 1)'),
                ]);
            }
        });

        return ApiResponse::success(null, 'Servicio eliminado');
    }

    private function fetchFull(string $id): ?array
    {
        $row = DB::table('services as sv')
            ->leftJoin('customers as c', 'c.id', '=', 'sv.customer_id')
            ->where('sv.id', $id)
            ->first(['sv.*', 'c.id as cust_id', 'c.name as cust_name', 'c.phone as cust_phone', 'c.email as cust_email', 'c.address as cust_address']);

        if (!$row) return null;

        $service = (array) $row;
        $service['customer'] = $service['cust_id'] ? [
            'id' => $service['cust_id'],
            'name' => $service['cust_name'],
            'phone' => $service['cust_phone'],
            'email' => $service['cust_email'],
            'address' => $service['cust_address'],
        ] : null;
        foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email', 'cust_address'] as $key) unset($service[$key]);

        $service['service_products'] = $this->productsByServiceIds([$id])[$id] ?? [];
        $service['service_images'] = $this->imagesByServiceIds([$id])[$id] ?? [];
        $service['custom_fields'] = $this->decodeJson($service['custom_fields'] ?? null);

        return $service;
    }

    private function productsByServiceIds(array $ids): array
    {
        if ($ids === []) return [];
        $map = [];
        $rows = DB::table('service_products as sp')
            ->leftJoin('products as p', 'p.id', '=', 'sp.product_id')
            ->whereIn('sp.service_id', $ids)
            ->get(['sp.*', 'p.name as p_name']);
        foreach ($rows as $row) {
            $item = (array) $row;
            $map[$item['service_id']][] = $item;
        }
        return $map;
    }

    private function imagesByServiceIds(array $ids): array
    {
        if ($ids === []) return [];
        $map = [];
        $rows = DB::table('service_images')->whereIn('service_id', $ids)->orderBy('created_at')->get();
        foreach ($rows as $row) {
            $item = (array) $row;
            $map[$item['service_id']][] = $item;
        }
        return $map;
    }

    private function replaceProducts(string $serviceId, array $items): void
    {
        DB::table('service_products')->where('service_id', $serviceId)->delete();
        foreach ($items as $item) {
            DB::table('service_products')->insert([
                'id' => (string) Str::uuid(),
                'service_id' => $serviceId,
                'product_id' => $item['product_id'] ?? null,
                'product_name' => $item['product_name'] ?? ($item['name'] ?? ''),
                'quantity' => (int) ($item['quantity'] ?? 1),
                'unit_price' => (float) ($item['unit_price'] ?? 0),
                'subtotal' => (float) ($item['subtotal'] ?? 0),
            ]);
        }
    }

    private function decodeJson(mixed $value): array
    {
        if (is_array($value)) return $value;
        if (!is_string($value) || $value === '') return [];
        return json_decode($value, true) ?: [];
    }
}
