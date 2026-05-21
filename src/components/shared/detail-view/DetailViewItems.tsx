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
    <div>
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
        <Package className="w-4 h-4" />
        {type === "quote" ? "Conceptos" : "Productos"}
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
            {items.map((item) => (
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
  );
}
