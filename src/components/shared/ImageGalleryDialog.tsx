import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ImageIcon, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadFolder } from "@/hooks/useFileUpload";
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
import { useToast } from "@/hooks/use-toast";
import { resolveStorageUrl } from "@/lib/phpApi";
import { useGalleryFiles, type GalleryFile } from "@/hooks/useGalleryFiles";

interface ImageGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: UploadFolder;
  workshopCode?: string;
  onSelect: (url: string) => void;
  /** "list" muestra filas con nombre de archivo y un buscador; "grid" (default) es la vista de miniaturas clásica. */
  layout?: "grid" | "list";
}

export function ImageGalleryDialog({
  open,
  onOpenChange,
  folder,
  workshopCode,
  onSelect,
  layout = "grid",
}: ImageGalleryDialogProps) {
  const { files, loading, error, reload, deleteFile, updateMeta } = useGalleryFiles({
    folder,
    workshopCode,
    enabled: open,
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<GalleryFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [editingFilename, setEditingFilename] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setSearch("");
      setEditingFilename(null);
    }
  }, [open]);

  const visibleFiles = useMemo(() => {
    if (layout !== "list" || !search.trim()) return files;
    const term = search.trim().toLowerCase();
    return files.filter((f) =>
      f.filename.toLowerCase().includes(term) ||
      (f.title ?? "").toLowerCase().includes(term) ||
      (f.description ?? "").toLowerCase().includes(term)
    );
  }, [files, layout, search]);

  const handleEditClick = (file: GalleryFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFilename(file.filename);
    setTitleDraft(file.title ?? "");
    setDescriptionDraft(file.description ?? "");
  };

  const handleSaveMeta = async (file: GalleryFile) => {
    setSavingMeta(true);
    try {
      await updateMeta(file, { title: titleDraft, description: descriptionDraft });
      setEditingFilename(null);
    } catch (err) {
      console.error("Error saving image meta:", err);
      toast({ title: "Error", description: "No se pudo guardar el título", variant: "destructive" });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSelect = () => {
    const file = files.find((f) => f.filename === selectedFile);
    if (file) {
      onSelect(file.url);
      onOpenChange(false);
    }
  };

  const handleDeleteClick = (file: GalleryFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    setDeleting(true);
    try {
      await deleteFile(fileToDelete);
      toast({ title: "Éxito", description: "Imagen eliminada correctamente" });
      if (selectedFile === fileToDelete.filename) setSelectedFile(null);
    } catch (err) {
      console.error("Error deleting file:", err);
      toast({ title: "Error", description: "Error de conexión al eliminar", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Galería de Imágenes
              </span>
              <Button variant="ghost" size="icon" onClick={() => void reload()} disabled={loading}>
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {layout === "list" && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título o nombre de archivo…"
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              layout === "list" ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              )
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <p>{error}</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <p>No hay imágenes en esta carpeta</p>
              </div>
            ) : visibleFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Search className="w-12 h-12 mb-2 opacity-50" />
                <p>Ningún archivo coincide con "{search}"</p>
              </div>
            ) : layout === "list" ? (
              <div className="space-y-1.5">
                {visibleFiles.map((file) =>
                  editingFilename === file.filename ? (
                    <div
                      key={`${file.filename}-${file.cacheBuster}`}
                      className="flex flex-col gap-1.5 w-full rounded-lg border-2 border-primary/50 bg-primary/5 p-2"
                    >
                      <Input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        placeholder="Título (para buscarla más fácil)"
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Input
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        placeholder="Descripción (opcional)"
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2 justify-end pt-0.5">
                        <Button variant="ghost" size="sm" onClick={() => setEditingFilename(null)} disabled={savingMeta}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => void handleSaveMeta(file)} disabled={savingMeta}>
                          {savingMeta ? "Guardando…" : "Guardar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`${file.filename}-${file.cacheBuster}`}
                      className="relative group"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFile(file.filename)}
                        className={cn(
                          "flex items-center gap-3 w-full rounded-lg border-2 p-1.5 pr-16 text-left transition-all",
                          "hover:border-primary/50",
                          selectedFile === file.filename
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/40",
                        )}
                      >
                        <div className="w-14 h-10 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          <img
                            key={`img-${file.filename}-${file.cacheBuster}`}
                            src={resolveStorageUrl(file.previewUrl) ?? undefined}
                            alt={file.title || file.filename}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.retried) {
                                target.dataset.retried = "true";
                                const url = new URL(target.src);
                                url.searchParams.set("t", Date.now().toString());
                                target.src = url.toString();
                              } else {
                                target.src = "/placeholder.svg";
                              }
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate" title={file.title || file.filename}>
                            {file.title || file.filename}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {file.title && <span className="font-mono">{file.filename} · </span>}
                            {formatSize(file.size)} • {formatDate(file.modified)}
                          </p>
                        </div>
                        {selectedFile === file.filename && (
                          <div className="shrink-0 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        className="absolute top-1/2 -translate-y-1/2 right-9 text-muted-foreground hover:text-primary p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleEditClick(file, e)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="absolute top-1/2 -translate-y-1/2 right-2 text-muted-foreground hover:text-destructive p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteClick(file, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {visibleFiles.map((file) => (
                  <div key={`${file.filename}-${file.cacheBuster}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => setSelectedFile(file.filename)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all w-full",
                        "hover:ring-2 hover:ring-primary/50",
                        selectedFile === file.filename
                          ? "border-primary ring-2 ring-primary"
                          : "border-transparent",
                      )}
                    >
                      <img
                        key={`img-${file.filename}-${file.cacheBuster}`}
                        src={resolveStorageUrl(file.previewUrl) ?? undefined}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.retried) {
                            target.dataset.retried = "true";
                            const url = new URL(target.src);
                            url.searchParams.set("t", Date.now().toString());
                            target.src = url.toString();
                          } else {
                            target.src = "/placeholder.svg";
                          }
                        }}
                      />
                      {selectedFile === file.filename && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                        {formatSize(file.size)} • {formatDate(file.modified)}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      onClick={(e) => handleDeleteClick(file, e)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSelect} disabled={!selectedFile}>Seleccionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La imagen "{fileToDelete?.filename}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
