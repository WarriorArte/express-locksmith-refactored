import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useWorkshop } from "@/hooks/useWorkshop";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Key, Cpu, FileText, Database } from "lucide-react";
import {
  HerramientasModule,
  type SuperAdminHerramientasView,
} from "@/components/herramientas/HerramientasModule";

export default function SuperAdminHerramientas() {
  const { isSuperAdmin, isLoading } = useWorkshop();
  const [view, setView] = useState<SuperAdminHerramientasView>("asignacion");

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Herramientas</h1>
        <p className="text-muted-foreground">
          Gestión global de herramientas y asignaciones por taller
        </p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as SuperAdminHerramientasView)} className="space-y-4">
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

      <HerramientasModule superAdminView={view} />
    </div>
  );
}
