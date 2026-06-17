import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { m as motion, AnimatePresence } from "framer-motion";
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
  X,
  Shield,
  Construction,
  Building2,
  Activity,
  LogOut,
  Cpu,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Workshop-specific navigation items (top section, scrollable)
const workshopNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", featureKey: null },
  { icon: Package, label: "Inventario", path: "/inventario", featureKey: "inventory" },
  { icon: FileText, label: "Cotizaciones", path: "/cotizaciones", featureKey: "quotes" },
  { icon: Users, label: "Clientes", path: "/clientes", featureKey: "customers" },
  { icon: Wrench, label: "Servicios", path: "/servicios", featureKey: "services" },
  { icon: ShoppingCart, label: "Ventas", path: "/ventas", featureKey: "sales" },
  { icon: Shield, label: "Garantías", path: "/garantias", featureKey: "warranties" },
  { icon: Construction, label: "Herramientas", path: "/herramientas", featureKey: null },
];

// Items pinned at the bottom of the sidebar
const pinnedBottomItems = [
  { icon: Settings, label: "Configuración", path: "/configuracion", featureKey: null },
];

// SuperAdmin-specific navigation items (when not in workshop context)
const superAdminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Gestión de Talleres", path: "/superadmin" },
  { icon: Key, label: "Keycode", path: "/superadmin/keycode" },
  { icon: Cpu, label: "Immo Info", path: "/superadmin/immo" },
  { icon: Shield, label: "Auto Alarmas", path: "/superadmin/alarmas" },
  { icon: Database, label: "Vehículos", path: "/superadmin/vehiculos" },
];

const superAdminBottomItems = [
  { icon: Settings, label: "Configuración", path: "/configuracion" },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkshop, isSuperAdmin, isLoading, setCurrentWorkshop } = useWorkshop();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const { signOut } = useAuth();

  // Determine which nav items to show (top scrollable section)
  const getNavItems = () => {
    if (isLoading) return [];
    if (isSuperAdmin && !currentWorkshop) return superAdminNavItems;
    return workshopNavItems.filter(
      (item) => item.featureKey === null || isFeatureEnabled(item.featureKey),
    );
  };

  // Items pinned at the bottom (Settings; logout rendered separately)
  const getBottomItems = () => {
    if (isLoading) return [] as typeof pinnedBottomItems;
    if (isSuperAdmin && !currentWorkshop) return superAdminBottomItems;
    return pinnedBottomItems;
  };

  const navItems = getNavItems();
  const bottomItems = getBottomItems();

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate("/auth");
  };

  // Show loading state
  if (isLoading) {
    return (
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 96 : 280 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="hidden lg:flex flex-col h-dvh sticky top-0 z-30 p-3"
      >
        <div className="flex items-center justify-center flex-1 bg-sidebar rounded-2xl shadow-xl">
          <Loader2 className="w-6 h-6 animate-spin text-sidebar-foreground/50" />
        </div>
      </motion.aside>
    );
  }

  const sidebarContent = (
    <>
      {/* Logo & Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
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

      {/* Navigation Grid */}
      <nav
        className={cn(
          "flex-1 p-3 overflow-y-auto scrollbar-thin grid content-start gap-2",
          collapsed ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              onClick={(e) => {
                setMobileOpen(false);
                if (isActive) e.preventDefault();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none",
                collapsed ? "py-3 px-2" : "py-4 px-2",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 transition-colors",
                  collapsed ? "w-5 h-5" : "w-7 h-7",
                )}
              />
              {!collapsed && (
                <span className="text-[10px] font-semibold leading-tight text-center w-full truncate">
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* SuperAdmin link when in workshop context */}
        {isSuperAdmin && currentWorkshop && (
          <>
            <div className="col-span-full border-t border-sidebar-border my-0.5" />
            <NavLink
              to="/superadmin"
              aria-label="Panel SuperAdmin"
              onClick={(e) => {
                setMobileOpen(false);
                if (location.pathname === "/superadmin") e.preventDefault();
                void setCurrentWorkshop(null);
              }}
              className={cn(
                "col-span-full flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none",
                collapsed ? "py-3 px-2" : "py-4 px-2",
                location.pathname === "/superadmin"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Shield
                className={cn(
                  "flex-shrink-0 transition-colors",
                  collapsed ? "w-5 h-5" : "w-7 h-7",
                )}
              />
              {!collapsed && (
                <span className="text-[10px] font-semibold leading-tight text-center w-full truncate">
                  Panel SuperAdmin
                </span>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* Pinned bottom section: Settings + Logout (always visible) */}
      <div className="shrink-0 border-t border-sidebar-border p-3 space-y-1">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => {
                setMobileOpen(false);
                if (isActive) {
                  e.preventDefault();
                }
              }}
              className={cn("sidebar-nav-item group", isActive && "active")}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
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
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={handleSignOut}
          className="sidebar-nav-item group w-full text-left text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse Button (Desktop) */}
      <div className="hidden lg:block p-3 border-t border-sidebar-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar only - mobile uses BottomNav + Más sheet */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 96 : 280 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="hidden lg:flex flex-col h-dvh sticky top-0 z-30 p-3"
      >
        <div className="flex flex-col flex-1 bg-sidebar rounded-[16px] shadow-xl border border-white/[0.06] overflow-hidden min-h-0">
          {sidebarContent}
        </div>
      </motion.aside>
    </>
  );
}

