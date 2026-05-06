import { useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "./useWorkshop";

type MovementType = "sale" | "service" | "adjustment" | "purchase" | "return" | "transfer";

interface CreateMovementParams {
  product_id: string;
  quantity: number;
  movement_type: MovementType;
  reference_type?: "sale" | "service" | "quote" | null;
  reference_id?: string | null;
  from_location?: "store" | "warehouse" | null;
  to_location?: "store" | "warehouse" | null;
  notes?: string | null;
  workshop_id?: string;
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (params: CreateMovementParams) => {
      const workshopId = params.workshop_id || currentWorkshop?.id;
      if (!workshopId) {
        throw new Error("No hay taller seleccionado");
      }

      await phpApiRequest("/inventory-movements.php", {
        method: "POST",
        body: JSON.stringify({
          workshop_id: workshopId,
          product_id: params.product_id,
          quantity: params.quantity,
          movement_type: params.movement_type,
          reference_type: params.reference_type || null,
          reference_id: params.reference_id || null,
          from_location: params.from_location || null,
          to_location: params.to_location || null,
          notes: params.notes || null,
        }),
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Error al actualizar inventario: " + error.message,
        variant: "destructive",
      });
    },
  });
}

// Batch update inventory for multiple products
export function useBatchInventoryUpdate() {
  const createMovement = useCreateInventoryMovement();
  
  return {
    updateForSale: async (
      items: { product_id: string | null; quantity: number }[],
      saleId: string
    ) => {
      for (const item of items) {
        if (item.product_id) {
          await createMovement.mutateAsync({
            product_id: item.product_id,
            quantity: item.quantity,
            movement_type: "sale",
            reference_type: "sale",
            reference_id: saleId,
          });
        }
      }
    },
    updateForService: async (
      items: { product_id: string | null; quantity: number }[],
      serviceId: string
    ) => {
      for (const item of items) {
        if (item.product_id) {
          await createMovement.mutateAsync({
            product_id: item.product_id,
            quantity: item.quantity,
            movement_type: "service",
            reference_type: "service",
            reference_id: serviceId,
          });
        }
      }
    },
  };
}
