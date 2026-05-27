/**
 * ProductDetailSheet — Mobile-first product detail (Redesign v2 style).
 */
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";
import {
  Package,
  Edit,
  Move,
  History,
  Trash2,
  Store,
  Warehouse,
  AlertTriangle,
  ZoomIn,
} from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currencySymbol?: string;
  categoryName?: string;
  categoryColor?: string;
  onEdit: (p: Product) => void;
  onMovement: (p: Product) => void;
  onHistory: (p: Product) => void;
  onDelete?: (p: Product) => void;
  onZoomImage?: (p: Product) => void;
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  currencySymbol = "$",
  categoryName = "Sin categoría",
  categoryColor = "#6b7280",
  onEdit,
  onMovement,
  onHistory,
  onDelete,
  onZoomImage,
}: Props) {
  if (!product) return null;

  const isService = (product.item_type ?? "product") === "service";

  const getServiceTypeLabel = (serviceType: string | null) => {
    const labels: Record<string, string> = {
      automotive: "Automotriz",
      residential: "Residencial",
      commercial: "Comercial",
      industrial: "Industrial",
    };
    return labels[serviceType || ""] || serviceType || "Servicio";
  };

  const totalStock = product.stock_store + product.stock_warehouse;
  const isLow = totalStock < product.min_stock;
  const labor = Number(product.labor_cost || 0);
  const discount = Number(product.discount || 0);
  const serviceProductsSubtotal = (product.service_products || []).reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0,
  );
  const serviceTotal = Math.max(0, labor + serviceProductsSubtotal);
  const stockBadge = isLow
    ? { label: "Stock bajo", cls: "bg-warning/15 text-warning" }
    : { label: "En stock", cls: "bg-success/15 text-foreground dark:text-success" };

  const stockBoxes = [
    { l: "Tienda", v: product.stock_store, i: Store },
    { l: "Bodega", v: product.stock_warehouse, i: Warehouse },
    { l: "Mínimo", v: product.min_stock, i: AlertTriangle, alert: true },
  ];

  const footerActions: DialogAction[] = [
    { icon: Edit, label: "Editar", onClick: () => onEdit(product) },
    ...(!isService
      ? [
          { icon: Move, label: "Movimientos", onClick: () => onMovement(product) },
          { icon: History, label: "Historial", onClick: () => onHistory(product) },
        ]
      : []),
    ...(onDelete
      ? [{ icon: Trash2, label: "Eliminar", onClick: () => onDelete(product), tone: "destructive" as const }]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {/* Image */}
          <button
            type="button"
            onClick={() => onZoomImage?.(product)}
            className="w-full h-40 rounded-2xl bg-[hsl(var(--surface-2))] flex items-center justify-center overflow-hidden relative"
          >
            {product.image_url ? (
              <img src={resolveStorageUrl(product.image_url) ?? undefined} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-12 h-12 text-muted-foreground" />
            )}
            {product.image_url && (
              <span className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-background/70 backdrop-blur flex items-center justify-center">
                <ZoomIn className="w-4 h-4 text-foreground" />
              </span>
            )}
          </button>

          {/* Badges */}
          <div className="flex gap-1.5 flex-wrap">
            {!isService && (
              <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold", stockBadge.cls)}>
                {stockBadge.label}
              </span>
            )}
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: `${categoryColor}22`, color: categoryColor }}
            >
              {isService ? getServiceTypeLabel(product.service_type) : categoryName}
            </span>
          </div>

          {product.description && (
            <p className="text-[13px] text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Prices/Labor */}
          <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {isService ? "Detalles de servicio" : "Precios"}
            </div>
            {isService ? (
              <>
                <Row label="Mano de obra" value={`${currencySymbol}${labor.toLocaleString()}`} />
                <Row label="Productos" value={`${currencySymbol}${serviceProductsSubtotal.toLocaleString()}`} />
                <Row label="Precio con descuento" value={`${currencySymbol}${discount.toLocaleString()}`} accent="text-destructive" />
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                  <span className="text-[13px] font-bold text-foreground">Precio del servicio</span>
                  <span className="text-base font-extrabold text-foreground dark:text-primary">
                    {currencySymbol}{serviceTotal.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Row label="Costo local" value={`${currencySymbol}${Number(product.purchase_price_local || 0).toLocaleString()}`} />
                {product.purchase_price_imported ? (
                  <Row label="Costo importado" value={`${currencySymbol}${Number(product.purchase_price_imported).toLocaleString()}`} />
                ) : null}
                <Row
                  label="Precio con descuento"
                  value={`${currencySymbol}${Number(product.sale_price_min || 0).toLocaleString()}`}
                  accent="text-destructive"
                />
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                  <span className="text-[13px] font-bold text-foreground">Precio sugerido</span>
                  <span className="text-base font-extrabold text-foreground dark:text-primary">
                    {currencySymbol}{Number(product.sale_price_max || 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Stock boxes - only for products */}
          {!isService && (
            <div className="grid grid-cols-3 gap-2">
              {stockBoxes.map(({ l, v, i: Icon, alert }) => (
                <div key={l} className="bg-[hsl(var(--surface-2))] rounded-xl px-2 py-2.5 text-center">
                  <Icon
                    className={cn(
                      "w-4 h-4 mx-auto mb-1",
                      alert && v >= product.min_stock ? "text-warning" : "text-foreground dark:text-primary",
                    )}
                  />
                  <div className={cn("text-[18px] font-extrabold", isLow ? "text-warning" : "text-foreground")}>
                    {v}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Instructions / Requirements */}
          {product.instructions && (
            <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {isService ? "Requisitos" : "Instrucciones de uso"}
              </div>
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                {product.instructions}
              </p>
            </div>
          )}

          {/* Internal Notes */}
          {product.notes && (
            <div className="bg-[hsl(var(--surface-2))] rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Notas internas
              </div>
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                {product.notes}
              </p>
            </div>
          )}

        </div>

        <DialogFooter className="pt-1">
          <DialogActionBar actions={footerActions} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("text-[13px] font-semibold", accent ?? "text-foreground")}>{value}</span>
    </div>
  );
}
