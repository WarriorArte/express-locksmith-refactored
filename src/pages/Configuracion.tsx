import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
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
  ChevronRight,
  Copy,
  LogOut,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { UserManagement } from "@/components/settings/UserManagement";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { IconTabs } from "@/components/ui/icon-tabs";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { spawnRipple } from "@/lib/ripple";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/useBusinessSettings";
import { useProfiles, useUpdateUserRole, type UserWithRole } from "@/hooks/useProfiles";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshop } from "@/hooks/useWorkshop";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { phpApiUpload } from "@/lib/phpApi";
import { BackupManager } from "@/components/settings/BackupManager";
import { MaintenanceManager } from "@/components/settings/MaintenanceManager";
import { QuoteDocSettingsPanel, QuoteDocSettingsPreview } from "@/components/settings/QuoteDocSettingsPanel";
import { UpdateCheckCard } from "@/components/settings/UpdateCheckCard";
import { useQuoteDocSettings } from "@/hooks/useQuoteDocSettings";

import { COUNTRIES, getCountryByCode, inferCountryCode } from "@/lib/countries";

type BusinessFormState = {
  name: string;
  phone: string;
  address: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  logo_url: string;
  currency_symbol: string;
  phone_country_code: string;
  country_code: string;
  ticket_show_logo: boolean;
  ticket_paper_size: string;
  ticket_footer_sale: string;
  ticket_footer_service: string;
  ticket_footer_warranty: string;
};

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<string>(
    typeof window !== "undefined" && window.innerWidth >= 1024 ? "perfil" : "",
  );
  const { isAdmin, user, profile, signOut } = useAuth();
  const { currentWorkshop, isSuperAdmin } = useWorkshop();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  // Business settings
  const { data: settings, isLoading: loadingSettings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const quoteDocSettings = useQuoteDocSettings();
  
  // Users
  const { data: users, isLoading: loadingUsers } = useProfiles();
  const updateUserRole = useUpdateUserRole();

  // Form state
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessFormState>({
    name: "",
    phone: "",
    address: "",
    email: "",
    website: "",
    facebook: "",
    instagram: "",
    logo_url: "",
    currency_symbol: "$",
    phone_country_code: "+52",
    country_code: "MX",
    ticket_show_logo: true,
    ticket_paper_size: "58mm",
    ticket_footer_sale: "",
    ticket_footer_service: "",
    ticket_footer_warranty: "",
  });


  useEffect(() => {
    if (settings) {
      const inferred = settings.country_code
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
        logo_url: settings.logo_url || "",
        currency_symbol: settings.currency_symbol || info?.currencySymbol || "$",
        phone_country_code: settings.phone_country_code || info?.dial || "+52",
        country_code: inferred,
        ticket_show_logo: settings.ticket_show_logo !== false,
        ticket_paper_size: settings.ticket_paper_size || "58mm",
        ticket_footer_sale: settings.ticket_footer_sale || "",
        ticket_footer_service: settings.ticket_footer_service || "",
        ticket_footer_warranty: settings.ticket_footer_warranty || "",
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
      ticket_show_logo: businessForm.ticket_show_logo ? 1 : 0,
      ticket_footer_sale: businessForm.ticket_footer_sale || null,
      ticket_footer_service: businessForm.ticket_footer_service || null,
      ticket_footer_warranty: businessForm.ticket_footer_warranty || null,
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
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-0 px-5 lg:px-6 pb-mobile-nav space-y-6 lg:space-y-0 no-scrollbar">
      {/* Header */}
      <PageHeader
        title="Configuración"
        subtitle={currentWorkshop?.name || "Perfil y preferencias"}
        className="lg:hidden"
      />

      {/* MOBILE: v2 prototype layout - profile card + tabs in single screen */}
      <div className="lg:hidden -mt-2">
        {/* Perfil: avatar en forma cookie sobre contenedor tonal */}
        <div className="mb-4 flex items-center gap-4 rounded-[28px] bg-primary-light p-4">
          <MaterialShape name="cookie6" className="h-14 w-14 text-background/70">
            <span className="text-lg font-bold text-foreground">
              {(() => {
                const name = profile?.full_name || "";
                const parts = name.trim().split(" ").filter(Boolean);
                if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                return (user?.email || "U").charAt(0).toUpperCase();
              })()}
            </span>
          </MaterialShape>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-foreground">{profile?.full_name || "Usuario"}</div>
            <div className="truncate text-sm text-muted-foreground">
              {isAdmin ? "Administrador" : "Empleado"} · {user?.email}
            </div>
          </div>
        </div>

        <MobileConfigTabs
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
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
          <div className="sticky top-0 z-40 -mx-6 px-6 pt-4 pb-4 bg-background border-b border-border/60 shadow-[0_8px_24px_hsl(var(--background))]">
          <PageHeader
            title="Configuración"
            subtitle={currentWorkshop?.name || "Perfil y preferencias"}
                className="mb-5"
          />
          <TabsList className={cn(
            "grid gap-2 h-auto p-1 bg-muted",
            isSuperAdmin ? "grid-cols-8" : isAdmin ? "grid-cols-7" : "grid-cols-5",
          )}>
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
            <TabsTrigger value="ticket" className="gap-2 py-3">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Ticket</span>
            </TabsTrigger>
            <TabsTrigger value="cotizacion" className="gap-2 py-3">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Cotización</span>
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
            {isSuperAdmin && (
              <TabsTrigger value="mantenimiento" className="gap-2 py-3">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Mantenimiento</span>
              </TabsTrigger>
            )}
          </TabsList>
          </div>



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
                      ? "border-primary "
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
                      ? "border-primary "
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

            <UpdateCheckCard />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>
                </div>
              </div>

              {/* País -> autocompleta moneda y prefijo telefónico */}
              <div className="lg:col-span-2 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    País del Negocio
                  </Label>
                  <NativeSelect
                    value={businessForm.country_code}
                    onChange={(e) => {
                      const value = e.target.value;
                      const info = getCountryByCode(value);
                      setBusinessForm(prev => ({
                        ...prev,
                        country_code: value,
                        currency_symbol: info?.currencySymbol ?? prev.currency_symbol,
                        phone_country_code: info?.dial ?? prev.phone_country_code,
                      }));
                    }}
                    className="max-w-sm"
                  >
                    <option value="" disabled>Selecciona un país</option>
                    {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.dial} · {c.currencySymbol})
                        </option>
                      ))}
                  </NativeSelect>
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

          {/* Ticket Tab */}
          <TabsContent value="ticket" className="space-y-6">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Configuración de Ticket
              </h3>

              <div className="space-y-6">
                {/* Logo y tamaño de papel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between gap-4 rounded-[20px] bg-muted p-4">
                    <div>
                      <div className="text-[15px] font-medium">Incluir logo</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Mostrar el logo del negocio en el ticket</div>
                    </div>
                    <Switch
                      checked={businessForm.ticket_show_logo}
                      onCheckedChange={(v) => setBusinessForm((p) => ({ ...p, ticket_show_logo: v }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tamaño de papel</Label>
                    <NativeSelect
                      value={businessForm.ticket_paper_size}
                      onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_paper_size: e.target.value }))}
                    >
                      <option value="58mm">58 mm (impresora pequeña)</option>
                      <option value="80mm">80 mm (estándar)</option>
                      <option value="104mm">104 mm (ancho)</option>
                    </NativeSelect>
                    <p className="text-xs text-muted-foreground">
                      Ancho del papel de tu impresora térmica
                    </p>
                  </div>
                </div>

                {/* Mensajes personalizados */}
                <div className="pt-2">
                  <div className="text-base font-semibold mb-1">Mensajes de pie de ticket</div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Personaliza el mensaje final que aparece en cada tipo de ticket. Si lo dejas vacío, se usará "¡Gracias por su preferencia!"
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="footer_sale">Venta</Label>
                      <Textarea
                        id="footer_sale"
                        rows={2}
                        placeholder="¡Gracias por su preferencia!"
                        value={businessForm.ticket_footer_sale}
                        onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_footer_sale: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer_service">Servicio</Label>
                      <Textarea
                        id="footer_service"
                        rows={2}
                        placeholder="¡Gracias por su preferencia!"
                        value={businessForm.ticket_footer_service}
                        onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_footer_service: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer_warranty">Garantía</Label>
                      <Textarea
                        id="footer_warranty"
                        rows={2}
                        placeholder="¡Gracias por su preferencia!"
                        value={businessForm.ticket_footer_warranty}
                        onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_footer_warranty: e.target.value }))}
                      />
                    </div>
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
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Cotización Tab */}
          <TabsContent value="cotizacion" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,620px)_minmax(420px,1fr)] xl:items-start">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Diseño de cotización
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Personaliza cómo se imprimen tus cotizaciones. Los cambios se aplican a todas las cotizaciones.
              </p>
              <QuoteDocSettingsPanel state={quoteDocSettings} />
            </div>
            <aside className="hidden xl:block sticky top-[11.5rem] self-start h-[calc(100dvh-12.5rem)]">
              <div className="h-full">
                <QuoteDocSettingsPreview state={quoteDocSettings} />
              </div>
            </aside>
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
                  <div className="m3-list">
                    {users?.map((user) => (
                      <div key={user.id} className="m3-list-item flex items-center justify-between gap-3 bg-muted px-4 py-3">
                        <div className="flex items-center gap-4">
                          <MaterialShape name="cookie6" className="h-11 w-11 text-background">
                            <span className="text-sm font-bold text-foreground">{user.full_name.charAt(0)}</span>
                          </MaterialShape>
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
                        <NativeSelect
                          value={user.role || "employee"}
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value as "admin" | "employee")}
                          aria-label={`Rol de ${user.full_name || user.email}`}
                          className="w-44"
                        >
                          <option value="admin">Administrador</option>
                          <option value="employee">Empleado</option>
                        </NativeSelect>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}


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

          {/* Mantenimiento Tab (SuperAdmin: datos globales de Herramientas + eliminar talleres) */}
          {isSuperAdmin && (
            <TabsContent value="mantenimiento">
              <div className="card-elevated p-6">
                <MaintenanceManager />
              </div>
            </TabsContent>
          )}

        </Tabs>
      </motion.div>

    </div>
  );
}

