import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ImageIcon, RefreshCw, Trash2 } from "lucide-react";
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
}

export function ImageGalleryDialog({
  open,
  onOpenChange,
  folder,
  workshopCode,
  onSelect,
}: ImageGalleryDialogProps) {
  const { files, loading, error, reload, deleteFile } = useGalleryFiles({
    folder,
    workshopCode,
    enabled: open,
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<GalleryFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setSelectedFile(null);
  }, [open]);

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

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
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
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {files.map((file) => (
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
