/**
 * ServiceDetailSheet — detalle de un servicio (hoja inferior en móvil).
 * Criterio M3E (docs/CRITERIO-DISENO-M3E.md), variante "dentro de una hoja":
 * protagonista = estado + siguiente paso (botón grande dentro del hero).
 */
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Edit, ImagePlus, Trash2, Truck, Wrench, XCircle, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { DetailViewCustomer } from "@/components/shared/detail-view/DetailViewCustomer";
import { DetailViewImages } from "@/components/shared/detail-view/DetailViewImages";
import { DetailViewItems } from "@/components/shared/detail-view/DetailViewItems";
import { formatMoney } from "@/components/shared/detail-view/DetailViewTotals";
import { DetailSection, SpecRow, SpecTile } from "@/design-system/detail/DetailScreen";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { cn } from "@/lib/utils";
import type { Service, ServiceStatus } from "@/hooks/useServices";

const STATUS_META: Record<ServiceStatus, { label: string; dot: string }> = {
  pending:     { label: "Pendiente",  dot: "bg-warning" },
  in_progress: { label: "En curso",   dot: "bg-info" },
  completed:   { label: "Finalizado", dot: "bg-success" },
  delivered:   { label: "Entregado",  dot: "bg-primary" },
  cancelled:   { label: "Cancelado",  dot: "bg-destructive" },
};

const TYPE_LABEL: Record<string, string> = {
  automotive: "Automotriz",
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
};

const NEXT_STATUS: Partial<Record<ServiceStatus, { status: ServiceStatus; label: string; icon: LucideIcon }>> = {
  pending:     { status: "in_progress", label: "Iniciar servicio",  icon: Wrench },
  in_progress: { status: "completed",   label: "Marcar completado", icon: CheckCircle },
  completed:   { status: "delivered",   label: "Marcar entregado",  icon: Truck },
};

interface Props {
  service: Service | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currencySymbol?: string;
  onEdit?: (s: Service) => void;
  onStatusChange?: (s: Service, next: ServiceStatus) => void;
  onAddImages?: (s: Service) => void;
  onCancel?: (s: Service) => void;
  onDelete?: (s: Service) => void;
}