type MobileConfigTabsProps = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  theme: string;
  setTheme: (theme: "light" | "dark" | "system") => void;
  businessForm: BusinessFormState;
  setBusinessForm: Dispatch<SetStateAction<BusinessFormState>>;
  handleSaveSettings: () => Promise<void>;
  updatePending: boolean;
  workshopCode?: string;
  onPendingLogoFile: (file: File | null) => void;
  signOut: () => Promise<void> | void;
};

/* MOBILE: v2-style tabs */
function MobileConfigTabs({
  isAdmin,
  isSuperAdmin,
  theme,
  setTheme,
  businessForm,
  setBusinessForm,
  handleSaveSettings,
  updatePending,
  workshopCode,
  onPendingLogoFile,
  signOut,
}: MobileConfigTabsProps) {
  const [tab, setTab] = useState<"negocio" | "ticket" | "cotizacion" | "usuarios" | "sistema">("negocio");
  const tabs = [
    { id: "negocio" as const, icon: Building2, label: "Negocio" },
    { id: "ticket" as const, icon: Printer, label: "Ticket" },
    { id: "cotizacion" as const, icon: FileText, label: "Cotización" },
    ...(isAdmin ? [{ id: "usuarios" as const, icon: Users, label: "Usuarios" }] : []),
    { id: "sistema" as const, icon: Palette, label: "Sistema" },
  ];

  return (
    <div>
      <IconTabs value={tab} onChange={(id) => setTab(id as typeof tab)} items={tabs} className="mb-5" />

      {/* Negocio */}
      {tab === "negocio" && (
        <div className="space-y-3.5">
          <div>
            <Label>Logo</Label>
            <ImageUploader
              value={businessForm.logo_url}
              onChange={(url: string) => setBusinessForm((p) => ({ ...p, logo_url: url }))}
              onPendingFile={(file: File | null) => onPendingLogoFile?.(file)}
              folder="logos"
              workshopCode={workshopCode}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Nombre del negocio</Label>
            <Input value={businessForm.name} onChange={(e) => setBusinessForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label>Teléfono</Label>
              <Input value={businessForm.phone} onChange={(e) => setBusinessForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>País</Label>
              <NativeSelect
                value={businessForm.country_code}
                onChange={(e) => {
                  const value = e.target.value;
                  const info = getCountryByCode(value);
                  setBusinessForm((p) => ({
                    ...p,
                    country_code: value,
                    currency_symbol: info?.currencySymbol ?? p.currency_symbol,
                    phone_country_code: info?.dial ?? p.phone_country_code,
                  }));
                }}
              >
                <option value="" disabled>País</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.currencySymbol})
                  </option>
                ))}
              </NativeSelect>
              <p className="mt-1 text-xs text-muted-foreground">
                Moneda: <strong>{businessForm.currency_symbol}</strong> · Tel: <strong>{businessForm.phone_country_code}</strong>
              </p>
            </div>
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={businessForm.address} onChange={(e) => setBusinessForm((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <Label>Correo</Label>
            <Input type="email" value={businessForm.email} onChange={(e) => setBusinessForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          {workshopCode && (
            <div>
              <Label>Código del taller</Label>
              <div className="flex gap-2">
                <Input value={workshopCode} readOnly className="flex-1 bg-muted text-muted-foreground cursor-default" />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(workshopCode);
                      navigator.vibrate?.(10);
                      sonnerToast.success("Código copiado");
                    } catch {
                      sonnerToast.error("No se pudo copiar");
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
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

      {/* Ticket */}
      {tab === "ticket" && (
        <div className="space-y-4">
          {/* Logo toggle */}
          <div className="flex min-h-14 items-center justify-between gap-4 rounded-[20px] bg-muted px-4 py-3">
            <div className="text-[15px] font-medium">Incluir logo en el ticket</div>
            <Switch
              checked={businessForm.ticket_show_logo}
              onCheckedChange={(v) => setBusinessForm((p) => ({ ...p, ticket_show_logo: v }))}
            />
          </div>

          {/* Paper size */}
          <div className="space-y-1.5">
            <Label>Tamaño de papel</Label>
            <NativeSelect
              value={businessForm.ticket_paper_size}
              onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_paper_size: e.target.value }))}
            >
              <option value="58mm">58 mm (impresora pequeña)</option>
              <option value="80mm">80 mm (estándar)</option>
              <option value="104mm">104 mm (ancho)</option>
            </NativeSelect>
          </div>

          {/* Footer messages */}
          <div className="space-y-3">
            <div className="text-base font-semibold text-foreground">Mensajes de pie</div>
            <div className="space-y-1.5">
              <Label>Venta</Label>
              <Textarea
                rows={2}
                placeholder="¡Gracias por su preferencia!"
                value={businessForm.ticket_footer_sale}
                onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_footer_sale: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Servicio</Label>
              <Textarea
                rows={2}
                placeholder="¡Gracias por su preferencia!"
                value={businessForm.ticket_footer_service}
                onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_footer_service: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Garantía</Label>
              <Textarea
                rows={2}
                placeholder="¡Gracias por su preferencia!"
                value={businessForm.ticket_footer_warranty}
                onChange={(e) => setBusinessForm((p) => ({ ...p, ticket_footer_warranty: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={updatePending} className="w-full mt-2">
            {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      )}

      {/* Cotización */}
      {tab === "cotizacion" && <QuoteDocSettingsPanel compact />}

      {/* Usuarios */}
      {tab === "usuarios" && isAdmin && <UserManagement />}


      {/* Sistema */}
      {tab === "sistema" && (
        <div className="space-y-3">
          <div className="m3-list">
            <div className="m3-list-item flex min-h-16 items-center justify-between gap-4 bg-muted px-4 py-3">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[15px] font-medium text-foreground">Modo oscuro</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
            </div>
            {isAdmin && (
              <SystemRow
                icon={Shield}
                label="Respaldo de datos"
                sub="Copia de seguridad"
                onClick={() => document.getElementById("__cfg_backup")?.scrollIntoView({ behavior: "smooth" })}
              />
            )}
            {isSuperAdmin && (
              <SystemRow
                icon={Wrench}
                label="Mantenimiento"
                sub="Herramientas globales y talleres"
                onClick={() => document.getElementById("__cfg_maintenance")?.scrollIntoView({ behavior: "smooth" })}
              />
            )}
          </div>

          <UpdateCheckCard compact />

          <Button onClick={handleSaveSettings} disabled={updatePending} className="w-full">
            {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>


          {isAdmin && (
            <div id="__cfg_backup" className="pt-4">
              <BackupManager />
            </div>
          )}

          {isSuperAdmin && (
            <div id="__cfg_maintenance" className="pt-4">
              <MaintenanceManager />
            </div>
          )}

          {signOut && (
            <button
              type="button"
              onClick={signOut}
              onPointerDown={spawnRipple}
              className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-destructive-light text-sm font-semibold text-destructive"
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

function SystemRow({
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={spawnRipple}
      className="m3-list-item flex min-h-16 w-full items-center gap-3 bg-muted px-4 py-3 text-left"
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium text-foreground">{label}</div>
        {sub && <div className="truncate text-sm text-muted-foreground">{sub}</div>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
