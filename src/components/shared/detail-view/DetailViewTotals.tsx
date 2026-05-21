import type { DetailData } from "./types";

interface Props {
  data: DetailData;
  currencySymbol: string;
}

export function DetailViewTotals({ data, currencySymbol }: Props) {
  return (
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
        <span className="text-foreground dark:text-success">{currencySymbol}{Number(data.total).toFixed(2)}</span>
      </div>
      {data.type === "service" && data.estimated_price && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Presupuesto estimado:</span>
          <span>{currencySymbol}{Number(data.estimated_price).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
