import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Download, Upload, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiRequest } from "@/lib/phpApi";

interface ResetLog {
  message: string;
  type: "info" | "success" | "error";
  timestamp: Date;
}

export function BackupManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetLogs, setResetLogs] = useState<ResetLog[]>([]);
  const [resetComplete, setResetComplete] = useState(false);
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshop();

  const getWorkshopQuery = () => {
    if (!currentWorkshop?.id) {
      throw new Error("No hay taller seleccionado");
    }
    return `workshop_id=${encodeURIComponent(currentWorkshop.id)}`;
  };

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    setResetLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  const deleteWorkshopFolder = async (folderType: string): Promise<{ deleted: number; errors: number }> => {
    if (!currentWorkshop?.id) {
      return { deleted: 0, errors: 0 };
    }

    let deleted = 0;
    let errors = 0;

    try {
      const files = await phpApiRequest<Array<{ filename: string; folder?: string }>>(
        `/uploads.php?action=list&folder=${encodeURIComponent(folderType)}`,
        { method: "GET" }
      );

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('filename', file.filename);
          formData.append('folder', file.folder || folderType);

          await phpApiRequest<null>(`/uploads.php?action=delete`, {
            method: 'POST',
            body: formData,
          });
          deleted++;
        } catch {
          errors++;
        }
      }
    } catch (error) {
      console.error(`[Reset] Error deleting folder ${folderType}:`, error);
    }

    return { deleted, errors };
  };

  const exportEndpoints = [
    { key: "business_settings", endpoint: "/business-settings.php" },
    { key: "categories", endpoint: "/categories.php" },
    { key: "customers", endpoint: "/customers.php" },
    { key: "products", endpoint: "/products.php" },
    { key: "quotes", endpoint: "/quotes.php" },
    { key: "sales", endpoint: "/sales.php" },
    { key: "services", endpoint: "/services.php" },
    { key: "inventory_movements", endpoint: "/inventory-movements.php" },
    { key: "tags", endpoint: "/tags.php" },
    { key: "templates", endpoint: "/templates.php" },
    { key: "warranties", endpoint: "/warranties.php" },
    { key: "warranty_settings_bundle", endpoint: "/warranty-settings.php" },
  ];

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const workshopQuery = getWorkshopQuery();

      const backup: Record<string, any> = {
        timestamp: new Date().toISOString(),
        version: "php-hosting-1.0",
        workshop_id: currentWorkshop?.id,
        tables: {}
      };

      for (const item of exportEndpoints) {
        const data = await phpApiRequest<any>(`${item.endpoint}?${workshopQuery}`, {
          method: "GET",
        });
        backup.tables[item.key] = data ?? [];
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup creado",
        description: "La copia de seguridad se descargó correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al crear backup",
        description: error.message || "No se pudo crear el backup",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsRestoring(true);
    try {
      const file = event.target.files?.[0];
      if (!file) {
        throw new Error("No se seleccionó ningún archivo");
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      await phpApiRequest<{ restored_at: string; workshop_id: string; counts: Record<string, number> }>(
        "/backup-restore.php",
        {
          method: "POST",
          body: JSON.stringify({
            workshop_id: currentWorkshop?.id,
            backup,
          }),
        }
      );

      toast({
        title: "Backup restaurado",
        description: "La restauración finalizó correctamente. Se recargará la aplicación.",
      });

      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error al restaurar backup",
        description: error.message || "No se pudo restaurar el backup",
        variant: "destructive",
      });
    }
    setIsRestoring(false);
    event.target.value = "";
  };

  const handleReset = async () => {
    if (resetConfirmText !== "RESTAURAR") return;

    setIsResetting(true);
    setResetLogs([]);
    setResetComplete(false);
    
    try {
      addLog("Iniciando restauración del sistema...", "info");
      const workshopQuery = getWorkshopQuery();

      const resetResources: Array<{ label: string; endpoint: string }> = [
        { label: "garantías", endpoint: "/warranties.php" },
        { label: "servicios", endpoint: "/services.php" },
        { label: "ventas", endpoint: "/sales.php" },
        { label: "cotizaciones", endpoint: "/quotes.php" },
        { label: "productos", endpoint: "/products.php" },
        { label: "clientes", endpoint: "/customers.php" },
        { label: "etiquetas", endpoint: "/tags.php" },
        { label: "categorías", endpoint: "/categories.php" },
        { label: "plantillas", endpoint: "/templates.php" },
      ];

      addLog("Eliminando registros de base de datos...", "info");
      for (const resource of resetResources) {
        try {
          const rows = await phpApiRequest<Array<{ id: string }>>(
            `${resource.endpoint}?${workshopQuery}`,
            { method: "GET" }
          );

          let deletedCount = 0;
          for (const row of rows || []) {
            if (!row?.id) continue;
            await phpApiRequest<null>(`${resource.endpoint}?id=${encodeURIComponent(row.id)}`, {
              method: "DELETE",
            });
            deletedCount++;
          }

          addLog(`✓ ${resource.label}: ${deletedCount} registros eliminados`, "success");
        } catch (error: any) {
          addLog(`⚠️ Error en ${resource.label}: ${error.message || "desconocido"}`, "error");
        }
      }

      addLog("Eliminando archivos multimedia...", "info");
      const folderTypes = ['services', 'products', 'customers', 'general'];
      let totalDeleted = 0;
      let totalErrors = 0;

      for (const folderType of folderTypes) {
        addLog(`  Procesando carpeta ${folderType}...`, "info");
        const result = await deleteWorkshopFolder(folderType);
        totalDeleted += result.deleted;
        totalErrors += result.errors;
        if (result.deleted > 0) {
          addLog(`  ✓ ${result.deleted} archivos eliminados de ${folderType}`, "success");
        }
      }

      addLog("", "info");
      addLog("═══════════════════════════════════════", "info");
      addLog("✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE", "success");
      addLog(`📊 Archivos multimedia eliminados: ${totalDeleted}`, "info");
      if (totalErrors > 0) {
        addLog(`⚠️ Errores encontrados: ${totalErrors}`, "error");
      }
      addLog("═══════════════════════════════════════", "info");

      setResetComplete(true);

      toast({
        title: "Sistema restaurado",
        description: `Los datos principales del taller han sido eliminados. ${totalDeleted} archivos multimedia eliminados.`,
      });
    } catch (error: any) {
      addLog(`❌ Error crítico: ${error.message}`, "error");
      toast({
        title: "Error al restaurar sistema",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsResetting(false);
  };

  const handleCloseResetDialog = () => {
    if (resetComplete) {
      window.location.reload();
    } else {
      setResetDialogOpen(false);
      setResetConfirmText("");
      setResetLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Respaldo de Datos</h3>
        <p className="text-sm text-muted-foreground">
          Crea copias de seguridad de todos tus datos o restaura desde un archivo previo
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar Backup
          </Button>
          <p className="text-sm text-muted-foreground">
            Descarga todos tus datos en formato JSON
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Label htmlFor="restore-file" className="cursor-pointer">
            <Button
              type="button"
              variant="outline"
              disabled={isRestoring}
              className="gap-2"
              asChild
            >
              <span>
                {isRestoring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Restaurar Backup
              </span>
            </Button>
          </Label>
          <Input
            id="restore-file"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleRestoreBackup}
            disabled={isRestoring}
          />
          <p className="text-sm text-muted-foreground">
            Carga un archivo de backup previo
          </p>
        </div>

        <div className="border-t pt-4">
          <Button
            onClick={() => setResetDialogOpen(true)}
            variant="destructive"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Restaurar Sistema
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Elimina todos los datos del sistema incluyendo archivos multimedia (irreversible)
          </p>
        </div>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={handleCloseResetDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {resetComplete ? "¡Restauración Completada!" : "¿Restaurar el sistema?"}
            </AlertDialogTitle>
            {!isResetting && !resetComplete && (
              <AlertDialogDescription>
                Esta acción eliminará TODOS los datos del sistema (clientes, productos, ventas, servicios, garantías, archivos multimedia, etc.).
                Esta operación es IRREVERSIBLE. Los usuarios y sus roles no serán eliminados.
                <br /><br />
                Para continuar, escribe <strong>RESTAURAR</strong> en el campo de abajo:
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          
          {(isResetting || resetComplete) && resetLogs.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <div className="bg-muted/50 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
                {resetLogs.map((log, index) => (
                  <div 
                    key={index}
                    className={cn(
                      log.type === "success" && "text-success",
                      log.type === "error" && "text-destructive",
                      log.type === "info" && "text-muted-foreground"
                    )}
                  >
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!isResetting && !resetComplete && (
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESTAURAR"
              className="mt-2"
            />
          )}
          
          <AlertDialogFooter>
            {resetComplete ? (
              <AlertDialogAction 
                onClick={handleCloseResetDialog}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                Recargar Aplicación
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel onClick={() => setResetConfirmText("")} disabled={isResetting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  disabled={resetConfirmText !== "RESTAURAR" || isResetting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isResetting ? "Procesando..." : "Confirmar Restauración"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
