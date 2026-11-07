/**
 * Tarjeta de producto/servicio para la cuadrícula de Inventario (móvil y escritorio).
 * Criterio M3E (docs/CRITERIO-DISENO-M3E.md): foto limpia sin velo oscuro, texto
 * legible debajo (nombre 15 px, precio protagonista, stock en palabras) y la
 * acción principal como botón tonal. Sin bordes.
 */
import type { ReactNode } from "react";
import { AlertTriangle, Package, ShoppingCart, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TonalChip } from "@/design-system/detail/DetailScreen";
import { resolveStorageUrl } from "@/lib/phpApi";
import { spawnRipple } from "@/lib/ripple";

interface ProductTileProps {
  name: string;
  imageUrl?: string | null;
  isService: boolean;
  price: string;
  /** Línea de apoyo: "3 en tienda · 2 en bodega" o "Mano de obra $150". */
  supporting: string;
  lowStock?: boolean;
  onOpen: () => void;
  onSell: () => void;
  /** Menú extra (escritorio): aparece en la esquina al pasar el cursor. */
  menu?: ReactNode;
}

export function ProductTile({ name, imageUrl, isService, price, supporting, lowStock = false, onOpen, onSell, menu }: ProductTileProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[24px] bg-card shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={spawnRipple}
        className="relative flex flex-1 flex-col overflow-hidden text-left"
      >
        <span className="relative block aspect-square w-full bg-muted">
          {imageUrl ? (
            <img
              src={resolveStorageUrl(imageUrl) ?? undefined}
              alt={name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              {isService ? <Wrench className="h-10 w-10" /> : <Package className="h-10 w-10" />}
            </span>
          )}
          {lowStock && (
            <span className="absolute left-2.5 top-2.5">
              <TonalChip
                tone="warning"
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="Stock bajo"
                className="h-7 px-2.5 text-xs shadow-sm"
              />
            </span>
          )}
        </span>
        <span className="block px-3.5 pt-3">
          <span className="line-clamp-2 min-h-[2.6rem] text-[15px] font-medium leading-snug text-foreground">{name}</span>
          <span className="mt-1 block text-lg font-bold leading-tight tabular-nums text-foreground">{price}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{supporting}</span>
        </span>
      </button>

      <div className="px-3 pb-3 pt-2.5">
        <Button type="button" variant="secondary" className="h-10 w-full" onClick={onSell}>
          <ShoppingCart />
          {isService ? "Usar" : "Vender"}
        </Button>
      </div>

      {menu && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {menu}
        </div>
      )}
    </div>
  );
}
