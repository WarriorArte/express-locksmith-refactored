import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";

import {
  type DetailData,
  type OverflowAction,
  typeConfig,
  statusLabels,
  paymentMethodLabels,
} from "./detail-view/types";
import { DetailViewCustomer } from "./detail-view/DetailViewCustomer";
import { DetailViewImages } from "./detail-view/DetailViewImages";
import { DetailViewItems } from "./detail-view/DetailViewItems";
import { DetailViewTotals } from "./detail-view/DetailViewTotals";
import { DetailViewFooter } from "./detail-view/DetailViewFooter";

export type { OverflowAction } from "./detail-view/types";

interface DetailViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DetailData | null;
  onEdit?: () => void;
  overflowActions?: OverflowAction[];
  onDelete?: () => void;
}

export function DetailViewDialog({
  open,
  onOpenChange,
  data,
  onEdit,
  overflowActions,
  onDelete,
}: DetailViewDialogProps) {
  const { data: settings } = useBusinessSettings();
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  if (!data) return null;

  const config = typeConfig[data.type];
  const Icon = config.icon;
  const currencySymbol = settings?.currency_symbol || "$";
  const statusConfig = data.status ? statusLabels[data.status] : null;
  const images = data.images ?? [];
  const viewerImages = images.map((image) => ({
    url: image.image_url,
    description: image.description || undefined,
  }));

  const overflowItems: OverflowAction[] = [...(overflowActions ?? [])];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fixedHeight disableSwipeToClose={viewingImageIndex !== null} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className={`inline-flex size-8 items-center justify-center rounded-xl ${config.color}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-foreground dark:text-primary">{data.number}</span>
                <span className="block text-xs font-medium text-muted-foreground">{config.label}</span>
              </span>
              {statusConfig && <Badge className={statusConfig.color}>{statusConfig.label}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[hsl(var(--surface-2))] px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Fecha
                </div>
                <div className="truncate text-[13px] font-semibold text-foreground">
                  {format(parseISO(data.date), "dd MMM yyyy HH:mm", { locale: es })}
                </div>
              </div>

              {data.valid_until && (
                <div className="rounded-xl bg-[hsl(var(--surface-2))] px-3 py-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Valido hasta
                  </div>
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {format(parseISO(data.valid_until), "dd MMM yyyy", { locale: es })}
                  </div>
                </div>
              )}

              {data.payment_method && (
                <div className="rounded-xl bg-[hsl(var(--surface-2))] px-3 py-2.5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pago
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {paymentMethodLabels[data.payment_method] || data.payment_method}
                  </Badge>
                </div>
              )}
            </div>

            {(data.customer_name || data.customer_phone || data.customer_email) && (
              <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
                <DetailViewCustomer data={data} />
              </div>
            )}

            {(data.description || data.problem) && (
              <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
                <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Descripcion
                </h4>
                <p className="text-sm text-foreground">{data.description}</p>
                {data.problem && (
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Solucion: </span>
                    {data.problem}
                  </p>
                )}
              </div>
            )}

            {data.type === "service" && images.length > 0 && (
              <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
                <DetailViewImages images={images} onView={setViewingImageIndex} />
              </div>
            )}

            {data.items.length > 0 && (
              <DetailViewItems type={data.type} items={data.items} currencySymbol={currencySymbol} />
            )}

            <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
              <DetailViewTotals data={data} currencySymbol={currencySymbol} />
            </div>

            {data.notes && (
              <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-3.5">
                <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notas
                </h4>
                <p className="whitespace-pre-wrap text-[13px] text-foreground">{data.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-1 gap-2">
            <DetailViewFooter
              onEdit={onEdit}
              onDelete={onDelete}
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
