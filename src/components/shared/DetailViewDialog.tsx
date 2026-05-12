import { useState } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  User,
  Calendar,
  Phone,
  MapPin,
  Mail,
  FileText,
  ShoppingCart,
  Wrench,
  Package,
  Image as ImageIcon,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  MessageCircle,
  Trash2,
  Edit,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";

interface DetailItem {
  id: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ServiceImage {
  id: string;
  image_url: string;
  description?: string | null;
  created_at?: string;
}

interface DetailData {
  type: "sale" | "service" | "quote";
  number: string;
  date: string;
  status?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  description?: string | null;
  problem?: string | null;
  items: DetailItem[];
  subtotal: number;
  discount?: number | null;
  total: number;
  notes?: string | null;
  payment_method?: string | null;
  created_by?: string | null;
  valid_until?: string | null;
  estimated_price?: number | null;
  final_price?: number | null;
  labor_cost?: number | null;
  images?: ServiceImage[];
}

export interface OverflowAction {
  icon: LucideIcon | React.ElementType;
  label: string;
  onClick: () => void;
  className?: string;
  separator?: boolean;
}

interface DetailViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DetailData | null;
  /** Tile buttons shown prominently (max 2 recommended) */
  onPrint?: () => void;
  onEdit?: () => void;
  /** Items that go into the ⋮ overflow dropdown */
  onPreview?: () => void;
  onShare?: () => void;
  overflowActions?: OverflowAction[];
  onDelete?: () => void;
}

const typeConfig = {
  sale: {
    label: "Venta",
    icon: ShoppingCart,
    color: "bg-secondary text-secondary-foreground",
  },
  service: {
    label: "Servicio",
    icon: Wrench,
    color: "bg-primary text-primary-foreground",
  },
  quote: {
    label: "Cotización",
    icon: FileText,
    color: "bg-info text-info-foreground",
  },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-warning text-warning-foreground" },
  accepted: { label: "Aceptada", color: "bg-success text-success-foreground" },
  rejected: { label: "Rechazada", color: "bg-destructive text-destructive-foreground" },
  converted: { label: "Convertida", color: "bg-primary text-primary-foreground" },
  expired: { label: "Vencida", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "En Curso", color: "bg-info text-info-foreground" },
  completed: { label: "Finalizado", color: "bg-success text-success-foreground" },
  delivered: { label: "Entregado", color: "bg-primary text-primary-foreground" },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};

