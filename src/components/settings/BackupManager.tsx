import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload, Trash2, Loader2, AlertTriangle, Settings2, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiRequest } from "@/lib/phpApi";

type BackupTableData = unknown[] | Record<string, unknown> | null;
type BackupFile = {
  timestamp: string;
  version: string;
  workshop_id?: string | null;
  tables: Record<string, BackupTableData>;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface ResetLog {
  message: string;
  type: "info" | "success" | "error";
  timestamp: Date;
}

type ResetSectionKey =
  | "customers"
  | "products"
  | "categories_tags"
  | "quotes"
  | "sales"
  | "services"
  | "warranties"
  | "business_settings"
  | "warranty_settings"
  | "quote_doc_settings";

type ResetSection = {
  key: ResetSectionKey;
  label: string;
  note?: string;
  defaultChecked: boolean;
};

// Datos operativos del taller: lo que ya cubria "Restaurar Sistema" antes,
// ahora seleccionable. Marcados por defecto para conservar el comportamiento
// previo (todo se borraba).
const DATA_SECTIONS: ResetSection[] = [
  { key: "customers", label: "Clientes", defaultChecked: true },
  { key: "products", label: "Productos e inventario", note: "Incluye stock y movimientos de inventario: van siempre juntos", defaultChecked: true },
  { key: "categories_tags", label: "Categorías y etiquetas", note: "Si hay plazos de garantía por categoría, también se eliminan", defaultChecked: true },
  { key: "quotes", label: "Cotizaciones", defaultChecked: true },
  { key: "sales", label: "Ventas", defaultChecked: true },
  { key: "services", label: "Servicios", note: "Incluye las fotos adjuntas", defaultChecked: true },
  { key: "warranties", label: "Garantías", note: "Registros otorgados a clientes", defaultChecked: true },
];

// Configuracion del taller: hoy nunca se borra con el reset rapido, se deja
// fuera por defecto para no sorprender a nadie.
const CONFIG_SECTIONS: ResetSection[] = [
  { key: "business_settings", label: "Datos del negocio", note: "Nombre, logo, contacto", defaultChecked: false },
  { key: "warranty_settings", label: "Configuración de garantías", note: "Plazos por defecto y términos", defaultChecked: false },
  { key: "quote_doc_settings", label: "Configuración de cotización/ticket", note: "Colores y textos del documento", defaultChecked: false },
];

const ALL_SECTIONS = [...DATA_SECTIONS, ...CONFIG_SECTIONS];

// Datos GLOBALES del modulo Herramientas: compartidos por TODOS los talleres
// (no tienen workshop_id). Solo se muestran a SuperAdmin; un admin de taller
// normal nunca los ve ni puede tocarlos desde aqui.
type ToolModuleKey = "keycode" | "alarmas" | "immo" | "assignments" | "vehicles";

type ToolSection = {
  key: ToolModuleKey;
  label: string;
  note: string;
};

const TOOL_SECTIONS: ToolSection[] = [
  { key: "keycode", label: "Keycode", note: "Perfiles de llaves y sus códigos de bitting" },
  { key: "alarmas", label: "Alarmas (diagramas)", note: "Perfiles y diagramas de programación de alarmas" },
  { key: "immo", label: "Immo Info", note: "Perfiles y catálogo de inmovilizadores" },
  { key: "assignments", label: "Asignaciones", note: "Vínculos vehículo → herramientas" },
  { key: "vehicles", label: "Base de vehículos", note: "Listado usado para buscar vehículos" },
];

// Perfiles referenciados desde las asignaciones por id, dentro de un JSON sin
// FK: purgarlos sin purgar tambien "Asignaciones" deja vinculos rotos.
const PROFILE_TOOL_MODULES: ToolModuleKey[] = ["keycode", "alarmas", "immo"];

const TOOL_MODULE_LABELS: Record<string, string> = {
  keycode: "Keycode",
  alarmas: "Alarmas",
  immo: "Immo Info",
  assignments: "Asignaciones",
  vehicles: "Base de vehículos",
};

const COUNT_LABELS: Record<string, string> = {
  customers: "Clientes",
  products: "Productos",
  inventory_movements: "Movimientos de inventario",
  categories: "Categorías",
  tags: "Etiquetas",
  warranty_category_settings: "Config. de garantías por categoría",
  quotes: "Cotizaciones",
  sales: "Ventas",
  services: "Servicios",
  warranties: "Garantías",
  business_settings: "Datos del negocio",
  warranty_settings: "Configuración de garantías",
  quote_doc_settings: "Configuración de cotización/ticket",
  media_files: "Archivos multimedia",
};

function defaultSelection(): Record<ResetSectionKey, boolean> {
  return ALL_SECTIONS.reduce((acc, section) => {
    acc[section.key] = section.defaultChecked;
    return acc;
  }, {} as Record<ResetSectionKey, boolean>);
}

export function BackupManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetLogs, setResetLogs] = useState<ResetLog[]>([]);
  const [resetComplete, setResetComplete] = useState(false);
  const [selection, setSelection] = useState<Record<ResetSectionKey, boolean>>(defaultSelection);
  const [toolSelection, setToolSelection] = useState<Partial<Record<ToolModuleKey, boolean>>>({});
  const { toast } = useToast();
  const { currentWorkshop, isSuperAdmin } = useWorkshop();

  const selectedKeys = useMemo(
    () => (Object.keys(selection) as ResetSectionKey[]).filter((key) => selection[key]),
    [selection],
  );

  const selectedToolModules = useMemo(
    () => (Object.keys(toolSelection) as ToolModuleKey[]).filter((key) => toolSelection[key]),
    [toolSelection],
  );

  const toolOrphanRisk = useMemo(
    () => PROFILE_TOOL_MODULES.some((m) => toolSelection[m]) && !toolSelection.assignments,
    [toolSelection],
  );

  const totalSelectedCount = selectedKeys.length + selectedToolModules.length;

  const toggleSection = (key: ResetSectionKey, checked: boolean) => {
    setSelection((prev) => ({ ...prev, [key]: checked }));
  };

  const toggleToolModule = (key: ToolModuleKey, checked: boolean) => {
    setToolSelection((prev) => {
      const next = { ...prev, [key]: checked };
      // Auto-incluir: purgar perfiles sin purgar asignaciones deja vinculos
      // rotos. Se puede desmarcar despues; se avisa pero no se bloquea.
      if (checked && PROFILE_TOOL_MODULES.includes(key)) {
        next.assignments = true;
      }
      return next;
    });
  };

  const getWorkshopQuery = () => {
    if (!currentWorkshop?.id) {
      throw new Error("No hay taller seleccionado");
    }
    return `workshop_id=${encodeURIComponent(currentWorkshop.id)}`;
  };

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    setResetLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
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
    { key: "warranties", endpoint: "/warranties.php" },
    { key: "warranty_settings_bundle", endpoint: "/warranty-settings.php" },
  ];

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const workshopQuery = getWorkshopQuery();

      const backup: BackupFile = {
        timestamp: new Date().toISOString(),
        version: "php-hosting-1.0",
        workshop_id: currentWorkshop?.id,
        tables: {}
      };

      for (const item of exportEndpoints) {
        const data = await phpApiRequest<BackupTableData>(`${item.endpoint}?${workshopQuery}`, {
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
    } catch (error) {
      toast({
        title: "Error al crear backup",
        description: getErrorMessage(error, "No se pudo crear el backup"),
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
    } catch (error) {
      toast({
        title: "Error al restaurar backup",
        description: getErrorMessage(error, "No se pudo restaurar el backup"),
        variant: "destructive",
      });
    }
    setIsRestoring(false);
    event.target.value = "";
  };

  const handleReset = async () => {
    if (resetConfirmText !== "RESTAURAR" || totalSelectedCount === 0 || isResetting) return;
    if (!currentWorkshop?.id) {
      toast({ title: "No hay taller seleccionado", variant: "destructive" });
      return;
    }

    setIsResetting(true);
    setResetLogs([]);
    setResetComplete(false);

    try {
      addLog("Iniciando restauración del sistema...", "info");

      if (selectedKeys.length > 0) {
        addLog(`Restaurando ${selectedKeys.length} sección(es) de este taller...`, "info");

        const sections = selectedKeys.reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {} as Record<string, boolean>);

        const result = await phpApiRequest<{
          restored_at: string;
          workshop_id: string;
          sections: string[];
          counts: Record<string, number>;
        }>("/system-reset.php", {
          method: "POST",
          body: JSON.stringify({ workshop_id: currentWorkshop.id, sections }),
        });

        // Se recorre en el orden de COUNT_LABELS (no el de result.counts) para
        // que el log se lea siempre igual, sin importar el orden interno en
        // que el backend fue contando cada tabla.
        for (const key of Object.keys(COUNT_LABELS)) {
          if (!(key in result.counts)) continue;
          addLog(`✓ ${COUNT_LABELS[key]}: ${result.counts[key].toLocaleString()} eliminados`, "success");
        }
      }

      if (selectedToolModules.length > 0) {
        addLog(`Purgando ${selectedToolModules.length} módulo(s) globales de Herramientas...`, "info");

        const result = await phpApiRequest<{
          modules: string[];
          deleted: Record<string, Record<string, number>>;
        }>("/herramientas/maintenance", {
          method: "DELETE",
          body: JSON.stringify({ modules: selectedToolModules }),
        });

        for (const mod of selectedToolModules) {
          const counts = result.deleted[mod];
          if (!counts) continue;
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          addLog(`✓ ${TOOL_MODULE_LABELS[mod] ?? mod}: ${total.toLocaleString()} eliminados`, "success");
        }
      }

      addLog("", "info");
      addLog("═══════════════════════════════════════", "info");
      addLog("✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE", "success");
      addLog("═══════════════════════════════════════", "info");

      setResetComplete(true);

      toast({
        title: "Sistema restaurado",
        description: `Se restauraron ${totalSelectedCount} elementos seleccionados.`,
      });
    } catch (error) {
      addLog(`Error crítico: ${getErrorMessage(error, "Error desconocido")}`, "error");
      toast({
        title: "Error al restaurar sistema",
        description: getErrorMessage(error, "Error desconocido"),
        variant: "destructive",
      });
    }
    setIsResetting(false);
  };

  const handleCloseResetDialog = () => {
    if (isResetting) return;
    if (resetComplete) {
      window.location.reload();
    } else {
      setResetDialogOpen(false);
      setResetConfirmText("");
      setResetLogs([]);
      setSelection(defaultSelection());
      setToolSelection({});
    }
  };

  const renderSectionRow = (section: ResetSection) => (
    <label
      key={section.key}
      className="flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
    >
      <Checkbox
        checked={selection[section.key]}
        onCheckedChange={(checked) => toggleSection(section.key, checked === true)}
        className="mt-0.5"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium leading-none">{section.label}</span>
        {section.note && (
          <span className="block text-xs text-muted-foreground">{section.note}</span>
        )}
      </span>
    </label>
  );

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
            Elige qué datos de este taller eliminar (irreversible). Los usuarios nunca se ven afectados
            desde aquí.
            {isSuperAdmin
              ? " Como SuperAdmin también puedes purgar aquí los datos globales de Herramientas (Keycode, Alarmas, Immo, asignaciones, base de vehículos)."
              : " Los datos globales de Herramientas (Keycode, Alarmas, Immo, asignaciones, base de vehículos) los administra un SuperAdmin desde Mantenimiento."}
          </p>
        </div>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={handleCloseResetDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {resetComplete ? "¡Restauración Completada!" : "Restaurar Sistema"}
            </AlertDialogTitle>
            {!isResetting && !resetComplete && (
              <AlertDialogDescription>
                Selecciona qué datos de <strong>{currentWorkshop?.name ?? "este taller"}</strong> quieres
                eliminar. Esta operación es IRREVERSIBLE.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {!isResetting && !resetComplete && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Datos operativos
                </p>
                <div className="space-y-2">
                  {DATA_SECTIONS.map(renderSectionRow)}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Configuración (normalmente se conserva)
                </p>
                <div className="space-y-2">
                  {CONFIG_SECTIONS.map(renderSectionRow)}
                </div>
              </div>

              {isSuperAdmin && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      Herramientas — afecta a TODOS los talleres
                    </p>
                    <div className="space-y-2">
                      {TOOL_SECTIONS.map((section) => {
                        const isChecked = toolSelection[section.key] === true;
                        const isAutoIncluded = section.key === "assignments" && isChecked
                          && PROFILE_TOOL_MODULES.some((m) => toolSelection[m]);
                        return (
                          <label
                            key={section.key}
                            className="flex items-start gap-2.5 rounded-md border border-amber-500/30 p-2.5 cursor-pointer hover:bg-amber-500/5"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => toggleToolModule(section.key, checked === true)}
                              className="mt-0.5"
                            />
                            <span className="space-y-0.5">
                              <span className="block text-sm font-medium leading-none">{section.label}</span>
                              <span className="block text-xs text-muted-foreground">{section.note}</span>
                              {isAutoIncluded && (
                                <span className="block text-xs text-primary">
                                  Incluido automáticamente (vinculada a los perfiles marcados)
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {toolOrphanRisk && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 mt-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p>
                          Vas a eliminar perfiles sin eliminar <strong>Asignaciones</strong>: quedarán
                          vínculos rotos a esos perfiles.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="reset-confirm-text" className="text-xs">
                  Escribe <strong>RESTAURAR</strong> para continuar
                </Label>
                <Input
                  id="reset-confirm-text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESTAURAR"
                />
              </div>
            </div>
          )}

          {(isResetting || resetComplete) && resetLogs.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <div className="bg-muted/50 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
                {resetLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      log.type === "success" && "text-foreground dark:text-success",
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

          <AlertDialogFooter>
            {resetComplete ? (
              <Button
                onClick={handleCloseResetDialog}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                Recargar Aplicación
              </Button>
            ) : (
              <>
                <AlertDialogCancel onClick={() => setResetConfirmText("")} disabled={isResetting}>
                  Cancelar
                </AlertDialogCancel>
                <Button
                  onClick={handleReset}
                  disabled={resetConfirmText !== "RESTAURAR" || isResetting || totalSelectedCount === 0}
                  variant="destructive"
                  className="gap-2"
                >
                  {isResetting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isResetting ? "Procesando..." : `Eliminar ${totalSelectedCount} ${totalSelectedCount === 1 ? "elemento" : "elementos"}`}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
