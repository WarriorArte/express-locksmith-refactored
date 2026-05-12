<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $services = DB::table('products')
            ->where('item_type', 'service')
            ->whereNotNull('service_products')
            ->get(['id', 'workshop_id', 'service_products']);

        foreach ($services as $service) {
            $items = $service->service_products;
            if (is_string($items)) {
                $decoded = json_decode($items, true);
                $items = is_array($decoded) ? $decoded : [];
            }
            if (!is_array($items) || $items === []) {
                continue;
            }

            $productIds = [];
            $productNames = [];
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $pid = trim((string) ($item['product_id'] ?? ''));
                if ($pid !== '') {
                    $productIds[] = $pid;
                }

                $pname = trim((string) ($item['product_name'] ?? ''));
                if ($pname !== '') {
                    $productNames[] = $pname;
                }
            }

            $productIds = array_values(array_unique($productIds));
            $productNames = array_values(array_unique($productNames));

            $products = collect();
            if ($productIds !== [] || $productNames !== []) {
                $products = DB::table('products')
                    ->where('workshop_id', $service->workshop_id)
                    ->where('item_type', '!=', 'service')
                    ->where(function ($query) use ($productIds, $productNames): void {
                        if ($productIds !== []) {
                            $query->whereIn('id', $productIds);
                        }
                        if ($productNames !== []) {
                            if ($productIds !== []) {
                                $query->orWhereIn('name', $productNames);
                            } else {
                                $query->whereIn('name', $productNames);
                            }
                        }
                    })
                    ->get(['id', 'name', 'sale_price_min']);
            }

            $productsById = [];
            $productsByName = [];
            foreach ($products as $product) {
                $productsById[$product->id] = $product;
                $productsByName[strtolower($product->name)] = $product;
            }

            $normalized = [];
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $quantity = max((int) ($item['quantity'] ?? 1), 1);
                $inputProductId = trim((string) ($item['product_id'] ?? ''));
                $inputProductName = trim((string) ($item['product_name'] ?? ''));

                $resolved = null;
                if ($inputProductId !== '' && isset($productsById[$inputProductId])) {
                    $resolved = $productsById[$inputProductId];
                } elseif ($inputProductName !== '') {
                    $resolved = $productsByName[strtolower($inputProductName)] ?? null;
                }

                $resolvedProductId = $resolved?->id ?? ($inputProductId !== '' ? $inputProductId : null);
                $resolvedProductName = $resolved?->name ?? $inputProductName;
                if ($resolvedProductId === null && $resolvedProductName === '') {
                    continue;
                }

                $unitPrice = isset($item['unit_price'])
                    ? (float) $item['unit_price']
                    : (float) ($resolved?->sale_price_min ?? 0);
                $subtotal = isset($item['subtotal'])
                    ? (float) $item['subtotal']
                    : ($quantity * $unitPrice);

                $normalized[] = [
                    'product_id' => $resolvedProductId,
                    'product_name' => $resolvedProductName,
                    'quantity' => $quantity,
                    'unit_price' => round($unitPrice, 2),
                    'subtotal' => round($subtotal, 2),
                ];
            }

            DB::table('products')
                ->where('id', $service->id)
                ->update([
                    'service_products' => json_encode($normalized),
                    'updated_at' => now(),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration normalizes JSON payloads in place and is not reversible.
    }
};
