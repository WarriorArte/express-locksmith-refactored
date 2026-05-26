import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UnitNumberInput } from "@/components/ui/unit-number-input";
import { ProductSelect } from "./ProductSelect";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

export interface ProductEditorItem {
  tempId: string;
  product_id: string | null;
  product_name: string;
  /** Campo editable de descripción — usado en cotizaciones */
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  /** Metadato extra — usado en ventas para cálculo de garantía */
  category_id?: string | null;
}

interface ServiceProductsEditorProps {
  items: ProductEditorItem[];
  onItemsChange: (items: ProductEditorItem[]) => void;

  // Checkbox "sin productos" — solo servicios/inventario
  noProductsConsumed?: boolean;
  onNoProductsConsumedChange?: (value: boolean) => void;

  // Comportamiento de items
  /** true = cantidad y precio editables (servicios, ventas, cotizaciones); false = solo lectura (inventario) */
  editable?: boolean;
  /** Mínimo de items permitidos antes de deshabilitar el botón eliminar. 0 = sin límite, 1 = ventas/cotizaciones */
  minItems?: number;
  /** Muestra campo de descripción editable por item — cotizaciones */
  showDescriptionField?: boolean;
  /** Excluye del selector los productos ya agregados — ventas */
  excludeAddedProducts?: boolean;
  /** Excluye servicios del selector — servicios/inventario */
  excludeServiceItems?: boolean;

  // Validación
  showInvalid?: boolean;
  invalidQuantityIds?: Set<string>;
  /** IDs de items con descripción vacía — cotizaciones */
  invalidDescriptionIds?: Set<string>;
  /** IDs de items con precio <= 0 — ventas/cotizaciones */
  invalidPriceIds?: Set<string>;

  currencySymbol?: string;
}

