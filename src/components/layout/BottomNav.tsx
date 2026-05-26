import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Wrench, Package, Grid3x3, Plus,
  ShoppingCart, FileText, Users, Shield, Construction, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { m as motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";

import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";

const navItems = [
  { to: "/", icon: Home, label: "Inicio", featureKey: null as string | null },
  { to: "/servicios", icon: Wrench, label: "Servicios", featureKey: "services" as string | null },
  { to: "/inventario", icon: Package, label: "Inventario", featureKey: "inventory" as string | null },
];

const moreItems = [
  { to: "/clientes", icon: Users, label: "Clientes", featureKey: "customers" },
  { to: "/cotizaciones", icon: FileText, label: "Cotizaciones", featureKey: "quotes" },
  { to: "/ventas", icon: ShoppingCart, label: "Ventas", featureKey: "sales" },
  { to: "/garantias", icon: Shield, label: "Garantías", featureKey: "warranties" },
  { to: "/herramientas", icon: Construction, label: "Herramientas", featureKey: null as any },
  { to: "/configuracion", icon: Settings, label: "Configuración", featureKey: null as any },
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
  const { signOut } = useAuth();

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
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around h-[72px] px-2">
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
                className="w-[52px] h-[52px] rounded-2xl bg-primary text-primary-foreground flex items-center justify-center -mt-2 shadow-[0_0_24px_hsl(var(--primary)/0.45),0_8px_24px_hsl(var(--primary)/0.30)]"
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
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full"
          >
            <Grid3x3
              className={cn(
                "w-[22px] h-[22px] transition-colors",
                moreOpen ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                moreOpen ? "text-primary" : "text-muted-foreground",
              )}
            >
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Quick actions sheet */}
      <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {enabledQuickActions.map((a) => (
              <button
                key={a.dialog}
                onClick={() => openAction(a.dialog)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[hsl(var(--surface-2))] hover:bg-muted transition-colors active:scale-95"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground text-center">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* "Más" navigation sheet */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Más opciones</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-1">
            {enabledMoreItems.map((item) => {
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
                    "flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors text-left",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-[hsl(var(--surface-2))] text-foreground hover:bg-muted",
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    active ? "bg-primary text-primary-foreground" : "bg-card text-primary",
                  )}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <span className="text-sm font-semibold flex-1">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl text-left bg-destructive/10 text-destructive hover:bg-destructive/15 mt-2"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-destructive/15">
                <LogOut className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm font-semibold flex-1">Cerrar sesión</span>
            </button>
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
  item: { to: string; icon: any; label: string };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
        }
      }}
      className="flex-1 flex flex-col items-center justify-center gap-1 h-full"
    >
      <Icon
        className={cn(
          "w-[22px] h-[22px] transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

