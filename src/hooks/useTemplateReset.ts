import { useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useToast } from "@/hooks/use-toast";
import { defaultTemplates, templateTypeLabels } from "@/hooks/useTemplates";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";
import type { Template } from "@/hooks/useTemplates";

export function useTemplateReset() {
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log("[Reset] Iniciando reset...");
      
      if (!currentWorkshop?.id) {
        throw new Error("No hay taller seleccionado");
      }

      // Paso 1: Eliminar todas las plantillas del taller
      console.log("[Reset] Eliminando plantillas del taller:", currentWorkshop.id);
      const existingTemplates = await phpApiRequest<Template[]>(
        `/templates.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      const workshopTemplates = (existingTemplates || []).filter(
        (tpl) => !tpl.is_global && tpl.workshop_id === currentWorkshop.id
      );

      for (const tpl of workshopTemplates) {
        await phpApiRequest(`/templates.php?id=${encodeURIComponent(tpl.id)}`, {
          method: "DELETE",
        });
      }

      const deletedCount = workshopTemplates.length;
      console.log(`[Reset] ${deletedCount} plantillas eliminadas`);

      // Paso 2: Recrear todas las plantillas predeterminadas
      const plantillasCrear = Object.entries(defaultTemplates).map(([tipo, contenido]) => ({
        workshop_id: currentWorkshop.id,
        template_type: tipo,
        name: templateTypeLabels[tipo],
        html_content: sanitizeHTML(contenido.html),
        css_content: sanitizeCSS(contenido.css),
        is_default: true,
      }));

      console.log("[Reset] Recreando plantillas:", plantillasCrear.map(p => p.template_type));

      let createdCount = 0;
      for (const plantilla of plantillasCrear) {
        await phpApiRequest("/templates.php", {
          method: "POST",
          body: JSON.stringify(plantilla),
        });
        createdCount += 1;
      }

      console.log("[Reset] Plantillas creadas:", plantillasCrear.map(p => p.template_type));
      return { deleted: deletedCount, created: createdCount };
    },
    onSuccess: (result) => {
      console.log("[Reset] Éxito:", result);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template"] });
      
      toast({
        title: "Plantillas restauradas",
        description: `Se eliminaron ${result.deleted} y se recrearon ${result.created} plantillas`,
      });

      // Refrescar página
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (error: any) => {
      console.error("[Reset] Error fatal:", error);
      toast({
        title: "Error al restaurar",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    },
  });
}
