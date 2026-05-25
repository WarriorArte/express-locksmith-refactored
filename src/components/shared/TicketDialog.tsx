import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
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
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const currency = settings?.currency_symbol || "$";
  const money = (v: number | null | undefined) =>
    `${currency}${Number(v || 0).toFixed(2)}`;
  const statusConfig = data.status ? statusLabels[data.status] : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0" fixedHeight>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-base">{kindTitle[data.kind]}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2 overflow-auto">
          <div
            ref={ticketRef}
            id="ticket-print-area"
            className="ticket-paper mx-auto bg-white text-black p-4 rounded-lg shadow-sm"
            style={{ width: "100%", maxWidth: 320, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {/* Header negocio */}
            <div className="text-center border-b border-dashed border-black/40 pb-2 mb-2">
              {settings?.logo_url && (
                <img
                  src={settings.logo_url}
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

        <DialogFooter className="px-4 pb-4 pt-2 gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-2xl"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 mr-1.5" />
            Cerrar
          </Button>
          <Button
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
