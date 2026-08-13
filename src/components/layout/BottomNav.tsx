import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Wrench, Package, Plus,
  ShoppingCart, FileText, Users, Car,
  type LucideIcon,
} from "lucide-react";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [barWidth, setBarWidth] = useState(0);
  const [notchX, setNotchX] = useState<number | null>(null);

  const activeItem = filteredNavItems.find((i) => isItemActive(i.to)) || null;

  const measure = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    setBarWidth(rect.width);
    const el = activeItem ? itemRefs.current[activeItem.to] : null;
    if (el) {
      const r = el.getBoundingClientRect();
      setNotchX(r.left - rect.left + r.width / 2);
    } else {
      setNotchX(null);
    }
  }, [activeItem]);

  useLayoutEffect(() => {
    measure();
  }, [measure, filteredNavItems.length, shouldShowFAB]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(bar);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [measure]);

  if (isLoading) return null;

  return (
    <>
      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 lg:hidden">
        <div
          ref={barRef}
          className="relative h-[68px] drop-shadow-[0_18px_34px_hsl(var(--foreground)/0.28)]"
        >
          {/* Silueta de la barra con muesca que se mueve al tab activo */}
          {barWidth > 0 && (
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 ${barWidth} 68`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <motion.path
                d={buildBarPath(barWidth, notchX)}
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
                strokeWidth={1}
                initial={false}
                animate={{ d: buildBarPath(barWidth, notchX) }}
                transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.7 }}
              />
            </svg>
          )}

          {/* Burbuja del tab activo, encajada en la muesca */}
          {notchX !== null && activeItem && (
            <motion.div
              className="pointer-events-none absolute top-[-12px] z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.5),0_10px_20px_-6px_hsl(var(--primary)/0.55)]"
              initial={false}
              animate={{ left: clampNotch(barWidth, notchX) - 25, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.7 }}
            >
              <motion.span
                key={activeItem.to}
                initial={{ scale: 0.5, opacity: 0, rotate: -18 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
              >
                <activeItem.icon className="h-[23px] w-[23px]" strokeWidth={2} />
              </motion.span>
            </motion.div>
          )}

          {/* Título del tab activo, alineado siempre con la burbuja */}
          {notchX !== null && activeItem && (
            <motion.span
              key={activeItem.to}
              className="pointer-events-none absolute top-[42px] z-20 w-[50px] text-center text-[10px] font-bold text-primary"
              initial={{ opacity: 0, y: 4 }}
              animate={{ left: clampNotch(barWidth, notchX) - 25, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.7 }}
            >
              {activeItem.label}
            </motion.span>
          )}

          <div className="relative flex h-full items-end justify-around px-2 pb-2">
            {leftItems.map((item) => (
              <NavBtn
                key={item.to}
                item={item}
                active={isItemActive(item.to)}
                innerRef={(el) => (itemRefs.current[item.to] = el)}
              />
            ))}

            {/* Center FAB */}
            {shouldShowFAB && (
              <div className="flex flex-1 items-center justify-center self-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFabClick}
                  aria-label={directAction ? "Crear" : "Acciones rápidas"}
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.6} />
                </motion.button>
              </div>
            )}

            {rightItems.map((item) => (
              <NavBtn
                key={item.to}
                item={item}
                active={isItemActive(item.to)}
                innerRef={(el) => (itemRefs.current[item.to] = el)}
              />
            ))}
          </div>
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

const NOTCH_HALF = 36; // media anchura de la muesca
const NOTCH_DEPTH = 26; // profundidad de la muesca

/** Centro de la muesca, limitado para no comerse las esquinas redondeadas. */
function clampNotch(w: number, notchX: number | null): number {
  if (notchX === null || w === 0) return 0;
  return Math.min(Math.max(notchX, 24 + NOTCH_HALF), w - 24 - NOTCH_HALF);
}

/** Silueta de la barra: rectángulo redondeado con una muesca cóncava bajo el tab activo. */
function buildBarPath(w: number, notchX: number | null): string {
  const h = 68;
  const r = 24;
  const nw = NOTCH_HALF;
  const nd = NOTCH_DEPTH;
  const cx = notchX === null ? null : clampNotch(w, notchX);

  const top =
    cx === null
      ? `H ${w - r}`
      : `H ${cx - nw} C ${cx - nw + 14} 0 ${cx - nw + 8} ${nd} ${cx} ${nd} ` +
        `C ${cx + nw - 8} ${nd} ${cx + nw - 14} 0 ${cx + nw} 0 H ${w - r}`;


  return [
    `M ${r} 0`,
    top,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `V ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
}

function NavBtn({
  item,
  active,
  innerRef,
}: {
  item: Pick<NavItem, "to" | "icon" | "label">;
  active: boolean;
  innerRef?: (el: HTMLAnchorElement | null) => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      ref={innerRef}
      to={item.to}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (active) e.preventDefault();
      }}
      className="relative flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-[18px] pb-1 active:bg-muted/60"
    >
      {!active && (
        <span className="flex flex-col items-center gap-1">
          <Icon className="h-[22px] w-[22px] text-muted-foreground" strokeWidth={2} />
          <span className="text-[10px] font-medium text-muted-foreground transition-colors duration-200">
            {item.label}
          </span>
        </span>
      )}
    </NavLink>
  );
}


