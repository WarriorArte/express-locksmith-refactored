import { useWorkshop } from "@/hooks/useWorkshop";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";

/**
 * ¿El inicio ("/") es la herramienta de vehículos?
 *
 * Decisión del usuario (2026-11-06): la herramienta de vehículos es lo que más
 * se usa, así que es la pantalla de inicio, con accesos rápidos y el resumen
 * del día debajo. Solo aplica si el taller tiene alguna herramienta de vehículos
 * activa (Keycode, Alarmas o Immo) y no es SuperAdmin; si no, el inicio sigue
 * siendo el panel clásico.
 */
export function useVehicleHome(): boolean {
  const { isSuperAdmin } = useWorkshop();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const hasVehicleTool =
    isFeatureEnabled("tool_keycode") || isFeatureEnabled("tool_alarmas") || isFeatureEnabled("tool_immo");
  return hasVehicleTool && !isSuperAdmin;
}
