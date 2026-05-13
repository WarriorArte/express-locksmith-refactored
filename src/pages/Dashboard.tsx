import { PageHeader } from "@/components/layout/PageHeader";
import { StatsLayout } from "@/components/ui/stats-layout";
import { 
  FileText, 
  ShoppingCart, 
  Wrench,
  TrendingUp,
  Loader2,
} from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-2 px-5 lg:px-6 pb-24 md:pb-6 space-y-6 no-scrollbar">
      {/* Header */}
      <PageHeader
        title="Panel Principal"
        subtitle={
          <>
            Bienvenido
            {profile?.full_name ? (
              <>, <span className="text-primary font-semibold">{profile.full_name}</span></>
            ) : null}
          </>
        }
        action={
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-success bg-success-light rounded-full px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-semibold">En vivo</span>
          </div>
        }
      />

      {/* Stats Configuration */}
      <StatsLayout
        mainStat={{
          title: "Ventas del Mes",
          value: `${currencySymbol}${(stats?.sales.total || 0).toLocaleString()}`,
          icon: ShoppingCart,
          className: "bg-primary/5",
          iconClassName: "bg-primary text-primary-foreground",
        }}
        secondaryStats={[
          {
            title: "Servicios Hoy",
            value: stats?.services.today || 0,
            icon: Wrench,
            className: "bg-secondary/5",
            iconClassName: "bg-secondary text-secondary-foreground",
          },
          {
            title: "Total Cotizaciones",
            value: stats?.quotes.total || 0,
            icon: FileText,
            className: "bg-muted",
            iconClassName: "bg-muted-foreground/20 text-muted-foreground",
          }
        ]}
      />

      {/* Service Status */}
      <ServiceStatus stats={stats?.services.byStatus} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <LowStockAlert products={stats?.lowStock || []} />
          <UpcomingQuotes quotes={stats?.expiringQuotes || []} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
