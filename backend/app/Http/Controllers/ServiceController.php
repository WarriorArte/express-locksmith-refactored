<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ServiceController
{
    private const FIELDS = [
        'customer_id', 'quote_id', 'service_type', 'status', 'description',
        'problem', 'location', 'address', 'estimated_price', 'final_price',
        'labor_cost', 'discount', 'deposit', 'internal_notes', 'policies',
        'assigned_to', 'started_at', 'completed_at', 'delivered_at', 'scheduled_start_at',
        'has_warranty', 'warranty_days',
    ];

    private const DATETIME_FIELDS = ['started_at', 'completed_at', 'delivered_at', 'scheduled_start_at'];

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

    /** GET /api/services?workshop_id=&page=1&per_page=50&status= */
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

        $query = DB::table('services as sv')
            ->leftJoin('customers as c', 'c.id', '=', 'sv.customer_id')
            ->where('sv.workshop_id', $workshopId)
            ->orderByDesc('sv.created_at')
            ->select('sv.*', 'c.name as cust_name', 'c.phone as cust_phone', 'c.address as cust_address');

        if ($status = $request->query('status')) {
            $query->where('sv.status', $status);
        }

        $perPage = min((int) $request->query('per_page', 50), 200);
        $paginator = $query->paginate($perPage);

        $services = collect($paginator->items())->map(fn ($row) => (array) $row)->all();

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

        return ApiResponse::paginated($paginator, $services);
    }

    /** GET /api/services/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $service = $this->fetchFull($id);

        if (!$service) {
            return ApiResponse::error('Servicio no encontrado', 404);
        }

        if (!$user->canAccessWorkshop($service['workshop_id'])) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        return ApiResponse::success($service);
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
        if (empty($data['service_number'])) {
            return ApiResponse::error('service_number es requerido');
        }
        if (empty($data['description'])) {
            return ApiResponse::error('description es requerido');
        }

        try {
            $dateUpdates = $this->normalizeDateTimeValues([
                'started_at' => $data['started_at'] ?? null,
                'completed_at' => $data['completed_at'] ?? null,
                'delivered_at' => $data['delivered_at'] ?? null,
                'scheduled_start_at' => $data['scheduled_start_at'] ?? null,
            ]);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $id = (string) Str::uuid();
        DB::transaction(function () use ($id, $workshopId, $data, $user, $dateUpdates): void {
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
                'deposit' => (float) ($data['deposit'] ?? 0),
                'internal_notes' => $data['internal_notes'] ?? null,
                'policies' => $data['policies'] ?? null,
                'custom_fields' => json_encode($data['custom_fields'] ?? []),
                'assigned_to' => $data['assigned_to'] ?? null,
                'created_by' => $user->id,
                'started_at' => $dateUpdates['started_at'],
                'completed_at' => $dateUpdates['completed_at'],
                'delivered_at' => $dateUpdates['delivered_at'],
                'scheduled_start_at' => $dateUpdates['scheduled_start_at'],
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

        Cache::forget("recent-activity:{$workshopId}");
        return ApiResponse::success($this->fetchFull($id), 'Servicio creado');
    }

    /** PUT — compartido entre legacy y REST */
    public function update(Request $request, string $id = ''): JsonResponse
    {
        $user = $request->user();
        $id = $id ?: $request->query('id', '');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $row = DB::table('services')->where('id', $id)->first(['workshop_id', 'status', 'has_warranty', 'warranty_days', 'custom_fields', 'customer_id', 'description']);
        if (!$row) {
            return ApiResponse::error('Servicio no encontrado', 404);
        }
        if (!$user->canAccessWorkshop($row->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(self::FIELDS));
        if (array_key_exists('custom_fields', $data)) {
            $updates['custom_fields'] = json_encode($data['custom_fields']);
        }

        try {
            $updates = $this->normalizeDateTimeValues($updates);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        DB::transaction(function () use ($id, $updates, $data): void {
            if ($updates !== []) {
                DB::table('services')->where('id', $id)->update($updates);
            }
            if (array_key_exists('service_products', $data)) {
                $this->replaceProducts($id, is_array($data['service_products']) ? $data['service_products'] : []);
            }
        });

        // Crear garantía automáticamente al marcar como entregado
        $newStatus = $data['status'] ?? null;
        $oldStatus = $row->status ?? null;
        $hasWarranty = isset($data['has_warranty']) ? (int) $data['has_warranty'] : (int) ($row->has_warranty ?? 0);

        if ($newStatus === 'delivered' && $oldStatus !== 'delivered' && $hasWarranty === 1) {
            $alreadyExists = DB::table('warranties')->where('service_id', $id)->exists();
            if (!$alreadyExists) {
                $customFields = $this->decodeJson(
                    isset($data['custom_fields']) ? json_encode($data['custom_fields']) : ($row->custom_fields ?? '')
                );
                $unit  = $customFields['warranty_duration_unit']  ?? 'days';
                $value = (int) ($customFields['warranty_duration_value'] ?? ($row->warranty_days ?? 30));
                $warrantyDays = isset($data['warranty_days']) ? (int) $data['warranty_days'] : (int) ($row->warranty_days ?? 30);

                $startDate = Carbon::now();
                $endDate   = $this->calculateWarrantyEndDateFromDuration($startDate, $unit, $value);

                $service = $this->fetchFull($id);
                $workshopId = $row->workshop_id;

                DB::table('warranties')->insert([
                    'id'                  => (string) Str::uuid(),
                    'warranty_code'       => $this->nextWarrantyCode($workshopId),
                    'sale_id'             => null,
                    'service_id'          => $id,
                    'customer_id'         => $row->customer_id,
                    'customer_name'       => $service['customer']['name'] ?? null,
                    'product_name'        => null,
                    'service_description' => $row->description,
                    'warranty_type'       => 'service',
                    'warranty_days'       => $warrantyDays,
                    'start_date'          => $startDate->format('Y-m-d H:i:s'),
                    'end_date'            => $endDate->format('Y-m-d H:i:s'),
                    'notes'               => null,
                    'is_voided'           => 0,
                    'workshop_id'         => $workshopId,
                    'created_by'          => null,
                ]);
            }
        }

        return ApiResponse::success($this->fetchFull($id), 'Servicio actualizado');
    }

    private function normalizeDateTimeValues(array $payload): array
    {
        foreach (self::DATETIME_FIELDS as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $value = $payload[$field];
            if ($value === null || $value === '') {
                $payload[$field] = null;

                continue;
            }

            if (!is_string($value)) {
                throw new \InvalidArgumentException("{$field} debe ser una fecha en formato valido");
            }

            try {
                $payload[$field] = Carbon::parse($value)->format('Y-m-d H:i:s');
            } catch (\Throwable $e) {
                throw new \InvalidArgumentException("{$field} debe ser una fecha en formato valido");
            }
        }

        return $payload;
    }

    /** DELETE — compartido entre legacy y REST */
    public function destroy(Request $request, string $id = ''): JsonResponse
    {
        $user = $request->user();
        $id = $id ?: $request->query('id', '');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $row = DB::table('services')->where('id', $id)->first(['workshop_id', 'customer_id']);
        if (!$row) {
            return ApiResponse::error('Servicio no encontrado', 404);
        }
        if (!$user->canAdminWorkshop($row->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 403);
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

        $services = DB::table('services as sv')
            ->leftJoin('customers as c', 'c.id', '=', 'sv.customer_id')
            ->where('sv.workshop_id', $workshopId)
            ->orderByDesc('sv.created_at')
            ->limit(500)
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

    private function fetchFull(string $id): ?array
    {
        $row = DB::table('services as sv')
            ->leftJoin('customers as c', 'c.id', '=', 'sv.customer_id')
            ->where('sv.id', $id)
            ->first(['sv.*', 'c.id as cust_id', 'c.name as cust_name', 'c.phone as cust_phone', 'c.email as cust_email', 'c.address as cust_address']);

        if (!$row) {
            return null;
        }

        $service = (array) $row;
        $service['customer'] = $service['cust_id'] ? [
            'id' => $service['cust_id'],
            'name' => $service['cust_name'],
            'phone' => $service['cust_phone'],
            'email' => $service['cust_email'],
            'address' => $service['cust_address'],
        ] : null;
        foreach (['cust_id', 'cust_name', 'cust_phone', 'cust_email', 'cust_address'] as $key) {
            unset($service[$key]);
        }

        $service['service_products'] = $this->productsByServiceIds([$id])[$id] ?? [];
        $service['service_images'] = $this->imagesByServiceIds([$id])[$id] ?? [];
        $service['custom_fields'] = $this->decodeJson($service['custom_fields'] ?? null);

        return $service;
    }

    private function productsByServiceIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

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
        if ($ids === []) {
            return [];
        }

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

    private function nextWarrantyCode(string $workshopId): string
    {
        $prefix = 'G-' . now()->format('dmy') . '-';
        $count  = DB::table('warranties')
            ->where('workshop_id', $workshopId)
            ->where('warranty_code', 'like', $prefix . '%')
            ->count();
        return $prefix . str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);
    }

    private function calculateWarrantyEndDateFromDuration(Carbon $startDate, string $unit, int $value): Carbon
    {
        return match ($unit) {
            'years'  => (clone $startDate)->addYears($value),
            'months' => (clone $startDate)->addMonths($value),
            'weeks'  => (clone $startDate)->addWeeks($value),
            default  => (clone $startDate)->addDays($value),
        };
    }

    private function decodeJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || $value === '') {
            return [];
        }
        return json_decode($value, true) ?: [];
    }
}
