import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { DetailSection, SpecTile, SubHeading, TonalChip } from "@/design-system/detail/DetailScreen";

import {
  type DetailData,
  type OverflowAction,
  typeConfig,
  statusLabels,
  statusTone,
  paymentMethodLabels,
} from "./detail-view/types";
import type { DialogAction } from "@/components/shared/DialogActionBar";
import { DetailViewCustomer } from "./detail-view/DetailViewCustomer";
import { DetailViewImages } from "./detail-view/DetailViewImages";
import { DetailViewItems } from "./detail-view/DetailViewItems";
import { DetailViewTotals, formatMoney } from "./detail-view/DetailViewTotals";
import { DetailViewFooter } from "./detail-view/DetailViewFooter";

export type { OverflowAction } from "./detail-view/types";
export type { DialogAction } from "@/components/shared/DialogActionBar";

/*
 * Detalle de venta / servicio / cotización — criterio M3E (docs/CRITERIO-DISENO-M3E.md),
 * variante "dentro de una hoja": protagonista = total + estado; el folio vive aquí
 * (se quitó de las listas) y el cliente se puede llamar o escribir con un toque.
 */

interface DetailViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DetailData | null;
  onEdit?: () => void;
  actions?: DialogAction[];
  overflowActions?: OverflowAction[];
  onDelete?: () => void;
}

export function DetailViewDialog({
  open,
  onOpenChange,
  data,
  onEdit,
  actions,
  overflowActions,
  onDelete,
}: DetailViewDialogProps) {
  const { data: settings } = useBusinessSettings();
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  if (!data) return null;

  const config = typeConfig[data.type];
  const currencySymbol = settings?.currency_symbol || "$";
  const statusConfig = data.status ? statusLabels[data.status] : null;
  const images = data.images ?? [];
  const viewerImages = images.map((image) => ({
    url: image.image_url,
    description: image.description || undefined,
  }));
  const overflowItems: OverflowAction[] = [...(overflowActions ?? [])];

  const hasDeposit = data.type === "service" && Number(data.deposit) > 0;
  const heroTiles: { label: string; value: string }[] = [];
  if (hasDeposit) {
    heroTiles.push({ label: "Anticipo", value: formatMoney(currencySymbol, data.deposit) });
    heroTiles.push({ label: "Saldo pendiente", value: formatMoney(currencySymbol, Number(data.total) - Number(data.deposit)) });
  }
  if (data.valid_until) {
    heroTiles.push({ label: "Válida hasta", value: format(parseISO(data.valid_until), "d MMM yyyy", { locale: es }) });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fixedHeight disableSwipeToClose={viewingImageIndex !== null} className="max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold">{config.label}</DialogTitle>
            <DialogDescription className="tabular-nums">
              {data.number} · {format(parseISO(data.date), "d MMM yyyy, HH:mm", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pb-2">
            {/* Protagonista: total + estado */}
            <section className="rounded-[28px] bg-primary-light p-5">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="text-[2.25rem] font-bold leading-tight tabular-nums text-foreground">
                {formatMoney(currencySymbol, data.total)}
              </p>
              {(statusConfig || data.payment_method) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusConfig && (
                    <TonalChip
                      label={statusConfig.label}
                      tone={statusTone[data.status!] ?? "neutral"}
                      className={statusTone[data.status!] === "accent" ? "bg-background/70 text-foreground" : undefined}
                    />
                  )}
                  {data.payment_method && (
                    <TonalChip
                      label={paymentMethodLabels[data.payment_method] || data.payment_method}
                      tone="neutral"
                      className="bg-background/70"
                    />
                  )}
                </div>
              )}
              {heroTiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {heroTiles.map((t) => (
                    <SpecTile key={t.label} label={t.label} value={t.value} />
                  ))}
                </div>
              )}
            </section>

            <DetailViewCustomer data={data} />

            {(data.description || data.problem) && (
              <DetailSection title="Descripción" className="bg-muted shadow-none">
                {data.description && (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{data.description}</p>
                )}
                {data.problem && (
                  <div className={data.description ? "mt-4" : undefined}>
                    <SubHeading>Solución</SubHeading>
                    <p className="-mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{data.problem}</p>
                  </div>
                )}
              </DetailSection>
            )}

            {data.type === "service" && images.length > 0 && (
              <DetailViewImages images={images} onView={setViewingImageIndex} />
            )}

            <DetailViewItems type={data.type} items={data.items} currencySymbol={currencySymbol} />

            <DetailViewTotals data={data} currencySymbol={currencySymbol} />

            {data.notes && (
              <DetailSection title="Notas" className="bg-muted shadow-none">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{data.notes}</p>
              </DetailSection>
            )}
          </div>

          <DialogFooter className="pt-1 gap-2">
            <DetailViewFooter
              onEdit={onEdit}
              onDelete={onDelete}
              actions={actions}
              overflowItems={overflowItems}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageViewDialog
        open={viewingImageIndex !== null && viewerImages.length > 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setViewingImageIndex(null);
        }}
        images={viewerImages}
        initialIndex={viewingImageIndex ?? 0}
      />
    </>
  );
}
