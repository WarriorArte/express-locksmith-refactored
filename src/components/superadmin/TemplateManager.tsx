import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, FileText, Printer, Shield, Trash2, Edit, Eye, Loader2, Image as ImageIcon,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllTemplates, templateTypeLabels, Template } from "@/hooks/useTemplates";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TemplateEditorDialog } from "@/components/shared/TemplateEditorDialog";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sanitizeHTML, sanitizeCSS } from "@/lib/sanitize";

const typeIcons: Record<string, any> = {
  quote_pdf: FileText,
  sale_receipt: Printer,
  service_order: Printer,
  warranty_ticket: Shield,
};

export function TemplateManager() {
  const { data: templates, isLoading } = useAllTemplates();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingType, setEditingType] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("sale_receipt");
  const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
  const [thumbnailTemplate, setThumbnailTemplate] = useState<Template | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditingType(template.template_type);
    setEditorOpen(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    const { defaultTemplates } = await import("@/hooks/useTemplates");
    const defaults = defaultTemplates[newType];
    
    try {
      await phpApiRequest("/templates.php", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          template_type: newType,
          html_content: defaults?.html || "",
          css_content: defaults?.css || "",
          is_global: true,
          is_default: false,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["global-templates"] });
      setCreateOpen(false);
      setNewName("");
      toast({ title: "Plantilla creada", description: "Ahora puedes editarla" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error desconocido", variant: "destructive" });
      return;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
      await phpApiRequest(`/templates.php?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });

      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["global-templates"] });
      toast({ title: "Eliminada", description: "Plantilla eliminada" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error desconocido", variant: "destructive" });
    }

    setIsDeleting(false);
    setDeleteId(null);
  };

  const handleSaveThumbnail = async () => {
    if (!thumbnailTemplate) return;

    try {
      await phpApiRequest(`/templates.php?id=${encodeURIComponent(thumbnailTemplate.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          thumbnail_url: thumbnailUrl || null,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["global-templates"] });
      toast({ title: "Thumbnail guardado" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error desconocido", variant: "destructive" });
    }

    setThumbnailDialogOpen(false);
  };

  const globalTemplates = templates?.filter(t => t.is_global) || [];
  const groupedByType = Object.keys(templateTypeLabels).reduce((acc, type) => {
    acc[type] = globalTemplates.filter(t => t.template_type === type);
    return acc;
  }, {} as Record<string, Template[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Gestión de Plantillas
          </h3>
          <p className="text-sm text-muted-foreground">
            Crea y edita plantillas globales disponibles para todos los talleres
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </Button>
      </div>

      {Object.entries(groupedByType).map(([type, tmps]) => {
        const Icon = typeIcons[type] || FileText;
        return (
          <div key={type}>
            <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {templateTypeLabels[type]}
              <Badge variant="outline" className="ml-2">{tmps.length}</Badge>
            </h4>
            
            {tmps.length === 0 ? (
              <p className="text-xs text-muted-foreground italic mb-4 pl-6">
                Sin plantillas globales para este tipo
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {tmps.map((template) => (
                  <Card key={template.id} className="overflow-hidden group">
                    <div className="aspect-[4/3] bg-muted relative flex items-center justify-center overflow-hidden">
                      {template.thumbnail_url ? (
                        <img 
                          src={template.thumbnail_url} 
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <div 
                            className="transform scale-[0.3] origin-top-left w-[300%] h-[300%] pointer-events-none"
                          >
                            <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(template.css_content || "") }} />
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(template.html_content || "") }} />
                          </div>
                        </div>
                      )}
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(template)}>
                          <Edit className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setPreviewTemplate(template)}>
                          <Eye className="w-3 h-3 mr-1" /> Ver
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{template.name}</p>
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => {
                              setThumbnailTemplate(template);
                              setThumbnailUrl(template.thumbnail_url || "");
                              setThumbnailDialogOpen(true);
                            }}
                          >
                            <ImageIcon className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Plantilla Global</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Ticket Moderno" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(templateTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Los talleres que la tengan seleccionada volverán a la plantilla por defecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Thumbnail URL Dialog */}
      <Dialog open={thumbnailDialogOpen} onOpenChange={setThumbnailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imagen de Vista Previa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL de la imagen</Label>
              <Input 
                value={thumbnailUrl} 
                onChange={e => setThumbnailUrl(e.target.value)} 
                placeholder="https://ejemplo.com/preview.png" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pega la URL de una imagen que represente esta plantilla
              </p>
            </div>
            {thumbnailUrl && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThumbnailDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveThumbnail}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa - {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
            {previewTemplate?.template_type === "quote_pdf" ? (
              <div 
                className="mx-auto bg-white shadow-lg"
                style={{ width: '100%', maxWidth: '816px', minHeight: '1056px', padding: '1in' }}
              >
                <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(previewTemplate?.css_content || "") }} />
                <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewTemplate?.html_content || "") }} />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="bg-white shadow-lg" style={{ width: '304px', padding: '5mm' }}>
                  <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(previewTemplate?.css_content || "") }} />
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewTemplate?.html_content || "") }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewTemplate(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor (reused) */}
      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        templateType={editingType}
        editTemplate={editingTemplate}
        isGlobalMode
      />
    </div>
  );
}
