import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImagePlus, Trash2, X, ZoomIn, Camera, Upload, Link } from "lucide-react";
import { useCreateServiceImage, useDeleteServiceImage, useService, type Service } from "@/hooks/useServices";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload, isStorageConfigured } from "@/hooks/useFileUpload";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiDeleteFile, resolveStorageUrl, getStorableUrl } from "@/lib/phpApi";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";

interface ServiceImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const MAX_SERVICE_IMAGES = 2;

export function ServiceImagesDialog({ open, onOpenChange, service: initialService }: ServiceImagesDialogProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageDescription, setNewImageDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  
  // Usar el hook para obtener datos frescos cuando cambian
  const { data: freshService } = useService(initialService?.id);
  const service = freshService || initialService;
  
  const createServiceImage = useCreateServiceImage();
  const deleteServiceImage = useDeleteServiceImage();
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();
  const { uploadFile, isUploading, progress } = useFileUpload({ folder: 'services', workshopCode: currentWorkshop?.code });
  const storageConfigured = isStorageConfigured();

  useEffect(() => {
    if (!open) {
      setViewImageIndex(null);
      setNewImageUrl("");
      setNewImageDescription("");
    }
  }, [open]);

  const viewerImages = (service?.service_images ?? [])
    .filter((image) => Boolean(image.image_url))
    .map((image) => ({
      url: image.image_url,
      description: image.description || undefined,
    }));

  const currentImagesCount = service?.service_images?.length || 0;
  const canAddMoreImages = currentImagesCount < MAX_SERVICE_IMAGES;

  const handleAddImage = async () => {
    if (!service || !newImageUrl.trim()) return;
    if (!canAddMoreImages) {
      toast({
        title: "Límite alcanzado",
        description: `Solo se permiten ${MAX_SERVICE_IMAGES} imágenes por servicio.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsAdding(true);
    try {
      await createServiceImage.mutateAsync({
        service_id: service.id,
        image_url: newImageUrl.trim(),
        description: newImageDescription.trim() || null,
      });
      
      toast({
        title: "Imagen agregada",
        description: "La imagen ha sido agregada al servicio",
      });
      
      setNewImageUrl("");
      setNewImageDescription("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!service || !file) return;
    if (!canAddMoreImages) {
      toast({
        title: "Límite alcanzado",
        description: `Solo se permiten ${MAX_SERVICE_IMAGES} imágenes por servicio.`,
        variant: "destructive",
      });
      return;
    }
    
    const result = await uploadFile(file);
    if (result.success && result.url) {
      // Guardar URL base sin token
      const storableUrl = result.secureUrl || getStorableUrl(result.url);
      setNewImageUrl(storableUrl);
      // Auto-add the image after successful upload
      setIsAdding(true);
      try {
        await createServiceImage.mutateAsync({
          service_id: service.id,
          image_url: storableUrl,
          description: newImageDescription.trim() || null,
        });
        
        toast({
          title: "Imagen agregada",
          description: "La imagen ha sido subida y agregada al servicio",
        });
        
        setNewImageUrl("");
        setNewImageDescription("");
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsAdding(false);
      }
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    try {
      phpApiDeleteFile(imageUrl); // fire-and-forget: delete physical file
      await deleteServiceImage.mutateAsync(imageId);
      toast({
        title: "Imagen eliminada",
        description: "La imagen ha sido eliminada del servicio",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fixedHeight
        disableSwipeToClose={viewImageIndex !== null}
        className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Imágenes del Servicio {service.service_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Agregar Nueva Imagen ({currentImagesCount}/{MAX_SERVICE_IMAGES})</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  type="button"
                  variant={inputMode === 'upload' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!canAddMoreImages}
                  onClick={() => setInputMode('upload')}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Subir
                </Button>
                <Button
                  type="button"
                  variant={inputMode === 'url' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!canAddMoreImages}
                  onClick={() => setInputMode('url')}
                >
                  <Link className="w-3 h-3 mr-1" />
                  URL
                </Button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div className="space-y-3">
                {/* Hidden file inputs */}
                <input
                  id="service-file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isAdding || isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <input
                  id="service-camera-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={isAdding || isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={isAdding || isUploading || !storageConfigured || !canAddMoreImages}
                    onClick={() => document.getElementById('service-file-upload')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar archivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={isAdding || isUploading || !storageConfigured || !canAddMoreImages}
                    onClick={() => document.getElementById('service-camera-upload')?.click()}
                  >
                    <Camera className="w-4 h-4" />
                    Cámara
                  </Button>
                </div>

                {/* Upload progress */}
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

                {!storageConfigured && (
                  <p className="text-xs text-amber-600">
                    Configura el servidor de archivos en Configuración → Almacenamiento
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddImage} 
                  disabled={isAdding || !newImageUrl.trim() || !canAddMoreImages}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}

            <Input
              value={newImageDescription}
              onChange={(e) => setNewImageDescription(e.target.value)}
              placeholder="Descripción de la imagen (opcional)"
              disabled={!canAddMoreImages}
            />
            {!canAddMoreImages && (
              <p className="text-xs text-muted-foreground">
                Ya alcanzaste el máximo de {MAX_SERVICE_IMAGES} imágenes. Elimina una para agregar otra.
              </p>
            )}
          </div>

          {/* Current images */}
          <div className="space-y-3">
            <Label>Imágenes Actuales ({service.service_images?.length || 0})</Label>
            
            {(!service.service_images || service.service_images.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8 bg-muted/50 rounded-lg">
                No hay imágenes registradas
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {service.service_images.map((image, index) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={resolveStorageUrl(image.image_url) ?? undefined}
                      alt={image.description || "Imagen del servicio"}
                      className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setViewImageIndex(index)}
                    />
                    <Button
                      variant="default"
                      size="icon"
                      className="absolute top-2 left-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setViewImageIndex(index)}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteImage(image.id, image.image_url)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    {image.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {image.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(image.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Image Viewer Dialog */}
      <ImageViewDialog
        open={viewImageIndex !== null && viewerImages.length > 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setViewImageIndex(null);
          }
        }}
        images={viewerImages}
        initialIndex={viewImageIndex ?? 0}
      />
    </Dialog>
  );
}
