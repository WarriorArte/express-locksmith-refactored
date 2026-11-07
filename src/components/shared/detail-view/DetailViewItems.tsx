import { DetailSection } from "@/design-system/detail/DetailScreen";
import type { DetailData, DetailItem } from "./types";

interface Props {
  type: DetailData["type"];
  items: DetailItem[];
  currencySymbol: string;
}

const money = (symbol: string, v: number) =>
  `${symbol}${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Productos / conceptos: nombre, "cantidad × precio" y subtotal a la derecha. */
export function DetailViewItems({ type, items, currencySymbol }: Props) {
  if (!items.length) return null;

  return (
    <DetailSection
      title={type === "quote" ? "Conceptos" : "Productos"}
      className="bg-muted shadow-none"
      action={<span className="text-sm tabular-nums text-muted-foreground">{items.length}</span>}
    >
      <div className="-my-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-foreground">{item.product_name || item.description}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {item.quantity} × {money(currencySymbol, item.unit_price)}
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
              {money(currencySymbol, item.subtotal)}
            </span>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
