import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { BusinessSettingsRow } from "@/types/database";

export type BusinessSettings = BusinessSettingsRow & {
  currency_symbol?: string;
};

type BusinessSettingsMutationData = Partial<Omit<BusinessSettings, "id" | "workshop_id" | "created_at" | "updated_at">> & {
  id?: string;
};

function normalizeBusinessSettings(raw: BusinessSettingsRow): BusinessSettings {
  return {
    ...raw,
    auto_cut: typeof raw.auto_cut === "boolean" ? raw.auto_cut : !!raw.auto_cut,
    ticket_show_logo: raw.ticket_show_logo !== 0 && raw.ticket_show_logo !== false,
  };
}

export function useBusinessSettings() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["business-settings", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return null;

      const data = await phpApiRequest<BusinessSettingsRow>(`/business-settings.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return data ? normalizeBusinessSettings(data) : null;
    },
    enabled: !!currentWorkshop?.id,
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (settings: BusinessSettingsMutationData) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const { id: _id, ...payload } = settings;

      const data = await phpApiRequest<BusinessSettingsRow>("/business-settings.php", {
        method: "PUT",
        body: JSON.stringify({
          workshop_id: currentWorkshop.id,
          ...payload,
        }),
      });

      return normalizeBusinessSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido aplicados",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
