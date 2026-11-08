/**
 * Ficha + historial del cliente — criterio M3E (docs/CRITERIO-DISENO-M3E.md),
 * variante "dentro de una hoja". Protagonista: el cliente (avatar en forma
 * cookie) con lo que importa antes de atenderlo: etiquetas (deuda, no trabajar),
 * servicios y compras. Debajo, contacto y la lista de servicios.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { DetailViewCustomer } from "@/components/shared/detail-view/DetailViewCustomer";
import { MobileListCard, MobileListCardSkeleton } from "@/components/shared/MobileListCard";
import { DetailSection, SpecTile, TonalChip } from "@/design-system/detail/DetailScreen";
import { AlertCircle, Edit, Star, Trash2, Wallet, Wrench } from "lucide-react";
import { useServices, type Service } from "@/hooks/useServices";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import type { Customer } from "@/hooks/useCustomers";
import { ServiceDetailSheet } from "@/components/services/ServiceDetailSheet";
import { CustomerAvatar } from "@/components/customers/CustomerAvatar";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CustomerServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const STATUS: Record<string, { label: string; text: string; dot: string }> = {
  pending:     { label: "Pendiente",  text: "text-warning",     dot: "bg-warning" },
  in_progress: { label: "En curso",   text: "text-info",        dot: "bg-info" },
  completed:   { label: "Finalizado", text: "text-success",     dot: "bg-success" },
  delivered:   { label: "Entregado",  text: "text-primary",     dot: "bg-primary" },
  cancelled:   { label: "Cancelado",  text: "text-destructive", dot: "bg-destructive/70" },
};

const getServiceStatus = (service: Service) =>
  service.status === "pending" && service.scheduled_start_at
    ? { label: "Programado", text: "text-primary", dot: "bg-primary-light ring-2 ring-inset ring-primary" }
    : STATUS[service.status] ?? STATUS.pending;

const getServiceDate = (service: Service) =>
  (service.status === "pending" && service.scheduled_start_at) || service.started_at || service.created_at;

export function CustomerServicesDialog({ open, onOpenChange, customer, onEdit, onDelete }: CustomerServicesDialogProps) {
  const { data: allServices, isLoading } = useServices();
  const { data: settings } = useBusinessSettings();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const currencySymbol = settings?.currency_symbol || "$";

  const customerServices = allServices?.filter((s) => s.customer_id === customer?.id) || [];

  const handleViewDetail = (service: Service) => {
    setSelectedService(service);
    onOpenChange(false);
    window.setTimeout(() => setDetailDialogOpen(true), 0);
  };

  if (!customer) return null;

  const noWork = !!customer.no_work_again;
  const footerActions: DialogAction[] = onEdit ? [{ icon: Edit, label: "Editar", onClick: onEdit }] : [];
  // Eliminar va al menú ⋯ (acción destructiva).
  const menuActions: DialogAction[] = onDelete
    ? [{ icon: Trash2, label: "Eliminar cliente", tone: "destructive", onClick: onDelete }]
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle className="line-clamp-2 text-2xl font-bold leading-tight">{customer.name}</DialogTitle>
            <DialogDescription>{customer.customer_type === "company" ? "Empresa" : "Persona"}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pb-2">
            {/* Protagonista: el cliente y lo que hay que saber antes de atenderlo */}
            <section className={cn("rounded-[28px] p-5", noWork ? "bg-destructive-light" : "bg-primary-light")}>
              <div className="flex items-center gap-4">
                <CustomerAvatar
                  name={customer.name}
                  customerType={customer.customer_type}
                  noWorkAgain={noWork}
                  className={cn("h-20 w-20 text-2xl", noWork ? "text-background/70" : "")}
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <SpecTile label="Servicios" value={isLoading ? "…" : String(customerServices.length)} />
                  <SpecTile
                    label="Compras"
                    value={`${currencySymbol}${Number(customer.total_purchases || 0).toLocaleString()}`}
                  />
                </div>
              </div>

              {(noWork || customer.has_debt || customer.is_frequent || customer.is_vip) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {noWork && (
                    <TonalChip icon={<AlertCircle className="h-4 w-4" />} label="No volver a trabajar" tone="destructive" className="bg-background/70 text-destructive" />
                  )}
                  {!!customer.has_debt && (
                    <TonalChip icon={<Wallet className="h-4 w-4" />} label="Con deuda" tone="warning" />
                  )}
                  {!!customer.is_frequent && (
                    <TonalChip icon={<Star className="h-4 w-4" />} label="Frecuente" tone="neutral" className="bg-background/70" />
                  )}
                  {!!customer.is_vip && (
                    <TonalChip label="Cerrajero externo" tone="neutral" className="bg-background/70" />
                  )}
                </div>
              )}
              {noWork && customer.no_work_reason && (
                <p className="mt-3 text-[15px] leading-relaxed text-foreground">{customer.no_work_reason}</p>
              )}
            </section>

            <DetailViewCustomer
              data={{
                customer_name: null,
                customer_phone: customer.phone,
                customer_email: customer.email,
                customer_address: customer.address,
              }}
            />
            {customer.phone_secondary && (
              <DetailViewCustomer
                data={{ customer_name: null, customer_phone: customer.phone_secondary, customer_email: null, customer_address: null }}
              />
            )}

            {customer.notes && (
              <DetailSection title="Notas" className="bg-muted shadow-none">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{customer.notes}</p>
              </DetailSection>
            )}

            <DetailSection
              title="Servicios"
              className="bg-muted shadow-none"
              action={!isLoading && <span className="text-sm tabular-nums text-muted-foreground">{customerServices.length}</span>}
            >
              {isLoading ? (
                <div className="m3-list -mx-1">
                  {[0, 1, 2].map((i) => <MobileListCardSkeleton key={i} />)}
                </div>
              ) : customerServices.length === 0 ? (
                <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
                  <Wrench className="h-4 w-4 shrink-0" />
                  Sin servicios registrados
                </p>
              ) : (
                <div className="m3-list -mx-1">
                  {customerServices.map((service) => {
                    const status = getServiceStatus(service);
                    const price = service.final_price ?? service.estimated_price ?? 0;
                    return (
                      <MobileListCard
                        key={service.id}
                        onClick={() => handleViewDetail(service)}
                        code={service.service_number}
                        statusLabel={status.label}
                        statusTextClass={status.text}
                        statusDotClass={status.dot}
                        statusPulse={service.status === "in_progress"}
                        title={service.description || service.service_number}
                        subtitle={format(parseISO(getServiceDate(service)), "d MMM yyyy", { locale: es })}
                        valueText={price > 0 ? `${currencySymbol}${Number(price).toLocaleString()}` : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </DetailSection>
          </div>

          {(footerActions.length > 0 || menuActions.length > 0) && (
            <DialogFooter>
              <DialogActionBar actions={footerActions} menuActions={menuActions} />
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ServiceDetailSheet
        open={detailDialogOpen}
        onOpenChange={(nextOpen) => {
          setDetailDialogOpen(nextOpen);
          if (!nextOpen) setSelectedService(null);
        }}
        service={selectedService}
        currencySymbol={currencySymbol}
      />
    </>
  );
}
