import { useState } from "react";
import { Toaster } from "sonner";
import { DevWorkshopProvider } from "@/hooks/useDevContext";
import { DevLayout } from "@/components/layout/DevLayout";
import { HerramientasModule, type SuperAdminHerramientasView } from "@/components/herramientas/HerramientasModule";

export default function App() {
  const [superAdminView, setSuperAdminView] = useState<SuperAdminHerramientasView>("keycode");

  return (
    <DevWorkshopProvider>
      <DevLayout superAdminView={superAdminView} setSuperAdminView={setSuperAdminView}>
        <HerramientasModule superAdminView={superAdminView} />
      </DevLayout>
      <Toaster richColors position="top-right" />
    </DevWorkshopProvider>
  );
}
