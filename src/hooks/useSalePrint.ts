import { useCallback } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useTemplate, defaultTemplates } from "@/hooks/useTemplates";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";
import { printDirect, applyPaperSizeToCSS, getPaperWidthMM } from "@/lib/printUtils";
import type { Sale } from "@/hooks/useSales";

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};

export function useSalePrint() {
  const { data: settings } = useBusinessSettings();
  const { data: template } = useTemplate("sale_receipt");

  const printSale = useCallback((sale: Sale) => {
    const currencySymbol = settings?.currency_symbol || "$";
    const paperWidthMM = getPaperWidthMM(settings?.printer_model);

    const templateHtml = sanitizeHTML(template?.html || defaultTemplates.sale_receipt?.html || "");
    const baseCss = sanitizeCSS(template?.css || defaultTemplates.sale_receipt?.css || "");
    const templateCss = applyPaperSizeToCSS(baseCss, paperWidthMM);

    const formatDate = (dateStr: string) => {
      try { return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: es }); }
      catch { return dateStr; }
    };
    const formatNumber = (num: number) =>
      Number(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const items = sale.sale_items || [];
    const generateProductsHTML = () => items.map(item =>
      `<tr><td>${item.product_name}</td><td class="text-right">${item.quantity}</td><td class="text-right">${currencySymbol}${formatNumber(item.unit_price)}</td><td class="text-right">${currencySymbol}${formatNumber(item.subtotal)}</td></tr>`
    ).join("");
    const generateProductsTicketHTML = () => items.map(item =>
      `<div class="item"><div>${item.quantity}x ${item.product_name}</div><div>${currencySymbol}${formatNumber(item.subtotal)}</div></div>`
    ).join("");

    const logoHtml = settings?.logo_url ? `<img src="${resolveStorageUrl(settings.logo_url)}" alt="Logo" style="max-width: 80px;" />` : "";
    const replacements: Record<string, string> = {
      "[logo]": logoHtml,
      "[nombre_negocio]": settings?.name || "Mi Negocio",
      "[direccion]": settings?.address || "",
      "[telefono]": settings?.phone || "",
      "[email]": settings?.email || "",
      "[folio]": sale.sale_number,
      "[fecha]": formatDate(sale.created_at),
      "[cliente]": sale.customer_name || sale.customer?.name || "Cliente General",
      "[cliente_telefono]": sale.customer?.phone || "",
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

    let html = templateHtml;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.split(placeholder).join(value);
    }

    printDirect({
      html,
      css: templateCss,
      title: `Recibo ${sale.sale_number}`,
      paperWidthMM,
      isTicket: true,
    });
  }, [settings, template]);

  return { printSale };
}
