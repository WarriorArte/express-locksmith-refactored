import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Quote as QuoteRow, Customer, QuoteItem as QuoteItemRow, Product } from "@/types/database";

export type Quote = QuoteRow & {
  customer?: Customer | null;
  quote_items?: (QuoteItemRow & {
    product?: Product | null;
  })[];
};

export type QuoteItem = QuoteItemRow;

type RawQuoteItem = QuoteItemRow & {
  product?: Product | null;
  product_name?: string | null;
  sale_price_min?: number | null;
  sale_price_max?: number | null;
};

type RawQuote = QuoteRow & {
  customer?: Customer | null;
  quote_items?: RawQuoteItem[] | null;
};

type QuoteMutationData = {
  quote_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  description?: string | null;
  location?: string | null;
  status?: "pending" | "accepted" | "rejected" | "converted" | "expired";
  subtotal?: number;
  discount?: number;
  total?: number;
  validity_days?: number;
  valid_until?: string | null;
  policies?: string | null;
  notes?: string | null;
  items?: Array<{
    product_id?: string | null;
    description?: string;
    quantity?: number;
    unit_price?: number;
    subtotal?: number;
    sort_order?: number;
  }>;
};

function normalizeQuote(raw: RawQuote): Quote {
  const normalizedCustomer = raw.customer ?? null;
  const normalizedItems = Array.isArray(raw.quote_items)
    ? raw.quote_items.map((item) => ({
        ...item,
        product: item.product ?? (item.product_id
          ? {
              id: item.product_id,
              name: item.product_name || item.description || "",
              sale_price_min: item.sale_price_min,
              sale_price_max: item.sale_price_max,
            }
          : null),
      }))
    : [];

  return {
    ...raw,
    customer: normalizedCustomer,
    quote_items: normalizedItems,
  } as Quote;
}

export function useQuotes() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["quotes", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<RawQuote[]>(`/quotes.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return (data || []).map(normalizeQuote);
    },
    enabled: !!currentWorkshop?.id,
  });
}


export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (quote: QuoteMutationData & { quote_number: string }) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<RawQuote>("/quotes.php", {
        method: "POST",
        body: JSON.stringify({
          ...quote,
          workshop_id: currentWorkshop.id,
        }),
      });

      return normalizeQuote(data);
    },
    onSuccess: () => {
      const wid = currentWorkshop?.id;
      queryClient.invalidateQueries({ queryKey: ["quotes", wid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", wid] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast({
        title: "Cotización creada",
        description: "La cotización ha sido creada exitosamente",
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

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async ({ id, ...quote }: QuoteMutationData & { id: string }) => {
      const data = await phpApiRequest<RawQuote>(`/quotes.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(quote),
      });

      return normalizeQuote(data);
    },
    onSuccess: () => {
      const wid = currentWorkshop?.id;
      queryClient.invalidateQueries({ queryKey: ["quotes", wid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", wid] });
      toast({
        title: "Cotización actualizada",
        description: "Los cambios han sido guardados",
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

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/quotes.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      const wid = currentWorkshop?.id;
      queryClient.invalidateQueries({ queryKey: ["quotes", wid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", wid] });
      toast({
        title: "Cotización eliminada",
        description: "La cotización ha sido eliminada",
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

export function useDuplicateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (quote: Quote) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");
      
      // Generate new quote number
      const newNumber = await generateQuoteNumber(currentWorkshop.id);

      const data = await phpApiRequest<RawQuote>("/quotes.php", {
        method: "POST",
        body: JSON.stringify({
          workshop_id: currentWorkshop.id,
          quote_number: newNumber,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          customer_phone: quote.customer_phone,
          customer_email: quote.customer_email,
          customer_address: quote.customer_address,
          description: quote.description ? `Copia - ${quote.description}` : "Copia de cotización",
          location: quote.location,
          policies: quote.policies,
          notes: quote.notes,
          status: "pending",
          subtotal: quote.subtotal,
          discount: quote.discount,
          total: quote.total,
          validity_days: quote.validity_days,
          valid_until: null,
          items: (quote.quote_items || []).map((item, index) => ({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            sort_order: item.sort_order ?? index,
          })),
        }),
      });

      return normalizeQuote(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentWorkshop?.id] });
      toast({
        title: "Cotización duplicada",
        description: "Se ha creado una copia de la cotización",
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

// Generate quote number - now exported with optional workshopId for backward compatibility
export async function generateQuoteNumber(workshopId?: string): Promise<string> {
  if (!workshopId) {
    throw new Error("No hay taller seleccionado");
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefix = `C-${day}${month}${year}-`;

  const quotes = await phpApiRequest<Array<{ quote_number?: string }>>(
    `/quotes.php?workshop_id=${encodeURIComponent(workshopId)}`,
    { method: "GET" }
  );

  const count = (quotes || []).filter((q) => (q.quote_number || "").toUpperCase().startsWith(prefix.toUpperCase())).length;

  const nextNumber = (count || 0) + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}
