import { useRef, useMemo } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useTemplate } from "@/hooks/useTemplates";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";
import type { Warranty } from "@/hooks/useWarranties";

interface WarrantyPrintTicketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty | null;
}

export function WarrantyPrintTicket({ open, onOpenChange, warranty }: WarrantyPrintTicketProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useBusinessSettings();
  const { data: template } = useTemplate("warranty_ticket");

  const isPast = warranty ? new Date(warranty.end_date) < new Date() : false;
  const statusText = warranty?.is_voided ? "ANULADA" : isPast ? "VENCIDA" : "VIGENTE";

  // Generar HTML del QR como string para el placeholder
  const qrHtml = useMemo(() => {
    if (!warranty) return "";
    // Usar la API de QR con el código de garantía exacto
    const qrData = warranty.warranty_code;
    return `<div style="text-align: center; margin: 10px 0;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=10&data=${encodeURIComponent(qrData)}" alt="QR Code" style="max-width: 150px; display: block; margin: 0 auto;" />
      <div style="font-size: 9px; margin-top: 3px; color: #666;">${qrData}</div>
    </div>`;
  }, [warranty]);

  // Procesar placeholders
  const processedHtml = useMemo(() => {
    if (!template?.html || !warranty) return "";

    let html = template.html;

    // Logo
    if (settings?.logo_url && settings.print_logo) {
      html = html.replace(/\[logo\]/g, `<img src="${resolveStorageUrl(settings.logo_url)}" alt="Logo" style="max-width: 60px; margin: 0 auto; display: block;" />`);
    } else {
      html = html.replace(/\[logo\]/g, "");
    }

    // Datos del negocio
    html = html.replace(/\[nombre_negocio\]/g, settings?.name || "Mi Negocio");
    html = html.replace(/\[direccion\]/g, settings?.address || "");
    html = html.replace(/\[telefono\]/g, settings?.phone || "");
    html = html.replace(/\[email\]/g, settings?.email || "");
    html = html.replace(/\[contacto\]/g, settings?.website || "");
    html = html.replace(/\[whatsapp\]/g, settings?.whatsapp || "");

    // Datos de la garantía
    html = html.replace(/\[codigo_garantia\]/g, warranty.warranty_code);
    html = html.replace(/\[estado_garantia\]/g, statusText);
    html = html.replace(/\[tipo_garantia\]/g, warranty.warranty_type === "sale" ? "Venta" : "Servicio");
    html = html.replace(/\[dias_garantia\]/g, String(warranty.warranty_days));
    html = html.replace(/\[fecha_inicio\]/g, format(parseISO(warranty.start_date), "dd/MM/yyyy", { locale: es }));
    html = html.replace(/\[fecha_fin\]/g, format(parseISO(warranty.end_date), "dd/MM/yyyy", { locale: es }));
    html = html.replace(/\[fecha\]/g, format(parseISO(warranty.created_at), "dd/MM/yyyy HH:mm", { locale: es }));

    // Cliente
    html = html.replace(/\[cliente\]/g, warranty.customer_name || "N/A");
    html = html.replace(/\[cliente_telefono\]/g, warranty.customer?.phone || "");

    // Producto/Servicio
    html = html.replace(/\[producto\]/g, warranty.product_name || "");
    html = html.replace(/\[servicio\]/g, warranty.service_description || "");
    html = html.replace(/\[ref_venta\]/g, warranty.sale?.sale_number || "");
    html = html.replace(/\[ref_servicio\]/g, warranty.service?.service_number || "");

    // Notas
    html = html.replace(/\[notas\]/g, warranty.notes || "");

    // QR
    html = html.replace(/\[qr\]/g, qrHtml);

    return sanitizeHTML(html);
  }, [template?.html, warranty, settings, statusText, qrHtml]);

  // Apply paper size to CSS
  const applyPaperSizeToCSS = (css: string, paperWidthMM: number) => {
    return css.replace(/--paper-width:\s*\d+mm/g, `--paper-width: ${paperWidthMM}mm`)
              .replace(/width:\s*\d+mm/g, `width: ${paperWidthMM}mm`);
  };

  const paperWidthMM = settings?.printer_model === "58mm" ? 58 : settings?.printer_model === "110mm" ? 110 : 80;

  const processedCss = useMemo(() => {
    if (!template?.css) return "";
    const baseCss = sanitizeCSS(template.css);
    return applyPaperSizeToCSS(baseCss, paperWidthMM);
  }, [template?.css, paperWidthMM]);

  const handlePrint = () => {
    if (printRef.current && warranty) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Ticket de Garantía - ${warranty.warranty_code}</title>
              <style>
                @page { margin: 0; size: ${paperWidthMM}mm auto; }
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  margin: 0;
                  padding: 8px;
                  width: ${paperWidthMM}mm;
                }
                ${processedCss}
              </style>
            </head>
            <body>
              ${printContents}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  if (!warranty) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Ticket de Garantía
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Print Preview */}
        <div 
          ref={printRef} 
          className="bg-white p-4 rounded-lg border font-mono text-sm"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          <style>{processedCss}</style>
          <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
        </div>

        {/* Print Button */}
        <div className="flex gap-2 mt-4">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
