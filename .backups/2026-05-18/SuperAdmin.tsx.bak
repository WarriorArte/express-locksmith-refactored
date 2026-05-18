import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkshop } from "@/hooks/useWorkshop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Settings, HardDrive, CheckCircle2, AlertCircle, Save, ImageIcon, UserPlus, Trash2, Loader2, Download, ToggleLeft, Pencil, Key, Eye, EyeOff, Search, Wrench, Shield } from "lucide-react";
import { Navigate } from "react-router-dom";
import { isStorageConfigured, useFileUpload } from "@/hooks/useFileUpload";
import { useAppAdminSettings, useUpdateAppAdminSettings } from "@/hooks/useAppAdminSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logError, getUserFriendlyError } from "@/lib/errorHandler";
import { phpApiRequest, phpApiCleanup } from "@/lib/phpApi";

type WorkshopRow = {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
  created_at?: string;
};

type WorkshopFeatureRow = {
  id: string;
  feature_key: string;
  is_enabled: boolean | number;
  settings?: string | null;
  created_at?: string;
};

type UserRoleRow = {
  id: string;
  user_id: string;
  workshop_id: string | null;
  role: "admin" | "employee" | null;
  globalRole: string | null;
  profile: {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

type SuperAdminAccessSettings = {
  id: string;
  workshop_code: string;
  email: string;
  login_path: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading: workshopLoading } = useWorkshop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState({ name: "", code: "" });
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false);
  const [assignUserData, setAssignUserData] = useState({ email: "", workshopId: "", role: "employee" as "admin" | "employee" });
  const [isEditWorkshopDialogOpen, setIsEditWorkshopDialogOpen] = useState(false);
  const [editWorkshop, setEditWorkshop] = useState<{ id: string; name: string; code: string } | null>(null);
  const [selectedWorkshopForFeatures, setSelectedWorkshopForFeatures] = useState<string | null>(null);
  
  // Crear nuevo usuario
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: "", password: "", fullName: "", workshopId: "", role: "employee" as "admin" | "employee" });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Cambiar contraseña
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState<{ userId: string; userEmail: string; userName: string; newPassword: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Eliminar usuario permanentemente
  const [deleteUserData, setDeleteUserData] = useState<{ userId: string; userEmail: string; userName: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Diagnóstico de consistencia (Auth vs Profiles)
  const [isUserConsistencyOpen, setIsUserConsistencyOpen] = useState(false);
  const [consistencyEmail, setConsistencyEmail] = useState("");
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [isRepairingAccount, setIsRepairingAccount] = useState(false);

  // Available features
  const availableFeatures = [
    { key: "inventory", label: "Inventario", description: "Gestión de productos y stock" },
    { key: "quotes", label: "Cotizaciones", description: "Crear y gestionar cotizaciones" },
    { key: "services", label: "Servicios", description: "Gestión de órdenes de servicio" },
    { key: "sales", label: "Ventas", description: "Punto de venta y registro de ventas" },
    { key: "customers", label: "Clientes", description: "Base de datos de clientes" },
    { key: "reports", label: "Reportes", description: "Estadísticas y reportes" },
  ];
  
  // Storage configuration - from appadmin_settings
  const { data: appAdminSettings, isLoading: loadingAppSettings } = useAppAdminSettings();
  const updateAppSettings = useUpdateAppAdminSettings();
  const [storageEndpoint, setStorageEndpoint] = useState("");
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; kept: number } | null>(null);
  const { uploadFile, isUploading, progress } = useFileUpload({ folder: 'general', workshopCode: 'system' });
  const storageConfigured = isStorageConfigured();

  const [superAdminAccessForm, setSuperAdminAccessForm] = useState({
    workshopCode: "",
    email: "",
    loginPath: "/auth_su",
    password: "",
  });
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);

  const { data: superAdminAccessSettings, isLoading: loadingSuperAdminAccess } = useQuery({
    queryKey: ["superadmin-access-settings"],
    queryFn: async () => phpApiRequest<SuperAdminAccessSettings | null>("/superadmin-access.php", {
      method: "GET",
    }),
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (superAdminAccessSettings) {
      setSuperAdminAccessForm((current) => ({
        workshopCode: superAdminAccessSettings.workshop_code || "",
        email: superAdminAccessSettings.email || "",
        loginPath: superAdminAccessSettings.login_path || "/auth_su",
        password: current.password,
      }));
    }
  }, [superAdminAccessSettings]);

  const updateSuperAdminAccess = useMutation({
    mutationFn: async () => phpApiRequest<SuperAdminAccessSettings>("/superadmin-access.php", {
      method: "PUT",
      body: JSON.stringify({
        workshop_code: superAdminAccessForm.workshopCode.trim().toUpperCase(),
        email: superAdminAccessForm.email.trim().toLowerCase(),
        login_path: superAdminAccessForm.loginPath.trim(),
        password: superAdminAccessForm.password,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-access-settings"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setSuperAdminAccessForm((current) => ({ ...current, password: "" }));
      toast({
        title: "Acceso SuperAdmin actualizado",
        description: "La ruta y credenciales aisladas ya estan activas",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Load storage settings when appAdminSettings changes
  useEffect(() => {
    if (appAdminSettings) {
      setStorageEndpoint(appAdminSettings.storage_endpoint || "");
    }
  }, [appAdminSettings]);

  // Fetch all workshops
  const { data: workshops, isLoading: workshopsLoading } = useQuery({
    queryKey: ["superadmin-workshops"],
    queryFn: async () => {
      const data = await phpApiRequest<WorkshopRow[]>("/workshops.php");
      return (data || []).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    },
    enabled: isSuperAdmin,
  });

  // Fetch all user roles with profiles
  const { data: userRoles, isLoading: usersLoading } = useQuery({
    queryKey: ["superadmin-user-roles", workshops?.length || 0],
    queryFn: async () => {
      const rows = await phpApiRequest<Array<{
        id: string;
        user_id: string;
        workshop_id: string | null;
        workshop_role: "admin" | "employee" | null;
        full_name: string | null;
        email: string | null;
        global_role?: string | null;
      }>>("/profiles.php?action=system-roles");

      return (rows || []).map((row) => ({
        id: `${row.user_id}:${row.workshop_id || "global"}`,
        user_id: row.user_id,
        workshop_id: row.workshop_id,
        role: row.workshop_role,
        globalRole: row.global_role || null,
        profile: {
          id: row.id,
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
        },
      }));
    },
    enabled: isSuperAdmin,
  });

  // Fetch workshop features
  const { data: workshopFeatures } = useQuery({
    queryKey: ["superadmin-workshop-features", selectedWorkshopForFeatures],
    queryFn: async () => {
      if (!selectedWorkshopForFeatures) return [];
      return phpApiRequest<WorkshopFeatureRow[]>(`/workshop-features.php?workshop_id=${encodeURIComponent(selectedWorkshopForFeatures)}`);
    },
    enabled: isSuperAdmin && !!selectedWorkshopForFeatures,
  });

  // Create workshop mutation
  const createWorkshop = useMutation({
    mutationFn: async (workshop: { name: string; code: string }) => {
      const data = await phpApiRequest<{ id: string; name: string; code: string }>("/workshops.php", {
        method: "POST",
        body: JSON.stringify({
          name: workshop.name,
          code: workshop.code.toUpperCase(),
        }),
      });
      
      // Create default business settings for the workshop
      await phpApiRequest("/business-settings.php", {
        method: "PUT",
        body: JSON.stringify({
          name: workshop.name,
          workshop_id: data.id,
        }),
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshops"] });
      setIsCreateDialogOpen(false);
      setNewWorkshop({ name: "", code: "" });
      toast({ title: "Taller creado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle workshop active status
  const toggleWorkshopStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await phpApiRequest(`/workshops.php?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshops"] });
      toast({ title: "Estado actualizado" });
    },
  });

  // Update workshop mutation
  const updateWorkshop = useMutation({
    mutationFn: async (workshop: { id: string; name: string; code: string }) => {
      await phpApiRequest(`/workshops.php?id=${encodeURIComponent(workshop.id)}`, {
        method: "PUT",
        body: JSON.stringify({ name: workshop.name, code: workshop.code.toUpperCase() }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshops"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setIsEditWorkshopDialogOpen(false);
      setEditWorkshop(null);
      toast({ title: "Taller actualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle feature mutation
  const toggleFeature = useMutation({
    mutationFn: async ({ workshopId, featureKey, isEnabled }: { workshopId: string; featureKey: string; isEnabled: boolean }) => {
      await phpApiRequest(`/workshop-features.php?workshop_id=${encodeURIComponent(workshopId)}`, {
        method: "PUT",
        body: JSON.stringify({
          feature_key: featureKey,
          is_enabled: isEnabled,
        }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshop-features"] });
      queryClient.invalidateQueries({ queryKey: ["workshop-features", variables.workshopId] });
      toast({ title: "Feature actualizado" });
    },
  });

  // Assign user to workshop mutation
  const assignUserToWorkshop = useMutation({
    mutationFn: async (data: { email: string; workshopId: string; role: "admin" | "employee" }) => {
      const normalizedEmail = data.email.trim().toLowerCase();
      const existingRole = userRoles?.find(
        (role) => role.workshop_id === data.workshopId && role.profile?.email?.toLowerCase() === normalizedEmail
      );

      if (existingRole) {
        throw new Error("El usuario ya está asignado a este taller");
      }

      const profile = await phpApiRequest<{ user_id: string }>(`/profiles.php?action=find-by-email&email=${encodeURIComponent(normalizedEmail)}`);

      await phpApiRequest("/profiles.php?action=assign", {
        method: "POST",
        body: JSON.stringify({
          user_id: profile.user_id,
          workshop_id: data.workshopId,
          role: data.role,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setIsAssignUserDialogOpen(false);
      setAssignUserData({ email: "", workshopId: "", role: "employee" });
      toast({ title: "Usuario asignado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, workshopId, newRole }: { userId: string; workshopId: string; newRole: "admin" | "employee" }) => {
      await phpApiRequest("/profiles.php?action=assign", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, workshop_id: workshopId, role: newRole }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      toast({ title: "Rol actualizado" });
    },
  });

  // Delete user role mutation
  const deleteUserRole = useMutation({
    mutationFn: async ({ profileId, workshopId }: { profileId: string; workshopId: string }) => {
      await phpApiRequest(`/profiles.php?id=${encodeURIComponent(profileId)}&workshop_id=${encodeURIComponent(workshopId)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      toast({ title: "Usuario removido del taller" });
    },
  });

  // Create new user function
  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.fullName || !newUserData.workshopId) {
      toast({ title: "Error", description: "Todos los campos son requeridos", variant: "destructive" });
      return;
    }

    setIsCreatingUser(true);
    try {
      await phpApiRequest("/profiles.php?action=invite", {
        method: "POST",
        body: JSON.stringify({
          email: newUserData.email,
          password: newUserData.password,
          full_name: newUserData.fullName,
          role: newUserData.role,
          workshop_id: newUserData.workshopId,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setIsCreateUserDialogOpen(false);
      setNewUserData({ email: "", password: "", fullName: "", workshopId: "", role: "employee" });
      toast({ title: "Usuario creado exitosamente" });
    } catch (error) {
      logError(error, 'handleCreateUser');
      toast({ title: "Error", description: getUserFriendlyError(error), variant: "destructive" });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Change user password function
  const handleChangePassword = async () => {
    if (!passwordChangeData?.userId || !passwordChangeData.newPassword) {
      toast({ title: "Error", description: "La nueva contraseña es requerida", variant: "destructive" });
      return;
    }

    if (passwordChangeData.newPassword.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      await phpApiRequest("/profiles.php?action=change-password", {
        method: "POST",
        body: JSON.stringify({
          user_id: passwordChangeData.userId,
          new_password: passwordChangeData.newPassword,
        }),
      });

      setIsChangePasswordDialogOpen(false);
      setPasswordChangeData(null);
      toast({ title: "Contraseña actualizada exitosamente" });
    } catch (error) {
      logError(error, 'handleChangePassword');
      toast({ title: "Error", description: getUserFriendlyError(error), variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Delete user permanently
  const handleDeleteUserPermanently = async () => {
    if (!deleteUserData) return;

    setIsDeletingUser(true);
    try {
      await phpApiRequest("/profiles.php?action=delete-user", {
        method: "POST",
        body: JSON.stringify({
          user_id: deleteUserData.userId,
          email: deleteUserData.userEmail,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setDeleteUserData(null);
      toast({ title: "Usuario eliminado permanentemente" });
    } catch (error) {
      logError(error, 'handleDeleteUserPermanently');
      toast({ title: "Error", description: getUserFriendlyError(error), variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleSaveStorageSettings = async () => {
    if (!storageEndpoint.trim()) {
      toast({
        title: "Error",
        description: "La URL del endpoint es requerida",
        variant: "destructive",
      });
      return;
    }

    // Use the mutation from useUpdateAppAdminSettings
    updateAppSettings.mutate({
      storage_endpoint: storageEndpoint.trim(),
    });
  };

  if (workshopLoading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Superadministrador</h1>
          <p className="text-muted-foreground">Gestión global de talleres y usuarios</p>
        </div>
      </div>

      <Tabs defaultValue="workshops" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workshops" className="gap-2">
            <Building2 className="h-4 w-4" />
            Talleres
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <ToggleLeft className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="su-access" className="gap-2">
            <Shield className="h-4 w-4" />
            Acceso SU
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Archivos
          </TabsTrigger>
        </TabsList>

        {/* Workshops Tab */}
        <TabsContent value="workshops">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Talleres
                </CardTitle>
                <CardDescription>Gestiona todos los talleres del sistema</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Taller
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Taller</DialogTitle>
                    <DialogDescription>
                      Ingresa los datos del nuevo taller
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Taller</Label>
                      <Input
                        id="name"
                        value={newWorkshop.name}
                        onChange={(e) => setNewWorkshop({ ...newWorkshop, name: e.target.value })}
                        placeholder="Cerrajería Ejemplo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Código de Acceso</Label>
                      <Input
                        id="code"
                        value={newWorkshop.code}
                        onChange={(e) => setNewWorkshop({ ...newWorkshop, code: e.target.value.toUpperCase() })}
                        placeholder="EJEMPLO123"
                        className="uppercase"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este código será requerido para iniciar sesión en el taller
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => createWorkshop.mutate(newWorkshop)}
                      disabled={!newWorkshop.name || !newWorkshop.code || createWorkshop.isPending}
                    >
                      {createWorkshop.isPending ? "Creando..." : "Crear Taller"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {workshopsLoading ? (
                <p>Cargando talleres...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workshops?.map((workshop) => (
                      <TableRow key={workshop.id}>
                        <TableCell className="font-medium">{workshop.name}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {workshop.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={workshop.is_active ?? true}
                              onCheckedChange={(checked) =>
                                toggleWorkshopStatus.mutate({ id: workshop.id, isActive: checked })
                              }
                            />
                            <Badge variant={workshop.is_active ? "default" : "secondary"}>
                              {workshop.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(workshop.created_at!).toLocaleDateString("es-MX")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditWorkshop({ id: workshop.id, name: workshop.name, code: workshop.code });
                              setIsEditWorkshopDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Workshop Dialog */}
          <Dialog open={isEditWorkshopDialogOpen} onOpenChange={setIsEditWorkshopDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Taller</DialogTitle>
                <DialogDescription>Modifica los datos del taller</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del Taller</Label>
                  <Input
                    value={editWorkshop?.name || ""}
                    onChange={(e) => setEditWorkshop(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Nombre del taller"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código de Acceso</Label>
                  <Input
                    value={editWorkshop?.code || ""}
                    onChange={(e) => setEditWorkshop(prev => prev ? { ...prev, code: e.target.value.toUpperCase() } : null)}
                    className="uppercase"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditWorkshopDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => editWorkshop && updateWorkshop.mutate(editWorkshop)}
                  disabled={!editWorkshop?.name || !editWorkshop?.code || updateWorkshop.isPending}
                >
                  {updateWorkshop.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Features por Taller
              </CardTitle>
              <CardDescription>Activa o desactiva módulos para cada taller</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Seleccionar Taller</Label>
                <Select
                  value={selectedWorkshopForFeatures || ""}
                  onValueChange={setSelectedWorkshopForFeatures}
                >
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue placeholder="Seleccionar taller" />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops?.map((workshop) => (
                      <SelectItem key={workshop.id} value={workshop.id}>
                        {workshop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkshopForFeatures && (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableFeatures.map((feature) => {
                    const workshopFeature = workshopFeatures?.find(f => f.feature_key === feature.key);
                    const isEnabled = workshopFeature?.is_enabled == null ? true : !!workshopFeature.is_enabled;
                    
                    return (
                      <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{feature.label}</p>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            toggleFeature.mutate({
                              workshopId: selectedWorkshopForFeatures,
                              featureKey: feature.key,
                              isEnabled: checked,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {!selectedWorkshopForFeatures && (
                <p className="text-muted-foreground text-center py-8">
                  Selecciona un taller para configurar sus features
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios por Taller
                </CardTitle>
                <CardDescription>Usuarios asignados a cada taller</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Usuario
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                      <DialogDescription>
                        Crea un nuevo usuario y asígnalo a un taller
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input
                          value={newUserData.fullName}
                          onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                          placeholder="Nombre del usuario"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          placeholder="usuario@ejemplo.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contraseña</Label>
                        <div className="relative">
                          <Input
                            type={showNewUserPassword ? "text" : "password"}
                            value={newUserData.password}
                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                            placeholder="Mínimo 8 caracteres"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          >
                            {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Taller</Label>
                        <Select
                          value={newUserData.workshopId}
                          onValueChange={(value) => setNewUserData({ ...newUserData, workshopId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar taller" />
                          </SelectTrigger>
                          <SelectContent>
                            {workshops?.filter(w => w.is_active).map((workshop) => (
                              <SelectItem key={workshop.id} value={workshop.id}>
                                {workshop.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select
                          value={newUserData.role}
                          onValueChange={(value: "admin" | "employee") => setNewUserData({ ...newUserData, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="employee">Empleado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateUser}
                        disabled={!newUserData.email || !newUserData.password || !newUserData.fullName || !newUserData.workshopId || isCreatingUser}
                      >
                        {isCreatingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Crear Usuario"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isUserConsistencyOpen} onOpenChange={setIsUserConsistencyOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Search className="h-4 w-4" />
                      Diagnóstico de Cuenta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Diagnóstico de inicio de sesión</DialogTitle>
                      <DialogDescription>
                        Verifica si un email existe en autenticación y si está sincronizado con profiles (IDs iguales).
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={consistencyEmail}
                          onChange={(e) => setConsistencyEmail(e.target.value)}
                          placeholder="usuario@ejemplo.com"
                        />
                      </div>

                      {consistencyResult && (
                        <div className="rounded-lg border bg-card p-3 text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Resultado</span>
                            <Badge variant={consistencyResult?.matches ? "default" : "secondary"}>
                              {consistencyResult?.matches === true
                                ? "OK (IDs coinciden)"
                                : consistencyResult?.matches === false
                                  ? "Desincronizado"
                                  : "Incompleto"}
                            </Badge>
                          </div>
                          <div className="grid gap-1">
                            <div><span className="text-muted-foreground">Profile user_id:</span> <code className="text-xs">{consistencyResult?.profile_user_id ?? "(no existe)"}</code></div>
                            <div><span className="text-muted-foreground">Auth user_id:</span> <code className="text-xs">{consistencyResult?.auth_user?.id ?? "(no existe)"}</code></div>
                            <div><span className="text-muted-foreground">Auth updated_at:</span> <code className="text-xs">{consistencyResult?.auth_user?.updated_at ?? "-"}</code></div>
                            <div><span className="text-muted-foreground">Auth last_sign_in_at:</span> <code className="text-xs">{consistencyResult?.auth_user?.last_sign_in_at ?? "-"}</code></div>
                          </div>

                          {/* Mostrar botón de reparación si hay desincronización o falta profile */}
                          {consistencyResult?.auth_user?.id && consistencyResult?.matches !== true && (
                            <div className="pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                                disabled={isRepairingAccount}
                                onClick={async () => {
                                  setIsRepairingAccount(true);
                                  try {
                                    const res = await phpApiRequest<{ message?: string }>("/profiles.php?action=repair", {
                                      method: "POST",
                                      body: JSON.stringify({ email: consistencyEmail.trim() }),
                                    });

                                    toast({
                                      title: "Cuenta reparada",
                                      description: res?.message || "Profile sincronizado correctamente.",
                                    });

                                    // Re-run consistency check
                                    const checkRes = await phpApiRequest("/profiles.php?action=consistency", {
                                      method: "POST",
                                      body: JSON.stringify({ email: consistencyEmail.trim() }),
                                    });
                                    setConsistencyResult(checkRes);

                                    queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
                                  } catch (err) {
                                    logError("repair-user-profile", err);
                                    toast({
                                      title: "Error al reparar",
                                      description: getUserFriendlyError(err),
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setIsRepairingAccount(false);
                                  }
                                }}
                              >
                                {isRepairingAccount ? (
                                  <><Loader2 className="h-4 w-4 animate-spin" /> Reparando...</>
                                ) : (
                                  <><Wrench className="h-4 w-4" /> Reparar Cuenta</>
                                )}
                              </Button>
                              <p className="text-xs text-muted-foreground mt-1">
                                Crea o actualiza el profile para que coincida con el Auth user_id.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsUserConsistencyOpen(false)}>
                        Cerrar
                      </Button>
                      <Button
                        disabled={!consistencyEmail.trim() || isCheckingConsistency}
                        onClick={async () => {
                          setIsCheckingConsistency(true);
                          setConsistencyResult(null);
                          try {
                            const res = await phpApiRequest<{ matches: boolean | null }>("/profiles.php?action=consistency", {
                              method: "POST",
                              body: JSON.stringify({ email: consistencyEmail.trim() }),
                            });

                            setConsistencyResult(res);

                            const matches = res?.matches;
                            toast({
                              title: "Diagnóstico completado",
                              description:
                                matches === true
                                  ? "La cuenta está sincronizada (Auth y Profile coinciden)."
                                  : matches === false
                                    ? "La cuenta está desincronizada: Auth y Profile no coinciden."
                                    : "Cuenta incompleta: falta Auth o Profile para este email.",
                              variant: matches === true ? "default" : "destructive",
                            });
                          } catch (err) {
                            logError("user-consistency", err);
                            toast({
                              title: "Diagnóstico falló",
                              description: getUserFriendlyError(err),
                              variant: "destructive",
                            });
                          } finally {
                            setIsCheckingConsistency(false);
                          }
                        }}
                      >
                        {isCheckingConsistency ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Revisando...</> : "Revisar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                 
                <Dialog open={isAssignUserDialogOpen} onOpenChange={setIsAssignUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Asignar Existente
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Asignar Usuario a Taller</DialogTitle>
                    <DialogDescription>
                      Asigna un usuario existente a un taller
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email del Usuario</Label>
                      <Input
                        type="email"
                        value={assignUserData.email}
                        onChange={(e) => setAssignUserData({ ...assignUserData, email: e.target.value })}
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Taller</Label>
                      <Select
                        value={assignUserData.workshopId}
                        onValueChange={(value) => setAssignUserData({ ...assignUserData, workshopId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar taller" />
                        </SelectTrigger>
                        <SelectContent>
                          {workshops?.map((workshop) => (
                            <SelectItem key={workshop.id} value={workshop.id}>
                              {workshop.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <Select
                        value={assignUserData.role}
                        onValueChange={(value: "admin" | "employee") => setAssignUserData({ ...assignUserData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="employee">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignUserDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => assignUserToWorkshop.mutate(assignUserData)}
                      disabled={!assignUserData.email || !assignUserData.workshopId || assignUserToWorkshop.isPending}
                    >
                      {assignUserToWorkshop.isPending ? "Asignando..." : "Asignar Usuario"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p>Cargando usuarios...</p>
              ) : (
                <div className="space-y-6">
                  {workshops?.map((workshop) => {
                    const workshopUsers = userRoles?.filter(r => r.workshop_id === workshop.id) || [];
                    if (workshopUsers.length === 0) return null;
                    
                    return (
                      <div key={workshop.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{workshop.name}</span>
                            <code className="bg-background px-2 py-0.5 rounded text-xs">
                              {workshop.code}
                            </code>
                          </div>
                          <Badge variant="outline">{workshopUsers.length} usuarios</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Usuario</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workshopUsers.map((role) => (
                              <TableRow key={role.id}>
                                <TableCell className="font-medium">
                                  {role.profile?.full_name && role.profile?.email && role.profile.full_name.toLowerCase() === role.profile.email.toLowerCase()
                                    ? "Sin nombre"
                                    : role.profile?.full_name || "Sin nombre"}
                                </TableCell>
                                <TableCell>{role.profile?.email || "-"}</TableCell>
                                <TableCell>
                                  {role.globalRole === "superadmin" ? (
                                    <Badge className="bg-amber-500 text-white">SuperAdmin</Badge>
                                  ) : (
                                    <Select
                                      value={role.role}
                                      onValueChange={(value: "admin" | "employee") => 
                                        updateUserRole.mutate({ userId: role.user_id, workshopId: role.workshop_id, newRole: value })
                                      }
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="employee">Empleado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setPasswordChangeData({
                                          userId: role.user_id,
                                          userEmail: role.profile?.email || "",
                                          userName: role.profile?.full_name || role.profile?.email || "Usuario",
                                          newPassword: "",
                                        });
                                        setIsChangePasswordDialogOpen(true);
                                      }}
                                    >
                                      <Key className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Remover usuario del taller?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta acción eliminará el acceso del usuario a este taller (no elimina su cuenta).
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => role.profile?.id && deleteUserRole.mutate({ profileId: role.profile.id, workshopId: role.workshop_id })}
                                            className="bg-orange-500 text-white hover:bg-orange-600"
                                          >
                                            Remover del taller
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    {role.globalRole !== "superadmin" && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleteUserData({
                                          userId: role.user_id,
                                          userEmail: role.profile?.email || "",
                                          userName: role.profile?.full_name || role.profile?.email || "Usuario",
                                        })}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                  
                  {/* Usuarios sin taller asignado */}
                  {userRoles?.filter(r => !r.workshop_id).length ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">Sin taller asignado</span>
                        </div>
                        <Badge variant="outline">
                          {userRoles.filter(r => !r.workshop_id).length} usuarios
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userRoles.filter(r => !r.workshop_id).map((role) => (
                            <TableRow key={role.id}>
                              <TableCell className="font-medium">
                                {role.profile?.full_name || "Sin nombre"}
                              </TableCell>
                              <TableCell>{role.profile?.email || "-"}</TableCell>
                              <TableCell>
                                {role.globalRole === "superadmin" ? (
                                  <Badge className="bg-amber-500 text-white">SuperAdmin</Badge>
                                ) : (
                                  <Badge variant="secondary">{role.role}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Eliminar rol de usuario?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción eliminará el rol del usuario.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => role.profile?.id && role.workshop_id && deleteUserRole.mutate({ profileId: role.profile.id, workshopId: role.workshop_id })}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="su-access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Acceso aislado SuperAdmin
              </CardTitle>
              <CardDescription>Configura la ruta privada y credenciales del login global</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ruta del login SuperAdmin</Label>
                  <Input
                    value={superAdminAccessForm.loginPath}
                    onChange={(event) => setSuperAdminAccessForm({
                      ...superAdminAccessForm,
                      loginPath: event.target.value.startsWith("/") ? event.target.value : `/${event.target.value}`,
                    })}
                    placeholder="/auth_su"
                    disabled={loadingSuperAdminAccess}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL actual: {window.location.origin}{superAdminAccessForm.loginPath || "/auth_su"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Codigo SuperAdmin</Label>
                  <Input
                    value={superAdminAccessForm.workshopCode}
                    onChange={(event) => setSuperAdminAccessForm({
                      ...superAdminAccessForm,
                      workshopCode: event.target.value.toUpperCase(),
                    })}
                    placeholder="ADMINWARRIOR"
                    className="uppercase"
                    disabled={loadingSuperAdminAccess}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Correo SuperAdmin</Label>
                  <Input
                    type="email"
                    value={superAdminAccessForm.email}
                    onChange={(event) => setSuperAdminAccessForm({
                      ...superAdminAccessForm,
                      email: event.target.value,
                    })}
                    placeholder="superadmin@dominio.com"
                    disabled={loadingSuperAdminAccess}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nueva contrasena</Label>
                  <div className="relative">
                    <Input
                      type={showSuperAdminPassword ? "text" : "password"}
                      value={superAdminAccessForm.password}
                      onChange={(event) => setSuperAdminAccessForm({
                        ...superAdminAccessForm,
                        password: event.target.value,
                      })}
                      placeholder="Dejar vacio para conservarla"
                      disabled={loadingSuperAdminAccess}
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                    >
                      {showSuperAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                Solo puede existir una configuracion de acceso SuperAdmin. Al guardar, ese correo queda sincronizado como el unico rol global <code className="px-1 py-0.5 rounded bg-background">superadmin</code>.
              </div>

              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={() => updateSuperAdminAccess.mutate()}
                  disabled={
                    updateSuperAdminAccess.isPending
                    || loadingSuperAdminAccess
                    || !superAdminAccessForm.workshopCode.trim()
                    || !superAdminAccessForm.email.trim()
                    || !superAdminAccessForm.loginPath.trim()
                  }
                >
                  {updateSuperAdminAccess.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar acceso
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Almacenamiento de Archivos
              </CardTitle>
              <CardDescription>Configuración global del endpoint de uploads en tu hosting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-start gap-3">
                  {storageConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {storageConfigured ? "Servidor configurado" : "Servidor no configurado"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {storageConfigured 
                        ? "Los archivos se suben directamente al endpoint de uploads de tu host" 
                        : "Configura el endpoint de uploads para poder subir imágenes y archivos"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>URL del Endpoint PHP</Label>
                  <Input 
                    value={storageEndpoint}
                    onChange={(e) => setStorageEndpoint(e.target.value)}
                    placeholder="https://tudominio.com/php/secure_upload.php"
                  />
                  <p className="text-xs text-muted-foreground">
                    La URL completa donde está instalado el script secure_upload.php
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    <strong>Subida directa:</strong> Ya no se utiliza API key. El frontend envía los archivos
                    directamente al endpoint de uploads del host con autenticación del sistema.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button 
                    className="gap-2" 
                    onClick={handleSaveStorageSettings}
                    disabled={updateAppSettings.isPending || loadingAppSettings}
                  >
                    {updateAppSettings.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Configuración
                  </Button>
                </div>
              </div>

              {/* Test Upload Section */}
              <div className="pt-6 border-t">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Probar Carga de Archivos
                </h4>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input 
                        type="file"
                        accept="image/*"
                        disabled={!storageConfigured || isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const result = await uploadFile(file);
                            if (result.success && result.url) {
                              setTestImageUrl(result.url);
                              toast({
                                title: "Imagen subida correctamente",
                                description: `URL: ${result.url}`,
                              });
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {isUploading && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Subiendo... {progress}%</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {testImageUrl && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Imagen subida exitosamente:</p>
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <img 
                          src={testImageUrl} 
                          alt="Test upload" 
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                        <div className="flex-1 space-y-2">
                          <Input value={testImageUrl} readOnly className="text-xs" />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(testImageUrl);
                              toast({
                                title: "URL copiada",
                                description: "La URL de la imagen ha sido copiada al portapapeles",
                              });
                            }}
                          >
                            Copiar URL
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!storageConfigured && (
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Configura el servidor de archivos primero para probar la carga
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t">
                <h4 className="font-medium mb-4">Instrucciones de Instalación</h4>
                
                <div className="mb-6">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => {
                      window.open('/php/upload.php', '_blank');
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Descargar upload.php
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Descarga el archivo PHP para instalarlo en tu hosting compartido
                  </p>
                </div>

                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-foreground dark:text-primary">1.</span>
                    Descarga el archivo <code className="px-1 py-0.5 rounded bg-muted">upload.php</code> usando el botón de arriba
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-foreground dark:text-primary">2.</span>
                    Súbelo a tu hosting compartido (ej: <code className="px-1 py-0.5 rounded bg-muted">public_html/api/upload.php</code>)
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-foreground dark:text-primary">3.</span>
                    Crea una carpeta <code className="px-1 py-0.5 rounded bg-muted">uploads</code> en el mismo directorio con permisos 755
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-foreground dark:text-primary">4.</span>
                    Asegúrate de que el endpoint acepte peticiones autenticadas de la app y guarde archivos en <code className="px-1 py-0.5 rounded bg-muted">/uploads</code>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-foreground dark:text-primary">5.</span>
                    Ingresa únicamente la URL del endpoint de uploads
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Card */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Mantenimiento de Archivos
              </CardTitle>
              <CardDescription>Elimina imágenes subidas que ya no están en uso en ningún módulo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escanea todos los talleres y carpetas (productos, servicios, logos, avatares) y elimina los archivos que no están referenciados en la base de datos.
              </p>

              {cleanupResult && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm flex gap-4">
                  <span className="text-destructive font-medium">{cleanupResult.deleted} eliminados</span>
                  <span className="text-muted-foreground">{cleanupResult.kept} en uso</span>
                </div>
              )}

              <Button
                variant="outline"
                className="gap-2"
                disabled={isCleaning}
                onClick={async () => {
                  setIsCleaning(true);
                  setCleanupResult(null);
                  try {
                    const result = await phpApiCleanup();
                    setCleanupResult(result);
                    toast({
                      title: "Limpieza completada",
                      description: `${result.deleted} archivo(s) eliminado(s), ${result.kept} en uso`,
                    });
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  } finally {
                    setIsCleaning(false);
                  }
                }}
              >
                {isCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Limpiar imágenes no usadas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para cambiar contraseña */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={(open) => {
        setIsChangePasswordDialogOpen(open);
        if (!open) {
          setPasswordChangeData(null);
          setShowChangePassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Cambiar contraseña de: {passwordChangeData?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  type={showChangePassword ? "text" : "password"}
                  value={passwordChangeData?.newPassword || ""}
                  onChange={(e) => setPasswordChangeData(prev => prev ? { ...prev, newPassword: e.target.value } : null)}
                  placeholder="Mínimo 8 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  {showChangePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                La contraseña debe tener al menos 8 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={!passwordChangeData?.newPassword || passwordChangeData.newPassword.length < 8 || isChangingPassword}
            >
              {isChangingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Actualizando...</> : "Cambiar Contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Permanently Dialog */}
      <AlertDialog open={!!deleteUserData} onOpenChange={(open) => !open && setDeleteUserData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">¿Eliminar usuario permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción <strong>no se puede deshacer</strong>. Se eliminará permanentemente la cuenta de "{deleteUserData?.userName}" incluyendo:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Datos de autenticación</li>
                <li>Perfil del usuario</li>
                <li>Todos los roles en todos los talleres</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUserPermanently}
              disabled={isDeletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Eliminando...</> : "Eliminar Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
