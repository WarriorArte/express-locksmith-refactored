import { NavLink, useLocation } from "react-router";
import {
  Home, Wrench, Package, Plus,
  ShoppingCart, FileText, Users, Car,
  type LucideIcon,
} from "lucide-react";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useState } from "react";


import { spawnRipple } from "@/lib/ripple";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { useVehicleHome } from "@/hooks/useVehicleHome";
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

// Cuando el inicio ES la herramienta de vehículos (useVehicleHome), el primer tab
// pasa a ser "Vehículos" y el lugar que queda libre lo ocupa Ventas.
const vehicleHomeNavItems: NavItem[] = [
  { to: "/", icon: Car, label: "Vehículos", featureKey: null },
  { to: "/servicios", icon: Wrench, label: "Servicios", featureKey: "services" },
  { to: "/inventario", icon: Package, label: "Inventario", featureKey: "inventory" },
  { to: "/ventas", icon: ShoppingCart, label: "Ventas", featureKey: "sales" },
];

const quickActions = [
  { icon: Wrench, label: "Servicio", dialog: "service", featureKey: "services" },
  { icon: ShoppingCart, label: "Venta", dialog: "sale", featureKey: "sales" },
  { icon: FileText, label: "Cotización", dialog: "quote", featureKey: "quotes" },
  { icon: Users, label: "Cliente", dialog: "customer", featureKey: "customers" },
  { icon: Package, label: "Producto", dialog: "product", featureKey: "inventory" },
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

  const vehicleHome = useVehicleHome();
  const filteredNavItems = (vehicleHome ? vehicleHomeNavItems : navItems).filter(
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
      {/* Barra flotante M3 Expressive ("floating toolbar") + FAB aparte.
          El destino activo se expande en una píldora con ícono + nombre;
          los demás muestran solo el ícono. Animación con CSS (flex-grow con
          curva de resorte) porque LazyMotion usa domAnimation, sin layout. */}
      <nav
        aria-label="Navegación principal"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex items-center gap-3 max-[360px]:inset-x-2 max-[360px]:gap-2 lg:hidden"
      >
        <div className="pointer-events-auto flex h-16 min-w-0 flex-1 items-center gap-1 rounded-full bg-card px-2 max-[360px]:px-1.5 shadow-[0_6px_20px_-6px_hsl(var(--foreground)/0.22),0_2px_6px_-2px_hsl(var(--foreground)/0.12)] dark:bg-popover dark:shadow-[0_8px_24px_-6px_hsl(0_0%_0%/0.6)]">
          {filteredNavItems.map((item) => (
            <NavItemButton key={item.to} item={item} active={isItemActive(item.to)} />
          ))}
        </div>

        {shouldShowFAB && (
          <button
            type="button"
            onClick={handleFabClick}
            aria-label={directAction ? "Crear" : "Acciones rápidas"}
            className="group pointer-events-auto relative flex h-16 w-16 shrink-0 items-center justify-center max-[360px]:h-14 max-[360px]:w-14 drop-shadow-[0_6px_14px_hsl(var(--primary)/0.35)] dark:drop-shadow-[0_6px_16px_hsl(0_0%_0%/0.55)]"
          >
            <MaterialShape
              name="cookie9"
              className="h-16 w-16 max-[360px]:h-14 max-[360px]:w-14 text-primary transition-transform duration-500 ease-spring group-active:rotate-45 group-active:scale-95"
            >
              <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.4} />
            </MaterialShape>
          </button>
        )}
      </nav>


      {/* Quick actions sheet */}
      <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Crear</DialogTitle>
            <DialogDescription className="sr-only">
              Elige qué vas a registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 pb-2 pt-3">
            {enabledQuickActions.map((a) => (
              <button
                key={a.dialog}
                type="button"
                onClick={() => openAction(a.dialog)}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  onPointerDown={spawnRipple}
                  className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] bg-accent text-accent-foreground"
                >
                  <a.icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium text-foreground">{a.label}</span>
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

function NavItemButton({ item, active }: { item: Pick<NavItem, "to" | "icon" | "label">; active: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (active) e.preventDefault();
      }}
      onPointerDown={spawnRipple}
      className={`relative flex h-12 items-center justify-center overflow-hidden rounded-full transition-[flex-grow,background-color,color] duration-500 ease-spring ${
        active ? "min-w-max shrink-0 grow-[2.6] bg-accent px-3 max-[360px]:px-2 text-accent-foreground" : "min-w-9 basis-0 grow text-muted-foreground"
      }`}
    >
      <Icon className="h-6 w-6 shrink-0 max-[360px]:h-5 max-[360px]:w-5" strokeWidth={active ? 2.2 : 1.9} />
      <span
        aria-hidden="true"
        className={`overflow-hidden whitespace-nowrap text-sm max-[360px]:text-xs font-semibold transition-[max-width,opacity,margin] duration-500 ease-emphasized ${
          active ? "ml-2 shrink-0 max-w-[7.5rem] opacity-100 max-[360px]:ml-1.5" : "ml-0 max-w-0 opacity-0"
        }`}
      >
        {item.label}
      </span>
    </NavLink>
  );
}
