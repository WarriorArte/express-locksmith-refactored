import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HardDrive, CheckCircle2, AlertCircle, Save, ImageIcon, Loader2,
  Download, Trash2, Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isStorageConfigured, useFileUpload } from "@/hooks/useFileUpload";
import { useAppAdminSettings, useUpdateAppAdminSettings } from "@/hooks/useAppAdminSettings";
import { phpApiCleanup } from "@/lib/phpApi";

export function StorageTab() {
  const { toast } = useToast();
  const { data: appAdminSettings, isLoading: loadingAppSettings } = useAppAdminSettings();
  const updateAppSettings = useUpdateAppAdminSettings();
  const { uploadFile, isUploading, progress } = useFileUpload({ folder: "general", workshopCode: "system" });
  const storageConfigured = isStorageConfigured();

  const [storageEndpoint, setStorageEndpoint] = useState("");
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; kept: number } | null>(null);

  useEffect(() => {
    if (appAdminSettings) {
      setStorageEndpoint(appAdminSettings.storage_endpoint || "");
    }
  }, [appAdminSettings]);

  const handleSave = async () => {
    if (!storageEndpoint.trim()) {
      toast({ title: "Error", description: "La URL del endpoint es requerida", variant: "destructive" });
      return;
    }
    updateAppSettings.mutate({ storage_endpoint: storageEndpoint.trim() });
  };

  return (
    <>
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
                onClick={handleSave}
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
                onClick={() => window.open("/php/upload.php", "_blank")}
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
