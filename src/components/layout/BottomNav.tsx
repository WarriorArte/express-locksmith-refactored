import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Wrench, Package, Plus,
  ShoppingCart, FileText, Users, Car,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";

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

  const shouldShowFAB =
    !isLoading &&
    !(isSuperAdmin && !currentWorkshop) &&
    enabledQuickActions.length > 0;

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

  const isItemActive = (to: string) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  // Layout: mitad izquierda | FAB | mitad derecha (simétrico con 3 o 4 items)
  const half = Math.ceil(filteredNavItems.length / 2);
  const leftItems = filteredNavItems.slice(0, half);
  const rightItems = filteredNavItems.slice(half);

  const directActionMap: Record<string, string> = {
    "/inventario": "product",
    "/cotizaciones": "quote",
    "/clientes": "customer",
    "/servicios": "service",
    "/ventas": "sale",
  };
  const directAction = enabledQuickActions.length
    ? directActionMap[location.pathname] || null
    : null;

  const handleFabClick = () => {
    if (directAction) {
      openAction(directAction);
    } else {
      setActionsOpen(true);
    }
  };

  return (
    <>
      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 lg:hidden">
        <div className="relative flex h-[68px] items-center justify-around rounded-[24px] border border-border/80 bg-card/95 px-2 shadow-[0_18px_42px_-18px_hsl(var(--foreground)/0.42),0_8px_22px_-14px_hsl(var(--primary)/0.38)] backdrop-blur-xl">
          {leftItems.map((item) => (
            <NavBtn key={item.to} item={item} active={isItemActive(item.to)} />
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
            <NavBtn key={item.to} item={item} active={isItemActive(item.to)} />
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
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (active) e.preventDefault();
      }}
      className="relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[18px] active:bg-muted/70"
    >
      {/* Marcador: aparece en su sitio con un "pop", sin deslizarse */}
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            key="marker"
            className="absolute inset-x-1 top-2 bottom-2 rounded-[16px] bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.45),0_8px_18px_-6px_hsl(var(--primary)/0.4)]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.6 }}
          />
        )}
      </AnimatePresence>

      <motion.span
        className="relative z-10 flex flex-col items-center gap-1"
        animate={active ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 460, damping: 26 }}
      >
        <Icon
          className={cn(
            "w-[22px] h-[22px] transition-colors duration-200",
            active ? "text-primary-foreground" : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "text-[10px] transition-colors duration-200",
            active
              ? "text-primary-foreground font-bold"
              : "text-muted-foreground font-medium",
          )}
        >
          {item.label}
        </span>
      </motion.span>
    </NavLink>
  );
}

