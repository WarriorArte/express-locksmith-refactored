/* eslint-disable react-refresh/only-export-components */
import { DetailSection, SpecRow } from "@/design-system/detail/DetailScreen";
import type { DetailData } from "./types";

interface Props {
  data: DetailData;
  currencySymbol: string;
}

export const formatMoney = (symbol: string, v: number | null | undefined) =>
  `${symbol}${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Desglose del total. El total en sí es el protagonista del hero del detalle,
 * así que esta sección solo aparece cuando hay algo que desglosar
 * (mano de obra o descuento).
 */
export function DetailViewTotals({ data, currencySymbol }: Props) {
  const hasProducts = Number(data.subtotal) > 0;
  const hasLabor = data.type === "service" && Number(data.labor_cost) > 0;
  const hasDiscount = Number(data.discount) > 0;
  if (!hasLabor && !hasDiscount) return null;

  return (
    <DetailSection title="Desglose" className="bg-muted shadow-none">
      <div className="-my-1.5">
        {hasProducts && <SpecRow label="Productos" value={formatMoney(currencySymbol, data.subtotal)} />}
        {hasLabor && <SpecRow label="Mano de obra" value={formatMoney(currencySymbol, data.labor_cost)} />}
        {hasDiscount && (
          <SpecRow
            label="Descuento"
            value={<span className="text-destructive">−{formatMoney(currencySymbol, data.discount)}</span>}
          />
        )}
        <SpecRow label="Total" value={<span className="font-bold">{formatMoney(currencySymbol, data.total)}</span>} />
      </div>
    </DetailSection>
  );
}
