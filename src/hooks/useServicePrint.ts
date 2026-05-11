import { useCallback } from "react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useTemplate, defaultTemplates } from "@/hooks/useTemplates";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";
import { printDirect, applyPaperSizeToCSS, getPaperWidthMM } from "@/lib/printUtils";
import type { Service } from "@/hooks/useServices";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En Curso",
  completed: "Finalizado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const typeLabels: Record<string, string> = {
  automotive: "Automotriz",
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
};

export function useServicePrint() {
  const { data: settings } = useBusinessSettings();
  const { data: template } = useTemplate("service_order");

  const printService = useCallback((service: Service) => {
    const currencySymbol = settings?.currency_symbol || "$";
    const paperWidthMM = getPaperWidthMM(settings?.printer_model);

    const templateHtml = sanitizeHTML(template?.html || defaultTemplates.service_order?.html || "");
    const baseCss = sanitizeCSS(template?.css || defaultTemplates.service_order?.css || "");
    const templateCss = applyPaperSizeToCSS(baseCss, paperWidthMM);

    const formatDate = (dateStr: string) => {
      try { return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: es }); }
      catch { return dateStr; }
    };
    const formatNumber = (num: number) =>
      Number(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const items = service.service_products || [];
    const productsSubtotal = items.reduce((acc, p) => acc + Number(p.subtotal), 0);

    const generateProductsHTML = () => items.map(item =>
      `<tr><td>${item.product_name}</td><td class="text-right">${item.quantity}</td><td class="text-right">${currencySymbol}${formatNumber(item.unit_price)}</td><td class="text-right">${currencySymbol}${formatNumber(item.subtotal)}</td></tr>`
    ).join("");
    const generateProductsTicketHTML = () => items.map(item =>
      `<div class="item"><div>${item.quantity}x ${item.product_name}</div><div>${currencySymbol}${formatNumber(item.subtotal)}</div></div>`
    ).join("");

    const logoHtml = settings?.logo_url ? `<img src="${settings.logo_url}" alt="Logo" style="max-width: 80px;" />` : "";
    const replacements: Record<string, string> = {
      "[logo]": logoHtml,
      "[nombre_negocio]": settings?.name || "Mi Negocio",
      "[direccion]": settings?.address || "",
      "[telefono]": settings?.phone || "",
      "[email]": settings?.email || "",
      "[folio]": service.service_number,
      "[fecha]": formatDate(service.created_at),
      "[cliente]": service.customer?.name || "Cliente General",
      "[cliente_telefono]": service.customer?.phone || "",
      "[cliente_direccion]": service.address || service.customer?.address || "",
      "[descripcion]": service.description,
      "[problema]": service.problem || "",
      "[ubicacion]": service.location || service.address || service.customer?.address || "",
      "[productos]": generateProductsHTML(),
      "[productos_ticket]": generateProductsTicketHTML(),
      "[tipo_documento]": "ORDEN DE SERVICIO",
      "[moneda]": currencySymbol,
      "[subtotal]": formatNumber(productsSubtotal + Number(service.labor_cost || 0)),
      "[subtotal_productos]": formatNumber(productsSubtotal),
      "[mano_obra]": formatNumber(service.labor_cost || 0),
      "[descuento]": formatNumber(service.discount || 0),
      "[total]": formatNumber(service.final_price || service.estimated_price),
      "[estado]": statusLabels[service.status] || service.status,
      "[tipo_servicio]": typeLabels[service.service_type] || service.service_type,
      "[politicas]": "Garantía de 30 días en mano de obra. Piezas con garantía del fabricante.",
      "[notas]": service.internal_notes || "",
      "[usuario]": "",
      "[atendido_por]": "",
      "[contacto]": settings?.phone ? `Tel: ${settings.phone}` : "",
      "[whatsapp]": settings?.whatsapp || "",
    };

    let html = templateHtml;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.split(placeholder).join(value);
    }

    printDirect({
      html,
      css: templateCss,
      title: `Orden de Servicio ${service.service_number}`,
      paperWidthMM,
      isTicket: true,
    });
  }, [settings, template]);

  return { printService };
}
