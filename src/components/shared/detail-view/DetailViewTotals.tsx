import type { DetailData } from "./types";

interface Props {
  data: DetailData;
  currencySymbol: string;
}

export function DetailViewTotals({ data, currencySymbol }: Props) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Desglose
      </div>
      <div className="flex flex-col gap-1">
        {data.type === "service" && data.labor_cost && Number(data.labor_cost) > 0 && (
          <Row label="Mano de obra" value={`${currencySymbol}${Number(data.labor_cost).toFixed(2)}`} />
        )}
        <Row label="Subtotal" value={`${currencySymbol}${Number(data.subtotal).toFixed(2)}`} />
        {data.discount && Number(data.discount) > 0 && (
          <Row label="Descuento" value={`-${currencySymbol}${Number(data.discount).toFixed(2)}`} negative />
        )}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-[13px] font-bold text-foreground">Total</span>
          <span className="text-base font-extrabold text-foreground dark:text-success">
            {currencySymbol}{Number(data.total).toFixed(2)}
          </span>
        </div>
        {data.type === "service" && data.estimated_price && (
          <Row
            label="Presupuesto estimado"
            value={`${currencySymbol}${Number(data.estimated_price).toFixed(2)}`}
            muted
          />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
  muted,
}: {
  label: string;
  value: string;
  negative?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={negative ? "text-[13px] font-semibold text-destructive" : muted ? "text-[13px] text-muted-foreground" : "text-[13px] font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}
