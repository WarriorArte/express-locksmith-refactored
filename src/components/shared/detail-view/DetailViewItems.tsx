import { Package } from "lucide-react";
import type { DetailData, DetailItem } from "./types";

interface Props {
  type: DetailData["type"];
  items: DetailItem[];
  currencySymbol: string;
}

export function DetailViewItems({ type, items, currencySymbol }: Props) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Package className="w-3.5 h-3.5" />
        {type === "quote" ? "Conceptos" : "Productos"}
      </h4>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-background/70 px-3 py-2.5">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {item.product_name || item.description}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
              <span>Cant. {item.quantity}</span>
              <span>{currencySymbol}{Number(item.unit_price).toFixed(0)}</span>
              <span className="font-semibold text-foreground">
                {currencySymbol}{Number(item.subtotal).toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
