/**
 * ServiceDetailSheet — Mobile-first detail sheet (Redesign v2 style).
 * Opens as a tall bottom sheet showing badges, problem description,
 * meta grid, costs breakdown, images, and grouped action buttons.
 */
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Edit,
  Printer,
  Eye,
  MessageCircle,
  XCircle,
  Trash2,
  Wrench,
  CheckCircle,
  Truck,
  Package,
  Navigation,
  Image as ImageIcon,
  ImagePlus,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { Service, ServiceStatus } from "@/hooks/useServices";

const STATUS_META: Record<ServiceStatus, { label: string; dot: string; cls: string }> = {
  pending:     { label: "Pendiente",  dot: "bg-warning",     cls: "bg-warning/15 text-warning" },
  in_progress: { label: "En Curso",   dot: "bg-info",        cls: "bg-info/15 text-info" },
  completed:   { label: "Finalizado", dot: "bg-success",     cls: "bg-success/15 text-success" },
  delivered:   { label: "Entregado",  dot: "bg-primary",     cls: "bg-primary/15 text-primary" },
  cancelled:   { label: "Cancelado",  dot: "bg-destructive", cls: "bg-destructive/15 text-destructive" },
};

const TYPE_LABEL: Record<string, string> = {
  automotive: "Automotriz",
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
};

type ServiceImageItem = NonNullable<Service["service_images"]>[number];

const NEXT_STATUS: Partial<Record<ServiceStatus, { status: ServiceStatus; label: string; icon: LucideIcon }>> = {
  pending:     { status: "in_progress", label: "Iniciar servicio",   icon: Wrench },
  in_progress: { status: "completed",   label: "Marcar completado",  icon: CheckCircle },
  completed:   { status: "delivered",   label: "Marcar entregado",   icon: Truck },
};

