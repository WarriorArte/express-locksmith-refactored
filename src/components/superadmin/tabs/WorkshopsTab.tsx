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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";
import { useSuperAdminWorkshops } from "../hooks";

export function WorkshopsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workshops, isLoading } = useSuperAdminWorkshops(isSuperAdmin);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState({ name: "", code: "" });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editWorkshop, setEditWorkshop] = useState<{ id: string; name: string; code: string } | null>(null);

  const createWorkshop = useMutation({
    mutationFn: async (workshop: { name: string; code: string }) => {
      const data = await phpApiRequest<{ id: string; name: string; code: string }>("/workshops.php", {
        method: "POST",
        body: JSON.stringify({ name: workshop.name, code: workshop.code.toUpperCase() }),
      });
      await phpApiRequest("/business-settings.php", {
        method: "PUT",
        body: JSON.stringify({ name: workshop.name, workshop_id: data.id }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-workshops"] });
      setIsCreateOpen(false);
      setNewWorkshop({ name: "", code: "" });
      toast({ title: "Taller creado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
      setIsEditOpen(false);
      setEditWorkshop(null);
      toast({ title: "Taller actualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Talleres
            </CardTitle>
            <CardDescription>Gestiona todos los talleres del sistema</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Taller
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Taller</DialogTitle>
                <DialogDescription>Ingresa los datos del nuevo taller</DialogDescription>
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
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
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
          {isLoading ? (
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
                      <code className="bg-muted px-2 py-1 rounded text-sm">{workshop.code}</code>
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
                          setIsEditOpen(true);
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                onChange={(e) => setEditWorkshop((p) => (p ? { ...p, name: e.target.value } : null))}
                placeholder="Nombre del taller"
              />
            </div>
            <div className="space-y-2">
              <Label>Código de Acceso</Label>
              <Input
                value={editWorkshop?.code || ""}
                onChange={(e) => setEditWorkshop((p) => (p ? { ...p, code: e.target.value.toUpperCase() } : null))}
                className="uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => editWorkshop && updateWorkshop.mutate(editWorkshop)}
              disabled={!editWorkshop?.name || !editWorkshop?.code || updateWorkshop.isPending}
            >
              {updateWorkshop.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
