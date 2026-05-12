import { useRef } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useTemplate, defaultTemplates } from "@/hooks/useTemplates";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalePreviewData {
  sale_number: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: SaleItem[];
  subtotal: number;
  discount?: number | null;
  total: number;
  notes?: string | null;
  payment_method: string;
}

interface SalePrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SalePreviewData | null;
}

export function SalePrintPreview({ open, onOpenChange, sale }: SalePrintPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useBusinessSettings();
  const { data: template, isLoading: isLoadingTemplate } = useTemplate("sale_receipt");
  
  if (!sale) return null;

  const currencySymbol = settings?.currency_symbol || "$";
  const paperSize = settings?.printer_model || "80mm";

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num: number) => {
    return Number(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generate products for table format
  const generateProductsHTML = () => {
    return sale.items
      .map(
        (item) => `
        <tr>
          <td>${item.product_name}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${currencySymbol}${formatNumber(item.unit_price)}</td>
          <td class="text-right">${currencySymbol}${formatNumber(item.subtotal)}</td>
        </tr>
      `
      )
      .join("");
  };

  // Generate products for ticket format
  const generateProductsTicketHTML = () => {
    return sale.items
      .map(
        (item) => `
        <div class="item">
          <div>${item.quantity}x ${item.product_name}</div>
          <div>${currencySymbol}${formatNumber(item.subtotal)}</div>
        </div>
      `
      )
      .join("");
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    credit: "Crédito",
  };

  const processTemplate = (html: string) => {
    const logoHtml = settings?.logo_url 
      ? `<img src="${resolveStorageUrl(settings.logo_url)}" alt="Logo" style="max-width: 80px;" />`
      : "";

    const replacements: Record<string, string> = {
      "[logo]": logoHtml,
      "[nombre_negocio]": settings?.name || "Mi Negocio",
      "[direccion]": settings?.address || "",
      "[telefono]": settings?.phone || "",
      "[email]": settings?.email || "",
      "[folio]": sale.sale_number,
      "[fecha]": formatDate(sale.created_at),
      "[cliente]": sale.customer_name || "Cliente General",
      "[cliente_telefono]": sale.customer_phone || "",
      "[productos]": generateProductsHTML(),
      "[productos_ticket]": generateProductsTicketHTML(),
      "[tipo_documento]": "RECIBO DE VENTA",
      "[moneda]": currencySymbol,
      "[subtotal]": formatNumber(sale.subtotal),
      "[descuento]": formatNumber(sale.discount || 0),
      "[total]": formatNumber(sale.total),
      "[metodo_pago]": paymentMethodLabels[sale.payment_method] || sale.payment_method,
      "[notas]": sale.notes || "",
      "[contacto]": settings?.phone ? `Tel: ${settings.phone}` : "",
      "[whatsapp]": settings?.whatsapp || "",
    };

    let processedHtml = html;
    for (const [placeholder, value] of Object.entries(replacements)) {
      processedHtml = processedHtml.split(placeholder).join(value);
    }

    return processedHtml;
  };

  // Apply paper size to CSS
  const applyPaperSizeToCSS = (css: string, paperWidthMM: number) => {
    return css.replace(/--paper-width:\s*\d+mm/g, `--paper-width: ${paperWidthMM}mm`)
              .replace(/width:\s*\d+mm/g, `width: ${paperWidthMM}mm`);
  };

  // Sanitize template for security
  const templateHtml = sanitizeHTML(template?.html || defaultTemplates.sale_receipt?.html || "");
  const baseCss = sanitizeCSS(template?.css || defaultTemplates.sale_receipt?.css || "");
  const paperWidthMM = paperSize === "58mm" ? 58 : paperSize === "110mm" ? 110 : 80;
  const templateCss = applyPaperSizeToCSS(baseCss, paperWidthMM);

  const handlePrint = () => {
    const processedHTML = processTemplate(templateHtml);

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo ${sale.sale_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              padding: 5mm;
              color: #000;
              font-size: 12px;
              width: ${paperWidthMM}mm;
            }
            @page { size: ${paperWidthMM}mm auto; margin: 0; }
            @media print {
              body { padding: 0; }
            }
            ${templateCss}
          </style>
        </head>
        <body>
          ${processedHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const previewHTML = processTemplate(templateHtml);
  const paperWidthPx = paperSize === "58mm" ? 220 : paperSize === "110mm" ? 420 : 304;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Vista Previa - Recibo {sale.sale_number}
          </DialogTitle>
        </DialogHeader>

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex justify-center bg-gray-100 p-8 rounded-lg">
            <div 
              className="bg-white shadow-lg overflow-auto"
              style={{ width: `${paperWidthPx}px`, maxHeight: "600px" }}
            >
              <style dangerouslySetInnerHTML={{ __html: templateCss }} />
              <div 
                ref={contentRef}
                dangerouslySetInnerHTML={{ __html: previewHTML }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handlePrint} disabled={isLoadingTemplate} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
