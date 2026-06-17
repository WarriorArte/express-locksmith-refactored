import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Sale as SaleRow, Customer, SaleItem as SaleItemRow, Product } from "@/types/database";

export type Sale = SaleRow & {
  customer?: Customer | null;
  sale_items?: (SaleItemRow & {
    product?: Product | null;
  })[];
  payment_method?: PaymentMethod;
};

export type SaleItem = SaleItemRow;
export type PaymentMethod = "cash" | "card" | "transfer" | "credit";

type RawSaleItem = SaleItemRow & {
  p_name?: string | null;
  product?: Product | null;
};

type RawSale = SaleRow & {
  customer?: Customer | null;
  sale_items?: RawSaleItem[] | null;
  payment_method?: PaymentMethod;
};

type SaleMutationData = {
  sale_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal?: number;
  discount?: number;
  total?: number;
  payment_method?: PaymentMethod;
  notes?: string | null;
  has_warranty?: boolean | number;
  items?: Array<{
    product_id?: string | null;
    product_name?: string;
    quantity?: number;
    unit_price?: number;
    subtotal?: number;
  }>;
};

function normalizeSale(raw: RawSale): Sale {
  const normalizedCustomer = raw.customer ?? null;
  const normalizedItems = Array.isArray(raw.sale_items)
    ? raw.sale_items.map((item) => {
        const productName = item.product_name || item.p_name || item.product?.name || "";

        return {
          ...item,
          product_name: productName,
          product: item.product ?? (item.product_id
            ? {
                id: item.product_id,
                name: productName,
              }
            : null),
        };
      })
    : [];

  return {
    ...raw,
    customer: normalizedCustomer,
    sale_items: normalizedItems,
  } as Sale;
}

export function useSales() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["sales", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<RawSale[]>(`/sales.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return (data || []).map(normalizeSale);
    },
    enabled: !!currentWorkshop?.id,
  });
}


export function useCreateSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (sale: SaleMutationData & { sale_number: string }) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<RawSale>("/sales.php", {
        method: "POST",
        body: JSON.stringify({
          ...sale,
          workshop_id: currentWorkshop.id,
        }),
      });

      return normalizeSale(data);
    },
    onSuccess: () => {
      const wid = currentWorkshop?.id;
      queryClient.invalidateQueries({ queryKey: ["sales", wid] });
      queryClient.invalidateQueries({ queryKey: ["products", wid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", wid] });
      queryClient.invalidateQueries({ queryKey: ["customers", wid] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast({
        title: "Venta registrada",
        description: "La venta ha sido registrada exitosamente",
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


export function useDeleteSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/sales.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      const wid = currentWorkshop?.id;
      queryClient.invalidateQueries({ queryKey: ["sales", wid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", wid] });
      toast({
        title: "Venta eliminada",
        description: "La venta ha sido eliminada",
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

// Generate sale number - optional workshopId for backward compatibility
export async function generateSaleNumber(workshopId?: string): Promise<string> {
  if (!workshopId) {
    throw new Error("No hay taller seleccionado");
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefix = `V-${day}${month}${year}-`;

  const sales = await phpApiRequest<Array<{ sale_number?: string }>>(
    `/sales.php?workshop_id=${encodeURIComponent(workshopId)}`,
    { method: "GET" }
  );

  const count = (sales || []).filter((s) => (s.sale_number || "").toUpperCase().startsWith(prefix.toUpperCase())).length;

  const nextNumber = (count || 0) + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

// Payment method labels
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};