export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
  currencySymbol = "$",
  onEdit,
  onStatusChange,
  onAddImages,
  onCancel,
  onDelete,
}: Props) {
  const images = useMemo(() => service?.service_images ?? [], [service?.service_images]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const viewerImages = useMemo(
    () =>
      images
        .filter((img) => Boolean(img?.image_url))
        .map((img) => ({ url: img.image_url, description: img.description || undefined })),
    [images],
  );

  if (!service) return null;

  const isScheduled = service.status === "pending" && !!service.scheduled_start_at;
  const st = isScheduled ? { label: "Programado", dot: "bg-primary-light ring-2 ring-inset ring-primary" } : STATUS_META[service.status];
  const typeLabel = TYPE_LABEL[service.service_type] ?? service.service_type;
  const next = onStatusChange ? NEXT_STATUS[service.status] : undefined;

  const products = service.service_products ?? [];
  const productsSubtotal = products.reduce((acc, p) => acc + Number(p.subtotal), 0) || 0;
  const labor = Number(service.labor_cost || 0);
  const discount = Number(service.discount || 0);
  const deposit = Number(service.deposit || 0);
  const total = Number(service.final_price ?? service.estimated_price ?? 0);
  const notes = service.internal_notes?.trim() || "";
  const address = service.address || service.customer?.address || null;
  const canCancel = !!onCancel && (service.status === "pending" || service.status === "in_progress");

  const dateIso = isScheduled
    ? service.scheduled_start_at!
    : service.started_at || service.created_at;
  const dateLabel = isScheduled ? "Programado para" : service.started_at ? "Iniciado" : "Registrado";
  const dateText = format(parseISO(dateIso), "EEEE d MMM, HH:mm", { locale: es });

  const openImage = (index: number) => {
    const img = images[index];
    if (!img?.image_url || viewerImages.length === 0) return;
    const safeIndex = viewerImages.findIndex((image) => image.url === img.image_url);
    setImageViewerIndex(safeIndex >= 0 ? safeIndex : Math.min(index, viewerImages.length - 1));
    setImageViewerOpen(true);
  };

  // Pie: Editar y Fotos a la vista; cancelar y eliminar en el menú ⋯.
  const footerActions: DialogAction[] = [
    ...(onEdit ? [{ icon: Edit, label: "Editar", onClick: () => onEdit(service) }] : []),
    ...(onAddImages ? [{ icon: ImagePlus, label: "Fotos", tooltip: "Agregar fotos", onClick: () => onAddImages(service) }] : []),
  ];
  const menuActions: DialogAction[] = [
    ...(canCancel ? [{ icon: XCircle, label: "Cancelar servicio", tone: "warning" as const, onClick: () => onCancel!(service) }] : []),
    ...(onDelete
      ? [{ icon: Trash2, label: "Eliminar", tone: "destructive" as const, separator: true, onClick: () => onDelete(service) }]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight disableSwipeToClose={imageViewerOpen} className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="line-clamp-2 text-2xl font-bold leading-tight">
            {service.description || "Servicio"}
          </DialogTitle>
          <DialogDescription className="tabular-nums">
            {service.service_number} · {typeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto pb-2">
          {/* Protagonista: estado + siguiente paso */}
          <section className="rounded-[28px] bg-primary-light p-5">
            <p className="text-xs font-medium text-muted-foreground">Estado</p>
            <div className="mt-0.5 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn("h-3 w-3 shrink-0 rounded-full", st.dot, service.status === "in_progress" && "animate-pulse")}
              />
              <p className="text-[1.75rem] font-bold leading-tight text-foreground">{st.label}</p>
            </div>
            <p className="mt-1 text-[15px] text-muted-foreground first-letter:uppercase">
              {dateLabel} {dateText}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <SpecTile label="Total" value={formatMoney(currencySymbol, total)} />
              {deposit > 0 ? (
                <SpecTile label="Saldo pendiente" value={formatMoney(currencySymbol, total - deposit)} />
              ) : (
                <SpecTile label="Precio" value={service.final_price != null ? "Final" : "Estimado"} />
              )}
            </div>

            {next && (
              <Button
                className="mt-4 h-14 w-full text-base"
                onClick={() => onStatusChange?.(service, next.status)}
              >
                <next.icon className="!h-5 !w-5" />
                {next.label}
              </Button>
            )}
          </section>

          <DetailViewCustomer
            data={{
              customer_name: service.customer?.name,
              customer_phone: service.customer?.phone,
              customer_email: null,
              customer_address: address,
            }}
          />

          {service.problem && (
            <DetailSection title="Problema" className="bg-muted shadow-none">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{service.problem}</p>
            </DetailSection>
          )}

          {images.length > 0 && <DetailViewImages images={images} onView={openImage} />}

          <DetailViewItems
            type="service"
            items={products.map((p) => ({
              id: p.id,
              product_name: p.product_name || "Producto",
              quantity: Number(p.quantity || 0),
              unit_price: Number(p.unit_price || 0),
              subtotal: Number(p.subtotal || 0),
            }))}
            currencySymbol={currencySymbol}
          />

          {(labor > 0 || discount > 0 || deposit > 0) && (
            <DetailSection title="Desglose" className="bg-muted shadow-none">
              <div className="-my-1.5">
                {productsSubtotal > 0 && <SpecRow label="Productos" value={formatMoney(currencySymbol, productsSubtotal)} />}
                {labor > 0 && <SpecRow label="Mano de obra" value={formatMoney(currencySymbol, labor)} />}
                {discount > 0 && (
                  <SpecRow label="Descuento" value={<span className="text-destructive">−{formatMoney(currencySymbol, discount)}</span>} />
                )}
                <SpecRow label="Total" value={<span className="font-bold">{formatMoney(currencySymbol, total)}</span>} />
                {deposit > 0 && <SpecRow label="Anticipo" value={formatMoney(currencySymbol, deposit)} />}
              </div>
            </DetailSection>
          )}

          {notes && (
            <DetailSection title="Notas internas" className="bg-muted shadow-none">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{notes}</p>
            </DetailSection>
          )}

          {!service.problem && images.length === 0 && products.length === 0 && !notes && (
            <div className="flex flex-col items-center py-4 text-center">
              <MaterialShape name="cookie9" className="mb-2 h-12 w-12 text-muted">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </MaterialShape>
              <p className="text-sm text-muted-foreground">Sin productos, fotos ni notas todavía.</p>
            </div>
          )}
        </div>

        {(footerActions.length > 0 || menuActions.length > 0) && (
          <DialogFooter className="gap-2 pt-1">
            <DialogActionBar actions={footerActions} menuActions={menuActions} />
          </DialogFooter>
        )}
      </DialogContent>

      {viewerImages.length > 0 && (
        <ImageViewDialog
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          images={viewerImages}
          initialIndex={imageViewerIndex}
        />
      )}
    </Dialog>
  );
}
