import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Users, UserPlus, Trash2, Loader2, Building2, Key,
  Eye, EyeOff, Search, Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";
import { logError, getUserFriendlyError } from "@/lib/errorHandler";
import { useSuperAdminWorkshops, useSuperAdminUserRoles } from "../hooks";

export function UsersTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workshops } = useSuperAdminWorkshops(isSuperAdmin);
  const { data: userRoles, isLoading: usersLoading } = useSuperAdminUserRoles(
    isSuperAdmin,
    workshops?.length || 0
  );

  // Create user
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "", password: "", fullName: "", workshopId: "",
    role: "employee" as "admin" | "employee",
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Assign existing user
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const [assignUserData, setAssignUserData] = useState({
    email: "", workshopId: "", role: "employee" as "admin" | "employee",
  });

  // Consistency diagnosis
  const [isConsistencyOpen, setIsConsistencyOpen] = useState(false);
  const [consistencyEmail, setConsistencyEmail] = useState("");
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [isRepairingAccount, setIsRepairingAccount] = useState(false);

  // Change password
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState<{
    userId: string; userEmail: string; userName: string; newPassword: string;
  } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete permanently
  const [deleteUserData, setDeleteUserData] = useState<{
    userId: string; userEmail: string; userName: string;
  } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const assignUserToWorkshop = useMutation({
    mutationFn: async (data: { email: string; workshopId: string; role: "admin" | "employee" }) => {
      const normalizedEmail = data.email.trim().toLowerCase();
      const existingRole = userRoles?.find(
        (r) => r.workshop_id === data.workshopId && r.profile?.email?.toLowerCase() === normalizedEmail
      );
      if (existingRole) throw new Error("El usuario ya está asignado a este taller");

      const profile = await phpApiRequest<{ user_id: string }>(
        `/profiles.php?action=find-by-email&email=${encodeURIComponent(normalizedEmail)}`
      );
      await phpApiRequest("/profiles.php?action=assign", {
        method: "POST",
        body: JSON.stringify({ user_id: profile.user_id, workshop_id: data.workshopId, role: data.role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setIsAssignUserOpen(false);
      setAssignUserData({ email: "", workshopId: "", role: "employee" });
      toast({ title: "Usuario asignado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  const deleteUserRole = useMutation({
    mutationFn: async ({ profileId, workshopId }: { profileId: string; workshopId: string }) => {
      await phpApiRequest(
        `/profiles.php?id=${encodeURIComponent(profileId)}&workshop_id=${encodeURIComponent(workshopId)}`,
        { method: "DELETE" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      toast({ title: "Usuario removido del taller" });
    },
  });

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
      setIsCreateUserOpen(false);
      setNewUserData({ email: "", password: "", fullName: "", workshopId: "", role: "employee" });
      toast({ title: "Usuario creado exitosamente" });
    } catch (error) {
      logError(error, "handleCreateUser");
      toast({ title: "Error", description: getUserFriendlyError(error), variant: "destructive" });
    } finally {
      setIsCreatingUser(false);
    }
  };

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
      setIsChangePasswordOpen(false);
      setPasswordChangeData(null);
      toast({ title: "Contraseña actualizada exitosamente" });
    } catch (error) {
      logError(error, "handleChangePassword");
      toast({ title: "Error", description: getUserFriendlyError(error), variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteUserPermanently = async () => {
    if (!deleteUserData) return;
    setIsDeletingUser(true);
    try {
      await phpApiRequest("/profiles.php?action=delete-user", {
        method: "POST",
        body: JSON.stringify({ user_id: deleteUserData.userId, email: deleteUserData.userEmail }),
      });
      queryClient.invalidateQueries({ queryKey: ["superadmin-user-roles"] });
      setDeleteUserData(null);
      toast({ title: "Usuario eliminado permanentemente" });
    } catch (error) {
      logError(error, "handleDeleteUserPermanently");
      toast({ title: "Error", description: getUserFriendlyError(error), variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <>
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
            {/* Create user dialog */}
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>Crea un nuevo usuario y asígnalo a un taller</DialogDescription>
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
                      <SelectTrigger><SelectValue placeholder="Seleccionar taller" /></SelectTrigger>
                      <SelectContent>
                        {workshops?.filter((w) => w.is_active).map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="employee">Empleado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={!newUserData.email || !newUserData.password || !newUserData.fullName || !newUserData.workshopId || isCreatingUser}
                  >
                    {isCreatingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Crear Usuario"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Consistency diagnosis dialog */}
            <Dialog open={isConsistencyOpen} onOpenChange={setIsConsistencyOpen}>
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
                  <Button variant="outline" onClick={() => setIsConsistencyOpen(false)}>Cerrar</Button>
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

            {/* Assign existing user dialog */}
            <Dialog open={isAssignUserOpen} onOpenChange={setIsAssignUserOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar Existente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar Usuario a Taller</DialogTitle>
                  <DialogDescription>Asigna un usuario existente a un taller</DialogDescription>
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
                      <SelectTrigger><SelectValue placeholder="Seleccionar taller" /></SelectTrigger>
                      <SelectContent>
                        {workshops?.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="employee">Empleado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignUserOpen(false)}>Cancelar</Button>
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
                const workshopUsers = userRoles?.filter((r) => r.workshop_id === workshop.id) || [];
                if (workshopUsers.length === 0) return null;

                return (
                  <div key={workshop.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{workshop.name}</span>
                        <code className="bg-background px-2 py-0.5 rounded text-xs">{workshop.code}</code>
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
                                  value={role.role ?? undefined}
                                  onValueChange={(value: "admin" | "employee") =>
                                    role.workshop_id &&
                                    updateUserRole.mutate({
                                      userId: role.user_id,
                                      workshopId: role.workshop_id,
                                      newRole: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
                                    setIsChangePasswordOpen(true);
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
                                        onClick={() =>
                                          role.profile?.id && role.workshop_id &&
                                          deleteUserRole.mutate({ profileId: role.profile.id, workshopId: role.workshop_id })
                                        }
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
              {userRoles?.filter((r) => !r.workshop_id).length ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Sin taller asignado</span>
                    </div>
                    <Badge variant="outline">
                      {userRoles.filter((r) => !r.workshop_id).length} usuarios
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
                      {userRoles.filter((r) => !r.workshop_id).map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.profile?.full_name || "Sin nombre"}</TableCell>
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
                                    onClick={() =>
                                      role.profile?.id && role.workshop_id &&
                                      deleteUserRole.mutate({ profileId: role.profile.id, workshopId: role.workshop_id })
                                    }
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

      {/* Change password dialog */}
      <Dialog
        open={isChangePasswordOpen}
        onOpenChange={(open) => {
          setIsChangePasswordOpen(open);
          if (!open) {
            setPasswordChangeData(null);
            setShowChangePassword(false);
          }
        }}
      >
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
                  onChange={(e) =>
                    setPasswordChangeData((prev) => (prev ? { ...prev, newPassword: e.target.value } : null))
                  }
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
            <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                !passwordChangeData?.newPassword ||
                passwordChangeData.newPassword.length < 8 ||
                isChangingPassword
              }
            >
              {isChangingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Actualizando...</> : "Cambiar Contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete permanently dialog */}
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
    </>
  );
}
