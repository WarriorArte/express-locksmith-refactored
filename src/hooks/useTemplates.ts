import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useToast } from "@/hooks/use-toast";

export interface Template {
  id: string;
  name: string;
  template_type: string;
  html_content: string | null;
  css_content: string | null;
  is_default: boolean | null;
  is_global: boolean;
  thumbnail_url: string | null;
  workshop_id: string | null;
}

export interface TemplateSelection {
  id: string;
  workshop_id: string;
  template_type: string;
  template_id: string;
  custom_css: string | null;
}

function normalizeTemplate(raw: any): Template {
  return {
    ...raw,
    is_global: typeof raw.is_global === "boolean" ? raw.is_global : !!raw.is_global,
    is_default: typeof raw.is_default === "boolean" ? raw.is_default : !!raw.is_default,
  } as Template;
}

function normalizeSelection(raw: any): TemplateSelection {
  return {
    ...raw,
    template_type: raw.template_type || raw.type,
  } as TemplateSelection;
}

export const templateTypeLabels: Record<string, string> = {
  quote_pdf: "Cotización PDF",
  sale_receipt: "Recibo de Venta (Ticket Térmico)",
  service_order: "Orden de Servicio (Ticket Térmico)",
  warranty_ticket: "Ticket de Garantía (Ticket Térmico)",
};

export const placeholders = [
  "[logo]", "[nombre_negocio]", "[direccion]", "[telefono]", "[email]",
  "[folio]", "[fecha]", "[fecha_vencimiento]",
  "[cliente]", "[cliente_telefono]", "[cliente_email]", "[cliente_direccion]",
  "[descripcion]", "[problema]", "[ubicacion]",
  "[productos]", "[productos_ticket]",
  "[moneda]", "[subtotal]", "[descuento]", "[total]",
  "[mano_obra]", "[subtotal_productos]",
  "[metodo_pago]", "[estado]", "[tipo_servicio]", "[tipo_documento]",
  "[politicas]", "[notas]", "[usuario]", "[atendido_por]", "[contacto]",
  "[whatsapp]", "[qr]", "[firma]",
  "[codigo_garantia]", "[tipo_garantia]", "[estado_garantia]", "[dias_garantia]",
  "[fecha_inicio]", "[fecha_fin]", "[producto]", "[servicio]", "[ref_venta]", "[ref_servicio]"
];

