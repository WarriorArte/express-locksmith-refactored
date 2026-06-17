<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesWorkshop;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use App\Support\ApiResponse;
use App\Support\Uploads\UploadedFileCleanupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ProductController
{
    use AuthorizesWorkshop;

    public function __construct(private readonly UploadedFileCleanupService $uploadedFileCleanup)
    {
    }

    /** Punto de entrada legacy — mantiene compatibilidad con el frontend actual */
    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->legacyList($request),
            'POST' => $this->store(StoreProductRequest::createFrom($request)),
            'PUT' => $this->update(UpdateProductRequest::createFrom($request), $request->query('id', '')),
            'DELETE' => $this->destroy($request, $request->query('id', '')),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    /** GET /api/products?workshop_id=&page=1&per_page=50 */
    public function index(Request $request): JsonResponse
    {
        $id = $request->query('id');

        if ($id) {
            return $this->show($request, $id);
        }

        $workshopId = $request->query('workshop_id');

        if ($err = $this->requireAccess($request, $workshopId)) return $err;

        $query = Product::with(['category', 'tags'])
            ->where('workshop_id', $workshopId)
            ->orderByDesc('created_at');

        if ($request->query('include_inactive', '0') !== '1') {
            $query->where('is_active', true);
        }

        $perPage = min((int) $request->query('per_page', 50), 200);
        $paginator = $query->paginate($perPage);
        $items = $paginator->getCollection()->map(fn ($p) => $this->formatProduct($p));

        return ApiResponse::paginated($paginator, $items);
    }

    /** GET /api/products/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $product = Product::with(['category', 'tags'])->find($id);

        if (!$product) {
            return ApiResponse::error('Producto no encontrado', 404);
        }

        if ($err = $this->requireAccess($request, $product->workshop_id)) return $err;

        return ApiResponse::success($this->formatProduct($product));
    }

    /** POST /api/products */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $workshopId = $request->query('workshop_id', $request->input('workshop_id'));

        if ($err = $this->requireAdmin($request, $workshopId)) return $err;

        $itemType = (string) $request->input('item_type', 'product');
        $normalizedServiceProducts = $itemType === 'service'
            ? $this->normalizeServiceProducts($workshopId, $request->input('service_products', []))
            : null;

        $product = DB::transaction(function () use ($request, $workshopId, $itemType, $normalizedServiceProducts): Product {
            $product = Product::create([
                'workshop_id' => $workshopId,
                'item_type' => $itemType,
                'category_id' => $request->input('category_id'),
                'name' => $request->input('name'),
                'description' => $request->input('description'),
                'instructions' => $request->input('instructions'),
                'notes' => $request->input('notes'),
                'image_url' => $request->input('image_url'),
                'stock_store' => (int) $request->input('stock_store', 0),
                'stock_warehouse' => (int) $request->input('stock_warehouse', 0),
                'min_stock' => (int) $request->input('min_stock', 5),
                'purchase_price_imported' => $request->input('purchase_price_imported'),
                'purchase_price_local' => $request->input('purchase_price_local', 0),
                'sale_price_min' => $request->input('sale_price_min', 0),
                'sale_price_max' => $request->input('sale_price_max', 0),
                'is_active' => $request->boolean('is_active', true),
                // Service-specific fields
                'service_type' => $request->input('service_type'),
                'labor_cost' => $request->input('labor_cost'),
                'discount' => $request->input('discount', 0),
                'service_products' => $normalizedServiceProducts,
            ]);

            if ($request->has('tag_ids')) {
                $this->syncTags($product, (array) $request->input('tag_ids', []));
            }

            return $product;
        });

        Cache::forget("recent-activity:{$workshopId}");
        return ApiResponse::success($this->formatProduct($product->load(['category', 'tags'])), 'Producto creado', 201);
    }

    /** PUT /api/products/{id} */
    public function update(UpdateProductRequest $request, string $id): JsonResponse
    {
        $product = Product::find($id);

        if (!$product) {
            return ApiResponse::error('Producto no encontrado', 404);
        }

        if ($err = $this->requireAdmin($request, $product->workshop_id)) return $err;

        $previousImageUrl = $product->image_url;

        DB::transaction(function () use ($request, $product): void {
            $payload = $request->only([
                'item_type', 'category_id', 'name', 'description', 'instructions', 'notes',
                'image_url', 'stock_store', 'stock_warehouse', 'min_stock',
                'purchase_price_imported', 'purchase_price_local',
                'sale_price_min', 'sale_price_max', 'is_active',
                // Service-specific fields
                'service_type', 'labor_cost', 'discount', 'service_products',
            ]);

            $targetItemType = (string) ($payload['item_type'] ?? $product->item_type ?? 'product');
            if ($targetItemType === 'service' && array_key_exists('service_products', $payload)) {
                $payload['service_products'] = $this->normalizeServiceProducts($product->workshop_id, $payload['service_products']);
            }
            if ($targetItemType !== 'service') {
                $payload['service_type'] = null;
                $payload['labor_cost'] = null;
                $payload['discount'] = 0;
                $payload['service_products'] = null;
            }

            $product->fill($payload)->save();

            if ($request->has('tag_ids')) {
                $this->syncTags($product, (array) $request->input('tag_ids', []));
            }
        });

        if ($request->has('image_url') && $previousImageUrl !== $product->image_url) {
            $this->uploadedFileCleanup->deleteIfUnused($previousImageUrl);
        }

        return ApiResponse::success($this->formatProduct($product->load(['category', 'tags'])), 'Producto actualizado');
    }

    /** DELETE /api/products/{id} */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $product = Product::find($id);

        if (!$product) {
            return ApiResponse::error('Producto no encontrado', 404);
        }

        if ($err = $this->requireAdmin($request, $product->workshop_id)) return $err;

        $previousImageUrl = $product->image_url;

        $product->update([
            'is_active' => false,
            'image_url' => null,
        ]);

        $this->uploadedFileCleanup->deleteIfUnused($previousImageUrl);

        return ApiResponse::success(null, 'Producto desactivado');
    }

    /** Lista legacy con cap de seguridad — sin pagination para no romper frontend actual */
    private function legacyList(Request $request): JsonResponse
    {
        $id = $request->query('id');

        if ($id) {
            return $this->show($request, $id);
        }

        $workshopId = $request->query('workshop_id');

        if ($err = $this->requireAccess($request, $workshopId)) return $err;

        $query = Product::with(['category', 'tags'])
            ->where('workshop_id', $workshopId)
            ->orderByDesc('created_at');

        if ($request->query('include_inactive', '0') !== '1') {
            $query->where('is_active', true);
        }

        $products = $query->limit(500)->get()->map(fn ($p) => $this->formatProduct($p));

        return ApiResponse::success($products);
    }

    private function formatProduct(Product $product): array
    {
        $data = $product->toArray();
        $category = $product->relationLoaded('category') ? $product->category : null;
        $tags = $product->relationLoaded('tags') ? $product->tags : collect();

        $data['category'] = $category?->only(['id', 'name', 'color']);
        $data['product_tags'] = $tags->map(fn ($tag) => [
            'tag_id' => $tag->id,
            'tags' => $tag->only(['id', 'name', 'color']),
        ])->values()->toArray();

        return $data;
    }

    private function syncTags(Product $product, array $tagIds): void
    {
        $product->tags()->detach();

        foreach (array_unique(array_filter($tagIds)) as $tagId) {
            $product->tags()->attach($tagId, ['id' => (string) Str::uuid()]);
        }
    }

    private function normalizeServiceProducts(string $workshopId, mixed $items): array
    {
        if (!is_array($items) || $items === []) {
            return [];
        }

        $productIds = [];
        $productNames = [];

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $productId = trim((string) ($item['product_id'] ?? ''));
            if ($productId !== '') {
                $productIds[] = $productId;
            }

            $productName = trim((string) ($item['product_name'] ?? ''));
            if ($productName !== '') {
                $productNames[] = $productName;
            }
        }

        $products = collect();
        $productIds = array_values(array_unique($productIds));
        $productNames = array_values(array_unique($productNames));

        if ($productIds !== [] || $productNames !== []) {
            $products = DB::table('products')
                ->where('workshop_id', $workshopId)
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

            $resolvedProduct = null;
            if ($inputProductId !== '' && isset($productsById[$inputProductId])) {
                $resolvedProduct = $productsById[$inputProductId];
            } elseif ($inputProductName !== '') {
                $resolvedProduct = $productsByName[strtolower($inputProductName)] ?? null;
            }

            $resolvedProductId = $resolvedProduct?->id ?? ($inputProductId !== '' ? $inputProductId : null);
            $resolvedProductName = $resolvedProduct?->name ?? $inputProductName;
            if ($resolvedProductId === null && $resolvedProductName === '') {
                continue;
            }

            $unitPrice = isset($item['unit_price'])
                ? (float) $item['unit_price']
                : (float) ($resolvedProduct?->sale_price_min ?? 0);
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

        return $normalized;
    }
}
