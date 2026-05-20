import { useState, useMemo } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Plus, Package, FileText, Users, Wrench, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useIsMobile } from "@/hooks/use-mobile";

// Import dialogs
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";

const allFabActions = [
  {
    icon: Package,
    label: "Nuevo Producto",
    dialog: "product",
    color: "bg-primary",
    routes: ["/inventario", "/"],
    featureKey: "inventory"
  },
  {
    icon: FileText,
    label: "Nueva Cotización",
    dialog: "quote",
    color: "bg-info",
    routes: ["/cotizaciones", "/"],
    featureKey: "quotes"
  },
  {
    icon: Users,
    label: "Nuevo Cliente",
    dialog: "customer",
    color: "bg-accent",
    routes: ["/clientes", "/"],
    featureKey: "customers"
  },
  {
    icon: Wrench,
    label: "Nuevo Servicio",
    dialog: "service",
    color: "bg-success",
    routes: ["/servicios", "/"],
    featureKey: "services"
  },
  {
    icon: ShoppingCart,
    label: "Nueva Venta",
    dialog: "sale",
    color: "bg-secondary",
    routes: ["/ventas", "/"],
    featureKey: "sales"
  }
];

export function FAB() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const { isSuperAdmin, currentWorkshop, isLoading } = useWorkshop();
  const isMobile = useIsMobile();

  // Dialog states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);

  // Don't show FAB for SuperAdmin without workshop context
  const shouldShowFAB = useMemo(() => {
    if (isLoading) return false;
    
    // SuperAdmin without workshop context doesn't need quick actions
    if (isSuperAdmin && !currentWorkshop) {
      return false;
    }
    
    // On mobile, the FAB is integrated in BottomNav
    if (isMobile) {
      return false;
    }
    
    return true;
  }, [isSuperAdmin, currentWorkshop, isLoading, isMobile]);

  // Get direct action for current route (not dashboard)
  const getDirectAction = useMemo(() => {
    const currentPath = location.pathname;
    if (currentPath === "/") return null;
    
    const actionMap: Record<string, string> = {
      "/inventario": "product",
      "/cotizaciones": "quote",
      "/clientes": "customer",
      "/servicios": "service",
      "/ventas": "sale",
    };
    
    return actionMap[currentPath] || null;
  }, [location.pathname]);

  // Filter actions based on current route and enabled features
  const fabActions = useMemo(() => {
    if (!shouldShowFAB) return [];
    
    const currentPath = location.pathname;
    
    // First filter by enabled features
    const enabledActions = allFabActions.filter(action => 
      isFeatureEnabled(action.featureKey)
    );

    // Show all enabled actions on dashboard only
    if (currentPath === "/") {
      return enabledActions;
    }

    // For specific modules, we use direct action instead
    return [];
  }, [location.pathname, isFeatureEnabled, shouldShowFAB]);

  const handleAction = (dialog: string) => {
    setIsOpen(false);
    switch (dialog) {
      case "product":
        setProductDialogOpen(true);
        break;
      case "quote":
        setQuoteDialogOpen(true);
        break;
      case "customer":
        setCustomerDialogOpen(true);
        break;
      case "service":
        setServiceDialogOpen(true);
        break;
      case "sale":
        setSaleDialogOpen(true);
        break;
    }
  };

  // Don't render anything if FAB shouldn't be shown
  if (!shouldShowFAB) {
    return (
      <>
        {/* Still render dialogs for keyboard shortcuts or other triggers */}
        <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} />
        <QuoteFormDialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen} />
        <CustomerFormDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} />
        <ServiceFormDialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen} />
        <SaleFormDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} />
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Actions */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        <AnimatePresence>
          {isOpen && fabActions.map((action, index) => (
            <motion.button
              key={action.dialog}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleAction(action.dialog)}
              className="flex items-center gap-3 group"
            >
              <span className="px-3 py-2 rounded-lg bg-card shadow-lg text-sm font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {action.label}
              </span>
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg transition-transform hover:scale-110",
                  action.color
                )}
              >
                <action.icon className="w-5 h-5" />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // If there's a direct action for current route, execute it directly
            if (getDirectAction) {
              handleAction(getDirectAction);
            } else {
              // Otherwise toggle the menu (dashboard)
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300",
            isOpen
              ? "bg-foreground text-background"
              : "bg-primary text-primary-foreground"
          )}
          style={{
            boxShadow: isOpen
              ? "var(--shadow-lg)"
              : "0 0 24px hsl(var(--primary) / 0.45), 0 8px 24px hsl(var(--primary) / 0.30)"
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </div>

      {/* Dialogs */}
      <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} />
      <QuoteFormDialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen} />
      <CustomerFormDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} />
      <ServiceFormDialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen} />
      <SaleFormDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} />
    </>
  );
}
