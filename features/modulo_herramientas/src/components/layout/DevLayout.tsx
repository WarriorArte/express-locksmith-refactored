import { useState } from "react";
import { DevSidebar, MobileMenuButton } from "./DevSidebar";
import { Bell, Search, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkshop } from "@/hooks/useDevContext";
import type { SuperAdminHerramientasView } from "@/components/herramientas/HerramientasModule";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DevLayoutProps {
  children: React.ReactNode;
  superAdminView: SuperAdminHerramientasView;
  setSuperAdminView: (view: SuperAdminHerramientasView) => void;
}

export function DevLayout({ children, superAdminView, setSuperAdminView }: DevLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentWorkshop, isSuperAdmin } = useWorkshop();

  const mockUserName = isSuperAdmin ? "Admin Dev" : "Usuario Taller";
  const mockEmail = isSuperAdmin ? "admin@lockmaster.dev" : "taller@lockmaster.dev";

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DevSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        superAdminView={superAdminView}
        setSuperAdminView={setSuperAdminView}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <MobileMenuButton onClick={() => setMobileOpen(true)} />

              {/* Search */}
              <div className="hidden sm:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos, clientes..."
                  className="w-64 lg:w-80 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Search */}
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Search className="w-5 h-5" />
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                      {mockUserName.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{mockUserName}</span>
                      <span className="text-xs text-muted-foreground">{mockEmail}</span>
                      {isSuperAdmin && (
                        <span className="text-xs text-primary font-medium mt-1">SuperAdmin</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="w-4 h-4 mr-2" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
