import { Navigate, useLocation, useNavigate } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useWorkshop } from "@/hooks/useWorkshop";
import {
  HerramientasModule,
  type SuperAdminHerramientasView,
} from "@/components/herramientas/HerramientasModule";

const ROUTE_TO_VIEW: Record<string, { view: SuperAdminHerramientasView; title: string; subtitle: string }> = {
  "/superadmin/keycode": {
    view: "keycode",
    title: "Keycode",
    subtitle: "Perfiles globales de keycodes y cortes de llave",
  },
  "/superadmin/immo": {
    view: "immo",
    title: "Immo Info",
    subtitle: "Perfiles de inmovilizadores, asignaciones y suministros",
  },
  "/superadmin/alarmas": {
    view: "alarmas",
    title: "Auto Alarmas",
    subtitle: "Diagramas y datos de programación remota de alarmas",
  },
  "/superadmin/vehiculos": {
    view: "vehiculos",
    title: "Vehículos",
    subtitle: "Base de datos global de marcas, modelos y años",
  },
};

export default function SuperAdminHerramientas() {
  const { isSuperAdmin, isLoading } = useWorkshop();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const config = ROUTE_TO_VIEW[pathname] ?? ROUTE_TO_VIEW["/superadmin/keycode"];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col container mx-auto py-6 gap-6">
      <PageHeader className="shrink-0" title={config.title} subtitle={config.subtitle} onBack={() => navigate("/superadmin")} backLabel="Volver a Superadministrador" />
      <div className="flex-1 min-h-0 flex flex-col">
        <HerramientasModule superAdminView={config.view} />
      </div>
    </div>
  );
}
