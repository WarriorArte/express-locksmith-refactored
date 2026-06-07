import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Wrench, Package, Grid3x3, Plus,
  ShoppingCart, FileText, Users, Shield, Construction, Settings, LogOut,
  Key, Bell, User, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useLayoutEffect } from "react";
import { m as motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";

import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";

type FeatureKey = string | null;
type NavItem = { to: string; icon: LucideIcon; label: string; featureKey: FeatureKey };
type MoreItem = NavItem & { description: string; group: "operacion" | "catalogo" | "cuenta" };

const navItems: NavItem[] = [
  { to: "/", icon: Home, label: "Inicio", featureKey: null },
  { to: "/servicios", icon: Wrench, label: "Servicios", featureKey: "services" },
  { to: "/inventario", icon: Package, label: "Inventario", featureKey: "inventory" },
];

const moreItems: MoreItem[] = [
  { to: "/cotizaciones", icon: FileText, label: "Cotizaciones", description: "Propuestas y conversión a venta", group: "operacion", featureKey: "quotes" },
  { to: "/ventas", icon: ShoppingCart, label: "Ventas", description: "Caja del día y facturas", group: "operacion", featureKey: "sales" },
  { to: "/garantias", icon: Shield, label: "Garantías", description: "Cobertura y reclamos", group: "operacion", featureKey: "warranties" },
  { to: "/clientes", icon: Users, label: "Clientes", description: "Historial por cliente", group: "catalogo", featureKey: "customers" },
  { to: "/herramientas", icon: Construction, label: "Herramientas", description: "Inventario del taller", group: "catalogo", featureKey: null },
  { to: "/configuracion", icon: Settings, label: "Configuración", description: "Negocio, usuarios, plantillas", group: "cuenta", featureKey: null },
];

const quickActions = [
  { icon: Wrench, label: "Nuevo Servicio", dialog: "service", featureKey: "services" },
  { icon: ShoppingCart, label: "Nueva Venta", dialog: "sale", featureKey: "sales" },
  { icon: FileText, label: "Nueva Cotización", dialog: "quote", featureKey: "quotes" },
  { icon: Users, label: "Nuevo Cliente", dialog: "customer", featureKey: "customers" },
  { icon: Package, label: "Nuevo Producto", dialog: "product", featureKey: "inventory" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const { isSuperAdmin, currentWorkshop, isLoading } = useWorkshop();
  const { profile, signOut } = useAuth();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const filteredNavItems = navItems.filter(
    (i) => i.featureKey === null || isFeatureEnabled(i.featureKey),
  );
  const enabledMoreItems = moreItems.filter(
    (i) => i.featureKey === null || isFeatureEnabled(i.featureKey),
  );
  const enabledQuickActions = quickActions.filter((a) =>
    isFeatureEnabled(a.featureKey),
  );

  const shouldShowFAB = !isLoading && !(isSuperAdmin && !currentWorkshop);
  const isMoreActive = enabledMoreItems.some((item) => item.to === location.pathname);

  const navInnerRef = useRef<HTMLDivElement>(null);
  const [pillX, setPillX] = useState<number | null>(null);
  const [pillW, setPillW] = useState(0);

  useLayoutEffect(() => {
    const container = navInnerRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!activeEl) { setPillX(null); return; }
    const cRect = container.getBoundingClientRect();
    const bRect = activeEl.getBoundingClientRect();
    setPillX(bRect.left - cRect.left + 4);
    setPillW(bRect.width - 8);
  }, [location.pathname]);
  const workshopName = currentWorkshop?.name || "Cerrajería Express";
  const workshopCode = currentWorkshop?.code || "ELE-2024";
  const firstName = profile?.full_name?.split(" ")[0] || "Usuario";
  const moreGroups = [
    { key: "operacion", label: "Operación", items: enabledMoreItems.filter((item) => item.group === "operacion") },
    { key: "catalogo", label: "Catálogo", items: enabledMoreItems.filter((item) => item.group === "catalogo") },
    { key: "cuenta", label: "Cuenta", items: enabledMoreItems.filter((item) => item.group === "cuenta") },
  ].filter((group) => group.items.length > 0);

  const openAction = (dialog: string) => {
    setActionsOpen(false);
    switch (dialog) {
      case "product": setProductDialogOpen(true); break;
      case "quote": setQuoteDialogOpen(true); break;
      case "customer": setCustomerDialogOpen(true); break;
      case "service": setServiceDialogOpen(true); break;
      case "sale": setSaleDialogOpen(true); break;
    }
  };

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate("/auth");
  };

  if (isLoading) return null;

  // Layout: 2 nav items left | FAB | 1 nav + Más
  const leftItems = filteredNavItems.slice(0, 2);
  const rightItems = filteredNavItems.slice(2, 3);

  // Map current route -> direct create action; dashboard ("/") opens the action menu
  const directActionMap: Record<string, string> = {
    "/inventario": "product",
    "/cotizaciones": "quote",
    "/clientes": "customer",
    "/servicios": "service",
    "/ventas": "sale",
  };
  const directAction = directActionMap[location.pathname] || null;

  const handleFabClick = () => {
    if (directAction) {
      openAction(directAction);
    } else {
      setActionsOpen(true);
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 md:hidden"
      >
        <div
          ref={navInnerRef}
          className="relative flex h-[68px] items-center justify-around rounded-[24px] border border-border/80 bg-card/95 px-2 shadow-[0_18px_42px_-18px_hsl(var(--foreground)/0.42),0_8px_22px_-14px_hsl(var(--primary)/0.38)] backdrop-blur-xl"
        >
          {/* Sliding pill — always mounted, animates x */}
          {pillX !== null && (
            <motion.div
              className="absolute top-2 bottom-2 rounded-[16px] bg-primary pointer-events-none shadow-[0_0_20px_hsl(var(--primary)/0.45),0_8px_18px_-6px_hsl(var(--primary)/0.4)]"
              style={{ left: 0, width: pillW }}
              animate={{ x: pillX }}
              initial={false}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}

          {leftItems.map((item) => (
            <NavBtn key={item.to} item={item} active={location.pathname === item.to} />
          ))}

          {/* Center FAB */}
          {shouldShowFAB && (
            <div className="flex-1 flex items-center justify-center">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleFabClick}
                aria-label={directAction ? "Crear" : "Acciones rápidas"}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-[20px] bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.45),0_12px_24px_-8px_hsl(var(--primary)/0.55)]"
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </motion.button>
            </div>
          )}

          {rightItems.map((item) => (
            <NavBtn key={item.to} item={item} active={location.pathname === item.to} />
          ))}

          {/* Más button */}
          <button
            type="button"
            data-nav-active={isMoreActive ? "true" : "false"}
            onClick={() => setMoreOpen(true)}
            className="flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[18px] active:bg-muted/70"
          >
            <Grid3x3
              className={cn(
                "relative z-10 w-[22px] h-[22px] transition-colors duration-200",
                isMoreActive ? "text-primary-foreground" : moreOpen ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "relative z-10 text-[10px] font-medium transition-colors duration-200",
                isMoreActive ? "text-primary-foreground font-semibold" : moreOpen ? "text-primary" : "text-muted-foreground",
              )}
            >
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Quick actions sheet */}
      <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                <Plus className="h-6 w-6" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-extrabold tracking-tight">
                  Crear nuevo
                </DialogTitle>
                <DialogDescription>
                  Elige qué vas a registrar en el taller.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {enabledQuickActions.map((a) => (
              <button
                key={a.dialog}
                onClick={() => openAction(a.dialog)}
                className="flex min-h-[136px] flex-col items-start justify-end rounded-[14px] border border-border bg-card p-4 text-left transition-transform active:scale-[0.98]"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-extrabold leading-tight text-foreground">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* "Más" navigation sheet */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Más opciones</DialogTitle>
            <DialogDescription>Navegación secundaria y cuenta</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pb-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.28)]">
                <Key className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold leading-tight tracking-tight text-foreground">
                  {workshopName}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>Más opciones</span>
                  <span>·</span>
                  <span>navegación</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold text-foreground">
                    {workshopCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/configuracion");
                }}
                className="relative flex items-center gap-3 rounded-[14px] bg-muted px-3 py-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold leading-tight text-foreground">Mi perfil</div>
                  <div className="truncate text-xs font-medium text-muted-foreground">{firstName}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/configuracion");
                }}
                className="relative flex items-center gap-3 rounded-[14px] bg-muted px-3 py-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold leading-tight text-foreground">Notificaciones</div>
                  <div className="truncate text-xs font-medium text-muted-foreground">4 sin leer</div>
                </div>
                <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-extrabold text-destructive-foreground">
                  4
                </span>
              </button>
            </div>

            <div className="space-y-4">
              {moreGroups.map((group) => (
                <div key={group.key}>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = location.pathname === item.to;
                      return (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => {
                            setMoreOpen(false);
                            if (!active) {
                              navigate(item.to);
                            }
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors active:bg-muted/70",
                            active && "bg-primary/10 text-primary",
                          )}
                        >
                          <div className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]",
                            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={cn("truncate text-sm font-extrabold leading-tight", active ? "text-primary" : "text-foreground")}>
                              {item.label}
                            </div>
                            <div className="truncate text-xs font-medium text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-destructive active:bg-destructive/10"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-destructive/10">
                  <LogOut className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold">Cerrar sesión</div>
                  <div className="text-xs font-medium text-muted-foreground">Volver a la pantalla de acceso</div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form dialogs */}
      <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} />
      <QuoteFormDialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen} />
      <CustomerFormDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} />
      <ServiceFormDialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen} />
      <SaleFormDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} />
    </>
  );
}

function NavBtn({
  item,
  active,
}: {
  item: Pick<NavItem, "to" | "icon" | "label">;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      data-nav-active={active ? "true" : "false"}
      onClick={(e) => {
        if (active) e.preventDefault();
      }}
      className="relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[18px] active:bg-muted/70"
    >
      <Icon
        className={cn(
          "relative z-10 w-[22px] h-[22px] transition-colors duration-200",
          active ? "text-primary-foreground" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "relative z-10 text-[10px] font-medium transition-colors duration-200",
          active ? "text-primary-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

