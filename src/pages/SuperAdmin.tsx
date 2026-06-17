import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useWorkshop } from "@/hooks/useWorkshop";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ToggleLeft, Users, Shield, HardDrive, Wrench, Key, Cpu, FileText, Database } from "lucide-react";
import { WorkshopsTab } from "@/components/superadmin/tabs/WorkshopsTab";
import { FeaturesTab } from "@/components/superadmin/tabs/FeaturesTab";
import { UsersTab } from "@/components/superadmin/tabs/UsersTab";
import { SuperAdminAccessTab } from "@/components/superadmin/tabs/SuperAdminAccessTab";
import { StorageTab } from "@/components/superadmin/tabs/StorageTab";
import { HerramientasModule, type SuperAdminHerramientasView } from "@/components/herramientas/HerramientasModule";

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading: workshopLoading } = useWorkshop();
  const [herramientasView, setHerramientasView] = useState<SuperAdminHerramientasView>("asignacion");

  if (workshopLoading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Superadministrador</h1>
          <p className="text-muted-foreground">Gestión global de talleres y usuarios</p>
        </div>
      </div>

      <Tabs defaultValue="workshops" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="workshops" className="gap-2">
            <Building2 className="h-4 w-4" />
            Talleres
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <ToggleLeft className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="su-access" className="gap-2">
            <Shield className="h-4 w-4" />
            Acceso SU
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Archivos
          </TabsTrigger>
          <TabsTrigger value="herramientas" className="gap-2">
            <Wrench className="h-4 w-4" />
            Herramientas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workshops">
          <WorkshopsTab isSuperAdmin={isSuperAdmin} />
        </TabsContent>
        <TabsContent value="features">
          <FeaturesTab isSuperAdmin={isSuperAdmin} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab isSuperAdmin={isSuperAdmin} />
        </TabsContent>
        <TabsContent value="su-access">
          <SuperAdminAccessTab isSuperAdmin={isSuperAdmin} />
        </TabsContent>
        <TabsContent value="storage">
          <StorageTab />
        </TabsContent>
        <TabsContent value="herramientas" className="space-y-4">
          {/* Sub-tabs propias para las herramientas: controla la vista del módulo */}
          <Tabs
            value={herramientasView}
            onValueChange={(v) => setHerramientasView(v as SuperAdminHerramientasView)}
          >
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="asignacion" className="gap-2">
                <Wrench className="h-4 w-4" /> Talleres
              </TabsTrigger>
              <TabsTrigger value="keycode" className="gap-2">
                <Key className="h-4 w-4" /> Keycode
              </TabsTrigger>
              <TabsTrigger value="immo" className="gap-2">
                <Cpu className="h-4 w-4" /> Immo
              </TabsTrigger>
              <TabsTrigger value="alarmas" className="gap-2">
                <FileText className="h-4 w-4" /> Alarmas
              </TabsTrigger>
              <TabsTrigger value="vehiculos" className="gap-2">
                <Database className="h-4 w-4" /> Vehículos
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <HerramientasModule superAdminView={herramientasView} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

