import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "@/hooks/useWorkshop";

type DashboardStatsResponse = {
  quotes: { total: number; accepted: number; acceptedRate: number };
  sales: { total: number; count: number };
  services: {
    today: number;
    byStatus: {
      pending: number;
      in_progress: number;
      completed: number;
      delivered: number;
      cancelled: number;
    };
  };
  lowStock: Array<{
    id: string;
    name: string;
    stock_store: number;
    stock_warehouse: number;
    min_stock: number;
    image_url?: string | null;
  }>;
  expiringQuotes: Array<{
    id: string;
    quote_number: string;
    customer_name: string | null;
    description?: string | null;
    total: number;
    valid_until: string | null;
  }>;
};

function emptyStats() {
  return {
    quotes: { total: 0, accepted: 0, acceptedRate: 0 },
    sales: { total: 0, count: 0 },
    services: { today: 0, byStatus: { pending: 0, in_progress: 0, completed: 0, delivered: 0, cancelled: 0 } },
    lowStock: [],
    expiringQuotes: [],
  };
}

function normalizeDashboardStats(raw: DashboardStatsResponse) {
  return {
    ...raw,
    quotes: {
      ...raw.quotes,
      acceptedRate: Number(raw.quotes?.acceptedRate || 0),
    },
    lowStock: (raw.lowStock || []).map((p) => ({
      ...p,
      image_url: p.image_url ?? null,
    })),
    expiringQuotes: (raw.expiringQuotes || []).map((q) => ({
      ...q,
      description: q.description ?? null,
      total: Number(q.total || 0),
    })),
  };
}

export function useDashboardStats() {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["dashboard-stats", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) {
        return emptyStats();
      }

      const data = await phpApiRequest<DashboardStatsResponse>(
        `/dashboard-stats.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      return normalizeDashboardStats(data);
    },
    enabled: !!currentWorkshop?.id,
  });
}
