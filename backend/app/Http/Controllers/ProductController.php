<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesWorkshop;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ProductController
{
    use AuthorizesWorkshop;

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

        $product = DB::transaction(function () use ($request, $workshopId): Product {
            $product = Product::create([
                'workshop_id' => $workshopId,
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
            ]);

            if ($request->has('tag_ids')) {
                $this->syncTags($product, (array) $request->input('tag_ids', []));
            }

            return $product;
        });

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

        DB::transaction(function () use ($request, $product): void {
            $product->fill($request->only([
                'category_id', 'name', 'description', 'instructions', 'notes',
                'image_url', 'stock_store', 'stock_warehouse', 'min_stock',
                'purchase_price_imported', 'purchase_price_local',
                'sale_price_min', 'sale_price_max', 'is_active',
            ]))->save();

            if ($request->has('tag_ids')) {
                $this->syncTags($product, (array) $request->input('tag_ids', []));
            }
        });

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

        $product->update(['is_active' => false]);

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
}
