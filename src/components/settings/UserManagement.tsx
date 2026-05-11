import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Shield, Trash2, Loader2, UserPlus } from "lucide-react";
import { useProfiles, useUpdateUserRole, useDeleteUserFromWorkshop, type UserWithRole } from "@/hooks/useProfiles";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkshop } from "@/hooks/useWorkshop";
import { logError, getUserFriendlyError } from "@/lib/errorHandler";
import { phpApiRequest } from "@/lib/phpApi";

export function UserManagement() {
  const { data: users, isLoading } = useProfiles();
  const { user: currentUser } = useAuth();
  const { currentWorkshop } = useWorkshop();
  const workshopId = currentWorkshop?.id;
  const updateUserRole = useUpdateUserRole();
  const removeUserFromWorkshop = useDeleteUserFromWorkshop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "employee">("employee");
  const [isCreating, setIsCreating] = useState(false);

  const handleRoleChange = async (userId: string, role: "admin" | "employee") => {
    await updateUserRole.mutateAsync({ userId, role });
  };

  const handleAddUser = async () => {
    // Client-side validation
    if (!newUserEmail || !newUserName || !newUserPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (!workshopId) {
      toast({
        title: "Error",
        description: "No se pudo determinar el taller actual",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      await phpApiRequest("/profiles.php?action=invite", {
        method: "POST",
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword,
          full_name: newUserName.trim(),
          role: newUserRole,
          workshop_id: workshopId,
        }),
      });

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });

      // Reset form
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("employee");
      setAddUserDialogOpen(false);

      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error) {
      logError('Error creating user', error);
      toast({
        title: "Error al crear usuario",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      if (!workshopId) {
        throw new Error("No se pudo determinar el taller actual");
      }

      // IMPORTANT: In a multi-tenant system, workshop admins should remove a user
      // from the current workshop (delete role), not delete the user's profile.
      // Profile deletion is restricted and should be handled only by SuperAdmin flows.
      await removeUserFromWorkshop.mutateAsync({
        profileId: deleteUser.id,
        workshopId,
      });

      toast({
        title: "Usuario removido",
        description: "El usuario ha sido removido del taller",
      });

      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error) {
      logError('Error deleting user from workshop', error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    }

    setDeleteUser(null);
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge className="bg-primary text-primary-foreground">
        <Shield className="w-3 h-3 mr-1" />
        Administrador
      </Badge>
    ) : (
      <Badge variant="outline">Empleado</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestión de Usuarios
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <Button onClick={() => setAddUserDialogOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Agregar Usuario
        </Button>
      </div>

      <div className="space-y-3">
        {users?.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user.user_id === currentUser?.id ? (
                getRoleBadge(user.role || "employee")
              ) : (
                <Select
                  value={user.role || "employee"}
                  onValueChange={(value: "admin" | "employee") =>
                    handleRoleChange(user.user_id, value)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {user.user_id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteUser(user)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {users?.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay usuarios registrados</p>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Usuario</DialogTitle>
            <DialogDescription>
              Crea una nueva cuenta de usuario para el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select
                value={newUserRole}
                onValueChange={(value: "admin" | "employee") => setNewUserRole(value)}
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
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleAddUser} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover usuario del taller?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no elimina la cuenta; solo remueve el acceso del usuario "{deleteUser?.full_name}" a este taller.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
