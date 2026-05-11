import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";

/**
 * Hook legacy: la API key de storage ya no se utiliza.
 * Se mantiene temporalmente para compatibilidad y siempre retorna cadena vacía.
 */
export function useStorageApiKey() {
  const { data: apiKey = "", isLoading } = useQuery({
    queryKey: ["storage-api-key"],
    queryFn: async () => "",
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });

  return { apiKey, isLoading };
}

/**
 * Hook que obtiene el endpoint de almacenamiento
 * Obtiene appadmin_settings.storage_endpoint
 */
export function useStorageEndpoint() {
  const { data: endpoint = "", isLoading } = useQuery({
    queryKey: ["storage-endpoint-global"],
    queryFn: async () => {
      try {
        const adminSettings = await phpApiRequest<{ storage_endpoint?: string | null } | null>("/appadmin-settings.php", {
          method: "GET",
        });

        if (adminSettings?.storage_endpoint) {
          return adminSettings.storage_endpoint;
        }

        return "";
      } catch (error) {
        console.error("Error fetching storage endpoint:", error);
        return "";
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return { endpoint, isLoading };
}
