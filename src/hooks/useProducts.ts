import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Product as ProductRow, Category, ServiceProduct, Tag } from "@/types/database";

type ProductTag = {
  tag_id: string;
  tags: Tag;
};

export type Product = ProductRow & {
  category?: Category | null;
  product_tags?: ProductTag[];
};

type RawProductTag = {
  tag_id?: string;
  id?: string;
  tag_name?: string | null;
  name?: string | null;
  tag_color?: string | null;
  color?: string | null;
  tags?: Tag | null;
};

type RawProduct = ProductRow & {
  category?: Category | null;
  category_name?: string | null;
  category_color?: string | null;
  product_tags?: RawProductTag[] | null;
};

type ProductMutationData = {
  item_type?: "product" | "service";
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
  service_type?: ProductRow["service_type"];
  labor_cost?: number;
  discount?: number;
  service_products?: ServiceProduct[];
  is_active?: boolean | number;
  tag_ids?: string[];
};

function normalizeProduct(raw: RawProduct): Product {
  const normalizedCategory = raw.category
    ? raw.category
    : raw.category_id && (raw.category_name || raw.category_color)
      ? { id: raw.category_id, name: raw.category_name || "Sin categoría", color: raw.category_color }
      : null;

  const normalizedTags = Array.isArray(raw.product_tags)
    ? raw.product_tags.map((tag) => {
        const tagId = tag.tag_id || tag.id || "";

        return {
          tag_id: tagId,
          tags: {
            id: tagId,
            name: tag.tag_name || tag.name || tag.tags?.name || "",
            color: tag.tag_color || tag.color || tag.tags?.color,
          },
        };
      })
    : [];

  return { ...raw, category: normalizedCategory, product_tags: normalizedTags } as Product;
}

export function useProducts() {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["products", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];
      const data = await phpApiRequest<RawProduct[]>(`/products?workshop_id=${encodeURIComponent(currentWorkshop.id)}`);
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
      const data = await phpApiRequest<RawProduct>("/products", {
        method: "POST",
        body: JSON.stringify({ ...product, workshop_id: currentWorkshop.id }),
      });
      return normalizeProduct(data);
    },
    onMutate: async (newProduct) => {
      const key = ["products", currentWorkshop?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Product[]>(key);

      queryClient.setQueryData<Product[]>(key, (old) => {
        const temp: Product = {
          id: `temp-${Date.now()}`,
          workshop_id: currentWorkshop?.id,
          name: newProduct.name,
          item_type: newProduct.item_type ?? "product",
          category_id: newProduct.category_id ?? null,
          is_active: newProduct.is_active !== false,
          stock_store: newProduct.stock_store ?? 0,
          stock_warehouse: newProduct.stock_warehouse ?? 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: null,
          product_tags: [],
        } as Product;
        return [temp, ...(old ?? [])];
      });

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["products", currentWorkshop?.id], context.previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Producto creado", description: "El producto ha sido agregado exitosamente" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products", currentWorkshop?.id] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async ({ id, ...product }: ProductMutationData & { id: string }) => {
      const data = await phpApiRequest<RawProduct>(`/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(product),
      });
      return normalizeProduct(data);
    },
    onMutate: async ({ id, ...updates }) => {
      const key = ["products", currentWorkshop?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Product[]>(key);

      queryClient.setQueryData<Product[]>(key, (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["products", currentWorkshop?.id], context.previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Producto actualizado", description: "Los cambios han sido guardados" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products", currentWorkshop?.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onMutate: async (id) => {
      const key = ["products", currentWorkshop?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Product[]>(key);

      queryClient.setQueryData<Product[]>(key, (old) =>
        (old ?? []).filter((p) => p.id !== id)
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["products", currentWorkshop?.id], context.previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Producto eliminado", description: "El producto ha sido eliminado" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products", currentWorkshop?.id] });
    },
  });
}
