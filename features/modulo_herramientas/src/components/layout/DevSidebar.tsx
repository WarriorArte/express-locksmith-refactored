import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Wrench,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Key,
  Database,
  X,
  Menu,
  Shield,
  Construction,
  Building2,
  ClipboardList,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWorkshop } from "@/hooks/useDevContext";
import type { SuperAdminHerramientasView } from "@/components/herramientas/HerramientasModule";

const workshopNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Package, label: "Inventario", id: "inventario" },
  { icon: FileText, label: "Cotizaciones", id: "cotizaciones" },
  { icon: Users, label: "Clientes", id: "clientes" },
  { icon: Wrench, label: "Servicios", id: "servicios" },
  { icon: ShoppingCart, label: "Ventas", id: "ventas" },
  { icon: Shield, label: "Garantías", id: "garantias" },
  { icon: Construction, label: "Herramientas", id: "herramientas" },
  { icon: Settings, label: "Configuración", id: "configuracion" },
];

const superAdminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Construction, label: "Herramientas", id: "herramientas" },
  { icon: Building2, label: "Gestión de Talleres", id: "superadmin" },
  { icon: Settings, label: "Configuración", id: "configuracion" },
];

interface DevSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  superAdminView: SuperAdminHerramientasView;
  setSuperAdminView: (view: SuperAdminHerramientasView) => void;
}

export function DevSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  superAdminView,
  setSuperAdminView,
}: DevSidebarProps) {
  const { currentWorkshop, isSuperAdmin } = useWorkshop();

  // Always "herramientas" is the active item in dev
  const activeId = "herramientas";

  const navItems = isSuperAdmin ? superAdminNavItems : workshopNavItems;

  const sidebarContent = (
    <>
      {/* Logo & Header */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          {isSuperAdmin && !currentWorkshop ? (
            <Shield className="w-5 h-5" />
          ) : (
            <Key className="w-5 h-5" />
          )}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-lg font-bold text-sidebar-foreground whitespace-nowrap">
                {isSuperAdmin && !currentWorkshop
                  ? "SuperAdmin"
                  : currentWorkshop?.name || "Cerrajería"}
              </h1>
              <p className="text-xs text-sidebar-foreground/60 whitespace-nowrap">
                {isSuperAdmin && !currentWorkshop
                  ? "Administración Global"
                  : isSuperAdmin
                    ? "Modo Taller (SuperAdmin)"
                    : "Sistema de Gestión"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              className={cn("sidebar-nav-item group w-full", isActive && "active")}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}

        {isSuperAdmin && !collapsed && (
          <div className="mt-1 ml-2 pl-3 border-l border-sidebar-border/70 space-y-1">
            <button
              className={cn(
                "sidebar-nav-item group w-full justify-start text-sm",
                superAdminView === "asignacion" && "active"
              )}
              onClick={() => {
                setSuperAdminView("asignacion");
                setMobileOpen(false);
              }}
            >
              <ClipboardList className="w-4 h-4 flex-shrink-0" />
              <span>Asignación</span>
            </button>
            <button
              className={cn(
                "sidebar-nav-item group w-full justify-start text-sm",
                superAdminView === "keycode" && "active"
              )}
              onClick={() => {
                setSuperAdminView("keycode");
                setMobileOpen(false);
              }}
            >
              <Key className="w-4 h-4 flex-shrink-0" />
              <span>Keycode</span>
            </button>
            <button
              className={cn(
                "sidebar-nav-item group w-full justify-start text-sm",
                superAdminView === "immo" && "active"
              )}
              onClick={() => {
                setSuperAdminView("immo");
                setMobileOpen(false);
              }}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Immo Info</span>
            </button>
            <button
              className={cn(
                "sidebar-nav-item group w-full justify-start text-sm",
                superAdminView === "alarmas" && "active"
              )}
              onClick={() => {
                setSuperAdminView("alarmas");
                setMobileOpen(false);
              }}
            >
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span>Auto Alarmas</span>
            </button>
            <button
              className={cn(
                "sidebar-nav-item group w-full justify-start text-sm",
                superAdminView === "vehiculos" && "active"
              )}
              onClick={() => {
                setSuperAdminView("vehiculos");
                setMobileOpen(false);
              }}
            >
              <Database className="w-4 h-4 flex-shrink-0" />
              <span>Base de Vehículos</span>
            </button>
          </div>
        )}

        {/* SuperAdmin link when in workshop context */}
        {isSuperAdmin && currentWorkshop && (
          <button
            className="sidebar-nav-item group w-full mt-4 border-t border-sidebar-border pt-4"
            onClick={() => setMobileOpen(false)}
          >
            <Shield className="w-5 h-5 flex-shrink-0 transition-colors text-sidebar-foreground/70 group-hover:text-sidebar-foreground" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Panel SuperAdmin
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </nav>

      {/* Collapse Button (Desktop) */}
      <div className="hidden lg:block p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col lg:hidden"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="w-5 h-5" />
            </Button>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="hidden lg:flex flex-col bg-sidebar h-screen sticky top-0 z-30"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="lg:hidden">
      <Menu className="w-6 h-6" />
    </Button>
  );
}
