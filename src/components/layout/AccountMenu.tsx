import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Car,
  ChevronRight,
  FileText,
  LogOut,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { useVehicleHome } from "@/hooks/useVehicleHome";
import { cn } from "@/lib/utils";
import { spawnRipple } from "@/lib/ripple";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";

interface AccountMenuProps {
  /** @deprecated Ya no se muestran notificaciones (no existía la función real). */
  showNotifications?: boolean;
  triggerClassName?: string;
}

type AccountNavItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  featureKey: string | null;
};

// Una palabra por destino: el ícono hace el resto (sección 3.11 de la auditoría).
const navItems: AccountNavItem[] = [
  { label: "Cotizaciones", icon: FileText, to: "/cotizaciones", featureKey: "quotes" },
  { label: "Ventas", icon: ShoppingCart, to: "/ventas", featureKey: "sales" },
  { label: "Garantías", icon: Shield, to: "/garantias", featureKey: "warranties" },
  { label: "Clientes", icon: Users, to: "/clientes", featureKey: "customers" },
  { label: "Vehículos", icon: Car, to: "/herramientas", featureKey: null },
  { label: "Ajustes", icon: Settings, to: "/configuracion", featureKey: null },
];

export function AccountMenu({ triggerClassName }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { currentWorkshop } = useWorkshop();
  const { isFeatureEnabled } = useWorkshopFeatures();
  const navigate = useNavigate();

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";
  const displayName = profile?.full_name || user?.email || "Usuario";
  const vehicleHome = useVehicleHome();
  const items = navItems.filter(
    (item) =>
      (item.featureKey === null || isFeatureEnabled(item.featureKey)) &&
      // Si Vehículos es el inicio, no hace falta repetirlo aquí.
      !(vehicleHome && item.to === "/herramientas"),
  );

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Cuenta y menú"
        onClick={() => setOpen(true)}
        className={cn(
          "ce-hero-avatar relative flex items-center justify-center overflow-hidden text-sm font-bold",
          triggerClassName,
        )}
        onPointerDown={spawnRipple}
      >
        {initial}
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Cuenta y menú</DialogTitle>
          <DialogDescription>Secciones de la app y opciones de la cuenta</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pb-1">
          {/* Persona + taller: toca para ir al perfil */}
          <button
            type="button"
            onClick={() => goTo("/configuracion")}
            onPointerDown={spawnRipple}
            className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-muted p-3 text-left"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-foreground">{displayName}</span>
              {currentWorkshop?.name && (
                <span className="block truncate text-sm text-muted-foreground">{currentWorkshop.name}</span>
              )}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>

          <nav aria-label="Secciones" className="grid grid-cols-3 gap-x-3 gap-y-5">
            {items.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => goTo(item.to)}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  onPointerDown={spawnRipple}
                  className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] bg-accent text-accent-foreground"
                >
                  <item.icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleSignOut}
            onPointerDown={spawnRipple}
            className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