// Single source of truth for default templates
export const defaultTemplates: Record<string, { html: string; css: string }> = {
  quote_pdf: {
    html: `<div class="document">
  <div class="header">
    <div class="logo">[logo]</div>
    <div class="business-info">
      <h1>[nombre_negocio]</h1>
      <p>[direccion]</p>
      <p>Tel: [telefono] | [email]</p>
    </div>
  </div>
  
  <div class="document-title">
    <h2>COTIZACIÓN</h2>
    <p>Folio: [folio]</p>
    <p>Fecha: [fecha]</p>
    <p>Válida hasta: [fecha_vencimiento]</p>
  </div>
  
  <div class="customer-info">
    <h3>Cliente</h3>
    <p><strong>[cliente]</strong></p>
    <p>[cliente_telefono]</p>
    <p>[cliente_direccion]</p>
  </div>
  
  <div class="description">
    <h3>Descripción</h3>
    <p>[descripcion]</p>
  </div>
  
  <table class="items">
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio Unit.</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      [productos]
    </tbody>
  </table>
  
  <div class="totals">
    <p>Subtotal: [moneda][subtotal]</p>
    <p>Descuento: [moneda][descuento]</p>
    <p class="total">TOTAL: [moneda][total]</p>
  </div>
  
  <div class="policies">
    <h4>Políticas y Condiciones</h4>
    <p>[politicas]</p>
  </div>
  
  <div class="notes">
    <h4>Notas</h4>
    <p>[notas]</p>
  </div>
  
  <div class="footer">
    <p>Atendido por: [usuario]</p>
    <p>[contacto]</p>
  </div>
</div>`,
    css: `.document { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 20px; }
.logo img { max-width: 150px; }
.business-info { text-align: right; }
.business-info h1 { color: #1e3a5f; margin: 0 0 10px 0; }
.business-info p { margin: 3px 0; color: #666; }
.document-title { text-align: center; margin: 30px 0; padding: 20px; background: #f0f4ff; border-radius: 8px; }
.document-title h2 { color: #1e3a5f; margin: 0 0 15px 0; font-size: 24px; border-bottom: 2px solid #c9a227; display: inline-block; padding-bottom: 5px; }
.document-title p { margin: 5px 0; color: #333; }
.customer-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1e3a5f; }
.customer-info h3 { margin: 0 0 10px 0; color: #1e3a5f; font-size: 14px; text-transform: uppercase; }
.customer-info p { margin: 4px 0; }
.description { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
.description h3 { margin: 0 0 10px 0; color: #1e3a5f; font-size: 14px; text-transform: uppercase; }
.items { width: 100%; border-collapse: collapse; margin: 20px 0; }
.items th { background: #1e3a5f; color: white; padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; }
.items td { padding: 12px 15px; border-bottom: 1px solid #e5e7eb; }
.items tbody tr:nth-child(even) { background: #f9fafb; }
.text-right { text-align: right; }
.totals { text-align: right; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
.totals p { margin: 8px 0; font-size: 14px; }
.totals .total { font-size: 20px; font-weight: bold; color: #1e3a5f; margin-top: 15px; padding-top: 15px; border-top: 2px solid #1e3a5f; }
.policies { padding: 15px; background: #fffbeb; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
.policies h4 { margin: 0 0 10px 0; color: #92400e; }
.policies p { margin: 0; font-size: 13px; color: #666; white-space: pre-line; }
.notes { padding: 15px; background: #f0f9ff; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
.notes h4 { margin: 0 0 10px 0; color: #0369a1; }
.notes p { margin: 0; font-size: 13px; color: #666; white-space: pre-line; }
.footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
.footer p { margin: 5px 0; color: #666; }
@media print { body { padding: 0; } .document { padding: 0; } }`,
  },
  sale_receipt: {
    html: `<div class="ticket">
  <div class="header">
    <div class="logo">[logo]</div>
    <p class="business-name">[nombre_negocio]</p>
    <p>[direccion]</p>
    <p>Tel: [telefono]</p>
  </div>
  
  <div class="divider">================================</div>
  
  <div class="info">
    <p><strong>RECIBO DE VENTA</strong></p>
    <p>Folio: [folio]</p>
    <p>Fecha: [fecha]</p>
    <p>Cliente: [cliente]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="items">
    [productos_ticket]
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="totals">
    <p>Subtotal: [moneda][subtotal]</p>
    <p>Descuento: [moneda][descuento]</p>
    <p class="total">TOTAL: [moneda][total]</p>
    <p>Pago: [metodo_pago]</p>
  </div>
  
  <div class="divider">================================</div>
  
  <div class="footer">
    <p>¡Gracias por su compra!</p>
    <p>WhatsApp: [whatsapp]</p>
    <p>[contacto]</p>
  </div>
</div>`,
    css: `:root { --paper-width: 80mm; }
.ticket { font-family: 'Courier New', monospace; font-size: 12px; width: var(--paper-width); padding: 5mm; margin: 0; }
.header { text-align: center; margin-bottom: 5px; }
.business-name { font-weight: bold; font-size: 14px; margin: 3px 0; }
.logo { margin-bottom: 5px; }
.logo img { max-width: 60px; margin: 0 auto; display: block; }
.divider { text-align: center; margin: 5px 0; font-weight: bold; overflow: hidden; white-space: nowrap; }
.info { margin: 5px 0; }
.info p { margin: 2px 0; }
.items { margin: 5px 0; }
.items .item { display: flex; justify-content: space-between; margin: 3px 0; flex-wrap: wrap; }
.totals { text-align: right; margin: 5px 0; }
.totals p { margin: 2px 0; }
.totals .total { font-weight: bold; font-size: 14px; margin-top: 3px; }
.footer { text-align: center; font-size: 10px; margin-top: 5px; }
.footer p { margin: 2px 0; }`,
  },
  service_order: {
    html: `<div class="ticket">
  <div class="header">
    <div class="logo">[logo]</div>
    <p class="business-name">[nombre_negocio]</p>
    <p>[direccion]</p>
    <p>Tel: [telefono]</p>
  </div>
  
  <div class="divider">================================</div>
  
  <div class="info">
    <p><strong>ORDEN DE SERVICIO</strong></p>
    <p>Folio: [folio]</p>
    <p>Fecha: [fecha]</p>
    <p>Estado: [estado]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="customer">
    <p><strong>CLIENTE</strong></p>
    <p>[cliente]</p>
    <p>Tel: [cliente_telefono]</p>
    <p>Dir: [ubicacion]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="service">
    <p><strong>SERVICIO</strong></p>
    <p>[descripcion]</p>
    <p>Problema: [problema]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="items">
    <p><strong>MATERIALES</strong></p>
    [productos_ticket]
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="totals">
    <p>Materiales: [moneda][subtotal_productos]</p>
    <p>Mano Obra: [moneda][mano_obra]</p>
    <p>Descuento: [moneda][descuento]</p>
    <p class="total">TOTAL: [moneda][total]</p>
  </div>
  
  <div class="divider">================================</div>
  
  <div class="footer">
    <p>Firma: _____________________</p>
    <p>¡Gracias por su confianza!</p>
    <p>WhatsApp: [whatsapp]</p>
  </div>
</div>`,
    css: `:root { --paper-width: 80mm; }
.ticket { font-family: 'Courier New', monospace; font-size: 12px; width: var(--paper-width); padding: 5mm; margin: 0; }
.header { text-align: center; margin-bottom: 5px; }
.business-name { font-weight: bold; font-size: 14px; margin: 3px 0; }
.logo { margin-bottom: 5px; }
.logo img { max-width: 60px; margin: 0 auto; display: block; }
.divider { text-align: center; margin: 5px 0; font-weight: bold; overflow: hidden; white-space: nowrap; }
.info { margin: 5px 0; }
.info p, .customer p, .service p { margin: 2px 0; }
.customer { margin: 5px 0; }
.service { margin: 5px 0; }
.items { margin: 5px 0; }
.items p { margin: 2px 0; }
.items .item { display: flex; justify-content: space-between; margin: 3px 0; flex-wrap: wrap; }
.totals { text-align: right; margin: 5px 0; }
.totals p { margin: 2px 0; }
.totals .total { font-weight: bold; font-size: 14px; margin-top: 3px; }
.footer { text-align: center; font-size: 10px; margin-top: 5px; }
.footer p { margin: 4px 0; }`,
  },
  warranty_ticket: {
    html: `<div class="ticket">
  <div class="header">
    <div class="logo">[logo]</div>
    <p class="business-name">[nombre_negocio]</p>
    <p>[direccion]</p>
    <p>Tel: [telefono]</p>
  </div>
  
  <div class="divider">================================</div>
  
  <div class="title">🛡️ CERTIFICADO DE GARANTÍA</div>
  
  <div class="warranty-code">[codigo_garantia]</div>
  
  <div class="status [estado_garantia]">[estado_garantia]</div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="customer">
    <p><strong>CLIENTE</strong></p>
    <p>[cliente]</p>
    <p>Tel: [cliente_telefono]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="info">
    <p><strong>Tipo:</strong> [tipo_garantia]</p>
    <p><strong>Producto:</strong> [producto]</p>
    <p><strong>Servicio:</strong> [servicio]</p>
    <p><strong>Ref. Venta:</strong> [ref_venta]</p>
    <p><strong>Ref. Servicio:</strong> [ref_servicio]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="dates">
    <p><strong>Duración:</strong> [dias_garantia] días</p>
    <p><strong>Inicio:</strong> [fecha_inicio]</p>
    <p><strong>Vencimiento:</strong> [fecha_fin]</p>
  </div>
  
  <div class="divider">--------------------------------</div>
  
  <div class="notes">
    <p>[notas]</p>
  </div>
  
  <div class="qr-container">[qr]</div>
  <p class="qr-text">Escanea para verificar</p>
  
  <div class="divider">================================</div>
  
  <div class="footer">
    <p>Emitido: [fecha]</p>
    <p>Conserve este ticket como comprobante</p>
    <p>[contacto]</p>
  </div>
</div>`,
    css: `:root { --paper-width: 80mm; }
.ticket { font-family: 'Courier New', monospace; font-size: 12px; width: var(--paper-width); padding: 5mm; margin: 0; }
.header { text-align: center; margin-bottom: 5px; }
.business-name { font-weight: bold; font-size: 14px; margin: 3px 0; }
.logo { margin-bottom: 5px; }
.logo img { max-width: 60px; margin: 0 auto; display: block; }
.divider { text-align: center; margin: 5px 0; font-weight: bold; overflow: hidden; white-space: nowrap; }
.title { text-align: center; font-weight: bold; font-size: 14px; margin: 8px 0; }
.warranty-code { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
.status { text-align: center; font-weight: bold; padding: 4px; margin: 5px 0; border: 1px solid #000; }
.status.VIGENTE { background-color: #d4edda; }
.status.VENCIDA { background-color: #f5f5f5; }
.status.ANULADA { background-color: #f8d7da; }
.customer p, .info p, .dates p { margin: 2px 0; }
.notes { margin: 5px 0; }
.notes p { margin: 2px 0; font-size: 11px; }
.qr-container { text-align: center; margin: 10px 0; }
.qr-container img { margin: 0 auto; max-width: 100%; }
.qr-text { text-align: center; font-size: 10px; margin-top: 2px; }
.footer { text-align: center; font-size: 10px; margin-top: 5px; }
.footer p { margin: 2px 0; }`,
  },
};

