import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Loader2, Trash2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { phpApiCleanup } from "@/lib/phpApi";

export function StorageTab() {
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useFileUpload({ folder: "general", workshopCode: "system" });

  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; kept: number } | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Probar Carga de Archivos
          </CardTitle>
          <CardDescription>Sube una imagen de prueba para verificar que el servidor de archivos funciona</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                disabled={isUploading}
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
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {testImageUrl && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Imagen subida exitosamente:</p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img src={testImageUrl} alt="Test upload" className="w-32 h-32 object-cover rounded-lg border" />
                <div className="flex-1 space-y-2">
                  <Input value={testImageUrl} readOnly className="text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(testImageUrl);
                      toast({ title: "URL copiada", description: "La URL de la imagen ha sido copiada al portapapeles" });
                    }}
                  >
                    Copiar URL
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
              } catch (err) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "No se pudo completar la limpieza",
                  variant: "destructive",
                });
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
    </>
  );
}
