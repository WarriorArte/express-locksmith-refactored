import { NavLink, useLocation } from "react-router";
import {
  Home, Wrench, Package, Plus,
  ShoppingCart, FileText, Users, Car,
  type LucideIcon,
} from "lucide-react";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useState } from "react";
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

  if (isLoading) return null;

  return (
    <>
      {/* Material 3 Expressive — FAB flotante + barra de navegación */}
      {shouldShowFAB && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleFabClick}
          aria-label={directAction ? "Crear" : "Acciones rápidas"}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg lg:hidden"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </motion.button>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex h-20 items-stretch justify-around px-2">
          {filteredNavItems.map((item) => (
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
                className="flex min-h-[136px] flex-col items-start justify-end rounded-3xl bg-accent/50 p-4 text-left transition-transform active:scale-[0.98]"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
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
      className="flex flex-1 flex-col items-center justify-center gap-1"
    >
      <span className="relative flex h-8 w-16 items-center justify-center">
        {active && (
          <motion.span
            layoutId="m3-nav-indicator"
            className="absolute inset-0 rounded-full bg-accent"
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          />
        )}
        <Icon
          className={`relative h-6 w-6 ${active ? "text-accent-foreground" : "text-muted-foreground"}`}
          strokeWidth={active ? 2.25 : 1.9}
        />
      </span>
      <span className={`text-xs ${active ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
        {item.label}
      </span>
    </NavLink>
  );
}
