import type { DetailData } from "./types";

interface Props {
  data: DetailData;
  currencySymbol: string;
}

export function DetailViewTotals({ data, currencySymbol }: Props) {
  const fmt = (v: number | null | undefined) =>
    `${currencySymbol}${Number(v || 0).toFixed(2)}`;

  const hasProducts = Number(data.subtotal) > 0;
  const hasLabor = data.type === "service" && Number(data.labor_cost) > 0;
  const hasDiscount = Number(data.discount) > 0;
  const hasDeposit = data.type === "service" && Number(data.deposit) > 0;

  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Desglose
      </div>
      <div className="flex flex-col gap-1">

        {hasProducts && (
          <Row label="Productos" value={fmt(data.subtotal)} />
        )}
        {hasLabor && (
          <Row label="Mano de obra" value={fmt(data.labor_cost)} />
        )}

        {(hasProducts || hasLabor) && (
          <div className="border-t border-border my-1" />
        )}

        {hasDiscount && (
          <Row label="Descuento" value={`-${fmt(data.discount)}`} negative />
        )}

        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] font-bold text-foreground">Total</span>
          <span className="text-base font-extrabold text-foreground dark:text-success">
            {fmt(data.total)}
          </span>
        </div>

        {hasDeposit && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Anticipo
              </div>
              <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                {fmt(data.deposit)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Saldo pendiente
              </div>
              <div className="text-[13px] font-bold text-foreground">
                {fmt(Number(data.total) - Number(data.deposit))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={negative
        ? "text-[13px] font-semibold text-destructive"
        : "text-[13px] font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}
