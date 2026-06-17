<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class RecentActivityController
{
    private const LIMIT = 8;

    public function handle(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');

        if (!$workshopId) {
            return ApiResponse::error('workshop_id es requerido', 400);
        }

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        $limit = self::LIMIT;
        $rows = Cache::remember("recent-activity:{$workshopId}", 120, fn () => DB::select("
            SELECT type, id, title, description, created_at FROM (
                SELECT
                    'venta'      AS type,
                    id,
                    sale_number  AS title,
                    COALESCE(customer_name, 'Cliente mostrador') AS description,
                    created_at
                FROM sales WHERE workshop_id = ?
                ORDER BY created_at DESC LIMIT {$limit}

                UNION ALL

                SELECT
                    'servicio'   AS type,
                    id,
                    service_number AS title,
                    LEFT(description, 60) AS description,
                    created_at
                FROM services WHERE workshop_id = ?
                ORDER BY created_at DESC LIMIT {$limit}

                UNION ALL

                SELECT
                    'cotizacion' AS type,
                    id,
                    quote_number AS title,
                    CONCAT(COALESCE(customer_name, 'Sin cliente'), ' - ', total) AS description,
                    created_at
                FROM quotes WHERE workshop_id = ?
                ORDER BY created_at DESC LIMIT {$limit}

                UNION ALL

                SELECT
                    'cliente'    AS type,
                    id,
                    name         AS title,
                    customer_type AS description,
                    created_at
                FROM customers WHERE workshop_id = ?
                ORDER BY created_at DESC LIMIT {$limit}

                UNION ALL

                SELECT
                    'producto'   AS type,
                    id,
                    name         AS title,
                    CONCAT('Stock: ', stock_store + stock_warehouse) AS description,
                    created_at
                FROM products WHERE workshop_id = ?
                ORDER BY created_at DESC LIMIT {$limit}
            ) AS combined
            ORDER BY created_at DESC
            LIMIT {$limit}", [
            $workshopId,
            $workshopId,
            $workshopId,
            $workshopId,
            $workshopId,
        ]));

        return ApiResponse::success($rows);
    }
}
