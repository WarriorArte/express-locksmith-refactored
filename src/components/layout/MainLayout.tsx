import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { FAB } from "./FAB";
import { BottomNav } from "./BottomNav";
import { Bell, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // mobileOpen kept for compat but no longer used (no drawer on mobile).
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar only — mobile uses PageHeader for avatar/notifications */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md hidden lg:block">
          <div className="flex items-center justify-between h-14 px-6">
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground font-medium">
                Bienvenido
              </span>
              <span className="text-sm font-bold text-foreground truncate">
                {profile?.full_name || user?.email || "Usuario"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Notificaciones"
                className="relative h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10">
                    <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold">
                      {initial}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{profile?.full_name || "Usuario"}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                      {isAdmin && (
                        <span className="text-xs text-primary font-semibold mt-1">Administrador</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 min-h-0 px-5 lg:px-6 pt-10 lg:pt-2 pb-24 md:pb-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />

      {/* FAB - Desktop Only */}
      <FAB />
    </div>
  );
}
