import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Share2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useToast } from "@/hooks/use-toast";
import { resolveStorageUrl } from "@/lib/phpApi";
import { paymentMethodLabels, statusLabels } from "./detail-view/types";

export type TicketKind = "sale" | "service" | "warranty";

export interface TicketItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface TicketData {
  kind: TicketKind;
  number: string;
  date: string;
  status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  // sale/service
  items?: TicketItem[];
  subtotal?: number;
  discount?: number | null;
  labor_cost?: number | null;
  total?: number;
  payment_method?: string | null;
  notes?: string | null;
  description?: string | null;
  problem?: string | null;
  // warranty
  warranty_type?: "sale" | "service";
  warranty_days?: number;
  start_date?: string;
  end_date?: string;
  reference_number?: string | null;
  product_name?: string | null;
  service_description?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TicketData | null;
}

const kindTitle: Record<TicketKind, string> = {
  sale: "Ticket de Venta",
  service: "Orden de Servicio",
  warranty: "Comprobante de Garantía",
};

export function TicketDialog({ open, onOpenChange, data }: Props) {
  const { data: settings } = useBusinessSettings();
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const currency = settings?.currency_symbol || "$";
  const money = (v: number | null | undefined) =>
    `${currency}${Number(v || 0).toFixed(2)}`;
  const statusConfig = data.status ? statusLabels[data.status] : null;
  const logoUrl = resolveStorageUrl(settings?.logo_url);
  const pdfFileName = `ticket-${sanitizeFileName(data.number)}.pdf`;

  const createTicketPdf = async () => {
    if (!ticketRef.current) throw new Error("Ticket no listo");
    const { createTicketPdfBlob } = await import("./ticketPdf");
    const blob = await createTicketPdfBlob(ticketRef.current);
    return new File([blob], pdfFileName, { type: "application/pdf" });
  };

  const handleDownload = async () => {
    try {
      const file = await createTicketPdf();
      downloadFile(file);
    } catch (error) {
      toast({
        title: "No se pudo descargar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      const file = await createTicketPdf();
      const shareData = {
        title: kindTitle[data.kind],
        text: `${kindTitle[data.kind]} ${data.number}`,
        files: [file],
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      downloadFile(file);
      toast({
        title: "PDF descargado",
        description: "Este navegador no permite compartir archivos directamente.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({
        title: "No se pudo compartir",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = async () => {
    if (ticketRef.current) {
      await waitForTicketImages(ticketRef.current);
    }

    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm md:max-w-[430px] h-[90dvh] md:h-[min(92vh,760px)] p-0"
        fixedHeight
      >
        <DialogHeader className="px-4 pt-3 md:px-5 md:pt-5 !flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base md:text-lg">{kindTitle[data.kind]}</DialogTitle>
          <DialogClose className="md:hidden rounded-sm p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </DialogHeader>

        <div className="px-2 pb-2 md:px-4 overflow-auto">
          <div
            ref={ticketRef}
            id="ticket-print-area"
            className="ticket-paper mx-auto bg-white text-black p-4 rounded-sm shadow-sm"
            style={{ width: 320, maxWidth: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {/* Header negocio */}
            <div className="text-center border-b border-dashed border-black/40 pb-2 mb-2">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="logo"
                  className="mx-auto mb-1 h-12 w-12 object-contain"
                />
              )}
              <div className="font-bold text-[14px] uppercase tracking-wide">
                {settings?.name || "Mi Negocio"}
              </div>
              {settings?.address && <div className="text-[10px]">{settings.address}</div>}
              {settings?.phone && <div className="text-[10px]">Tel: {settings.phone}</div>}
              {settings?.email && <div className="text-[10px]">{settings.email}</div>}
            </div>

            {/* Tipo + número */}
            <div className="text-center mb-2">
              <div className="text-[10px] uppercase tracking-wider">{kindTitle[data.kind]}</div>
              <div className="font-bold text-[15px]">{data.number}</div>
              <div className="text-[10px]">
                {format(parseISO(data.date), "dd MMM yyyy · HH:mm", { locale: es })}
              </div>
              {statusConfig && (
                <div className="text-[10px] mt-1 inline-block border border-black/40 px-2 py-0.5 rounded">
                  {statusConfig.label}
                </div>
              )}
            </div>

            {/* Cliente */}
            {(data.customer_name || data.customer_phone) && (
              <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[11px]">
                <div className="font-bold uppercase text-[10px] mb-0.5">Cliente</div>
                {data.customer_name && <div>{data.customer_name}</div>}
                {data.customer_phone && <div>Tel: {data.customer_phone}</div>}
                {data.customer_email && <div>{data.customer_email}</div>}
              </div>
            )}

            {/* Descripción servicio */}
            {data.kind === "service" && (data.description || data.problem) && (
              <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[11px]">
                {data.description && (
                  <>
                    <div className="font-bold uppercase text-[10px]">Descripción</div>
                    <div className="mb-1">{data.description}</div>
                  </>
                )}
                {data.problem && (
                  <>
                    <div className="font-bold uppercase text-[10px]">Solución / Problema</div>
                    <div>{data.problem}</div>
                  </>
                )}
              </div>
            )}

            {/* Items */}
            {(data.kind === "sale" || data.kind === "service") && data.items && data.items.length > 0 && (
              <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[11px]">
                <div className="flex justify-between font-bold uppercase text-[10px] mb-1">
                  <span>Detalle</span>
                  <span>Importe</span>
                </div>
                {data.items.map((it, i) => (
                  <div key={i} className="mb-1">
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{it.quantity}× {it.name}</span>
                      <span className="font-semibold">{money(it.subtotal)}</span>
                    </div>
                    <div className="text-[10px] text-black/60">
                      {money(it.unit_price)} c/u
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales venta/servicio */}
            {(data.kind === "sale" || data.kind === "service") && (
              <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[11px]">
                {data.kind === "service" && data.labor_cost && Number(data.labor_cost) > 0 && (
                  <Row label="Mano de obra" value={money(data.labor_cost)} />
                )}
                {data.subtotal !== undefined && <Row label="Subtotal" value={money(data.subtotal)} />}
                {data.discount && Number(data.discount) > 0 && (
                  <Row label="Descuento" value={`-${money(data.discount)}`} />
                )}
                <div className="flex justify-between border-t border-black/40 pt-1 mt-1 font-bold text-[13px]">
                  <span>TOTAL</span>
                  <span>{money(data.total)}</span>
                </div>
                {data.payment_method && (
                  <div className="text-[10px] mt-1 text-center">
                    Pago: {paymentMethodLabels[data.payment_method] || data.payment_method}
                  </div>
                )}
              </div>
            )}

            {/* Datos garantía */}
            {data.kind === "warranty" && (
              <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[11px]">
                <div className="font-bold uppercase text-[10px] mb-1">
                  {data.warranty_type === "sale" ? "Producto cubierto" : "Servicio cubierto"}
                </div>
                <div className="mb-2">
                  {data.warranty_type === "sale" ? data.product_name : data.service_description}
                </div>
                {data.reference_number && (
                  <Row label="Referencia" value={data.reference_number} />
                )}
                <Row label="Duración" value={`${data.warranty_days} días`} />
                {data.start_date && (
                  <Row
                    label="Inicio"
                    value={format(parseISO(data.start_date), "dd/MM/yyyy", { locale: es })}
                  />
                )}
                {data.end_date && (
                  <Row
                    label="Vence"
                    value={format(parseISO(data.end_date), "dd/MM/yyyy", { locale: es })}
                  />
                )}
              </div>
            )}

            {/* Notas */}
            {data.notes && (
              <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[10px]">
                <div className="font-bold uppercase mb-0.5">Notas</div>
                <div className="whitespace-pre-wrap">{data.notes}</div>
              </div>
            )}

            {/* QR */}
            <div className="border-t border-dashed border-black/40 pt-2 flex flex-col items-center">
              <QRCodeSVG value={data.number} size={128} marginSize={1} />
              <div className="font-mono text-[11px] mt-1 font-bold">{data.number}</div>
              <div className="text-[9px] text-center mt-1 text-black/60">
                Conserve este comprobante
              </div>
            </div>

            <div className="text-center text-[10px] mt-2 pt-2 border-t border-dashed border-black/40">
              ¡Gracias por su preferencia!
            </div>
          </div>
        </div>

        <DialogFooter className="!grid grid-cols-3 px-3 md:px-5 pb-3 md:pb-5 pt-2 gap-2 [&>button]:min-w-0 [&>button]:flex-1 [&>button:last-child]:flex-1">
          <Button
            variant="outline"
            className="h-11 rounded-sm px-2 text-[11px] sm:text-sm gap-1.5"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">Descargar</span>
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-sm px-2 text-[11px] sm:text-sm gap-1.5"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Compartir</span>
          </Button>
          <Button
            className="h-11 rounded-sm bg-primary text-primary-foreground px-2 text-[11px] sm:text-sm gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="truncate">Imprimir</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function waitForTicketImages(ticket: HTMLElement) {
  const images = Array.from(ticket.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "ticket";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
