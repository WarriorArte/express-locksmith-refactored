import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";

export interface Warranty {
  id: string;
  warranty_code: string;
  sale_id: string | null;
  service_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  product_name: string | null;
  service_description: string | null;
  warranty_type: "sale" | "service";
  warranty_days: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  is_voided: boolean;
  voided_at: string | null;
  voided_reason: string | null;
  workshop_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  sale?: {
    id: string;
    sale_number: string;
  } | null;
  service?: {
    id: string;
    service_number: string;
  } | null;
}

export interface WarrantyCategorySetting {
  id: string;
  category_id: string;
  warranty_days: number;
  workshop_id: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface WarrantySettings {
  id: string;
  workshop_id: string;
  default_warranty_days: number;
  default_service_warranty_days: number;
  terms_conditions: string | null;
  coverage_policy_products: string | null;
  coverage_policy_services: string | null;
  created_at: string;
  updated_at: string;
}

type WarrantySettingsResponse = {
  warranty_settings: WarrantySettings | null;
  warranty_category_settings: any[];
};

function normalizeWarranty(raw: any): Warranty {
  return {
    ...raw,
    is_voided: !!raw.is_voided,
    customer: raw.customer
      ? {
          id: raw.customer.id || raw.customer_id || "",
          name: raw.customer.name || raw.customer_name || "",
          phone: raw.customer.phone ?? null,
          email: raw.customer.email ?? null,
        }
      : null,
    sale: raw.sale
      ? {
          id: raw.sale.id || raw.sale_id || "",
          sale_number: raw.sale.sale_number || "",
        }
      : null,
    service: raw.service
      ? {
          id: raw.service.id || raw.service_id || "",
          service_number: raw.service.service_number || "",
        }
      : null,
  } as Warranty;
}

function normalizeCategorySetting(raw: any): WarrantyCategorySetting {
  return {
    ...raw,
    category: raw.category
      ? raw.category
      : {
          id: raw.category_id,
          name: raw.category_name || "",
          color: raw.category_color || "#6b7280",
        },
  } as WarrantyCategorySetting;
}

// Fetch global warranty settings (one per workshop)
export function useWarrantySettings() {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["warranty_settings", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return null;

      const data = await phpApiRequest<WarrantySettingsResponse>(
        `/warranty-settings.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      return data?.warranty_settings || null;
    },
    enabled: !!currentWorkshop?.id,
  });
}

// Upsert global warranty settings
export function useUpsertWarrantySettings() {
  const queryClient = useQueryClient();
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      values: Partial<Omit<WarrantySettings, "id" | "workshop_id" | "created_at" | "updated_at">>,
    ) => {
      if (!currentWorkshop?.id) throw new Error("Sin taller");

      const data = await phpApiRequest<any>("/warranty-settings.php", {
        method: "PUT",
        body: JSON.stringify({
          workshop_id: currentWorkshop.id,
          ...values,
        }),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty_settings"] });
      toast({ title: "Configuración guardada", description: "Se actualizó la configuración de garantías." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// Fetch all warranties
export function useWarranties() {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["warranties", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<any[]>(`/warranties.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      return (data || []).map(normalizeWarranty);
    },
    enabled: !!currentWorkshop?.id,
  });
}

// Fetch single warranty by code
export function useWarrantyByCode(code: string | undefined) {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["warranty", currentWorkshop?.id, code],
    queryFn: async () => {
      if (!code || !currentWorkshop?.id) return null;

      const data = await phpApiRequest<any[]>(`/warranties.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, {
        method: "GET",
      });

      const found = (data || []).find(
        (item) => (item.warranty_code || "").toUpperCase() === code.toUpperCase()
      );

      return found ? normalizeWarranty(found) : null;
    },
    enabled: !!code && !!currentWorkshop?.id,
  });
}

// Fetch warranty category settings
export function useWarrantyCategorySettings() {
  const { currentWorkshop } = useWorkshop();

  return useQuery({
    queryKey: ["warranty_category_settings", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<WarrantySettingsResponse>(
        `/warranty-settings.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      return (data?.warranty_category_settings || []).map(normalizeCategorySetting);
    },
    enabled: !!currentWorkshop?.id,
  });
}

// Create warranty
export function useCreateWarranty() {
  const queryClient = useQueryClient();
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (warranty: Omit<Warranty, "id" | "created_at" | "updated_at" | "customer" | "sale" | "service">) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<any>("/warranties.php", {
        method: "POST",
        body: JSON.stringify({
          ...warranty,
          workshop_id: currentWorkshop.id,
        }),
      });

      return normalizeWarranty(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast({
        title: "Garantía creada",
        description: "La garantía se ha registrado correctamente.",
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

// Void warranty
export function useVoidWarranty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const data = await phpApiRequest<any>(`/warranties.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({
          void: true,
          voided_reason: reason,
        }),
      });

      return normalizeWarranty(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast({
        title: "Garantía anulada",
        description: "La garantía ha sido anulada.",
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

// Create/update warranty category setting
export function useUpsertWarrantyCategorySetting() {
  const queryClient = useQueryClient();
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ category_id, warranty_days }: { category_id: string; warranty_days: number }) => {
      if (!currentWorkshop?.id) throw new Error("No hay taller seleccionado");

      const data = await phpApiRequest<any>("/warranty-settings.php?action=category", {
        method: "POST",
        body: JSON.stringify({
          category_id,
          warranty_days,
          workshop_id: currentWorkshop.id,
        }),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty_category_settings"] });
      toast({
        title: "Configuración guardada",
        description: "La duración de garantía se ha actualizado.",
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

// Generate unique warranty code
export async function generateWarrantyCode(workshopId?: string): Promise<string> {
  if (!workshopId) {
    throw new Error("No hay taller seleccionado");
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefix = `G-${day}${month}${year}-`;

  const warranties = await phpApiRequest<Array<{ warranty_code?: string }>>(
    `/warranties.php?workshop_id=${encodeURIComponent(workshopId)}`,
    { method: "GET" }
  );

  const count = (warranties || []).filter((w) => (w.warranty_code || "").toUpperCase().startsWith(prefix.toUpperCase())).length;

  const nextNumber = (count || 0) + 1;
  return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
}

// Calculate warranty end date
export function calculateWarrantyEndDate(startDate: Date, days: number): Date {
  return addDays(startDate, days);
}
