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

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface QuotePreviewData {
  quote_number: string;
  created_at: string;
  valid_until?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  description?: string | null;
  location?: string | null;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  policies?: string | null;
}

interface QuotePrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuotePreviewData | null;
}

export function QuotePrintPreview({ open, onOpenChange, quote }: QuotePrintPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useBusinessSettings();
  const { data: template, isLoading: isLoadingTemplate } = useTemplate("quote_pdf");
  
  if (!quote) return null;

  const currencySymbol = settings?.currency_symbol || "$";

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num: number) => {
    return Number(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generate products HTML rows
  const generateProductsHTML = () => {
    return quote.items
      .map(
        (item) => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${currencySymbol}${formatNumber(item.unit_price)}</td>
          <td class="text-right">${currencySymbol}${formatNumber(item.subtotal)}</td>
        </tr>
      `
      )
      .join("");
  };

  // Replace placeholders with actual data
  const processTemplate = (html: string) => {
    const logoHtml = settings?.logo_url 
      ? `<img src="${resolveStorageUrl(settings.logo_url)}" alt="Logo" style="max-width: 150px;" />`
      : settings?.name || "Mi Negocio";

    const replacements: Record<string, string> = {
      "[logo]": logoHtml,
      "[nombre_negocio]": settings?.name || "Mi Negocio",
      "[direccion]": settings?.address || "",
      "[telefono]": settings?.phone || "",
      "[email]": settings?.email || "",
      "[folio]": quote.quote_number,
      "[fecha]": formatDate(quote.created_at),
      "[fecha_vencimiento]": quote.valid_until ? formatDate(quote.valid_until) : "N/A",
      "[cliente]": quote.customer_name || "Cliente General",
      "[cliente_telefono]": quote.customer_phone || "",
      "[cliente_email]": quote.customer_email || "",
      "[cliente_direccion]": quote.customer_address || "",
      "[descripcion]": quote.description || "",
      "[ubicacion]": quote.location || "",
      "[productos]": generateProductsHTML(),
      "[moneda]": currencySymbol,
      "[subtotal]": formatNumber(quote.subtotal),
      "[descuento]": formatNumber(quote.discount),
      "[total]": formatNumber(quote.total),
      "[politicas]": quote.policies || "Sin políticas especificadas.",
      "[notas]": quote.notes || "",
      "[usuario]": "",
      "[atendido_por]": "",
      "[contacto]": settings?.whatsapp ? `WhatsApp: ${settings.whatsapp}` : (settings?.phone ? `Tel: ${settings.phone}` : ""),
      "[whatsapp]": settings?.whatsapp || "",
    };

    let processedHtml = html;
    for (const [placeholder, value] of Object.entries(replacements)) {
      processedHtml = processedHtml.split(placeholder).join(value);
    }

    return processedHtml;
  };

  // Get the template HTML and CSS (sanitized for security)
  const templateHtml = sanitizeHTML(template?.html || defaultTemplates.quote_pdf?.html || "");
  const templateCss = sanitizeCSS(template?.css || defaultTemplates.quote_pdf?.css || "");

  const handlePrint = () => {
    const processedHTML = processTemplate(templateHtml);

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cotización ${quote.quote_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20mm;
              color: #333;
              line-height: 1.5;
            }
            @page { size: letter; margin: 15mm; }
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

  // Generate preview HTML with processed template
  const previewHTML = processTemplate(templateHtml);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Vista Previa - Cotización {quote.quote_number}
          </DialogTitle>
        </DialogHeader>

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg bg-white overflow-auto">
            <style dangerouslySetInnerHTML={{ __html: templateCss }} />
            <div 
              ref={contentRef}
              className="p-4"
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
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
