import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Auth from "./pages/Auth";
import SuperAdminAuth from "./pages/SuperAdminAuth";
import Index from "./pages/Index";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Inventario from "./pages/Inventario";
import Cotizaciones from "./pages/Cotizaciones";
import Clientes from "./pages/Clientes";
import Servicios from "./pages/Servicios";
import Ventas from "./pages/Ventas";
import Garantias from "./pages/Garantias";
import Configuracion from "./pages/Configuracion";
import Herramientas from "./pages/Herramientas";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function detectRouterBase(): string {
  const configuredBase = (import.meta.env.BASE_URL || "/").trim();

  if (configuredBase && configuredBase !== "./") {
    const normalized = configuredBase.startsWith("/") ? configuredBase : `/${configuredBase}`;
    return normalized.endsWith("/") ? normalized.slice(0, -1) || "/" : normalized;
  }

  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const clean = path.endsWith("/") ? path.slice(0, -1) : path;
    const lastSlash = clean.lastIndexOf("/");
    if (lastSlash > 0) {
      return clean.slice(0, lastSlash);
    }
  }

  return "/";
}

const routerBase = detectRouterBase();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBase === "/" ? undefined : routerBase}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth_su" element={<SuperAdminAuth />} />
          <Route path="/:superAdminLoginPath" element={<SuperAdminAuth />} />
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/inventario/nuevo" element={<Inventario />} />
            <Route path="/cotizaciones" element={<Cotizaciones />} />
            <Route path="/cotizaciones/nueva" element={<Cotizaciones />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/nuevo" element={<Clientes />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/servicios/nuevo" element={<Servicios />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/ventas/nueva" element={<Ventas />} />
            <Route path="/garantias" element={<Garantias />} />
            <Route path="/herramientas" element={<Herramientas />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
