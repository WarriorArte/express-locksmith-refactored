import { useState } from "react";
import { Plus, Edit, Loader2, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/hooks/useCategories";
import type { Category } from "@/hooks/useCategories";

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#2563eb");

  const handleCreate = async () => {
    if (categoryName.trim()) {
      await createCategory.mutateAsync({
        name: categoryName.trim(),
        color: categoryColor,
      });
      setCategoryName("");
      setCategoryColor("#2563eb");
      setNewCategoryOpen(false);
    }
  };

  const handleUpdate = async () => {
    if (editingCategory && categoryName.trim()) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: categoryName.trim(),
        color: categoryColor,
      });
      setCategoryName("");
      setCategoryColor("#2563eb");
      setEditingCategory(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmCategory) {
      await deleteCategory.mutateAsync(deleteConfirmCategory.id);
      setDeleteConfirmCategory(null);
    }
  };

  const openEdit = (category: Category) => {
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setEditingCategory(category);
  };

  const openCreate = () => {
    setCategoryName("");
    setCategoryColor("#2563eb");
    setNewCategoryOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Categorías</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button className="w-full" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Nueva categoría
            </Button>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="m3-list max-h-[50vh] overflow-y-auto">
                {categories?.map((cat) => (
                  <div key={cat.id} className="m3-list-item flex min-h-14 items-center justify-between gap-3 bg-muted py-2 pl-4 pr-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-[15px] font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-11 w-11"
                        onClick={() => openEdit(cat)}
                        aria-label={`Editar ${cat.name}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-11 w-11 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmCategory(cat)}
                        aria-label={`Eliminar ${cat.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {categories?.length === 0 && (
                  <p className="rounded-[20px] bg-muted py-6 text-center text-[15px] text-muted-foreground">Aún no hay categorías</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input 
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input 
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="proto-ghost" onClick={() => setNewCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createCategory.isPending || !categoryName.trim()}>
              {createCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input 
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input 
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="proto-ghost" onClick={() => setEditingCategory(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateCategory.isPending || !categoryName.trim()}>
              {updateCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmCategory} onOpenChange={() => setDeleteConfirmCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productos con esta categoría quedarán sin categoría asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
