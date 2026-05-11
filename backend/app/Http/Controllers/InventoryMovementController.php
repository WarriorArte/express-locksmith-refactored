<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class InventoryMovementController
{
    private const MOVEMENT_TYPES = ['sale', 'service', 'adjustment', 'purchase', 'return', 'transfer'];

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->index($request),
            'POST' => $this->store($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        $query = DB::table('inventory_movements as im')
            ->join('products as p', 'p.id', '=', 'im.product_id')
            ->where('im.workshop_id', $workshopId)
            ->orderByDesc('im.created_at')
            ->select('im.*', 'p.name as product_name');

        if ($productId = $request->query('product_id')) {
            $query->where('im.product_id', $productId);
        } else {
            $query->limit(500);
        }

        return ApiResponse::success($query->get());
    }

    private function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        if (empty($data['product_id'])) {
            return ApiResponse::error('product_id es requerido');
        }
        if (!isset($data['quantity'])) {
            return ApiResponse::error('quantity es requerido');
        }
        if (empty($data['movement_type'])) {
            return ApiResponse::error('movement_type es requerido');
        }
        if (!in_array($data['movement_type'], self::MOVEMENT_TYPES, true)) {
            return ApiResponse::error('movement_type invalido. Valores: '.implode(', ', self::MOVEMENT_TYPES));
        }

        $result = DB::transaction(function () use ($data, $workshopId, $user): array|JsonResponse {
            $product = DB::table('products')
                ->where('id', $data['product_id'])
                ->where('workshop_id', $workshopId)
                ->lockForUpdate()
                ->first(['id', 'stock_store', 'stock_warehouse']);

            if (!$product) {
                return ApiResponse::error('Producto no encontrado en este taller', 404);
            }

            $stockStore = (int) $product->stock_store;
            $stockWarehouse = (int) $product->stock_warehouse;
            $quantity = (int) $data['quantity'];
            $from = $data['from_location'] ?? null;
            $to = $data['to_location'] ?? null;

            switch ($data['movement_type']) {
                case 'sale':
                case 'service':
                    $stockStore = max(0, $stockStore - $quantity);
                    break;
                case 'purchase':
                    if ($to === 'warehouse') {
                        $stockWarehouse += $quantity;
                    } else {
                        $stockStore += $quantity;
                    }
                    break;
                case 'return':
                    if ($from === 'warehouse') {
                        $stockWarehouse = max(0, $stockWarehouse - $quantity);
                    } else {
                        $stockStore += $quantity;
                    }
                    break;
                case 'transfer':
                    if ($from === 'warehouse' && $to === 'store') {
                        $stockWarehouse = max(0, $stockWarehouse - $quantity);
                        $stockStore += $quantity;
                    } elseif ($from === 'store' && $to === 'warehouse') {
                        $stockStore = max(0, $stockStore - $quantity);
                        $stockWarehouse += $quantity;
                    }
                    break;
                case 'adjustment':
                    if ($to === 'warehouse') {
                        $stockWarehouse = max(0, $stockWarehouse + $quantity);
                    } else {
                        $stockStore = max(0, $stockStore + $quantity);
                    }
                    break;
            }

            $id = (string) Str::uuid();
            DB::table('inventory_movements')->insert([
                'id' => $id,
                'workshop_id' => $workshopId,
                'product_id' => $data['product_id'],
                'movement_type' => $data['movement_type'],
                'from_location' => $from,
                'to_location' => $to,
                'quantity' => $quantity,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            DB::table('products')
                ->where('id', $data['product_id'])
                ->update(['stock_store' => $stockStore, 'stock_warehouse' => $stockWarehouse]);

            $movement = DB::table('inventory_movements as im')
                ->join('products as p', 'p.id', '=', 'im.product_id')
                ->where('im.id', $id)
                ->select('im.*', 'p.name as product_name')
                ->first();

            return [
                'movement' => $movement,
                'stock_store' => $stockStore,
                'stock_warehouse' => $stockWarehouse,
            ];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return ApiResponse::success($result, 'Movimiento registrado y stock actualizado');
    }
}
