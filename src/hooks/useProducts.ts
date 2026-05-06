import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Product as ProductRow, Category, Tag } from "@/types/database";

export type Product = ProductRow & {
  category?: Category | null;
  product_tags?: { tag_id: string; tags: Tag }[];
};

type ProductMutationData = {
  category_id?: string | null;
  name?: string;
  description?: string | null;
  instructions?: string | null;
  notes?: string | null;
  image_url?: string | null;
  stock_store?: number;
  stock_warehouse?: number;
  min_stock?: number;
  purchase_price_imported?: number | null;
  purchase_price_local?: number;
  sale_price_min?: number;
  sale_price_max?: number;
  is_active?: boolean | number;
  tag_ids?: string[];
};

function normalizeProduct(raw: any): Product {
  const normalizedCategory = raw.category
    ? raw.category
    : raw.category_id && (raw.category_name || raw.category_color)
      ? {
          id: raw.category_id,
          name: raw.category_name,
          color: raw.category_color,
        }
      : null;

  const normalizedTags = Array.isArray(raw.product_tags)
    ? raw.product_tags.map((t: any) => ({
        tag_id: t.tag_id,
        tags: {
          id: t.tag_id || t.id,
          name: t.tag_name || t.name,
          color: t.tag_color || t.color,
        },
      }))
    : [];

  return {
    ...raw,
    category: normalizedCategory,
    product_tags: normalizedTags,
  } as Product;
}

export function useProducts() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["products", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<any[]>(`/products.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return (data || []).map(normalizeProduct);
    },
    enabled: !!currentWorkshop?.id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (product: ProductMutationData & { name: string }) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<any>("/products.php", {
        method: "POST",
        body: JSON.stringify({
          ...product,
          workshop_id: currentWorkshop.id,
        }),
      });

      return normalizeProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Producto creado",
        description: "El producto ha sido agregado exitosamente",
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

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...product }: ProductMutationData & { id: string }) => {
      const data = await phpApiRequest<any>(`/products.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(product),
      });

      return normalizeProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Producto actualizado",
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

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/products.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado",
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
