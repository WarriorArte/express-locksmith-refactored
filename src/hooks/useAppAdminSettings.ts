import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";

export interface AppAdminSettings {
  id: string;
  storage_endpoint: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para obtener la configuración global de la aplicación
 * Solo accesible para SuperAdmins (RLS enforced)
 */
export function useAppAdminSettings() {
  const { isSuperAdmin } = useWorkshop();

  return useQuery({
    queryKey: ["appadmin-settings"],
    queryFn: async (): Promise<AppAdminSettings | null> => {
      const data = await phpApiRequest<AppAdminSettings | null>("/appadmin-settings.php", {
        method: "GET",
      });

      return data;
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}


/**
 * Hook para actualizar la configuración global
 */
export function useUpdateAppAdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: {
      storage_endpoint?: string | null;
    }) => {
      const updateData: Partial<Pick<AppAdminSettings, "storage_endpoint">> = {};

      if (settings.storage_endpoint !== undefined) {
        updateData.storage_endpoint = settings.storage_endpoint;
      }

      return phpApiRequest<AppAdminSettings>("/appadmin-settings.php", {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appadmin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["storage-endpoint"] });
      queryClient.invalidateQueries({ queryKey: ["storage-endpoint-global"] });
      toast({
        title: "Configuración guardada",
        description: "Los cambios se aplicarán inmediatamente",
      });
    },
    onError: (error) => {
      console.error("Error updating app admin settings:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