export function DetailViewDialog({
  open,
  onOpenChange,
  data,
  onPrint,
  onEdit,
  onPreview,
  onShare,
  overflowActions,
  onDelete,
}: DetailViewDialogProps) {
  const { data: settings } = useBusinessSettings();
  const [showImages, setShowImages] = useState(true);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  if (!data) return null;

  const config = typeConfig[data.type];
  const Icon = config.icon;
  const currencySymbol = settings?.currency_symbol || "$";
  const statusConfig = data.status ? statusLabels[data.status] : null;
  const hasImages = data.images && data.images.length > 0;
  const viewerImages = (data.images ?? []).map((image) => ({
    url: image.image_url,
    description: image.description || undefined,
  }));

  // Main action button: onEdit takes priority over onPrint
  const mainAction = onEdit
    ? { icon: Edit, label: "Editar", onClick: onEdit }
    : onPrint
    ? { icon: Printer, label: "Ticket", onClick: onPrint }
    : null;
  const MainActionIcon = mainAction?.icon;

  // Build overflow dropdown items
  const overflowItems: OverflowAction[] = [
    ...(onEdit && onPrint ? [{ icon: Printer, label: "Ticket", onClick: onPrint }] : []),
    ...(onPreview ? [{ icon: Eye, label: "PDF", onClick: onPreview }] : []),
    ...(onShare ? [{ icon: MessageCircle, label: "WhatsApp", onClick: onShare, className: "text-[#25D366]" }] : []),
    ...(overflowActions ?? []),
  ];

  const hasOverflowMenu = overflowItems.length > 0;
  const hasFooter = !!mainAction || !!onDelete || hasOverflowMenu;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          disableSwipeToClose={viewingImageIndex !== null}
          className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono">{data.number}</span>
                <span className="text-muted-foreground ml-2">- {config.label}</span>
              </div>
              {statusConfig && (
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Fecha:</span>
                <span className="truncate">{format(parseISO(data.date), "dd MMM yyyy HH:mm", { locale: es })}</span>
              </div>
              {data.valid_until && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Válido hasta:</span>
                  <span>{format(parseISO(data.valid_until), "dd MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {data.payment_method && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Pago:</span>
                  <Badge variant="outline" className="text-xs">
                    {paymentMethodLabels[data.payment_method] || data.payment_method}
                  </Badge>
                </div>
              )}
            </div>

            {/* Customer Info */}
            {(data.customer_name || data.customer_phone || data.customer_email) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Cliente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.customer_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{data.customer_name}</span>
                      </div>
                    )}
                    {data.customer_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{data.customer_phone}</span>
                      </div>
                    )}
                    {data.customer_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{data.customer_email}</span>
                      </div>
                    )}
                    {data.customer_address && (
                      <div className="flex items-center gap-2 text-sm col-span-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{data.customer_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Description / Problem */}
            {(data.description || data.problem) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                  {data.problem && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Solución: </span>
                      <span className="text-sm text-muted-foreground">{data.problem}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Images Section - Only for services */}
            {data.type === "service" && hasImages && (
              <>
                <Separator />
                <div>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-0 hover:opacity-80 transition-opacity"
                    onClick={() => setShowImages(!showImages)}
                  >
                    <h4 className="font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Imágenes ({data.images!.length})
                    </h4>
                    {showImages ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {showImages && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data.images!.map((image, index) => (
                        <div
                          key={image.id}
                          className="relative group rounded-lg overflow-hidden border bg-muted/30"
                        >
                          <div className="aspect-square">
                            <img
                              src={resolveStorageUrl(image.image_url) ?? undefined}
                              alt={image.description || "Imagen del servicio"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded"
                              onClick={() => setViewingImageIndex(index)}
                            >
                              <ZoomIn className="w-4 h-4" />
                              Ver
                            </button>
                          </div>
                          {image.description && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                              <p className="text-xs text-white truncate">{image.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Items */}
            {data.items.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Package className="w-4 h-4" />
                    {data.type === "quote" ? "Conceptos" : "Productos"}
                  </h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm min-w-[300px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 sm:p-3">Descripción</th>
                          <th className="text-center p-2 sm:p-3 w-12">Cant.</th>
                          <th className="text-right p-2 sm:p-3 w-20">Precio</th>
                          <th className="text-right p-2 sm:p-3 w-20">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.items.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2 sm:p-3 max-w-[120px] truncate">{item.product_name || item.description}</td>
                            <td className="p-2 sm:p-3 text-center">{item.quantity}</td>
                            <td className="p-2 sm:p-3 text-right">{currencySymbol}{Number(item.unit_price).toFixed(0)}</td>
                            <td className="p-2 sm:p-3 text-right font-medium">{currencySymbol}{Number(item.subtotal).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Totals */}
            <Separator />
            <div className="space-y-2">
              {data.type === "service" && data.labor_cost && Number(data.labor_cost) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mano de obra:</span>
                  <span>{currencySymbol}{Number(data.labor_cost).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{currencySymbol}{Number(data.subtotal).toFixed(2)}</span>
              </div>
              {data.discount && Number(data.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Descuento:</span>
                  <span className="text-destructive">-{currencySymbol}{Number(data.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-success">{currencySymbol}{Number(data.total).toFixed(2)}</span>
              </div>
              {data.type === "service" && data.estimated_price && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Presupuesto estimado:</span>
                  <span>{currencySymbol}{Number(data.estimated_price).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {data.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Notas</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {data.notes}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer: Eliminar + main action + ⋮ overflow */}
          {hasFooter && (
            <div className="pt-4 border-t mt-2">
              <div className="flex items-center gap-2 w-full">
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex-1 h-12 rounded-2xl bg-destructive/10 text-destructive font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                )}
                {mainAction && MainActionIcon && (
                  <Button variant="outline" className="flex-1 h-12 rounded-2xl font-semibold" onClick={mainAction.onClick}>
                    <MainActionIcon className="w-4 h-4 mr-1.5" /> {mainAction.label}
                  </Button>
                )}
                {hasOverflowMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl flex-shrink-0">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top">
                      {overflowItems.map((item, idx) => (
                        <div key={item.label}>
                          {item.separator && idx > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuItem onClick={item.onClick} className={item.className}>
                            <item.icon className="w-4 h-4 mr-2" />
                            {item.label}
                          </DropdownMenuItem>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image View Dialog */}
      <ImageViewDialog
        open={viewingImageIndex !== null && viewerImages.length > 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setViewingImageIndex(null);
        }}
        images={viewerImages}
        initialIndex={viewingImageIndex ?? 0}
      />
    </>
  );
}

function ActionTile({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon | React.ElementType;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[60px] rounded-2xl bg-[hsl(var(--surface-2))] hover:bg-muted text-foreground flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform",
        className,
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
