import { useCallback } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useTemplate, defaultTemplates } from "@/hooks/useTemplates";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";
import { printDirect } from "@/lib/printUtils";
import type { Quote } from "@/hooks/useQuotes";

export function useQuotePrint() {
  const { data: settings } = useBusinessSettings();
  const { data: template } = useTemplate("quote_pdf");

  const printQuote = useCallback((quote: Quote) => {
    const currencySymbol = settings?.currency_symbol || "$";

    const templateHtml = sanitizeHTML(template?.html || defaultTemplates.quote_pdf?.html || "");
    const templateCss = sanitizeCSS(template?.css || defaultTemplates.quote_pdf?.css || "");

    const formatDate = (dateStr: string) => {
      try { return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: es }); }
      catch { return dateStr; }
    };
    const formatNumber = (num: number) =>
      Number(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const items = quote.quote_items || [];
    const generateProductsHTML = () => items.map(item =>
      `<tr><td>${item.description}</td><td class="text-right">${item.quantity}</td><td class="text-right">${currencySymbol}${formatNumber(item.unit_price)}</td><td class="text-right">${currencySymbol}${formatNumber(item.subtotal)}</td></tr>`
    ).join("");

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
      "[cliente]": quote.customer_name || quote.customer?.name || "Cliente General",
      "[cliente_telefono]": quote.customer_phone || quote.customer?.phone || "",
      "[cliente_email]": quote.customer_email || quote.customer?.email || "",
      "[cliente_direccion]": quote.customer_address || quote.customer?.address || "",
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

    let html = templateHtml;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.split(placeholder).join(value);
    }

    printDirect({
      html,
      css: templateCss,
      title: `Cotización ${quote.quote_number}`,
      paperWidthMM: 210, // Letter size
      isTicket: false,
    });
  }, [settings, template]);

  return { printQuote };
}
