/**
 * PageHeader - Cerrajería Express Redesign
 *
 * Mobile (Redesign.html style): big bold title on the left + avatar
 * with notification dot on the right. The desktop topbar already
 * shows avatar/notifications, so on lg+ this becomes the classic
 * title + optional action layout.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-side action (desktop). Use `mobileAction` for mobile. */
  action?: React.ReactNode;
  /** Action shown on mobile next to the avatar (e.g. small + button). */
  mobileAction?: React.ReactNode;
  /** Hide the mobile avatar (e.g. when page provides its own). */
  hideAvatar?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  mobileAction,
  hideAvatar = false,
  className,
}: PageHeaderProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className={cn("flex items-start justify-between gap-3 mb-5", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] sm:text-3xl font-extrabold text-foreground leading-[1.05] tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {/* Mobile: optional small action + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0 lg:hidden">
        {mobileAction ?? action}
        {!hideAvatar && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Cuenta"
                className="relative h-[42px] w-[42px] rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold shadow-[0_0_18px_hsl(var(--primary)/0.30)] active:scale-95 transition-transform"
              >
                {initial}
                <span className="absolute -top-0.5 -right-0.5 w-[10px] h-[10px] rounded-full bg-destructive ring-2 ring-background" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{profile?.full_name || "Usuario"}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                  {isAdmin && (
                    <span className="text-xs text-foreground dark:text-primary font-semibold mt-1">Administrador</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                <Bell className="w-4 h-4 mr-2" />
                Notificaciones
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                <User className="w-4 h-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Desktop: optional action slot */}
      {action && <div className="flex-shrink-0 hidden lg:block">{action}</div>}
    </div>
  );
}


