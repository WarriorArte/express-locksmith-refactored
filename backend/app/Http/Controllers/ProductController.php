<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ProductController
{
    private const FIELDS = [
        'category_id',
        'name',
        'description',
        'instructions',
        'notes',
        'image_url',
        'stock_store',
        'stock_warehouse',
        'min_stock',
        'purchase_price_imported',
        'purchase_price_local',
        'sale_price_min',
        'sale_price_max',
        'is_active',
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
            $product = Product::query()->find($id);
            if (!$product) {
                return ApiResponse::error('Producto no encontrado', 404);
            }
            if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $product->workshop_id)) {
                return ApiResponse::error('Sin acceso al taller indicado', 401);
            }

            return ApiResponse::success($this->enrich((array) $product->getAttributes()));
        }

        $workshopId = $request->query('workshop_id');
        if (!LegacyAuth::canAccessWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $query = DB::table('products as p')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->where('p.workshop_id', $workshopId)
            ->orderByDesc('p.created_at')
            ->select('p.*', 'c.name as category_name', 'c.color as category_color');

        if ($request->query('include_inactive', '0') !== '1') {
            $query->where('p.is_active', 1);
        }

        $products = $query->get()->map(fn ($row) => (array) $row)->all();

        if ($products !== []) {
            $tagsByProduct = [];
            $tags = DB::table('product_tags as pt')
                ->join('tags as t', 't.id', '=', 'pt.tag_id')
                ->whereIn('pt.product_id', array_column($products, 'id'))
                ->get(['pt.product_id', 'pt.tag_id', 't.name as tag_name', 't.color as tag_color']);

            foreach ($tags as $tag) {
                $tagsByProduct[$tag->product_id][] = (array) $tag;
            }

            foreach ($products as &$product) {
                $product['product_tags'] = $tagsByProduct[$product['id']] ?? [];
            }
            unset($product);
        }

        return ApiResponse::success($products);
    }

    private function store(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        if (empty($data['name'])) {
            return ApiResponse::error('El campo name es requerido');
        }

        $product = DB::transaction(function () use ($data, $workshopId): Product {
            $product = Product::query()->create([
                'workshop_id' => $workshopId,
                'category_id' => $data['category_id'] ?? null,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'instructions' => $data['instructions'] ?? null,
                'notes' => $data['notes'] ?? null,
                'image_url' => $data['image_url'] ?? null,
                'stock_store' => (int) ($data['stock_store'] ?? 0),
                'stock_warehouse' => (int) ($data['stock_warehouse'] ?? 0),
                'min_stock' => (int) ($data['min_stock'] ?? 5),
                'purchase_price_imported' => $data['purchase_price_imported'] ?? null,
                'purchase_price_local' => $data['purchase_price_local'] ?? 0,
                'sale_price_min' => $data['sale_price_min'] ?? 0,
                'sale_price_max' => $data['sale_price_max'] ?? 0,
                'is_active' => array_key_exists('is_active', $data) ? (int) $data['is_active'] : 1,
            ]);

            if (!empty($data['tag_ids']) && is_array($data['tag_ids'])) {
                $this->syncTags($product->id, $data['tag_ids']);
            }

            return $product;
        });

        return ApiResponse::success($this->enrich((array) $product->refresh()->getAttributes()), 'Producto creado');
    }

    private function update(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $product = Product::query()->find($id);
        if (!$product) {
            return ApiResponse::error('Producto no encontrado', 404);
        }
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $product->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        $data = $request->json()->all();
        $updates = array_intersect_key($data, array_flip(self::FIELDS));

        DB::transaction(function () use ($product, $updates, $data): void {
            if ($updates !== []) {
                $product->fill($updates)->save();
            }

            if (array_key_exists('tag_ids', $data)) {
                $this->syncTags($product->id, is_array($data['tag_ids']) ? $data['tag_ids'] : []);
            }
        });

        return ApiResponse::success($this->enrich((array) $product->refresh()->getAttributes()), 'Producto actualizado');
    }

    private function destroy(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $id = $request->query('id');

        if (!$id) {
            return ApiResponse::error('ID requerido');
        }

        $product = Product::query()->find($id);
        if (!$product) {
            return ApiResponse::error('Producto no encontrado', 404);
        }
        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $product->workshop_id)) {
            return ApiResponse::error('Se requiere rol de administrador en este taller', 401);
        }

        $product->is_active = 0;
        $product->save();

        return ApiResponse::success(null, 'Producto desactivado');
    }

    private function enrich(array $product): array
    {
        if (!empty($product['category_id'])) {
            $category = DB::table('categories')->where('id', $product['category_id'])->first(['id', 'name', 'color']);
            $product['category'] = $category ? (array) $category : null;
        } else {
            $product['category'] = null;
        }

        $product['product_tags'] = DB::table('product_tags as pt')
            ->join('tags as t', 't.id', '=', 'pt.tag_id')
            ->where('pt.product_id', $product['id'])
            ->get(['pt.tag_id', 't.id', 't.name', 't.color'])
            ->map(fn ($row) => (array) $row)
            ->all();

        return $product;
    }

    private function syncTags(string $productId, array $tagIds): void
    {
        DB::table('product_tags')->where('product_id', $productId)->delete();

        foreach (array_unique(array_filter($tagIds)) as $tagId) {
            DB::table('product_tags')->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'product_id' => $productId,
                'tag_id' => $tagId,
            ]);
        }
    }
}
