import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { m as motion } from "framer-motion";
import { 
  Building2,
  Printer,
  Users,
  FileText,
  Shield,
  Save,
  Loader2,
  DollarSign,
  Phone,
  User,
  Globe,
  Palette,
  Sun,
  Moon,
  Bell,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { UserManagement } from "@/components/settings/UserManagement";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/useBusinessSettings";
import { useProfiles, useUpdateUserRole, type UserWithRole } from "@/hooks/useProfiles";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshop } from "@/hooks/useWorkshop";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { phpApiUpload } from "@/lib/phpApi";
import { BackupManager } from "@/components/settings/BackupManager";

import { COUNTRIES, getCountryByCode, inferCountryCode } from "@/lib/countries";

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<string>(
    typeof window !== "undefined" && window.innerWidth >= 1024 ? "perfil" : "",
  );
  const { isAdmin, user, profile, signOut } = useAuth();
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  // Business settings
  const { data: settings, isLoading: loadingSettings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  
  // Users
  const { data: users, isLoading: loadingUsers } = useProfiles();
  const updateUserRole = useUpdateUserRole();

  // Form state
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [businessForm, setBusinessForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    website: "",
    facebook: "",
    instagram: "",
    whatsapp: "",
    logo_url: "",
    currency_symbol: "$",
    phone_country_code: "+52",
    country_code: "MX",
    printer_model: "80mm",
    print_logo: true,
    auto_cut: true,
  });


  useEffect(() => {
    if (settings) {
      const inferred = (settings as any).country_code
        || inferCountryCode(settings.phone_country_code, settings.currency_symbol)
        || "MX";
      const info = getCountryByCode(inferred);
      setBusinessForm({
        name: settings.name || "",
        phone: settings.phone || "",
        address: settings.address || "",
        email: settings.email || "",
        website: settings.website || "",
        facebook: settings.facebook || "",
        instagram: settings.instagram || "",
        whatsapp: settings.whatsapp || "",
        logo_url: settings.logo_url || "",
        currency_symbol: settings.currency_symbol || info?.currencySymbol || "$",
        phone_country_code: settings.phone_country_code || info?.dial || "+52",
        country_code: inferred,
        printer_model: settings.printer_model || "80mm",
        print_logo: settings.print_logo == null ? true : !!settings.print_logo,
        auto_cut: settings.auto_cut == null ? true : !!settings.auto_cut,
      });
    }
  }, [settings]);


  const handleSaveSettings = async () => {
    if (!settings) return;

    let logoUrl = businessForm.logo_url;
    if (pendingLogoFile) {
      const result = await phpApiUpload(pendingLogoFile, 'logos', currentWorkshop?.code);
      logoUrl = result.url;
      setPendingLogoFile(null);
    } else if (logoUrl?.startsWith('blob:')) {
      logoUrl = '';
    }

    await updateSettings.mutateAsync({
      id: settings.id,
      ...businessForm,
      logo_url: logoUrl,
    });
  };

  const handleRoleChange = async (userId: string, role: "admin" | "employee") => {
    await updateUserRole.mutateAsync({ userId, role });
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-2 px-5 lg:px-6 pb-24 md:pb-6 space-y-6 no-scrollbar">
      {/* Header */}
      <PageHeader
        title="Configuración"
        subtitle="Administra tu negocio y personaliza la app"
      />

      {/* MOBILE: v2 prototype layout — profile card + tabs in single screen */}
      <div className="lg:hidden -mt-2">
        {/* Profile card (green hero) */}
        <div className="rounded-[18px] bg-primary text-primary-foreground p-3.5 flex items-center gap-3 mb-4 shadow-[0_0_24px_hsl(var(--primary)/0.30)]">
          <div className="w-[46px] h-[46px] rounded-[14px] bg-foreground/10 flex items-center justify-center font-extrabold text-[17px]">
            {(() => {
              const name = profile?.full_name || "";
              const parts = name.trim().split(" ").filter(Boolean);
              if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
              if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
              return (user?.email || "U").charAt(0).toUpperCase();
            })()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold truncate">{profile?.full_name || "Usuario"}</div>
            <div className="text-[11px] opacity-70 truncate">
              {isAdmin ? "Administrador" : "Empleado"} · {user?.email}
            </div>
          </div>
        </div>

        <MobileConfigTabs
          isAdmin={isAdmin}
          theme={theme}
          setTheme={setTheme}
          businessForm={businessForm}
          setBusinessForm={setBusinessForm}
          handleSaveSettings={handleSaveSettings}
          updatePending={updateSettings.isPending}
          workshopCode={currentWorkshop?.code}
          onPendingLogoFile={setPendingLogoFile}
          signOut={signOut}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.08 }}
        className="hidden lg:block"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 gap-2 h-auto p-1 bg-muted">
            <TabsTrigger value="perfil" className="gap-2 py-3">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="apariencia" className="gap-2 py-3">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Apariencia</span>
            </TabsTrigger>
            <TabsTrigger value="negocio" className="gap-2 py-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Negocio</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="usuarios" className="gap-2 py-3">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Usuarios</span>
                </TabsTrigger>
                <TabsTrigger value="backup" className="gap-2 py-3">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Backup</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>


          {/* Perfil Tab */}
          <TabsContent value="perfil" className="space-y-6">
            <div className="card-elevated p-6">
              <ProfileSettings />
            </div>
          </TabsContent>

          {/* Apariencia Tab */}
          <TabsContent value="apariencia" className="space-y-6">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Apariencia
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Elige el modo visual de la aplicación.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "relative rounded-2xl border-2 p-4 transition-all text-left",
                    theme === "light"
                      ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className="h-20 rounded-xl mb-3 bg-[#F7F8FA] border border-black/5 flex items-center justify-center">
                    <Sun className="w-6 h-6 text-[#0D0D12]" />
                  </div>
                  <div className="font-bold text-sm">Claro</div>
                  <div className="text-xs text-muted-foreground">
                    {theme === "light" ? "Activo" : "Por defecto"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "relative rounded-2xl border-2 p-4 transition-all text-left",
                    theme === "dark"
                      ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className="h-20 rounded-xl mb-3 bg-[#0A0A0F] border border-white/5 flex items-center justify-center">
                    <Moon className="w-6 h-6 text-[#F0F0F8]" />
                  </div>
                  <div className="font-bold text-sm">Oscuro</div>
                  <div className="text-xs text-muted-foreground">
                    {theme === "dark" ? "Activo" : "Estilo nocturno"}
                  </div>
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Negocio Tab */}
          <TabsContent value="negocio" className="space-y-6">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Datos del Negocio
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Logo */}
                <div className="lg:col-span-2">
                  <Label>Logo del Negocio</Label>
                  <div className="mt-2">
                    <ImageUploader
                      value={businessForm.logo_url}
                      onChange={(url) => setBusinessForm(prev => ({ ...prev, logo_url: url }))}
                      onPendingFile={(file) => setPendingLogoFile(file)}
                      folder="logos"
                      workshopCode={currentWorkshop?.code}
                      placeholder="https://ejemplo.com/logo.png"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Recomendado: imagen cuadrada de 200x200px
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input 
                    id="businessName" 
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input 
                    id="phone" 
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input 
                    id="address" 
                    value={businessForm.address}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={businessForm.email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input 
                    id="website" 
                    value={businessForm.website}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="social">Redes Sociales</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input 
                      placeholder="Facebook" 
                      value={businessForm.facebook}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, facebook: e.target.value }))}
                    />
                    <Input 
                      placeholder="Instagram" 
                      value={businessForm.instagram}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, instagram: e.target.value }))}
                    />
                    <Input 
                      placeholder="WhatsApp" 
                      value={businessForm.whatsapp}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* País → autocompleta moneda y prefijo telefónico */}
              <div className="lg:col-span-2 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    País del Negocio
                  </Label>
                  <Select
                    value={businessForm.country_code}
                    onValueChange={(value) => {
                      const info = getCountryByCode(value);
                      setBusinessForm(prev => ({
                        ...prev,
                        country_code: value,
                        currency_symbol: info?.currencySymbol ?? prev.currency_symbol,
                        phone_country_code: info?.dial ?? prev.phone_country_code,
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Selecciona un país" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                            <span className="text-muted-foreground">({c.dial} · {c.currencySymbol})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex items-center gap-3 pt-1">
                    <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" /> Moneda: <strong>{businessForm.currency_symbol}</strong></span>
                    <span className="inline-flex items-center gap-1">Prefijo: <strong>{businessForm.phone_country_code}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t lg:col-span-2">
                <Button 
                  className="gap-2" 
                  onClick={handleSaveSettings}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Impresora Tab */}
          <TabsContent value="impresora" className="space-y-6">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Configuración de Ticket Térmico
              </h3>

              <p className="text-sm text-muted-foreground mb-6">
                Configura los parámetros de impresión para tickets térmicos. El tamaño y diseño se gestionan desde las plantillas.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tamaño de Papel Térmico</Label>
                  <Select 
                    value={businessForm.printer_model}
                    onValueChange={(value) => setBusinessForm(prev => ({ ...prev, printer_model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm (pequeño)</SelectItem>
                      <SelectItem value="80mm">80mm (estándar)</SelectItem>
                      <SelectItem value="110mm">110mm (grande)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Este tamaño se aplica a las plantillas de tickets térmicos
                  </p>
                  <div className="mt-4">
                    <ThermalPrinterPreview printerModel={businessForm.printer_model as any} showLogo={businessForm.print_logo} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <Label>Imprimir Logo en Tickets</Label>
                      <p className="text-sm text-muted-foreground">Incluir el logo del negocio en los recibos</p>
                    </div>
                    <Switch 
                      checked={businessForm.print_logo}
                      onCheckedChange={(checked) => setBusinessForm(prev => ({ ...prev, print_logo: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Corte Automático</Label>
                      <p className="text-sm text-muted-foreground">Cortar papel automáticamente después de imprimir</p>
                    </div>
                    <Switch 
                      checked={businessForm.auto_cut}
                      onCheckedChange={(checked) => setBusinessForm(prev => ({ ...prev, auto_cut: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <Button 
                  className="gap-2"
                  onClick={handleSaveSettings}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Usuarios Tab - Old version, kept for reference */}
          {isAdmin && (
            <TabsContent value="usuarios-old" className="space-y-6">
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Usuarios y Permisos
                  </h3>
                </div>

                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.full_name}</span>
                              <Badge className={cn(
                                "text-xs",
                                user.role === "admin" ? "bg-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {user.role === "admin" ? "Administrador" : "Empleado"}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                        <Select 
                          value={user.role || "employee"}
                          onValueChange={(value) => handleRoleChange(user.user_id, value as "admin" | "employee")}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="employee">Empleado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Plantillas Tab */}
          <TabsContent value="plantillas" className="space-y-6">
            <div className="card-elevated p-6">
              <TemplateSelector />
            </div>
          </TabsContent>

          {/* Usuarios Tab */}
          {isAdmin && (
            <TabsContent value="usuarios">
              <div className="card-elevated p-6">
                <UserManagement />
              </div>
            </TabsContent>
          )}

          {/* Backup Tab */}
          {isAdmin && (
            <TabsContent value="backup">
              <div className="card-elevated p-6">
                <BackupManager />
              </div>
            </TabsContent>
          )}

        </Tabs>
      </motion.div>

    </div>
  );
}

/* ───────── MOBILE: v2-style tabs ───────── */
function MobileConfigTabs({
  isAdmin,
  theme,
  setTheme,
  businessForm,
  setBusinessForm,
  handleSaveSettings,
  updatePending,
  workshopCode,
  onPendingLogoFile,
  signOut,
}: any) {
  const [tab, setTab] = useState<"negocio" | "usuarios" | "sistema">("negocio");
  const tabs = [
    { id: "negocio" as const, icon: Building2, label: "Negocio" },
    ...(isAdmin ? [{ id: "usuarios" as const, icon: Users, label: "Usuarios" }] : []),
    { id: "sistema" as const, icon: Palette, label: "Sistema" },
  ];

  return (
    <div>
      {/* Tabs strip */}
      <div className="flex border-b border-border mb-4 -mx-4 px-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 -mb-px transition-colors",
                active ? "text-primary border-primary" : "text-muted-foreground border-transparent",
              )}
            >
              <Icon className="w-[15px] h-[15px]" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Negocio */}
      {tab === "negocio" && (
        <div className="space-y-3.5">
          <div>
            <Label>Logo</Label>
            <ImageUploader
              value={businessForm.logo_url}
              onChange={(url: string) => setBusinessForm((p: any) => ({ ...p, logo_url: url }))}
              onPendingFile={(file: File | null) => onPendingLogoFile?.(file)}
              folder="logos"
              workshopCode={workshopCode}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Nombre del negocio</Label>
            <Input value={businessForm.name} onChange={(e) => setBusinessForm((p: any) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label>Teléfono</Label>
              <Input value={businessForm.phone} onChange={(e) => setBusinessForm((p: any) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>País</Label>
              <Select
                value={businessForm.country_code}
                onValueChange={(value) => {
                  const info = getCountryByCode(value);
                  setBusinessForm((p: any) => ({
                    ...p,
                    country_code: value,
                    currency_symbol: info?.currencySymbol ?? p.currency_symbol,
                    phone_country_code: info?.dial ?? p.phone_country_code,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                        <span className="text-muted-foreground text-xs">{c.currencySymbol}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Moneda: <strong>{businessForm.currency_symbol}</strong> · Tel: <strong>{businessForm.phone_country_code}</strong>
              </p>
            </div>
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={businessForm.address} onChange={(e) => setBusinessForm((p: any) => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <Label>Correo</Label>
            <Input type="email" value={businessForm.email} onChange={(e) => setBusinessForm((p: any) => ({ ...p, email: e.target.value }))} />
          </div>
          {workshopCode && (
            <div>
              <Label>Código del taller</Label>
              <div className="flex gap-2">
                <Input value={workshopCode} readOnly className="flex-1 bg-muted text-muted-foreground cursor-default" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(workshopCode); }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          )}
          <Button onClick={handleSaveSettings} disabled={updatePending} className="w-full mt-2">
            {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      )}

      {/* Usuarios */}
      {tab === "usuarios" && isAdmin && <UserManagement />}

      {/* Sistema */}
      {tab === "sistema" && (
        <div className="space-y-3">
          {/* Dark mode toggle row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--surface-2))] border border-border">
            <div>
              <div className="text-[13px] font-semibold text-foreground">Modo oscuro</div>
              <div className="text-[11px] text-muted-foreground">Cambiar apariencia de la app</div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
          </div>

          {/* Tamaño impresora */}
          <div>
            <Label>Tamaño de papel térmico</Label>
            <Select value={businessForm.printer_model}
              onValueChange={(v) => setBusinessForm((p: any) => ({ ...p, printer_model: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm (pequeño)</SelectItem>
                <SelectItem value="80mm">80mm (estándar)</SelectItem>
                <SelectItem value="110mm">110mm (grande)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plantillas + Backup as list-item card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SystemRow icon={Printer} label="Impresora térmica" sub="Configurar ticket" onClick={() => {}} />
            <SystemRow icon={FileText} label="Plantillas" sub="Tickets y documentos" onClick={() => document.getElementById("__cfg_templates")?.scrollIntoView({ behavior: "smooth" })} divider />
            {isAdmin && <SystemRow icon={Shield} label="Respaldo de datos" sub="Copia de seguridad" onClick={() => document.getElementById("__cfg_backup")?.scrollIntoView({ behavior: "smooth" })} divider />}
            <SystemRow icon={Bell} label="Notificaciones" sub="Alertas de stock y servicios" onClick={() => {}} divider />
          </div>

          <Button onClick={handleSaveSettings} disabled={updatePending} className="w-full">
            {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>

          <div id="__cfg_templates" className="pt-4">
            <TemplateSelector />
          </div>
          {isAdmin && (
            <div id="__cfg_backup" className="pt-4">
              <BackupManager />
            </div>
          )}

          {signOut && (
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-[13px] font-bold mt-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SystemRow({ icon: Icon, label, sub, onClick, divider }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-muted transition-colors",
        divider && "border-t border-border",
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-[hsl(var(--surface-2))] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
      </div>
      <span className="text-muted-foreground text-sm">›</span>
    </button>
  );
}

