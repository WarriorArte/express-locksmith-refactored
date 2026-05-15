import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Printer,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import type { Warranty } from "@/hooks/useWarranties";

interface WarrantyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty | null;
  onPrint?: () => void;
  onPreview?: () => void;
  onVoid?: () => void;
}

export function WarrantyDetailDialog({
  open,
  onOpenChange,
  warranty,
  onPrint,
  onPreview,
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
      return { label: "Por Vencer", color: "bg-warning text-warning-foreground", icon: Clock };
    }
    return { label: "Vigente", color: "bg-success text-success-foreground", icon: CheckCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;
  const daysLeft = differenceInDays(parseISO(warranty.end_date), new Date());

  const mainAction = onPreview
    ? { label: "Vista previa", icon: Eye, onClick: onPreview }
    : onPrint
    ? { label: "Imprimir", icon: Printer, onClick: onPrint }
    : null;
  const hasMenu = !!onPrint || !!onPreview || (!!onVoid && !warranty.is_voided);
  const hasFooter = !!mainAction || hasMenu;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Detalle de Garantía
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="font-mono text-xl font-bold text-foreground dark:text-primary mb-2">
              {warranty.warranty_code}
            </div>
            <Badge className={cn("text-sm", status.color)}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {status.label}
            </Badge>
            {!warranty.is_voided && !isPast(parseISO(warranty.end_date)) && (
              <p className={cn("text-sm mt-2 font-medium", daysLeft <= 7 ? "text-warning" : "text-foreground dark:text-success")}>
                {daysLeft} días restantes
              </p>
            )}
          </div>

          {/* Type Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="text-sm">
              {warranty.warranty_type === "sale" ? (
                <>
                  <Package className="w-4 h-4 mr-1" />
                  Garantía de Venta
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-1" />
                  Garantía de Servicio
                </>
              )}
            </Badge>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </h4>
            <div className="pl-6 space-y-1 text-sm">
              <p><strong>Nombre:</strong> {warranty.customer_name || "N/A"}</p>
              {warranty.customer?.phone && (
                <p><strong>Teléfono:</strong> {warranty.customer.phone}</p>
              )}
              {warranty.customer?.email && (
                <p><strong>Email:</strong> {warranty.customer.email}</p>
              )}
            </div>
          </div>

          {/* Product/Service Info */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              {warranty.warranty_type === "sale" ? (
                <Package className="w-4 h-4" />
              ) : (
                <Wrench className="w-4 h-4" />
              )}
              {warranty.warranty_type === "sale" ? "Producto" : "Servicio"}
            </h4>
            <div className="pl-6 space-y-1 text-sm">
              {warranty.warranty_type === "sale" && (
                <>
                  <p><strong>Producto:</strong> {warranty.product_name}</p>
                  {warranty.sale?.sale_number && (
                    <p><strong>Ref. Venta:</strong> {warranty.sale.sale_number}</p>
                  )}
                </>
              )}
              {warranty.warranty_type === "service" && (
                <>
                  <p><strong>Descripción:</strong> {warranty.service_description}</p>
                  {warranty.service?.service_number && (
                    <p><strong>Ref. Servicio:</strong> {warranty.service.service_number}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Vigencia
            </h4>
            <div className="pl-6 space-y-1 text-sm">
              <p><strong>Duración:</strong> {warranty.warranty_days} días</p>
              <p><strong>Fecha de inicio:</strong> {format(parseISO(warranty.start_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
              <p><strong>Fecha de vencimiento:</strong> {format(parseISO(warranty.end_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
              <p><strong>Creada:</strong> {format(parseISO(warranty.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            </div>
          </div>

          {/* Notes */}
          {warranty.notes && (
            <div className="space-y-3">
              <h4 className="font-semibold">Notas</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {warranty.notes}
              </p>
            </div>
          )}

          {/* Voided Info */}
          {warranty.is_voided && (
            <div className="space-y-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <h4 className="font-semibold text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Garantía Anulada
              </h4>
              <div className="pl-6 space-y-1 text-sm">
                {warranty.voided_at && (
                  <p><strong>Fecha:</strong> {format(parseISO(warranty.voided_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                )}
                <p><strong>Razón:</strong> {warranty.voided_reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer: botón principal + menú ⋮ */}
        {hasFooter && (
          <div className="pt-4 border-t mt-2">
            <div className="flex items-center gap-2 w-full">
              {mainAction && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl font-semibold"
                  onClick={mainAction.onClick}
                >
                  <mainAction.icon className="w-4 h-4 mr-1.5" /> {mainAction.label}
                </Button>
              )}
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl flex-shrink-0">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    {onPrint && (
                      <DropdownMenuItem onClick={onPrint}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimir Ticket
                      </DropdownMenuItem>
                    )}
                    {onPreview && (
                      <DropdownMenuItem onClick={onPreview}>
                        <Eye className="w-4 h-4 mr-2" /> Vista previa
                      </DropdownMenuItem>
                    )}
                    {onVoid && !warranty.is_voided && (
                      <DropdownMenuItem onClick={onVoid} className="text-destructive">
                        <XCircle className="w-4 h-4 mr-2" /> Anular Garantía
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
