<?php

namespace App\Http\Controllers\Concerns;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Evita IDOR entre talleres: cualquier ID recibido del cliente que apunte a
 * otra tabla (customers, products, sales, services, quotes) debe pertenecer
 * al mismo workshop_id del registro que se esta creando o actualizando.
 */
trait ValidatesWorkshopReferences
{
    /**
     * @param array<string,string> $refs mapa campo => tabla (ej. ['customer_id' => 'customers'])
     * @param array<string,mixed>  $data payload del cliente
     */
    protected function validateWorkshopReferences(?string $workshopId, array $data, array $refs): ?JsonResponse
    {
        foreach ($refs as $field => $table) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $id = $data[$field];
            if ($id === null || $id === '') {
                continue;
            }

            $owner = DB::table($table)->where('id', $id)->value('workshop_id');

            if ($owner === null || (string) $owner !== (string) $workshopId) {
                return ApiResponse::error("El campo {$field} no pertenece a este taller", 422);
            }
        }

        return null;
    }

    /**
     * Valida los product_id de una lista de items (quote_items, sale_items, service_products).
     *
     * @param array<int,array<string,mixed>> $items
     */
    protected function validateItemProducts(?string $workshopId, array $items, string $field = 'product_id'): ?JsonResponse
    {
        $ids = [];
        foreach ($items as $item) {
            if (is_array($item) && !empty($item[$field])) {
                $ids[] = $item[$field];
            }
        }

        $ids = array_values(array_unique($ids));
        if ($ids === []) {
            return null;
        }

        $valid = DB::table('products')
            ->whereIn('id', $ids)
            ->where('workshop_id', $workshopId)
            ->count();

        if ($valid !== count($ids)) {
            return ApiResponse::error('Uno o mas productos no pertenecen a este taller', 422);
        }

        return null;
    }
}
