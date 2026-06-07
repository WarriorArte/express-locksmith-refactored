import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { m as motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Shield, 
  Activity,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { phpApiRequest } from "@/lib/phpApi";

export default function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch stats for SuperAdmin
  const { data: stats, isLoading } = useQuery({
    queryKey: ["superadmin-dashboard-stats"],
    queryFn: async () => {
      const workshops = await phpApiRequest<Array<{ id: string; name: string; is_active?: boolean; created_at?: string }>>("/workshops.php");
      const roleRows = await phpApiRequest<Array<{ user_id: string; workshop_role: "admin" | "employee"; global_role?: string }>>("/profiles.php?action=system-roles");

      const uniqueUsers = new Set(roleRows.map((row) => row.user_id));

      const activeWorkshops = workshops?.filter(w => w.is_active) || [];
      const inactiveWorkshops = workshops?.filter(w => !w.is_active) || [];
      const superadminCount = new Set(roleRows.filter((r) => r.global_role === "superadmin").map((r) => r.user_id)).size;
      const adminCount = roleRows?.filter(r => r.workshop_role === 'admin').length || 0;
      const employeeCount = roleRows?.filter(r => r.workshop_role === 'employee').length || 0;

      // Get recent workshops
      const recentWorkshops = workshops
        ?.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5) || [];

      return {
        totalWorkshops: workshops?.length || 0,
        activeWorkshops: activeWorkshops.length,
        inactiveWorkshops: inactiveWorkshops.length,
        totalUsers: uniqueUsers.size,
        superadminCount,
        adminCount,
        employeeCount,
        recentWorkshops,
        workshops: workshops || [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-3 px-5 lg:px-6 pb-24 md:pb-6 space-y-6 no-scrollbar">
      {/* Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" />
            Panel SuperAdmin
          </span>
        }
        subtitle={`Bienvenido${profile?.full_name ? `, ${profile.full_name}` : ""} · Administración Global`}
        action={
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-sidebar-foreground/80 bg-background/10 rounded-full px-2.5 py-1.5">
            <Activity className="w-3.5 h-3.5 text-success" />
            <span>Global</span>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-1 w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            Resumen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Talleres" value={stats?.totalWorkshops || 0} subtitle={`${stats?.activeWorkshops || 0} activos`} icon={Building2} variant="primary" delay={0.1} />
            <StatCard title="Total Usuarios" value={stats?.totalUsers || 0} subtitle="Registrados en el sistema" icon={Users} variant="info" delay={0.15} />
            <StatCard title="SuperAdmins" value={stats?.superadminCount || 0} subtitle="Administradores globales" icon={Shield} variant="secondary" delay={0.2} />
            <StatCard title="Administradores" value={stats?.adminCount || 0} subtitle={`+ ${stats?.employeeCount || 0} empleados`} icon={TrendingUp} variant="success" delay={0.25} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

