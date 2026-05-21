import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Category, Tag } from "@/types/database";

export type { Category, Tag } from "@/types/database";

type CreateTagInput = {
  name: string;
  color?: string | null;
};

type CreateCategoryInput = {
  name: string;
  color?: string | null;
};

export function useCategories() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["categories", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<Category[]>(`/categories.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return data;
    },
    enabled: !!currentWorkshop?.id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (category: CreateCategoryInput) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<Category>("/categories.php", {
        method: "POST",
        body: JSON.stringify({
          ...category,
          workshop_id: currentWorkshop.id,
        }),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Categoría creada",
        description: "La categoría ha sido agregada",
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

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const data = await phpApiRequest<Category>(`/categories.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ name, color }),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido modificada",
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

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/categories.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada",
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

