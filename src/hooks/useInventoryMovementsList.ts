import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "./useWorkshop";

export function useInventoryMovements(productId?: string) {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["inventory-movements", productId, currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const search = new URLSearchParams({
        workshop_id: currentWorkshop.id,
      });

      if (productId) {
        search.set("product_id", productId);
      }

      return await phpApiRequest<any[]>(`/inventory-movements.php?${search.toString()}`, {
        method: "GET",
      });
    },
    enabled: !!currentWorkshop?.id,
  });
}
