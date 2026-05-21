import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Eye, MessageCircle, Printer } from "lucide-react";
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
  onPrint?: () => void;
  onEdit?: () => void;
  onPreview?: () => void;
  onShare?: () => void;
  overflowActions?: OverflowAction[];
  onDelete?: () => void;
}

export function DetailViewDialog({
  open,
  onOpenChange,
  data,
  onPrint,
  onEdit,
  onPreview,
  onShare,
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

  const overflowItems: OverflowAction[] = [
    ...(onEdit && onPrint ? [{ icon: Printer, label: "Ticket", onClick: onPrint }] : []),
    ...(onPreview ? [{ icon: Eye, label: "PDF", onClick: onPreview }] : []),
    ...(onShare ? [{ icon: MessageCircle, label: "WhatsApp", onClick: onShare, className: "text-[#25D366]" }] : []),
    ...(overflowActions ?? []),
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          disableSwipeToClose={viewingImageIndex !== null}
          className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono">{data.number}</span>
                <span className="text-muted-foreground ml-2">- {config.label}</span>
              </div>
              {statusConfig && <Badge className={statusConfig.color}>{statusConfig.label}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Fecha:</span>
                <span className="truncate">
                  {format(parseISO(data.date), "dd MMM yyyy HH:mm", { locale: es })}
                </span>
              </div>
              {data.valid_until && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Válido hasta:</span>
                  <span>{format(parseISO(data.valid_until), "dd MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {data.payment_method && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Pago:</span>
                  <Badge variant="outline" className="text-xs">
                    {paymentMethodLabels[data.payment_method] || data.payment_method}
                  </Badge>
                </div>
              )}
            </div>

            {(data.customer_name || data.customer_phone || data.customer_email) && (
              <>
                <Separator />
                <DetailViewCustomer data={data} />
              </>
            )}

            {(data.description || data.problem) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                  {data.problem && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Solución: </span>
                      <span className="text-sm text-muted-foreground">{data.problem}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {data.type === "service" && images.length > 0 && (
              <>
                <Separator />
                <DetailViewImages images={images} onView={setViewingImageIndex} />
              </>
            )}

            {data.items.length > 0 && (
              <>
                <Separator />
                <DetailViewItems type={data.type} items={data.items} currencySymbol={currencySymbol} />
              </>
            )}

            <Separator />
            <DetailViewTotals data={data} currencySymbol={currencySymbol} />

            {data.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Notas</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{data.notes}</p>
                </div>
              </>
            )}
          </div>

          <DetailViewFooter
            onPrint={onPrint}
            onEdit={onEdit}
            onDelete={onDelete}
            overflowItems={overflowItems}
          />
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
