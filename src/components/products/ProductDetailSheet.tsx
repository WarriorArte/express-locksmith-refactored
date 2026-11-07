/**
 * ProductDetailSheet — detalle de producto o servicio del inventario.
 * Criterio M3E (docs/CRITERIO-DISENO-M3E.md), variante "dentro de una hoja":
 * protagonista = foto + precio de venta + stock.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { formatMoney } from "@/components/shared/detail-view/DetailViewTotals";
import { DetailSection, SpecRow, SpecTile, TonalChip } from "@/design-system/detail/DetailScreen";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { resolveStorageUrl } from "@/lib/phpApi";
import { AlertTriangle, Edit, History, Move, Package, Trash2, Wrench, ZoomIn } from "lucide-react";
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

const SERVICE_TYPE_LABEL: Record<string, string> = {
  automotive: "Automotriz",
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
};

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
  const money = (v: number | null | undefined) => formatMoney(currencySymbol, v);

  const totalStock = product.stock_store + product.stock_warehouse;
  const isLow = totalStock < product.min_stock;
  const labor = Number(product.labor_cost || 0);
  const discount = Number(product.discount || 0);
  const serviceProductsSubtotal = (product.service_products || []).reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0,
  );
  const serviceTotal = Math.max(0, labor + serviceProductsSubtotal);
  const salePrice = isService ? serviceTotal : Number(product.sale_price_max || 0);
  const kindLabel = isService
    ? SERVICE_TYPE_LABEL[product.service_type || ""] || product.service_type || "Servicio"
    : categoryName;

  const footerActions: DialogAction[] = [
    { icon: Edit, label: "Editar", onClick: () => onEdit(product) },
    ...(!isService
      ? [
          { icon: Move, label: "Movimientos", tooltip: "Registrar entrada o salida", onClick: () => onMovement(product) },
          { icon: History, label: "Historial", onClick: () => onHistory(product) },
        ]
      : []),
  ];
  // Eliminar va al menú ⋯ para no quedar junto a Editar.
  const menuActions: DialogAction[] = onDelete
    ? [{ icon: Trash2, label: "Eliminar", tone: "destructive", onClick: () => onDelete(product) }]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="line-clamp-2 text-2xl font-bold leading-tight">{product.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {!isService && (
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} />
            )}
            {isService ? `Servicio · ${kindLabel}` : kindLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto pb-2">
          {/* Protagonista: foto + precio + stock */}
          <section className="rounded-[28px] bg-primary-light p-5">
            {product.image_url ? (
              <button
                type="button"
                onClick={() => onZoomImage?.(product)}
                aria-label={`Ampliar foto de ${product.name}`}
                className="relative mb-4 block h-44 w-full overflow-hidden rounded-2xl bg-background/70"
              >
                <img
                  src={resolveStorageUrl(product.image_url) ?? undefined}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
                <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <MaterialShape name="cookie9" className="mx-auto mb-4 h-24 w-24 text-background/60">
                {isService ? <Wrench className="h-9 w-9 text-primary" /> : <Package className="h-9 w-9 text-primary" />}
              </MaterialShape>
            )}

            <p className="text-xs font-medium text-muted-foreground">
              {isService ? "Precio del servicio" : "Precio sugerido"}
            </p>
            <p className="text-[2.25rem] font-bold leading-tight tabular-nums text-foreground">{money(salePrice)}</p>

            {!isService && (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isLow ? (
                    <TonalChip
                      icon={<AlertTriangle className="h-4 w-4" />}
                      label={`Stock bajo · quedan ${totalStock}`}
                      tone="warning"
                    />
                  ) : (
                    <TonalChip label={`${totalStock} en stock`} tone="neutral" className="bg-background/70" />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <SpecTile label="Tienda" value={String(product.stock_store)} />
                  <SpecTile label="Bodega" value={String(product.stock_warehouse)} />
                  <SpecTile label="Mínimo" value={String(product.min_stock)} />
                </div>
              </>
            )}
          </section>

          {product.description && (
            <DetailSection title="Descripción" className="bg-muted shadow-none">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{product.description}</p>
            </DetailSection>
          )}

          <DetailSection title={isService ? "Costos del servicio" : "Precios"} className="bg-muted shadow-none">
            <div className="-my-1.5">
              {isService ? (
                <>
                  <SpecRow label="Mano de obra" value={money(labor)} />
                  <SpecRow label="Productos" value={money(serviceProductsSubtotal)} />
                  <SpecRow label="Precio con descuento" value={money(discount)} />
                </>
              ) : (
                <>
                  <SpecRow label="Costo local" value={money(product.purchase_price_local)} />
                  {product.purchase_price_imported ? (
                    <SpecRow label="Costo importado" value={money(product.purchase_price_imported)} />
                  ) : null}
                  <SpecRow label="Precio con descuento" value={money(product.sale_price_min)} />
                  <SpecRow label="Precio sugerido" value={<span className="font-bold">{money(product.sale_price_max)}</span>} />
                </>
              )}
            </div>
          </DetailSection>

          {product.instructions && (
            <DetailSection title={isService ? "Requisitos" : "Instrucciones de uso"} className="bg-muted shadow-none">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{product.instructions}</p>
            </DetailSection>
          )}

          {product.notes && (
            <DetailSection title="Notas internas" className="bg-muted shadow-none">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{product.notes}</p>
            </DetailSection>
          )}
        </div>

        <DialogFooter className="pt-1">
          <DialogActionBar actions={footerActions} menuActions={menuActions} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
