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
  AlertTriangle,
  CheckCircle,
  FileText,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateManager } from "@/components/superadmin/TemplateManager";
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
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-2 px-5 lg:px-6 pb-24 md:pb-6 space-y-6 no-scrollbar">
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
        <TabsList className="grid grid-cols-2 w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Plantillas
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Talleres Recientes</CardTitle>
                <CardDescription>Últimos talleres creados en la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentWorkshops && stats.recentWorkshops.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentWorkshops.map((workshop) => (
                      <div key={workshop.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{workshop.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(workshop.created_at || '').toLocaleDateString('es-ES')}</p>
                          </div>
                        </div>
                        <Badge variant={workshop.is_active ? "default" : "secondary"}>
                          {workshop.is_active ? (<><CheckCircle className="w-3 h-3 mr-1" /> Activo</>) : (<><AlertTriangle className="w-3 h-3 mr-1" /> Inactivo</>)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No hay talleres registrados</p>
                )}
                <div className="mt-4">
                  <Link to="/superadmin"><Button variant="outline" className="w-full">Ver todos los talleres</Button></Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Acciones Rápidas</CardTitle>
                <CardDescription>Accesos directos a funciones de administración</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/superadmin" className="block">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                    <div><p className="font-medium">Gestionar Talleres</p><p className="text-xs text-muted-foreground">Crear, editar y configurar talleres</p></div>
                  </div>
                </Link>
                <Link to="/superadmin" className="block">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Users className="w-5 h-5 text-info" /></div>
                    <div><p className="font-medium">Gestionar Usuarios</p><p className="text-xs text-muted-foreground">Asignar roles y permisos</p></div>
                  </div>
                </Link>
                <Link to="/superadmin" className="block">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Shield className="w-5 h-5 text-success" /></div>
                    <div><p className="font-medium">Configuración de Features</p><p className="text-xs text-muted-foreground">Habilitar/deshabilitar módulos por taller</p></div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-success/10">
                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-medium text-foreground dark:text-success">Sistema Operativo</p>
                  <p className="text-xs text-muted-foreground">Todos los servicios activos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">{stats?.activeWorkshops || 0}</p>
                  <p className="text-xs text-muted-foreground">Talleres Activos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Users className="w-8 h-8 text-info mx-auto mb-2" />
                  <p className="font-medium">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Usuarios Totales</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Shield className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <p className="font-medium">{stats?.superadminCount || 0}</p>
                  <p className="text-xs text-muted-foreground">SuperAdmins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <TemplateManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
