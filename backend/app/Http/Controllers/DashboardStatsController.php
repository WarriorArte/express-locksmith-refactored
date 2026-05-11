<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class DashboardStatsController
{
    public function handle(Request $request): JsonResponse
    {
        $user = $request->user();
        $workshopId = $request->query('workshop_id');

        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error($workshopId ? 'Sin acceso al taller indicado' : 'workshop_id es requerido', $workshopId ? 403 : 400);
        }

        $data = Cache::remember("dashboard:{$workshopId}", 300, fn () => $this->compute($workshopId));

        return ApiResponse::success($data);
    }

    private function compute(string $workshopId): array
    {
        $monthStart = now()->startOfMonth()->format('Y-m-d H:i:s');
        $monthEnd = now()->endOfMonth()->format('Y-m-d H:i:s');
        $todayStart = now()->startOfDay()->format('Y-m-d H:i:s');
        $todayEnd = now()->endOfDay()->format('Y-m-d H:i:s');

        $quoteRow = DB::table('quotes')
            ->where('workshop_id', $workshopId)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN status IN ("accepted","converted") THEN 1 ELSE 0 END) as accepted')
            ->first();
        $quoteTotal = (int) ($quoteRow->total ?? 0);
        $quoteAccepted = (int) ($quoteRow->accepted ?? 0);

        $saleRow = DB::table('sales')
            ->where('workshop_id', $workshopId)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total), 0) as total')
            ->first();

        $todayServices = DB::table('services')
            ->where('workshop_id', $workshopId)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $byStatus = ['pending' => 0, 'in_progress' => 0, 'completed' => 0, 'delivered' => 0, 'cancelled' => 0];
        $statusRows = DB::table('services')->where('workshop_id', $workshopId)->groupBy('status')->get(['status', DB::raw('COUNT(*) as cnt')]);
        foreach ($statusRows as $row) {
            if (array_key_exists($row->status, $byStatus)) {
                $byStatus[$row->status] = (int) $row->cnt;
            }
        }

        return [
            'quotes' => [
                'total' => $quoteTotal,
                'accepted' => $quoteAccepted,
                'acceptedRate' => $quoteTotal > 0 ? round($quoteAccepted / $quoteTotal * 100, 1) : 0,
            ],
            'sales' => ['total' => (float) ($saleRow->total ?? 0), 'count' => (int) ($saleRow->count ?? 0)],
            'services' => ['today' => $todayServices, 'byStatus' => $byStatus],
            'lowStock' => DB::table('products')
                ->where('workshop_id', $workshopId)
                ->where('is_active', 1)
                ->whereRaw('(stock_store + stock_warehouse) <= min_stock')
                ->orderByRaw('(stock_store + stock_warehouse) asc')
                ->limit(20)
                ->get(['id', 'name', 'stock_store', 'stock_warehouse', 'min_stock', DB::raw('(stock_store + stock_warehouse) as total_stock')]),
            'expiringQuotes' => DB::table('quotes')
                ->where('workshop_id', $workshopId)
                ->where('status', 'pending')
                ->whereNotNull('valid_until')
                ->whereBetween('valid_until', [now()->toDateString(), now()->addDays(7)->toDateString()])
                ->orderBy('valid_until')
                ->limit(10)
                ->get(['id', 'quote_number', 'customer_name', 'total', 'valid_until']),
        ];
    }
}
