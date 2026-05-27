import { PageHeader } from "@/components/layout/PageHeader";
import { FileText, ShoppingCart, Wrench, TrendingUp } from "lucide-react";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ServiceStatus } from "@/components/dashboard/ServiceStatus";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { UpcomingQuotes } from "@/components/dashboard/UpcomingQuotes";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { profile } = useAuth();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || "$";

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-2 px-5 lg:px-6 pb-24 md:pb-6 space-y-6 no-scrollbar">
      <PageHeader
        title="Panel Principal"
        subtitle={
          <>
            Bienvenido
            {profile?.full_name ? (
              <>, <span className="text-foreground dark:text-primary font-semibold">{profile.full_name}</span></>
            ) : null}
          </>
        }
        action={
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground dark:text-success bg-success-light rounded-full px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-semibold">En vivo</span>
          </div>
        }
      />

      {/* Stats Rail */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-elevated p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 rounded-sm bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-2.5 rounded bg-muted/60 w-3/4" />
                <div className="h-5 rounded bg-muted/60 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="card-elevated p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-sm shrink-0 bg-primary/10">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wide truncate">Ventas del Mes</p>
              <p className="text-base sm:text-xl font-black text-foreground leading-tight truncate">{currencySymbol}{(stats?.sales.total || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="card-elevated p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-sm shrink-0 bg-muted">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wide truncate">Servicios Hoy</p>
              <p className="text-base sm:text-xl font-black text-foreground leading-tight">{stats?.services.today || 0}</p>
            </div>
          </div>
          <div className="card-elevated p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-sm shrink-0 bg-muted">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wide truncate">Cotizaciones</p>
              <p className="text-base sm:text-xl font-black text-foreground leading-tight">{stats?.quotes.total || 0}</p>
            </div>
          </div>
        </div>
      )}

      <ServiceStatus stats={stats?.services.byStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LowStockAlert products={stats?.lowStock || []} />
          <UpcomingQuotes quotes={stats?.expiringQuotes || []} />
        </div>
        <div className="space-y-6">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
