import { useCallback } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useTemplate, defaultTemplates } from "@/hooks/useTemplates";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";
import { printDirect, applyPaperSizeToCSS, getPaperWidthMM } from "@/lib/printUtils";
import type { Warranty } from "@/hooks/useWarranties";

export function useWarrantyPrint() {
  const { data: settings } = useBusinessSettings();
  const { data: template } = useTemplate("warranty_ticket");

  const printWarranty = useCallback((warranty: Warranty) => {
    const paperWidthMM = getPaperWidthMM(settings?.printer_model);

    const templateHtml = sanitizeHTML(template?.html || defaultTemplates.warranty_ticket?.html || "");
    const baseCss = sanitizeCSS(template?.css || defaultTemplates.warranty_ticket?.css || "");
    const templateCss = applyPaperSizeToCSS(baseCss, paperWidthMM);

    const isPast = new Date(warranty.end_date) < new Date();
    const statusText = warranty.is_voided ? "ANULADA" : isPast ? "VENCIDA" : "VIGENTE";

    const qrData = warranty.warranty_code;
    const qrHtml = `<div style="text-align: center; margin: 10px 0;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=10&data=${encodeURIComponent(qrData)}" alt="QR Code" style="max-width: 150px; display: block; margin: 0 auto;" />
      <div style="font-size: 9px; margin-top: 3px; color: #666;">${qrData}</div>
    </div>`;

    const logoHtml = settings?.logo_url && settings.print_logo
      ? `<img src="${resolveStorageUrl(settings.logo_url)}" alt="Logo" style="max-width: 60px; margin: 0 auto; display: block;" />`
      : "";

    const replacements: Record<string, string> = {
      "[logo]": logoHtml,
      "[nombre_negocio]": settings?.name || "Mi Negocio",
      "[direccion]": settings?.address || "",
      "[telefono]": settings?.phone || "",
      "[email]": settings?.email || "",
      "[contacto]": settings?.website || "",
      "[whatsapp]": settings?.whatsapp || "",
      "[codigo_garantia]": warranty.warranty_code,
      "[estado_garantia]": statusText,
      "[tipo_garantia]": warranty.warranty_type === "sale" ? "Venta" : "Servicio",
      "[dias_garantia]": String(warranty.warranty_days),
      "[fecha_inicio]": format(parseISO(warranty.start_date), "dd/MM/yyyy", { locale: es }),
      "[fecha_fin]": format(parseISO(warranty.end_date), "dd/MM/yyyy", { locale: es }),
      "[fecha]": format(parseISO(warranty.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
      "[cliente]": warranty.customer_name || "N/A",
      "[cliente_telefono]": warranty.customer?.phone || "",
      "[producto]": warranty.product_name || "",
      "[servicio]": warranty.service_description || "",
      "[ref_venta]": warranty.sale?.sale_number || "",
      "[ref_servicio]": warranty.service?.service_number || "",
      "[notas]": warranty.notes || "",
      "[qr]": qrHtml,
    };

    let html = templateHtml;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.split(placeholder).join(value);
    }

    printDirect({
      html,
      css: templateCss,
      title: `Ticket de Garantía - ${warranty.warranty_code}`,
      paperWidthMM,
      isTicket: true,
    });
  }, [settings, template]);

  return { printWarranty };
}
