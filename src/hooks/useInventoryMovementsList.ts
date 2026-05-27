import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "./useWorkshop";

export type InventoryMovementType = "sale" | "service" | "adjustment" | "purchase" | "return" | "transfer";
export type InventoryLocation = "store" | "warehouse";

export interface InventoryMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: InventoryMovementType;
  reference_type: "sale" | "service" | "quote" | null;
  reference_id: string | null;
  from_location: InventoryLocation | null;
  to_location: InventoryLocation | null;
  notes: string | null;
  created_at: string;
}

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

      return await phpApiRequest<InventoryMovement[]>(`/inventory-movements.php?${search.toString()}`, {
        method: "GET",
      });
    },
    enabled: !!currentWorkshop?.id,
  });
}
