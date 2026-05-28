import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  FileText,
  Key,
  LogOut,
  Settings,
  Shield,
  ShoppingCart,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshop } from "@/hooks/useWorkshop";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";

interface AccountMenuProps {
  showNotifications?: boolean;
  triggerClassName?: string;
}

const operationItems = [
  { label: "Cotizaciones", description: "Propuestas y conversión a venta", icon: FileText, to: "/cotizaciones" },
  { label: "Ventas", description: "Caja del día y facturas", icon: ShoppingCart, to: "/ventas" },
  { label: "Garantías", description: "Cobertura y reclamos", icon: Shield, to: "/garantias" },
];

const catalogItems = [
  { label: "Clientes", description: "Historial por cliente", icon: Users, to: "/clientes" },
  { label: "Herramientas", description: "Inventario del taller", icon: Wrench, to: "/herramientas" },
];

type AccountNavItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  to: string;
};

export function AccountMenu({
  showNotifications = true,
  triggerClassName,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const { currentWorkshop } = useWorkshop();
  const navigate = useNavigate();
  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";
  const workshopName = currentWorkshop?.name || "Cerrajería Express";
  const workshopCode = currentWorkshop?.code || "ELE-2024";

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
        aria-label="Cuenta"
        onClick={() => setOpen(true)}
        className={cn(
          "ce-hero-avatar relative flex items-center justify-center text-sm font-extrabold active:scale-95 transition-transform",
          triggerClassName,
        )}
      >
        {initial}
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Cuenta y navegación</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.25)]">
              <Key className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-extrabold leading-tight tracking-tight text-foreground">
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
            <AccountTile
              icon={User}
              label="Mi perfil"
              description={profile?.full_name?.split(" ")[0] || "Usuario"}
              onClick={() => goTo("/configuracion")}
            />
            {showNotifications && (
              <AccountTile
                icon={Bell}
                label="Notificaciones"
                description="4 sin leer"
                badge="4"
                onClick={() => goTo("/configuracion")}
              />
            )}
          </div>

          <AccountSection label="Operación" items={operationItems} onNavigate={goTo} />
          <AccountSection label="Catálogo" items={catalogItems} onNavigate={goTo} />

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Cuenta
            </div>
            <AccountRow
              icon={Settings}
              label="Configuración"
              description={isAdmin ? "Negocio, usuarios, plantillas" : "Perfil y preferencias"}
              onClick={() => goTo("/configuracion")}
            />
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
              <div className="min-w-0">
                <div className="text-sm font-extrabold">Cerrar sesión</div>
                <div className="text-xs font-medium text-muted-foreground">Volver a la pantalla de acceso</div>
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountTile({
  icon: Icon,
  label,
  description,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-3 rounded-[14px] bg-muted px-3 py-3 text-left active:scale-[0.98] transition-transform"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold leading-tight text-foreground">{label}</div>
        <div className="truncate text-xs font-medium text-muted-foreground">{description}</div>
      </div>
      {badge && (
        <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-extrabold text-destructive-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function AccountSection({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: AccountNavItem[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <AccountRow key={item.to} {...item} onClick={() => onNavigate(item.to)} />
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left active:bg-muted/70"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold leading-tight text-foreground">{label}</div>
        <div className="truncate text-xs font-medium text-muted-foreground">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
