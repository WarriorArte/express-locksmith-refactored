import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

// Auth pages: keep eager — first paint on /auth must be instant
import Auth from "./pages/Auth";
import SuperAdminAuth from "./pages/SuperAdminAuth";
import Index from "./pages/Index";

// Lazy-loaded feature pages (code-split per route)
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const Inventario = lazy(() => import("./pages/Inventario"));
const Cotizaciones = lazy(() => import("./pages/Cotizaciones"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Servicios = lazy(() => import("./pages/Servicios"));
const Ventas = lazy(() => import("./pages/Ventas"));
const Garantias = lazy(() => import("./pages/Garantias"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Herramientas = lazy(() => import("./pages/Herramientas"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminHerramientas = lazy(() => import("./pages/SuperAdminHerramientas"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos considerados frescos durante 1 min -> evita refetch al cambiar de pestaña/ventana
      staleTime: 60_000,
      // Mantener cache 5 min tras desmontar para navegación rápida back/forward
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

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

const RouteFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[40vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LazyMotion features={domAnimation} strict>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBase === "/" ? undefined : routerBase}>
        <Suspense fallback={<RouteFallback />}>
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
              <Route path="/superadmin/herramientas" element={<SuperAdminHerramientas />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
    </LazyMotion>
  </QueryClientProvider>
);

export default App;
