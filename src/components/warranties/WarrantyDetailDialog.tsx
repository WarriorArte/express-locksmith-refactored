import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShieldCheck,
  User,
  Calendar,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Warranty } from "@/hooks/useWarranties";

interface WarrantyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty | null;
  onVoid?: () => void;
}

export function WarrantyDetailDialog({
  open,
  onOpenChange,
  warranty,
  onVoid,
}: WarrantyDetailDialogProps) {
  if (!warranty) return null;

  const getStatus = () => {
    if (warranty.is_voided) {
      return { label: "Anulada", color: "bg-destructive text-destructive-foreground", icon: XCircle };
    }
    const endDate = parseISO(warranty.end_date);
    if (isPast(endDate)) {
      return { label: "Vencida", color: "bg-muted text-muted-foreground", icon: AlertCircle };
    }
    const daysLeft = differenceInDays(endDate, new Date());
    if (daysLeft <= 7) {
      return { label: "Por vencer", color: "bg-warning text-warning-foreground", icon: Clock };
    }
    return { label: "Vigente", color: "bg-success text-success-foreground", icon: CheckCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;
  const daysLeft = differenceInDays(parseISO(warranty.end_date), new Date());
  const typeLabel = warranty.warranty_type === "sale" ? "Garantia de venta" : "Garantia de servicio";
  const TypeIcon = warranty.warranty_type === "sale" ? Package : Wrench;

  const showVoid = !!onVoid && !warranty.is_voided;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-foreground dark:text-primary">
                {warranty.warranty_code}
              </span>
              <span className="block text-xs font-medium text-muted-foreground">Detalle de garantia</span>
            </span>
            <Badge className={cn("text-xs", status.color)}>
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {status.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pb-2">
          <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <TypeIcon className="w-3.5 h-3.5 mr-1" />
                {typeLabel}
              </Badge>
              {!warranty.is_voided && !isPast(parseISO(warranty.end_date)) && (
                <span className={cn("text-[13px] font-semibold", daysLeft <= 7 ? "text-warning" : "text-foreground dark:text-success")}>
                  {daysLeft} dias restantes
                </span>
              )}
            </div>
            <div className="font-mono text-lg font-bold text-foreground dark:text-primary">
              {warranty.warranty_code}
            </div>
          </div>

          <Section icon={User} title="Cliente">
            <InfoRow label="Nombre" value={warranty.customer_name || "N/A"} />
            {warranty.customer?.phone && <InfoRow label="Telefono" value={warranty.customer.phone} />}
            {warranty.customer?.email && <InfoRow label="Email" value={warranty.customer.email} />}
          </Section>

          <Section icon={TypeIcon} title={warranty.warranty_type === "sale" ? "Producto" : "Servicio"}>
            {warranty.warranty_type === "sale" ? (
              <>
                <InfoRow label="Producto" value={warranty.product_name || "N/A"} />
                {warranty.sale?.sale_number && <InfoRow label="Ref. venta" value={warranty.sale.sale_number} />}
              </>
            ) : (
              <>
                <InfoRow label="Descripcion" value={warranty.service_description || "N/A"} />
                {warranty.service?.service_number && <InfoRow label="Ref. servicio" value={warranty.service.service_number} />}
              </>
            )}
          </Section>

          <Section icon={Calendar} title="Vigencia">
            <InfoRow label="Duracion" value={`${warranty.warranty_days} dias`} />
            <InfoRow label="Inicio" value={format(parseISO(warranty.start_date), "dd MMM yyyy", { locale: es })} />
            <InfoRow label="Vencimiento" value={format(parseISO(warranty.end_date), "dd MMM yyyy", { locale: es })} />
            <InfoRow label="Creada" value={format(parseISO(warranty.created_at), "dd/MM/yyyy HH:mm", { locale: es })} />
          </Section>

          {warranty.notes && (
            <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Notas
              </div>
              <p className="whitespace-pre-wrap text-[13px] text-foreground">{warranty.notes}</p>
            </div>
          )}

          {warranty.is_voided && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                <XCircle className="w-3.5 h-3.5" />
                Garantia anulada
              </div>
              {warranty.voided_at && (
                <InfoRow label="Fecha" value={format(parseISO(warranty.voided_at), "dd/MM/yyyy HH:mm", { locale: es })} />
              )}
              <InfoRow label="Razon" value={warranty.voided_reason || "N/A"} />
            </div>
          )}
        </div>

        {showVoid && (
          <DialogFooter className="pt-1 gap-2">
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl font-semibold text-destructive hover:text-destructive"
              onClick={onVoid}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Anular garantia
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-[13px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
