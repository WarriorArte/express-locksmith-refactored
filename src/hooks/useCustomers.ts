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
      const data = await phpApiRequest<Customer[]>(`/customers?workshop_id=${encodeURIComponent(currentWorkshop.id)}`);
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
      const data = await phpApiRequest<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify({ ...customer, workshop_id: currentWorkshop.id }),
      });
      return data;
    },
    onMutate: async (newCustomer) => {
      const key = ["customers", currentWorkshop?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Customer[]>(key);

      queryClient.setQueryData<Customer[]>(key, (old) => {
        const temp: Customer = {
          id: `temp-${Date.now()}`,
          workshop_id: currentWorkshop?.id,
          name: newCustomer.name,
          customer_type: newCustomer.customer_type ?? "person",
          phone: newCustomer.phone ?? null,
          email: newCustomer.email ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Customer;
        return [temp, ...(old ?? [])];
      });

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["customers", currentWorkshop?.id], context.previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Cliente creado", description: "El cliente ha sido agregado exitosamente" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", currentWorkshop?.id] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async ({ id, ...customer }: CustomerMutationData & { id: string }) => {
      const data = await phpApiRequest<Customer>(`/customers/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(customer),
      });
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      const key = ["customers", currentWorkshop?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Customer[]>(key);

      queryClient.setQueryData<Customer[]>(key, (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, ...updates } : c))
      );

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["customers", currentWorkshop?.id], context.previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Cliente actualizado", description: "Los cambios han sido guardados" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", currentWorkshop?.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onMutate: async (id) => {
      const key = ["customers", currentWorkshop?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Customer[]>(key);

      queryClient.setQueryData<Customer[]>(key, (old) =>
        (old ?? []).filter((c) => c.id !== id)
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["customers", currentWorkshop?.id], context.previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Cliente eliminado", description: "El cliente ha sido eliminado correctamente" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", currentWorkshop?.id] });
    },
  });
}