interface Props {
  service: Service | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currencySymbol?: string;
  onEdit?: (s: Service) => void;
  onStatusChange?: (s: Service, next: ServiceStatus) => void;
  onPrint?: (s: Service) => void;
  onPreview?: (s: Service) => void;
  onShare?: (s: Service) => void;
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
  onPrint,
  onPreview,
  onShare,
  onAddImages,
  onCancel,
  onDelete,
}: Props) {
  const images = service?.service_images ?? [];
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const viewerImages = useMemo(
    () =>
      images
        .filter((img) => Boolean(img?.image_url))
        .map((img) => ({
          url: img.image_url,
          description: img.description || undefined,
        })),
    [images],
  );

  if (!service) return null;

  const st = service.status === "pending" && service.scheduled_start_at
    ? { label: "Programado", dot: "bg-accent", cls: "bg-accent/15 text-accent" }
    : STATUS_META[service.status];
  const typeLabel = TYPE_LABEL[service.service_type] ?? service.service_type;
  const next = onStatusChange ? NEXT_STATUS[service.status] : undefined;
  const products = service.service_products ?? [];
  const productsSubtotal =
    products.reduce((acc, p) => acc + Number(p.subtotal), 0) || 0;
  const labor = Number(service.labor_cost || 0);
  const discount = Number(service.discount || 0);
  const total = Number(service.final_price ?? service.estimated_price ?? 0);
  const notes = service.internal_notes?.trim() || "";

  const getDisplayDate = (svc: Service) => {
    if (svc.status === "pending" && svc.scheduled_start_at) {
      return svc.scheduled_start_at;
    }
    if (svc.started_at) {
      return svc.started_at;
    }
    return svc.created_at;
  };

  const meta = [
    { l: "Cliente", v: service.customer?.name || "—" },
    { l: "Teléfono", v: service.customer?.phone || "—" },
    { l: "Fecha", v: format(parseISO(getDisplayDate(service)), "dd MMM yyyy", { locale: es }) },
    { l: "Hora", v: format(parseISO(getDisplayDate(service)), "HH:mm", { locale: es }) },
  ];
  const address = service.address || service.customer?.address;
  const handleOpenMaps = () => {
    if (!address) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };
  const hasFooterActions =
    !!next ||
    !!onDelete ||
    !!onEdit ||
    !!onPrint ||
    !!onPreview ||
    !!onShare ||
    !!onAddImages ||
    (!!onCancel && (service.status === "pending" || service.status === "in_progress"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight disableSwipeToClose={imageViewerOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">{service.service_number}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {/* Badges */}
          <div className="flex gap-1.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold", st.cls)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
              {st.label}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground">
              {typeLabel}
            </span>
            {address && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground">
                <MapPin className="w-2.5 h-2.5" /> Domicilio
              </span>
            )}
          </div>

          {/* Description */}
          <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Descripción del problema
            </div>
            <div className="text-sm font-medium text-foreground">{service.description}</div>
            {service.problem && (
              <div className="text-[13px] text-muted-foreground mt-1.5">{service.problem}</div>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2">
            {meta.map(({ l, v }) => (
              <div key={l} className="bg-[hsl(var(--surface-2))] rounded-xl px-3 py-2.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{l}</div>
                <div className="text-[13px] font-semibold text-foreground truncate">{v}</div>
              </div>
            ))}
          </div>

          {address && (
            <div className="bg-[hsl(var(--surface-2))] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dirección</div>
                <div className="text-[13px] text-foreground truncate">{address}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-lg flex-shrink-0"
                onClick={handleOpenMaps}
              >
                <Navigation className="w-3.5 h-3.5 mr-1" />
                Ubicar
              </Button>
            </div>
          )}

          {/* Products */}
          {products.length > 0 && (
            <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Productos ({products.length})
              </div>
              <div className="space-y-2">
                {products.map((item) => (
                  <div key={item.id} className="rounded-xl bg-background/70 px-3 py-2.5">
                    <div className="text-[13px] font-semibold text-foreground truncate">{item.product_name || "Producto"}</div>
                    <div className="text-[12px] text-muted-foreground mt-1 flex justify-between gap-2">
                      <span>Cant. {Number(item.quantity || 0)}</span>
                      <span>{currencySymbol}{Number(item.unit_price || 0).toLocaleString()}</span>
                      <span className="font-semibold text-foreground">{currencySymbol}{Number(item.subtotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Costs */}
          <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Desglose de costos
            </div>
            {productsSubtotal > 0 && (
              <Row label="Productos" value={`${currencySymbol}${productsSubtotal.toLocaleString()}`} />
            )}
            <Row label="Mano de obra" value={`${currencySymbol}${labor.toLocaleString()}`} />
            {discount > 0 && (
              <Row label="Descuento" value={`-${currencySymbol}${discount.toLocaleString()}`} negative />
            )}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
              <span className="text-[13px] font-bold text-foreground">Total estimado</span>
              <span className="text-base font-extrabold text-primary">
                {currencySymbol}{total.toLocaleString()}
              </span>
            </div>
            {service.estimated_price && Number(service.estimated_price) > 0 && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-[12px] text-muted-foreground">Presupuesto</span>
                <span className="text-[12px] text-muted-foreground">
                  {currencySymbol}{Number(service.estimated_price).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {notes && (
            <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Notas
              </div>
              <div className="text-[13px] text-foreground whitespace-pre-wrap">{notes}</div>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Imágenes ({images.length})
              </div>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img: ServiceImageItem, index: number) => (
                  <button
                    key={img.id}
                    type="button"
                    className="aspect-square rounded-xl bg-[hsl(var(--surface-2))] overflow-hidden flex items-center justify-center cursor-zoom-in"
                    onClick={() => {
                      if (!img.image_url || viewerImages.length === 0) return;
                      const safeIndex = viewerImages.findIndex((image) => image.url === img.image_url);
                      setImageViewerIndex(safeIndex >= 0 ? safeIndex : Math.min(index, viewerImages.length - 1));
                      setImageViewerOpen(true);
                    }}
                  >
                    {img.image_url ? (
                      <img src={img.image_url} alt="Imagen del servicio" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {hasFooterActions && (
          <DialogFooter className="pt-1 gap-2">
            {/* Avanzar estado */}
            {next && (
              <Button
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover font-bold"
                onClick={() => onStatusChange?.(service, next.status)}
              >
                <next.icon className="w-4 h-4 mr-1.5" />
                {next.label}
              </Button>
            )}

            {/* Acciones secundarias */}
            <div className="flex items-center gap-2 w-full">
              {/* Editar */}
              {onEdit && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl font-semibold"
                  onClick={() => onEdit(service)}
                >
                  <Edit className="w-4 h-4 mr-1.5" /> Editar
                </Button>
              )}
              {(onPrint || onPreview || onShare || onAddImages || (onCancel && (service.status === "pending" || service.status === "in_progress"))) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl flex-shrink-0">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    {onPrint && (
                      <DropdownMenuItem onClick={() => onPrint(service)}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimir ticket
                      </DropdownMenuItem>
                    )}
                    {onPreview && (
                      <DropdownMenuItem onClick={() => onPreview(service)}>
                        <Eye className="w-4 h-4 mr-2" /> Vista previa
                      </DropdownMenuItem>
                    )}
                    {onShare && (
                      <DropdownMenuItem onClick={() => onShare(service)}>
                        <MessageCircle className="w-4 h-4 mr-2" /> Compartir WhatsApp
                      </DropdownMenuItem>
                    )}
                    {onAddImages && (
                      <DropdownMenuItem onClick={() => onAddImages(service)}>
                        <ImagePlus className="w-4 h-4 mr-2" /> Agregar imágenes
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(service)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                    {onCancel && (service.status === "pending" || service.status === "in_progress") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onCancel(service)}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Cancelar servicio
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("text-[13px] font-semibold", negative ? "text-destructive" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
