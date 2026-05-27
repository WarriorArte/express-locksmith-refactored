import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Profile as ProfileRow, UserRole as UserRoleRow } from "@/types/database";
import { logError, getUserFriendlyError } from "@/lib/errorHandler";

export type Profile = ProfileRow;
export type UserRole = UserRoleRow;

export interface UserWithRole extends Profile {
  role?: string;
  workshop_id?: string;
  is_active?: boolean;
}

type RawUserWithRole = ProfileRow & {
  role?: string | null;
  workshop_role?: string | null;
  workshop_id?: string | null;
  is_active?: boolean | number | null;
};

function normalizeUserWithRole(raw: RawUserWithRole): UserWithRole {
  return {
    ...raw,
    role: raw.role || raw.workshop_role || "employee",
    workshop_id: raw.workshop_id,
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : !!raw.is_active,
  };
}

// Fetches users for the current workshop only
export function useProfiles() {
  const { currentWorkshop } = useWorkshop();
  const workshopId = currentWorkshop?.id;

  return useQuery({
    queryKey: ["profiles", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];

      const data = await phpApiRequest<RawUserWithRole[]>(`/profiles.php?workshop_id=${encodeURIComponent(workshopId)}`, {
        method: "GET",
      });

      return (data || []).map(normalizeUserWithRole);
    },
    enabled: !!workshopId,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async ({ userId, role, workshopId }: { userId: string; role: "admin" | "employee"; workshopId?: string }) => {
      const targetWorkshopId = workshopId || currentWorkshop?.id;
      
      if (!targetWorkshopId) {
        throw new Error("No se pudo determinar el taller");
      }

      await phpApiRequest("/profiles.php?action=assign", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          role,
          workshop_id: targetWorkshopId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido cambiado correctamente",
      });
    },
    onError: (error) => {
      logError("Error updating user role", error);
      toast({
        title: "Error al actualizar rol",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteUserFromWorkshop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  return useMutation({
    mutationFn: async ({ profileId, workshopId }: { profileId: string; workshopId?: string }) => {
      const targetWorkshopId = workshopId || currentWorkshop?.id;
      
      if (!targetWorkshopId) {
        throw new Error("No se pudo determinar el taller");
      }

      await phpApiRequest(
        `/profiles.php?id=${encodeURIComponent(profileId)}&workshop_id=${encodeURIComponent(targetWorkshopId)}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({
        title: "Usuario removido",
        description: "El usuario ha sido removido del taller",
      });
    },
    onError: (error) => {
      logError("Error removing user from workshop", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    },
  });
}
