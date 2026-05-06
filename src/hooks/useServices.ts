import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type {
  Service as ServiceRow,
  Customer,
  ServiceProduct,
  Product,
  ServiceImage,
  ServiceStatus,
  ServiceType,
} from "@/types/database";

export type Service = ServiceRow & {
  customer?: Customer | null;
  service_products?: (ServiceProduct & {
    product?: Product | null;
  })[];
  service_images?: ServiceImage[];
};

type ServiceMutationData = {
  service_number?: string;
  customer_id?: string | null;
  quote_id?: string | null;
  service_type?: ServiceType;
  status?: ServiceStatus;
  description?: string;
  problem?: string | null;
  location?: string | null;
  address?: string | null;
  estimated_price?: number;
  final_price?: number | null;
  labor_cost?: number;
  discount?: number;
  internal_notes?: string | null;
  policies?: string | null;
  custom_fields?: unknown;
  assigned_to?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  has_warranty?: boolean | number;
  warranty_days?: number | null;
  service_products?: Array<{
    product_id?: string | null;
    product_name?: string;
    quantity?: number;
    unit_price?: number;
    subtotal?: number;
  }>;
};

function normalizeService(raw: any): Service {
  const normalizedCustomer = raw.customer ?? null;
  const normalizedProducts = Array.isArray(raw.service_products)
    ? raw.service_products.map((item: any) => ({
        ...item,
        product_name: item.product_name || item.p_name || item.product?.name || "",
        product: item.product ?? (item.product_id
          ? {
              id: item.product_id,
              name: item.product_name || item.p_name,
            }
          : null),
      }))
    : [];

  return {
    ...raw,
    customer: normalizedCustomer,
    service_products: normalizedProducts,
    service_images: Array.isArray(raw.service_images) ? raw.service_images : [],
  } as Service;
}

export function useServices() {
  const { currentWorkshop } = useWorkshop();
  
  return useQuery({
    queryKey: ["services", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<any[]>(`/services.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return (data || []).map(normalizeService);
    },
    enabled: !!currentWorkshop?.id,
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      if (!id) return null;

      const data = await phpApiRequest<any>(`/services.php?id=${encodeURIComponent(id)}`, {
        method: "GET",
      });

      return normalizeService(data);
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async (service: ServiceMutationData & { service_number: string; description: string }) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<any>("/services.php", {
        method: "POST",
        body: JSON.stringify({
          ...service,
          workshop_id: currentWorkshop.id,
        }),
      });

      return normalizeService(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast({
        title: "Servicio creado",
        description: "El servicio ha sido registrado exitosamente",
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

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...service }: ServiceMutationData & { id: string }) => {
      const data = await phpApiRequest<any>(`/services.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(service),
      });

      return normalizeService(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({
        title: "Servicio actualizado",
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

export function useDeleteService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/services.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado",
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

// Service Images
export function useCreateServiceImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: {
      service_id: string;
      image_url: string;
      description?: string | null;
    }) => {
      const data = await phpApiRequest<any>("/service-images.php", {
        method: "POST",
        body: JSON.stringify(image),
      });

      return data;
    },
    onSuccess: (data) => {
      // Invalidar lista general de servicios
      queryClient.invalidateQueries({ queryKey: ["services"] });
      // Invalidar el servicio específico si existe
      if (data?.service_id) {
        queryClient.invalidateQueries({ queryKey: ["services", data.service_id] });
      }
    },
  });
}

export function useDeleteServiceImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await phpApiRequest<null>(`/service-images.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidar lista general de servicios
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

// Generate service number - optional workshopId for backward compatibility
export async function generateServiceNumber(workshopId?: string): Promise<string> {
  if (!workshopId) {
    throw new Error("No hay taller seleccionado");
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefix = `S-${day}${month}${year}-`;

  const services = await phpApiRequest<Array<{ service_number?: string }>>(
    `/services.php?workshop_id=${encodeURIComponent(workshopId)}`,
    { method: "GET" }
  );

  const count = (services || []).filter((s) => (s.service_number || "").toUpperCase().startsWith(prefix.toUpperCase())).length;

  const nextNumber = (count || 0) + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}
