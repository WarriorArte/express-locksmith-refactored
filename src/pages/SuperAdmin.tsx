import { Navigate } from "react-router-dom";
import { useWorkshop } from "@/hooks/useWorkshop";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ToggleLeft, Users, Shield, HardDrive } from "lucide-react";
import { WorkshopsTab } from "@/components/superadmin/tabs/WorkshopsTab";
import { FeaturesTab } from "@/components/superadmin/tabs/FeaturesTab";
import { UsersTab } from "@/components/superadmin/tabs/UsersTab";
import { SuperAdminAccessTab } from "@/components/superadmin/tabs/SuperAdminAccessTab";
import { StorageTab } from "@/components/superadmin/tabs/StorageTab";

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading: workshopLoading } = useWorkshop();

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
      </Tabs>
    </div>
  );
}

