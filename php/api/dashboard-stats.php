<?php
/**
 * dashboard-stats.php — Estadísticas agregadas para el dashboard
 * GET ?workshop_id= → {
 *   quotes:   { total, accepted, acceptedRate },
 *   sales:    { total, count },
 *   services: { today, byStatus },
 *   lowStock: Product[],
 *   expiringQuotes: Quote[],
 * }
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();

if ($method !== 'GET') Response::error('Metodo no permitido', 405);

$workshopId = get_workshop_id_param();
require_workshop_access($conn, $authUser['user_id'], $workshopId);

try {

    $now        = date('Y-m-d H:i:s');
    $monthStart = date('Y-m-01 00:00:00');
    $monthEnd   = date('Y-m-t 23:59:59');
    $todayStart = date('Y-m-d 00:00:00');
    $todayEnd   = date('Y-m-d 23:59:59');

    // ── COTIZACIONES del mes ──────────────────────────────────────────────────
    $qStmt = $conn->prepare('
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status IN ("accepted","converted") THEN 1 ELSE 0 END) AS accepted
        FROM   quotes
        WHERE  workshop_id = ?
          AND  created_at BETWEEN ? AND ?
    ');
    $qStmt->execute([$workshopId, $monthStart, $monthEnd]);
    $qRow  = $qStmt->fetch();
    $total = (int)$qRow['total'];
    $acc   = (int)$qRow['accepted'];

    $quotesStats = [
        'total'        => $total,
        'accepted'     => $acc,
        'acceptedRate' => $total > 0 ? round($acc / $total * 100, 1) : 0,
    ];

    // ── VENTAS del mes ────────────────────────────────────────────────────────
    $sStmt = $conn->prepare('
        SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
        FROM   sales
        WHERE  workshop_id = ?
          AND  created_at BETWEEN ? AND ?
    ');
    $sStmt->execute([$workshopId, $monthStart, $monthEnd]);
    $sRow = $sStmt->fetch();

    $salesStats = [
        'total' => (float)$sRow['total'],
        'count' => (int)$sRow['count'],
    ];

    // ── SERVICIOS de hoy + por estado ────────────────────────────────────────
    $svTodayStmt = $conn->prepare('
        SELECT COUNT(*) AS today
        FROM   services
        WHERE  workshop_id = ?
          AND  created_at BETWEEN ? AND ?
    ');
    $svTodayStmt->execute([$workshopId, $todayStart, $todayEnd]);
    $todayCount = (int)$svTodayStmt->fetch()['today'];

    $svStatusStmt = $conn->prepare('
        SELECT status, COUNT(*) AS cnt
        FROM   services
        WHERE  workshop_id = ?
        GROUP  BY status
    ');
    $svStatusStmt->execute([$workshopId]);
    $byStatus = [
        'pending'     => 0,
        'in_progress' => 0,
        'completed'   => 0,
        'delivered'   => 0,
        'cancelled'   => 0,
    ];
    foreach ($svStatusStmt->fetchAll() as $r) {
        if (array_key_exists($r['status'], $byStatus)) {
            $byStatus[$r['status']] = (int)$r['cnt'];
        }
    }

    $servicesStats = ['today' => $todayCount, 'byStatus' => $byStatus];

    // ── PRODUCTOS con stock bajo ──────────────────────────────────────────────
    $lsStmt = $conn->prepare('
        SELECT id, name, stock_store, stock_warehouse, min_stock,
               (stock_store + stock_warehouse) AS total_stock
        FROM   products
        WHERE  workshop_id = ?
          AND  is_active = 1
          AND  (stock_store + stock_warehouse) <= min_stock
        ORDER  BY total_stock ASC
        LIMIT  20
    ');
    $lsStmt->execute([$workshopId]);
    $lowStock = $lsStmt->fetchAll();

    // ── COTIZACIONES próximas a vencer (pendientes, vencen en ≤7 días) ───────
    $expStmt = $conn->prepare('
        SELECT id, quote_number, customer_name, total, valid_until
        FROM   quotes
        WHERE  workshop_id = ?
          AND  status = "pending"
          AND  valid_until IS NOT NULL
          AND  valid_until BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)
        ORDER  BY valid_until ASC
        LIMIT  10
    ');
    $expStmt->execute([$workshopId, date('Y-m-d'), date('Y-m-d')]);
    $expiringQuotes = $expStmt->fetchAll();

    Response::success([
        'quotes'         => $quotesStats,
        'sales'          => $salesStats,
        'services'       => $servicesStats,
        'lowStock'       => $lowStock,
        'expiringQuotes' => $expiringQuotes,
    ]);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
