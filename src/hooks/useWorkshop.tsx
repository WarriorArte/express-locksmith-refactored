/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { phpApiRequest } from "@/lib/phpApi";
import { useAuth } from "./useAuth";

// ============================================================
// SISTEMA DE TALLERES - VERSIÓN 2.0 (RECONSTRUIDO)
// ============================================================
// Principios:
// 1. SuperAdmin puede ver todos los talleres
// 2. Usuarios normales solo ven talleres asignados
// 3. Estado se mantiene en errores temporales
// 4. Revalidación periódica cada 5 minutos
// ============================================================

export interface Workshop {
  id: string;
  name: string;
  code: string;
  is_active: boolean | number;
  settings?: Record<string, unknown> | string | null;
  workshop_role?: "admin" | "employee";
  created_at?: string;
  updated_at?: string;
}
export type GlobalRole = "superadmin" | "user";

interface CheckAuthResponse {
  authenticated: boolean;
  user: {
    id: string;
    global_role: GlobalRole;
    is_admin?: boolean;
  };
}

interface WorkshopContextType {
  currentWorkshop: Workshop | null;
  workshops: Workshop[];
  isSuperAdmin: boolean;
  globalRole: GlobalRole | null;
  isLoading: boolean;
  setCurrentWorkshop: (workshop: Workshop | null) => Promise<void>;
  refreshWorkshops: () => Promise<void>;
}

const WorkshopContext = createContext<WorkshopContextType | undefined>(undefined);

const REVALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [currentWorkshop, setCurrentWorkshopState] = useState<Workshop | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeWorkshop = useCallback((workshop: Workshop): Workshop => {
    return {
      ...workshop,
      is_active: workshop.is_active === true || workshop.is_active === 1,
    };
  }, []);

  // ============================================================
  // VERIFICAR ROL GLOBAL
  // ============================================================

  const checkGlobalRole = useCallback(async (): Promise<boolean> => {
    try {
      const data = await phpApiRequest<CheckAuthResponse>("/auth/me", {
        method: "GET",
      });

      const role = data.user?.global_role ?? "user";
      setGlobalRole(role);

      const superAdmin = role === "superadmin";
      setIsSuperAdmin(superAdmin);

      return superAdmin;
    } catch (err) {
      console.error("[Workshop] Excepción en checkGlobalRole:", err);
      setGlobalRole("user");
      setIsSuperAdmin(false);
      return false;
    }
  }, []);

  // ============================================================
  // CARGAR TALLERES
  // ============================================================

  const fetchWorkshops = useCallback(async (): Promise<Workshop[]> => {
    try {
      const data = await phpApiRequest<Workshop[]>("/workshops.php", {
        method: "GET",
      });

      return (data || []).map(normalizeWorkshop);
    } catch (err) {
      console.error("[Workshop] Excepción en fetchWorkshops:", err);
      return [];
    }
  }, [normalizeWorkshop]);

  // ============================================================
  // CAMBIAR TALLER ACTUAL
  // ============================================================

  const setCurrentWorkshop = useCallback(async (workshop: Workshop | null) => {
    setCurrentWorkshopState(workshop);

    if (user && workshop) {
      try {
        const refreshedWorkshop = await phpApiRequest<Workshop>(
          `/workshops.php?action=switch&id=${encodeURIComponent(workshop.id)}`,
          { method: "PUT" }
        );

        setCurrentWorkshopState(normalizeWorkshop(refreshedWorkshop));
        await refreshProfile();
      } catch (err) {
        console.error("[Workshop] Error actualizando current_workshop_id:", err);
      }
    }
  }, [user, normalizeWorkshop, refreshProfile]);

  // ============================================================
  // REFRESCAR TALLERES
  // ============================================================

  const refreshWorkshops = useCallback(async () => {
    if (!user) return;

    const newWorkshops = await fetchWorkshops();
    setWorkshops(newWorkshops);
  }, [user, fetchWorkshops]);

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!user) {
        setCurrentWorkshopState(null);
        setWorkshops([]);
        setIsSuperAdmin(false);
        setGlobalRole(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 1. Verificar rol global
        const superAdmin = await checkGlobalRole();

        // 2. Cargar talleres
        const availableWorkshops = await fetchWorkshops();

        if (!isMounted) return;

        setWorkshops(availableWorkshops);

        // 3. Determinar taller actual
        if (superAdmin) {
          // SuperAdmin: arrancar en contexto global. Puede seleccionar un taller manualmente.
          setCurrentWorkshopState(null);
        } else {
          // Usuario normal: debe tener taller
          if (profile?.current_workshop_id) {
            const saved = availableWorkshops.find((w) => w.id === profile.current_workshop_id);
            if (saved) {
              setCurrentWorkshopState(saved);
            } else if (availableWorkshops.length > 0) {
              // Taller guardado no accesible, usar primero disponible
              setCurrentWorkshopState(availableWorkshops[0]);
            }
          } else if (availableWorkshops.length > 0) {
            // Sin taller guardado, usar primero
            setCurrentWorkshopState(availableWorkshops[0]);
          }
        }
      } catch (err) {
        console.error("[Workshop] Error en inicialización:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.current_workshop_id, checkGlobalRole, fetchWorkshops]);

  // ============================================================
  // REVALIDACIÓN PERIÓDICA
  // ============================================================

  useEffect(() => {
    if (!user || !currentWorkshop || isSuperAdmin) return;

    const interval = setInterval(async () => {
      try {
        await phpApiRequest<Workshop>(`/workshops.php?id=${encodeURIComponent(currentWorkshop.id)}`, {
          method: "GET",
        });
      } catch (err) {
        if (user) {
          console.warn("[Workshop] Usuario perdió acceso al taller, refrescando...");
          await refreshWorkshops();
          await refreshProfile();
        }
        console.error("[Workshop] Error en revalidación:", err);
      }
    }, REVALIDATION_INTERVAL);

    return () => clearInterval(interval);
  }, [user, currentWorkshop, isSuperAdmin, refreshWorkshops, refreshProfile]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <WorkshopContext.Provider
      value={{
        currentWorkshop,
        workshops,
        isSuperAdmin,
        globalRole,
        isLoading,
        setCurrentWorkshop,
        refreshWorkshops,
      }}
    >
      {children}
    </WorkshopContext.Provider>
  );
}

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error("useWorkshop debe usarse dentro de un WorkshopProvider");
  }
  return context;
}
