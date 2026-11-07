/**
 * Detalle de garantía — criterio M3E (docs/CRITERIO-DISENO-M3E.md), variante
 * "dentro de una hoja". Protagonista: los días restantes, en un anillo de
 * progreso que se vacía hacia el vencimiento.
 */
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { DetailViewCustomer } from "@/components/shared/detail-view/DetailViewCustomer";
import { DetailSection, SpecRow, TonalChip } from "@/design-system/detail/DetailScreen";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Package, Printer, Wrench, XCircle } from "lucide-react";
import type { Warranty } from "@/hooks/useWarranties";

interface WarrantyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty | null;
  onVoid?: () => void;
  onPrint?: () => void;
}

type WarrantyState = "voided" | "expired" | "expiring" | "active";

const STATE_META: Record<WarrantyState, { label: string; ring: string; hero: string }> = {
  active:   { label: "Vigente",    ring: "text-primary",     hero: "bg-primary-light" },
  expiring: { label: "Por vencer", ring: "text-warning",     hero: "bg-warning-light" },
  expired:  { label: "Vencida",    ring: "text-muted-foreground", hero: "bg-muted" },
  voided:   { label: "Anulada",    ring: "text-destructive", hero: "bg-destructive-light" },
};

/** Anillo de progreso con los días restantes en el centro. */
function DaysRing({ fraction, days, className }: { fraction: number; days: number | null; className: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-background/70" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          className={cn("transition-[stroke-dashoffset] duration-700", className)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {days !== null ? (
          <>
            <span className="text-[2rem] font-bold leading-none tabular-nums text-foreground">{days}</span>
            <span className="mt-0.5 text-xs font-medium text-muted-foreground">{days === 1 ? "día" : "días"}</span>
          </>
        ) : (
          <span className="text-2xl font-bold text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

export function WarrantyDetailDialog({ open, onOpenChange, warranty, onVoid, onPrint }: WarrantyDetailDialogProps) {
  if (!warranty) return null;

  const endDate = parseISO(warranty.end_date);
  const daysLeft = differenceInDays(endDate, new Date());
  const state: WarrantyState = warranty.is_voided
    ? "voided"
    : isPast(endDate)
      ? "expired"
      : daysLeft <= 7
        ? "expiring"
        : "active";
  const meta = STATE_META[state];
  const isRunning = state === "active" || state === "expiring";
  const fraction = isRunning && warranty.warranty_days > 0
    ? Math.min(1, Math.max(0, daysLeft / warranty.warranty_days))
    : 0;

  const isSale = warranty.warranty_type === "sale";
  const TypeIcon = isSale ? Package : Wrench;
  const fmt = (iso: string, pattern = "d MMM yyyy") => format(parseISO(iso), pattern, { locale: es });

  const stateLine =
    state === "voided"
      ? warranty.voided_at ? `Anulada el ${fmt(warranty.voided_at)}` : "Garantía anulada"
      : state === "expired"
        ? `Venció el ${fmt(warranty.end_date)}`
        : `Vence el ${fmt(warranty.end_date)}`;

  const showVoid = !!onVoid && !warranty.is_voided;
  const footerActions: DialogAction[] = onPrint ? [{ icon: Printer, label: "Ticket", onClick: onPrint }] : [];
  // Anular va al menú ⋯ (acción destructiva).
  const menuActions: DialogAction[] = showVoid
    ? [{ icon: XCircle, label: "Anular garantía", tone: "destructive", onClick: onVoid! }]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">Garantía</DialogTitle>
          <DialogDescription className="tabular-nums">
            {warranty.warranty_code} · {isSale ? "de venta" : "de servicio"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pb-2">
          {/* Protagonista: días restantes */}
          <section className={cn("flex items-center gap-5 rounded-[28px] p-5", meta.hero)}>
            <DaysRing fraction={fraction} days={isRunning ? daysLeft : null} className={meta.ring} />
            <div className="min-w-0">
              <p className="text-[1.75rem] font-bold leading-tight text-foreground">{meta.label}</p>
              <p className="mt-1 text-[15px] text-muted-foreground">{stateLine}</p>
              <TonalChip
                icon={<TypeIcon className="h-4 w-4" />}
                label={`${warranty.warranty_days} días de cobertura`}
                tone="neutral"
                className="mt-3 bg-background/70"
              />
            </div>
          </section>

          {state === "voided" && (
            <DetailSection title="Motivo de anulación" tone="destructive" icon={<XCircle className="h-5 w-5 shrink-0 text-destructive" />}>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {warranty.voided_reason || "Sin motivo registrado"}
              </p>
            </DetailSection>
          )}

          <DetailSection title={isSale ? "Producto" : "Servicio"} className="bg-muted shadow-none">
            <p className="text-[15px] font-medium leading-relaxed text-foreground">
              {(isSale ? warranty.product_name : warranty.service_description) || "Sin descripción"}
            </p>
            {(isSale ? warranty.sale?.sale_number : warranty.service?.service_number) && (
              <div className="-mb-1.5 mt-2">
                <SpecRow
                  label={isSale ? "Venta" : "Servicio"}
                  value={(isSale ? warranty.sale?.sale_number : warranty.service?.service_number) ?? ""}
                />
              </div>
            )}
          </DetailSection>

          <DetailViewCustomer
            data={{
              customer_name: warranty.customer_name,
              customer_phone: warranty.customer?.phone,
              customer_email: warranty.customer?.email,
              customer_address: null,
            }}
          />

          <DetailSection title="Vigencia" className="bg-muted shadow-none">
            <div className="-my-1.5">
              <SpecRow label="Inicio" value={fmt(warranty.start_date)} />
              <SpecRow label="Vencimiento" value={fmt(warranty.end_date)} />
              <SpecRow label="Registrada" value={fmt(warranty.created_at, "d MMM yyyy, HH:mm")} />
            </div>
          </DetailSection>

          {warranty.notes && (
            <DetailSection title="Notas" className="bg-muted shadow-none">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{warranty.notes}</p>
            </DetailSection>
          )}
        </div>

        {(footerActions.length > 0 || menuActions.length > 0) && (
          <DialogFooter className="gap-2 pt-1">
            <DialogActionBar actions={footerActions} menuActions={menuActions} />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