export function ServiceProductsEditor({
  items,
  onItemsChange,
  noProductsConsumed,
  onNoProductsConsumedChange,
  editable = true,
  minItems = 0,
  showDescriptionField = false,
  excludeAddedProducts = false,
  excludeServiceItems = false,
  showInvalid = false,
  invalidQuantityIds = new Set(),
  invalidDescriptionIds = new Set(),
  invalidPriceIds = new Set(),
  currencySymbol = "$",
}: ServiceProductsEditorProps) {
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  const showNoProductsCheckbox =
    noProductsConsumed !== undefined && onNoProductsConsumedChange !== undefined;

  const invalidFieldClass =
    "border-destructive placeholder:text-destructive focus-visible:border-destructive";

  const excludeIds = excludeAddedProducts
    ? items.filter((i) => i.product_id).map((i) => i.product_id!)
    : [];

  const handleAdd = () => {
    // En modo descripción (cotizaciones), permitir agregar item vacío sin producto
    const allowEmpty = showDescriptionField;
    if (!allowEmpty && !pendingProductId) return;

    const isService = (pendingProduct?.item_type ?? "product") === "service";
    const unitPrice = pendingProduct
      ? isService
        ? Math.max(0, Number(pendingProduct.labor_cost || 0) + (pendingProduct.service_products || []).reduce((sum, i) => sum + Number(i.subtotal || 0), 0))
        : Number(pendingProduct.sale_price_min || 0)
      : 0;
    onNoProductsConsumedChange?.(false);
    onItemsChange([
      ...items,
      {
        tempId: crypto.randomUUID(),
        product_id: pendingProductId,
        product_name: pendingProduct?.name || "",
        description: pendingProduct?.name || "",
        quantity: 1,
        unit_price: unitPrice,
        subtotal: unitPrice,
        category_id: pendingProduct?.category_id || null,
      },
    ]);
    setPendingProductId(null);
    setPendingProduct(null);
  };

  const handleRemove = (tempId: string) => {
    if (items.length <= minItems) return;
    onItemsChange(items.filter((item) => item.tempId !== tempId));
  };

  const handleUpdate = (
    tempId: string,
    field: "quantity" | "unit_price" | "description",
    value: number | string,
  ) => {
    onItemsChange(
      items.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          updated.subtotal = (updated.quantity as number) * (updated.unit_price as number);
        }
        return updated;
      }),
    );
  };

  const handleNoProductsChange = (checked: boolean) => {
    onNoProductsConsumedChange?.(checked);
    if (checked) onItemsChange([]);
  };

  const canDelete = items.length > minItems;
  const addButtonDisabled = noProductsConsumed || (!showDescriptionField && !pendingProductId);

  return (
    <div className="space-y-4">
      {/* Checkbox "sin productos" — solo servicios/inventario */}
      {showNoProductsCheckbox && (
        <label
          className={cn(
            "w-full rounded-lg border bg-background px-3.5 py-3 transition-colors",
            "flex items-center gap-3 hover:bg-muted/50 cursor-pointer",
            noProductsConsumed
              ? "border-primary text-foreground"
              : showInvalid &&
                  items.length === 0 &&
                  "border-destructive text-destructive",
          )}
        >
          <Checkbox
            checked={noProductsConsumed}
            onCheckedChange={(checked) => handleNoProductsChange(checked === true)}
          />
          <span className="text-sm font-medium">Este servicio no consume productos</span>
        </label>
      )}

      {/* Selector de producto + botón agregar */}
      <div
        className={cn(
          "space-y-2",
          noProductsConsumed && "opacity-50 pointer-events-none",
        )}
      >
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {showDescriptionField ? "Seleccionar Producto o Servicio" : "Seleccionar Producto"}
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <ProductSelect
              value={pendingProductId}
              onValueChange={(id, product) => {
                setPendingProductId(id);
                setPendingProduct(product);
              }}
              excludeIds={excludeIds}
              excludeServiceItems={excludeServiceItems}
              invalid={false}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleAdd}
            disabled={addButtonDisabled}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Lista de productos agregados */}
      {items.length === 0 ? (
        <div
          className={cn(
            "flex items-center justify-center text-center text-muted-foreground text-sm select-none",
            editable ? "min-h-[28vh]" : "min-h-[14vh]",
          )}
        >
          No hay productos agregados
        </div>
      ) : (
        <div
          className={cn(
            "space-y-2 overflow-y-auto",
            editable ? "max-h-[32vh]" : "max-h-[38vh]",
          )}
        >
          {items.map((item) => (
            <div
              key={item.tempId}
              className={cn(
                "p-3 bg-muted/50 rounded-lg border",
                editable && "space-y-2",
              )}
            >
              {/* Nombre o descripción */}
              {showDescriptionField ? (
                <Input
                  value={item.description ?? ""}
                  onChange={(e) =>
                    handleUpdate(item.tempId, "description", e.target.value)
                  }
                  placeholder={
                    showInvalid && invalidDescriptionIds.has(item.tempId)
                      ? "Campo obligatorio"
                      : "Descripción del item..."
                  }
                  aria-invalid={showInvalid && invalidDescriptionIds.has(item.tempId)}
                  className={cn(
                    "text-sm",
                    showInvalid &&
                      invalidDescriptionIds.has(item.tempId) &&
                      invalidFieldClass,
                  )}
                />
              ) : (
                <p className="text-sm font-medium truncate">
                  {item.product_name || "—"}
                </p>
              )}

              {editable ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <UnitNumberInput
                      min={1}
                      value={item.quantity}
                      onValueChange={(value) =>
                        handleUpdate(item.tempId, "quantity", value || 1)
                      }
                      aria-invalid={showInvalid && invalidQuantityIds.has(item.tempId)}
                      className={cn(
                        "h-9 text-sm",
                        showInvalid &&
                          invalidQuantityIds.has(item.tempId) &&
                          invalidFieldClass,
                      )}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Precio</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleUpdate(
                          item.tempId,
                          "unit_price",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder={
                        showInvalid && invalidPriceIds.has(item.tempId)
                          ? "Debe ser mayor a 0"
                          : "0"
                      }
                      aria-invalid={showInvalid && invalidPriceIds.has(item.tempId)}
                      className={cn(
                        "h-9 text-sm",
                        showInvalid &&
                          invalidPriceIds.has(item.tempId) &&
                          invalidFieldClass,
                      )}
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Subtotal</Label>
                      <div className="h-9 px-2 py-1 bg-background rounded text-sm font-medium flex items-center">
                        {currencySymbol}
                        {item.subtotal.toLocaleString()}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleRemove(item.tempId)}
                      disabled={!canDelete}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Modo inventario: precio de referencia + eliminar */
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-muted-foreground">
                    {currencySymbol}
                    {Number(item.unit_price || 0).toLocaleString()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-1"
                    onClick={() => handleRemove(item.tempId)}
                    disabled={!canDelete}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
