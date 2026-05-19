import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useWorkshop } from "./useWorkshop";

export interface WorkshopFeature {
  feature_key: string;
  is_enabled: boolean | null;
  settings: unknown;
}

// Feature keys mapping to routes and FAB actions
const FEATURE_ROUTES: Record<string, string[]> = {
  inventory: ["/inventario"],
  quotes: ["/cotizaciones"],
  customers: ["/clientes"],
  services: ["/servicios"],
  sales: ["/ventas"],
};

const FEATURE_FAB_DIALOGS: Record<string, string> = {
  inventory: "product",
  quotes: "quote",
  customers: "customer",
  services: "service",
  sales: "sale",
};

export function useWorkshopFeatures() {
  const { currentWorkshop, isSuperAdmin } = useWorkshop();

  const { data: features = [], isLoading } = useQuery<WorkshopFeature[]>({
    queryKey: ["workshop-features", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const data = await phpApiRequest<WorkshopFeature[]>(
        `/workshop-features.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      return data || [];
    },
    enabled: !!currentWorkshop?.id,
  });

  const isFeatureEnabled = (featureKey: string): boolean => {
    // Superadmins no tienen acceso a features de talleres, solo al panel de administración
    if (isSuperAdmin && !currentWorkshop?.id) return false;
    
    // If no features defined, enable all by default
    if (features.length === 0) return true;
    
    const feature = features.find(f => f.feature_key === featureKey);
    // If feature not found in list, enable by default
    return feature?.is_enabled ?? true;
  };

  const isRouteEnabled = (path: string): boolean => {
    // Dashboard and settings always enabled
    if (path === "/" || path === "/configuracion" || path === "/superadmin") {
      return true;
    }

    for (const [featureKey, routes] of Object.entries(FEATURE_ROUTES)) {
      if (routes.includes(path)) {
        return isFeatureEnabled(featureKey);
      }
    }
    
    return true;
  };

  const isFabDialogEnabled = (dialog: string): boolean => {
    for (const [featureKey, fabDialog] of Object.entries(FEATURE_FAB_DIALOGS)) {
      if (fabDialog === dialog) {
        return isFeatureEnabled(featureKey);
      }
    }
    return true;
  };

  return {
    features,
    isLoading,
    isFeatureEnabled,
    isRouteEnabled,
    isFabDialogEnabled,
  };
}
