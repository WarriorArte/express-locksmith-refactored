import {
  FileText,
  ShoppingCart,
  Wrench,
  Package,
  Users,
  Shield,
  Car,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { UpcomingQuotes } from "@/components/dashboard/UpcomingQuotes";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/hooks/useAuth";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { DashboardHero } from "@/design-system/dashboard/DashboardHero";
import { DashboardMetricTile } from "@/design-system/dashboard/DashboardMetricTile";
import { DashboardSkeleton } from "@/design-system/dashboard/DashboardSkeleton";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { icon: Package, label: "Inventario", path: "/inventario", featureKey: "inventory" },
  { icon: FileText, label: "Cotizaciones", path: "/cotizaciones", featureKey: "quotes" },
  { icon: Users, label: "Clientes", path: "/clientes", featureKey: "customers" },
  { icon: Wrench, label: "Servicios", path: "/servicios", featureKey: "services" },
  { icon: ShoppingCart, label: "Ventas", path: "/ventas", featureKey: "sales" },
  { icon: Shield, label: "Garantías", path: "/garantias", featureKey: "warranties" },
  { icon: Car, label: "Vehículos", path: "/herramientas", featureKey: null },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { profile } = useAuth();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const firstName = profile?.full_name?.split(" ")[0] || "Usuario";
  const servicesStatus = stats?.services.byStatus;
  const inProgress = servicesStatus?.in_progress || 0;
  const pending = servicesStatus?.pending || 0;
  const expiringQuotes = stats?.expiringQuotes?.length || 0;

  const filteredNavItems = mobileNavItems.filter(
    (item) => item.featureKey === null || isFeatureEnabled(item.featureKey),
  );

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-3 px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Mobile nav grid */}
      <div className="lg:hidden">
        <DashboardHero
          firstName={firstName}
          inProgressServices={inProgress}
          expiringQuotes={expiringQuotes}
          accountTrigger={
            <AccountMenu showNotifications={false} triggerClassName="shrink-0" />
          }
        />

        <div className="relative z-10 -mt-12 grid grid-cols-3 gap-3">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "card-elevated shadow-md aspect-square flex flex-col items-center justify-center gap-2.5 rounded-xl px-2 transition-all duration-200",
                  isActive
                    ? "!bg-primary !text-primary-foreground border-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="w-7 h-7 flex-shrink-0" />
              <span className="text-xs font-semibold leading-tight text-center">
                {item.label}
              </span>
            </NavLink>
          ))}

          {Array.from({ length: (3 - (filteredNavItems.length % 3)) % 3 }).map((_, i) => (
            <div key={`placeholder-${i}`} className="card-elevated shadow-md aspect-square rounded-xl opacity-30" />
          ))}
        </div>
      </div>

      {/* Desktop dashboard */}
      <div className="hidden lg:block">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <DashboardHero
              firstName={firstName}
              inProgressServices={inProgress}
              expiringQuotes={expiringQuotes}
              accountTrigger={
                <AccountMenu showNotifications={false} triggerClassName="shrink-0" />
              }
            />

            <div className="relative z-10 grid grid-cols-2 gap-2.5 -mt-7 lg:mt-4">
              <DashboardMetricTile
                icon={Wrench}
                label="servicios hoy"
                value={stats?.services.today || 0}
                foot={`${pending} pendientes · ${inProgress} en curso`}
              />
              <DashboardMetricTile
                icon={FileText}
                label="cotizaciones"
                value={stats?.quotes.total || 0}
                foot={`${expiringQuotes} vencen esta semana`}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight">Operación de hoy</h2>
            </div>

            <div className="mt-2 space-y-4 lg:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                  <LowStockAlert products={stats?.lowStock || []} />
                  <UpcomingQuotes quotes={stats?.expiringQuotes || []} />
                </div>
                <div className="space-y-4 lg:space-y-6">
                  <RecentActivity />
                  <div className="hidden lg:block card-elevated p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          transacciones
                        </p>
                        <p className="text-xl font-extrabold leading-tight tabular-nums">
                          {stats?.sales.count || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
