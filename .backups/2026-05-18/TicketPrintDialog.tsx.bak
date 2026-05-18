import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface TicketItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface TicketData {
  type: "sale" | "service" | "quote";
  number: string;
  date: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  items: TicketItem[];
  subtotal: number;
  discount?: number | null;
  total: number;
  notes?: string | null;
  payment_method?: string | null;
  description?: string | null;
  status?: string;
}

interface TicketPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TicketData | null;
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};

const typeLabels = {
  sale: "Ticket de Venta",
  service: "Orden de Servicio",
  quote: "Cotización",
};

export function TicketPrintDialog({ open, onOpenChange, data }: TicketPrintDialogProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useBusinessSettings();

  if (!data) return null;

  const currencySymbol = settings?.currency_symbol || "$";
  const paperSize = settings?.printer_model || "80mm";

  const handlePrint = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "", "width=300,height=600");
    if (!printWindow) return;

    const width = paperSize === "58mm" ? "58mm" : paperSize === "110mm" ? "110mm" : "80mm";

    printWindow.document.write(`
      <html>
        <head>
          <title>${typeLabels[data.type]} - ${data.number}</title>
          <style>
            @page { 
              size: ${width} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: ${paperSize === "58mm" ? "10px" : "12px"};
              padding: 5mm;
              margin: 0;
              width: ${width};
            }
            .header { text-align: center; margin-bottom: 10px; }
            .logo { font-weight: bold; font-size: ${paperSize === "58mm" ? "14px" : "16px"}; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item { display: flex; justify-content: space-between; margin: 4px 0; }
            .total { font-weight: bold; font-size: ${paperSize === "58mm" ? "12px" : "14px"}; }
            .footer { text-align: center; margin-top: 10px; font-size: ${paperSize === "58mm" ? "8px" : "10px"}; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Imprimir {typeLabels[data.type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto">
            <div
              ref={ticketRef}
              className="font-mono text-xs"
              style={{ width: paperSize === "58mm" ? "180px" : paperSize === "110mm" ? "420px" : "260px" }}
            >
              {/* Header */}
              <div className="text-center mb-3">
                <div className="font-bold text-sm">{settings?.name || "Mi Negocio"}</div>
                {settings?.address && <div className="text-[10px]">{settings.address}</div>}
                {settings?.phone && <div className="text-[10px]">Tel: {settings.phone}</div>}
              </div>

              <div className="border-t border-dashed border-black my-2" />

              {/* Document info */}
              <div className="mb-2">
                <div className="font-bold">{typeLabels[data.type]}</div>
                <div>Folio: {data.number}</div>
                <div>Fecha: {format(parseISO(data.date), "dd/MM/yyyy HH:mm", { locale: es })}</div>
              </div>

              {data.customer_name && (
                <>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="mb-2">
                    <div>Cliente: {data.customer_name}</div>
                    {data.customer_phone && <div>Tel: {data.customer_phone}</div>}
                    {data.customer_address && <div>Dir: {data.customer_address}</div>}
                  </div>
                </>
              )}

              {data.description && (
                <>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="mb-2">
                    <div className="font-bold">Descripción:</div>
                    <div>{data.description}</div>
                  </div>
                </>
              )}

              <div className="border-t border-dashed border-black my-2" />

              {/* Items */}
              {data.items.length > 0 && (
                <div className="mb-2">
                  {data.items.map((item) => (
                    <div key={item.id} className="mb-1">
                      <div className="flex justify-between">
                        <span className="truncate flex-1">{item.product_name}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>{item.quantity} x {currencySymbol}{Number(item.unit_price).toFixed(2)}</span>
                        <span>{currencySymbol}{Number(item.subtotal).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-black my-2" />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{Number(data.subtotal).toFixed(2)}</span>
                </div>
                {data.discount && Number(data.discount) > 0 && (
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <span>-{currencySymbol}{Number(data.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span>{currencySymbol}{Number(data.total).toFixed(2)}</span>
                </div>
              </div>

              {data.payment_method && (
                <div className="mt-2">
                  <div>Pago: {paymentMethodLabels[data.payment_method] || data.payment_method}</div>
                </div>
              )}

              {data.notes && (
                <>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="text-[10px]">
                    <div className="font-bold">Notas:</div>
                    <div>{data.notes}</div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="border-t border-dashed border-black my-2" />
              <div className="text-center text-[10px]">
                <div>¡Gracias por su preferencia!</div>
                {settings?.whatsapp && <div>WhatsApp: {settings.whatsapp}</div>}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}