// ==================== HOOKS ====================

/** Fetch all global templates (for workshop selector) */
export function useGlobalTemplates(templateType?: string) {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["global-templates", templateType, currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<any[]>(
        `/templates.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      let templates = (data || []).map(normalizeTemplate).filter((t) => t.is_global);
      if (templateType) {
        templates = templates.filter((t) => t.template_type === templateType);
      }

      return templates.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!currentWorkshop?.id,
  });
}

/** Fetch all templates for SuperAdmin management */
export function useAllTemplates() {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["all-templates-admin", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<any[]>(
        `/templates.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      return (data || [])
        .map(normalizeTemplate)
        .sort((a, b) => a.template_type.localeCompare(b.template_type) || a.name.localeCompare(b.name));
    },
    enabled: !!currentWorkshop?.id,
  });
}

/** Fetch workshop's template selection for a given type */
export function useWorkshopTemplateSelection(templateType: string) {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["workshop-template-selection", templateType, currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return null;

      const data = await phpApiRequest<any[]>(
        `/template-selections.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      const selection = (data || []).find((s) => (s.template_type || s.type) === templateType);
      return selection ? normalizeSelection(selection) : null;
    },
    enabled: !!currentWorkshop?.id,
  });
}

/** Select a global template for a workshop */
export function useSelectTemplate() {
  const queryClient = useQueryClient();
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, templateType, customCss }: { templateId: string; templateType: string; customCss?: string }) => {
      if (!currentWorkshop?.id) throw new Error("Sin taller seleccionado");

      await phpApiRequest("/template-selections.php", {
        method: "POST",
        body: JSON.stringify({
          workshop_id: currentWorkshop.id,
          template_type: templateType,
          template_id: templateId,
          custom_css: customCss || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshop-template-selection"] });
      queryClient.invalidateQueries({ queryKey: ["template"] });
      toast({ title: "Plantilla seleccionada", description: "La plantilla ha sido aplicada a tu taller" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

/** Get the active template for a workshop (resolves selection → global template → default) */
export function useTemplate(templateType: string) {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["template", templateType, currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) {
        return defaultTemplates[templateType] || { html: "", css: "" };
      }

      const [templatesData, selectionsData] = await Promise.all([
        phpApiRequest<any[]>(`/templates.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, { method: "GET" }),
        phpApiRequest<any[]>(`/template-selections.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, { method: "GET" }),
      ]);

      const templates = (templatesData || []).map(normalizeTemplate);
      const selection = (selectionsData || []).map(normalizeSelection).find((s) => s.template_type === templateType);

      // 1. Seleccion activa por taller
      if (selection?.template_id) {
        const selectedTemplate = templates.find((t) => t.id === selection.template_id);
        if (selectedTemplate) {
          return {
            html: selectedTemplate.html_content || defaultTemplates[templateType]?.html || "",
            css: selection.custom_css || selectedTemplate.css_content || defaultTemplates[templateType]?.css || "",
          };
        }
      }

      // 2. Fallback legacy: plantilla del taller por tipo
      const legacyTemplate = templates
        .filter((t) => !t.is_global && t.workshop_id === currentWorkshop.id && t.template_type === templateType)
        .sort((a, b) => Number(b.is_default) - Number(a.is_default))[0];

      if (legacyTemplate) {
        return {
          html: legacyTemplate.html_content || defaultTemplates[templateType]?.html || "",
          css: legacyTemplate.css_content || defaultTemplates[templateType]?.css || "",
        };
      }
      
      return defaultTemplates[templateType] || { html: "", css: "" };
    },
  });
}

/** Legacy hook - kept for backward compatibility */
export function useTemplates(templateType: string) {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["templates", templateType, currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<any[]>(`/templates.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return (data || [])
        .map(normalizeTemplate)
        .filter((t) => t.workshop_id === currentWorkshop.id && t.template_type === templateType)
        .sort((a, b) => Number(b.is_default) - Number(a.is_default));
    },
    enabled: !!currentWorkshop?.id,
  });
}
