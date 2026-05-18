import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import type { WorkshopRow, UserRoleRow } from "./types";

export function useSuperAdminWorkshops(enabled: boolean) {
  return useQuery({
    queryKey: ["superadmin-workshops"],
    queryFn: async () => {
      const data = await phpApiRequest<WorkshopRow[]>("/workshops.php");
      return (data || []).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    enabled,
  });
}

export function useSuperAdminUserRoles(enabled: boolean, workshopsCount: number) {
  return useQuery({
    queryKey: ["superadmin-user-roles", workshopsCount],
    queryFn: async () => {
      const rows = await phpApiRequest<Array<{
        id: string;
        user_id: string;
        workshop_id: string | null;
        workshop_role: "admin" | "employee" | null;
        full_name: string | null;
        email: string | null;
        global_role?: string | null;
      }>>("/profiles.php?action=system-roles");

      return (rows || []).map<UserRoleRow>((row) => ({
        id: `${row.user_id}:${row.workshop_id || "global"}`,
        user_id: row.user_id,
        workshop_id: row.workshop_id,
        role: row.workshop_role,
        globalRole: row.global_role || null,
        profile: {
          id: row.id,
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
        },
      }));
    },
    enabled,
  });
}
