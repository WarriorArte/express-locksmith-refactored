import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Wrench, Package, Plus,
  ShoppingCart, FileText, Users, Car,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
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

const navItems: NavItem[] = [
  { to: "/", icon: Home, label: "Inicio", featureKey: null },
  { to: "/servicios", icon: Wrench, label: "Servicios", featureKey: "services" },
  { to: "/inventario", icon: Package, label: "Inventario", featureKey: "inventory" },
  { to: "/herramientas", icon: Car, label: "Vehículos", featureKey: null },
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

  const [actionsOpen, setActionsOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const filteredNavItems = navItems.filter(
    (i) => i.featureKey === null || isFeatureEnabled(i.featureKey),
  );
  const enabledQuickActions = quickActions.filter((a) =>
    isFeatureEnabled(a.featureKey),
  );

  const shouldShowFAB = !isLoading && !(isSuperAdmin && !currentWorkshop);

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

  if (isLoading) return null;

  // Layout: 2 nav items left | FAB | 2 nav items right
  const leftItems = filteredNavItems.slice(0, 2);
  const rightItems = filteredNavItems.slice(2, 4);

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
          {/* Sliding pill */}
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
