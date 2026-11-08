/**
 * Contenido del inicio debajo del selector de vehículo (mientras no hay uno
 * elegido): accesos rápidos para crear registros + resumen del día.
 * Criterio M3E: docs/CRITERIO-DISENO-M3E.md
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { format, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, ShoppingCart, Users, Wrench, type LucideIcon } from "lucide-react";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { ServiceDetailSheet } from "@/components/services/ServiceDetailSheet";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useServices, type Service } from "@/hooks/useServices";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { ShortcutTile } from "@/design-system/actions/ShortcutTile";

type CreateKind = "sale" | "service" | "quote" | "customer";

const QUICK_ACTIONS: { kind: CreateKind; label: string; icon: LucideIcon; featureKey: string }[] = [
  { kind: "sale", label: "Venta", icon: ShoppingCart, featureKey: "sales" },
  { kind: "service", label: "Servicio", icon: Wrench, featureKey: "services" },
  { kind: "quote", label: "Cotización", icon: FileText, featureKey: "quotes" },
  { kind: "customer", label: "Cliente", icon: Users, featureKey: "customers" },
];

const MAX_ROWS = 5;

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between px-1">
      <h2 className="text-lg font-semibold text-foreground">{children}</h2>
      {count !== undefined && <span className="text-sm tabular-nums text-muted-foreground">{count}</span>}
    </div>
  );
}

export function VehicleHomeExtras() {
  const navigate = useNavigate();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const { data: services } = useServices();
  const { data: stats } = useDashboardStats();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || "$";

  const [creating, setCreating] = useState<CreateKind | null>(null);
  const [viewing, setViewing] = useState<Service | null>(null);

  const showServices = isFeatureEnabled("services");
  const showQuotes = isFeatureEnabled("quotes");
  const actions = QUICK_ACTIONS.filter((a) => isFeatureEnabled(a.featureKey));

  const inProgress = useMemo(
    () => (services ?? []).filter((s) => s.status === "in_progress"),
    [services],
  );
  const pendingToday = useMemo(
    () =>
      (services ?? [])
        .filter((s) => s.status === "pending" && s.scheduled_start_at && isToday(parseISO(s.scheduled_start_at)))
        .sort((a, b) => (a.scheduled_start_at! < b.scheduled_start_at! ? -1 : 1)),
    [services],
  );
  const expiringQuotes = stats?.expiringQuotes ?? [];

  const price = (s: Service) => {
    const value = s.final_price ?? s.estimated_price ?? 0;
    return value > 0 ? `${currencySymbol}${Number(value).toLocaleString()}` : undefined;
  };

  return (
    <div className="space-y-6 pt-1">
      {/* Accesos rápidos: crear sin salir del inicio */}
      {actions.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {actions.map((a) => (
            <ShortcutTile
              key={a.kind}
              icon={a.icon}
              label={a.label}
              create
              onClick={() => setCreating(a.kind)}
            />
          ))}
        </div>
      )}

      {/* Resumen del día */}
      {showServices && inProgress.length > 0 && (
        <section>
          <SectionTitle count={inProgress.length}>En curso ahora</SectionTitle>
          <div className="m3-list">
            {inProgress.slice(0, MAX_ROWS).map((s) => (
              <MobileListCard
                key={s.id}
                onClick={() => setViewing(s)}
                code={s.service_number}
                statusLabel="En curso"
                statusTextClass="text-info"
                statusDotClass="bg-info"
                statusPulse
                title={s.description || s.service_number}
                subtitle={s.customer?.name ?? "Sin cliente"}
                valueText={price(s)}
              />
            ))}
          </div>
        </section>
      )}

      {showServices && pendingToday.length > 0 && (
        <section>
          <SectionTitle count={pendingToday.length}>Pendientes de hoy</SectionTitle>
          <div className="m3-list">
            {pendingToday.slice(0, MAX_ROWS).map((s) => (
              <MobileListCard
                key={s.id}
                onClick={() => setViewing(s)}
                code={s.service_number}
                statusLabel={format(parseISO(s.scheduled_start_at!), "HH:mm")}
                statusTextClass="text-foreground"
                statusDotClass="bg-primary-light ring-2 ring-inset ring-primary"
                title={s.description || s.service_number}
                subtitle={s.customer?.name ?? "Sin cliente"}
                valueText={price(s)}
              />
            ))}
          </div>
        </section>
      )}

      {showQuotes && expiringQuotes.length > 0 && (
        <section>
          <SectionTitle count={expiringQuotes.length}>Cotizaciones por vencer</SectionTitle>
          <div className="m3-list">
            {expiringQuotes.slice(0, MAX_ROWS).map((q) => (
              <MobileListCard
                key={q.id}
                onClick={() => navigate("/cotizaciones")}
                code={q.quote_number}
                statusLabel={q.valid_until ? `Vence ${format(parseISO(q.valid_until), "d MMM", { locale: es })}` : "Por vencer"}
                statusTextClass="text-warning"
                statusDotClass="bg-warning"
                title={q.description || q.quote_number}
                subtitle={q.customer_name ?? "Sin cliente"}
                valueText={`${currencySymbol}${Number(q.total).toLocaleString()}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Detalle de solo lectura: el estado se avanza desde Servicios
          (allí está la lógica de inventario al completar). */}
      <ServiceDetailSheet
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        service={viewing}
        currencySymbol={currencySymbol}
      />

      <SaleFormDialog open={creating === "sale"} onOpenChange={(o) => !o && setCreating(null)} />
      <ServiceFormDialog open={creating === "service"} onOpenChange={(o) => !o && setCreating(null)} />
      <QuoteFormDialog open={creating === "quote"} onOpenChange={(o) => !o && setCreating(null)} />
      <CustomerFormDialog open={creating === "customer"} onOpenChange={(o) => !o && setCreating(null)} />
    </div>
  );
}
