import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Customer as CustomerRow } from "@/types/database";

export type Customer = CustomerRow;

type CustomerMutationData = {
  name?: string;
  customer_type?: "person" | "company";
  phone?: string | null;
  phone_secondary?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_vip?: boolean | number;
  is_frequent?: boolean | number;
  is_normal?: boolean | number;
  has_debt?: boolean | number;
  no_work_again?: boolean | number;
  no_work_reason?: string | null;
};

export function useCustomers() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["customers", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<Customer[]>(`/customers.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return data;
    },
    enabled: !!currentWorkshop?.id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (customer: CustomerMutationData & { name: string }) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<Customer>("/customers.php", {
        method: "POST",
        body: JSON.stringify({
          ...customer,
          workshop_id: currentWorkshop.id,
        }),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido agregado exitosamente",
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

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...customer }: CustomerMutationData & { id: string }) => {
      const data = await phpApiRequest<Customer>(`/customers.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(customer),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Cliente actualizado",
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

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/customers.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
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
