import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, Trash2, KeyRound, Bell, Shield, Link2, Car, AlertTriangle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiRequest } from "@/lib/phpApi";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

type MaintenanceStats = {
  keycode: { profiles: number; codes: number };
  alarmas: { profiles: number };
  immo: { profiles: number; catalogItems: number };
  assignments: number;
  vehicles: number;
};

type Module = "keycode" | "alarmas" | "immo" | "assignments" | "vehicles";

interface PurgeLog {
  message: string;
  type: "info" | "success" | "error";
}

// Los perfiles (Keycode/Alarmas/Immo) estan referenciados desde las
// asignaciones por su id, guardado dentro de un JSON sin FK de base de datos.
// Si se purgan sin purgar tambien "Asignaciones", esas asignaciones quedan
// apuntando a perfiles que ya no existen (roto en silencio).
const PROFILE_MODULES: Module[] = ["keycode", "alarmas", "immo"];

/**
 * Unico lugar donde SuperAdmin gestiona datos DESTRUCTIVOS y globales:
 * purgar el modulo Herramientas (compartido por todos los talleres) y
 * eliminar un taller completo. Vive como pestaña propia en Configuracion,
 * separado de "Backup" (que es sobre el taller actual, no sobre el sistema).
 */
export function MaintenanceManager() {
  const { toast } = useToast();
  const { currentWorkshop, workshops, refreshWorkshops } = useWorkshop();

  // ── Purga de Herramientas (global) ──────────────────────────────────────
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selected, setSelected] = useState<Partial<Record<Module, boolean>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [purgeLogs, setPurgeLogs] = useState<PurgeLog[]>([]);
  const [purgeComplete, setPurgeComplete] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await phpApiRequest<MaintenanceStats>("/herramientas/maintenance");
      setStats(data);
    } catch (err) {
      toast({
        title: "Error al cargar estadísticas",
        description: getErrorMessage(err, "Error desconocido"),
        variant: "destructive",
      });
    } finally {
      setLoadingStats(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const modules: {
    id: Module;
    label: string;
    description: string;
    icon: React.ReactNode;
    statsLines: (s: MaintenanceStats) => { label: string; value: number }[];
    total: (s: MaintenanceStats) => number;
  }[] = [
    {
      id: "keycode",
      label: "Keycode",
      description: "Perfiles de llaves y sus códigos de bitting",
      icon: <KeyRound className="h-5 w-5" />,
      statsLines: (s) => [
        { label: "Perfiles", value: s.keycode.profiles },
        { label: "Códigos", value: s.keycode.codes },
      ],
      total: (s) => s.keycode.profiles + s.keycode.codes,
    },
    {
      id: "alarmas",
      label: "Alarmas",
      description: "Perfiles y diagramas de programación de alarmas",
      icon: <Bell className="h-5 w-5" />,
      statsLines: (s) => [{ label: "Perfiles", value: s.alarmas.profiles }],
      total: (s) => s.alarmas.profiles,
    },
    {
      id: "immo",
      label: "Immoinfo",
      description: "Perfiles y catálogo de immobilizadores",
      icon: <Shield className="h-5 w-5" />,
      statsLines: (s) => [
        { label: "Perfiles", value: s.immo.profiles },
        { label: "Catálogo", value: s.immo.catalogItems },
      ],
      total: (s) => s.immo.profiles + s.immo.catalogItems,
    },
    {
      id: "assignments",
      label: "Asignaciones",
      description: "Relaciones vehículo → herramientas",
      icon: <Link2 className="h-5 w-5" />,
      statsLines: (s) => [{ label: "Registros", value: s.assignments }],
      total: (s) => s.assignments,
    },
    {
      id: "vehicles",
      label: "Base de Vehículos",
      description: "Registros de la base de datos de vehículos",
      icon: <Car className="h-5 w-5" />,
      statsLines: (s) => [{ label: "Vehículos", value: s.vehicles }],
      total: (s) => s.vehicles,
    },
  ];

  const toggleModule = (mod: Module, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev, [mod]: checked };
      // Auto-incluir: purgar perfiles sin purgar asignaciones deja vinculos
      // rotos, asi que se marca Asignaciones automaticamente. El usuario
      // puede desmarcarla despues; se avisa pero no se bloquea.
      if (checked && PROFILE_MODULES.includes(mod)) {
        next.assignments = true;
      }
      return next;
    });
  };

  const selectedModules = useMemo(
    () => (Object.keys(selected) as Module[]).filter((m) => selected[m]),
    [selected],
  );

  const hasOrphanRisk = useMemo(
    () => PROFILE_MODULES.some((m) => selected[m]) && !selected.assignments,
    [selected],
  );

  const selectedTotal = stats
    ? selectedModules.reduce((sum, id) => {
        const mod = modules.find((m) => m.id === id);
        return sum + (mod ? mod.total(stats) : 0);
      }, 0)
    : 0;

  const addPurgeLog = (message: string, type: PurgeLog["type"] = "info") => {
    setPurgeLogs((prev) => [...prev, { message, type }]);
  };

  const handleConfirmPurge = async () => {
    if (confirmText !== "PURGAR" || selectedModules.length === 0 || isPurging) return;

    setIsPurging(true);
    setPurgeLogs([]);
    setPurgeComplete(false);

    try {
      addPurgeLog(`Purgando ${selectedModules.length} módulo(s)...`, "info");

      const result = await phpApiRequest<{ modules: string[]; deleted: Record<string, Record<string, number>> }>(
        "/herramientas/maintenance",
        { method: "DELETE", body: JSON.stringify({ modules: selectedModules }) },
      );

      for (const [mod, counts] of Object.entries(result.deleted)) {
        const label = modules.find((m) => m.id === mod)?.label ?? mod;
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        addPurgeLog(`✓ ${label}: ${total.toLocaleString()} registros eliminados`, "success");
      }

      addPurgeLog("✅ Purga completada correctamente", "success");
      setPurgeComplete(true);
      setSelected({});
      await fetchStats();

      toast({ title: "Módulos purgados correctamente" });
    } catch (err) {
      addPurgeLog(`Error: ${getErrorMessage(err, "desconocido")}`, "error");
      toast({
        title: "Error al purgar",
        description: getErrorMessage(err, "Error desconocido"),
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  };

  const closeConfirmDialog = () => {
    if (isPurging) return;
    setConfirmOpen(false);
    setConfirmText("");
    setPurgeLogs([]);
    setPurgeComplete(false);
  };

  // ── Eliminar un taller (global) ──────────────────────────────────────────
  const [deleteWorkshopOpen, setDeleteWorkshopOpen] = useState(false);
  const [workshopToDeleteId, setWorkshopToDeleteId] = useState("");
  const [deleteWorkshopConfirmText, setDeleteWorkshopConfirmText] = useState("");
  const [isDeletingWorkshop, setIsDeletingWorkshop] = useState(false);

  const workshopToDelete = workshops.find((w) => w.id === workshopToDeleteId) ?? null;

  const openDeleteWorkshopDialog = () => {
    void refreshWorkshops();
    setDeleteWorkshopOpen(true);
  };

  const closeDeleteWorkshopDialog = () => {
    if (isDeletingWorkshop) return;
    setDeleteWorkshopOpen(false);
    setWorkshopToDeleteId("");
    setDeleteWorkshopConfirmText("");
  };

  const handleDeleteWorkshop = async () => {
    if (!workshopToDelete || deleteWorkshopConfirmText !== workshopToDelete.code || isDeletingWorkshop) return;

    setIsDeletingWorkshop(true);
    try {
      await phpApiRequest<null>(`/workshops.php?id=${encodeURIComponent(workshopToDelete.id)}`, {
        method: "DELETE",
      });

      toast({
        title: "Taller eliminado",
        description: `"${workshopToDelete.name}" y todos sus datos fueron eliminados permanentemente.`,
      });

      const wasCurrentWorkshop = workshopToDelete.id === currentWorkshop?.id;
      setDeleteWorkshopOpen(false);
      setWorkshopToDeleteId("");
      setDeleteWorkshopConfirmText("");

      if (wasCurrentWorkshop) {
        // El taller activo ya no existe: recargar es la forma mas simple de
        // dejar la app en un estado consistente.
        window.location.reload();
      } else {
        await refreshWorkshops();
      }
    } catch (error) {
      toast({
        title: "Error al eliminar taller",
        description: getErrorMessage(error, "Error desconocido"),
        variant: "destructive",
      });
    }
    setIsDeletingWorkshop(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Mantenimiento de Datos</h3>
        <p className="text-sm text-muted-foreground">
          Datos globales del módulo Herramientas y gestión de talleres. Todo lo de esta pestaña afecta a
          TODOS los talleres del sistema — es independiente de los datos de un taller en particular.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Módulos de Herramientas</h4>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={fetchStats}
            disabled={loadingStats}
          >
            {loadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modules.map((mod) => {
                const lines = mod.statsLines(stats);
                const total = mod.total(stats);
                const isChecked = selected[mod.id] === true;
                const isAutoIncluded = mod.id === "assignments" && isChecked
                  && PROFILE_MODULES.some((m) => selected[m]);

                return (
                  <label
                    key={mod.id}
                    className={cn(
                      "block rounded-lg border p-4 cursor-pointer transition-colors",
                      isChecked ? "border-destructive/60 bg-destructive/5" : "hover:bg-muted/50",
                      total === 0 && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isChecked}
                        disabled={total === 0}
                        onCheckedChange={(checked) => toggleModule(mod.id, checked === true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {mod.icon}
                          <span className="font-semibold text-base">{mod.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                        <div className="space-y-1">
                          {lines.map((line) => (
                            <div key={line.label} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{line.label}</span>
                              <span className={`font-medium tabular-nums ${line.value === 0 ? "text-muted-foreground" : ""}`}>
                                {line.value.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        {isAutoIncluded && (
                          <p className="text-xs text-primary">Incluido automáticamente (vinculada a los perfiles marcados)</p>
                        )}
                        {total === 0 && <p className="text-xs text-muted-foreground">Sin datos</p>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {hasOrphanRisk && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Vas a eliminar perfiles sin eliminar <strong>Asignaciones</strong>: las asignaciones
                  existentes quedarán con vínculos rotos a esos perfiles.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <span className="text-sm text-muted-foreground">
                {selectedModules.length === 0
                  ? "Ningún módulo seleccionado"
                  : `${selectedModules.length} módulo(s) seleccionado(s) · ${selectedTotal.toLocaleString()} registros`}
              </span>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={selectedModules.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Purgar seleccionados
              </Button>
            </div>
          </>
        )}
      </div>

      <Separator />

      <div>
        <Button
          onClick={openDeleteWorkshopDialog}
          variant="destructive"
          className="gap-2"
        >
          <Building2 className="w-4 h-4" />
          Eliminar un Taller
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Elimina un taller completo (cualquiera del sistema) y todo lo que le pertenece: clientes,
          productos, ventas, servicios, garantías, archivos y el acceso de sus empleados. No afecta a
          otros talleres ni a los módulos de Herramientas de arriba.
        </p>
      </div>

      {/* Dialogo: purgar Herramientas */}
      <AlertDialog open={confirmOpen} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {purgeComplete ? "¡Purga completada!" : "¿Purgar módulos seleccionados?"}
            </AlertDialogTitle>
            {!isPurging && !purgeComplete && (
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Esta acción eliminará permanentemente, para TODOS los talleres:</p>
                  <div className="rounded-md bg-muted p-3 space-y-1">
                    {selectedModules.map((id) => (
                      <div key={id} className="flex justify-between text-sm">
                        <span>{modules.find((m) => m.id === id)?.label}</span>
                      </div>
                    ))}
                  </div>
                  {hasOrphanRisk && (
                    <p className="text-amber-600 dark:text-amber-400 text-sm">
                      ⚠️ Quedarán asignaciones con referencias rotas a los perfiles eliminados.
                    </p>
                  )}
                  <p className="text-destructive font-medium">Esta operación no se puede deshacer.</p>
                </div>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {!isPurging && !purgeComplete && (
            <div className="space-y-1.5">
              <Label htmlFor="purge-confirm-text" className="text-xs">
                Escribe <strong>PURGAR</strong> para continuar
              </Label>
              <Input
                id="purge-confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="PURGAR"
              />
            </div>
          )}

          {(isPurging || purgeComplete) && purgeLogs.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <div className="bg-muted/50 rounded-lg p-3 h-56 overflow-y-auto font-mono text-xs space-y-1">
                {purgeLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      log.type === "success" && "text-foreground dark:text-success",
                      log.type === "error" && "text-destructive",
                      log.type === "info" && "text-muted-foreground",
                    )}
                  >
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            {purgeComplete ? (
              <Button onClick={closeConfirmDialog} className="bg-success text-success-foreground hover:bg-success/90">
                Cerrar
              </Button>
            ) : (
              <>
                <AlertDialogCancel onClick={() => setConfirmText("")} disabled={isPurging}>
                  Cancelar
                </AlertDialogCancel>
                <Button
                  onClick={handleConfirmPurge}
                  disabled={confirmText !== "PURGAR" || isPurging}
                  variant="destructive"
                  className="gap-2"
                >
                  {isPurging && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPurging ? "Procesando..." : "Sí, purgar"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogo: eliminar un taller */}
      <AlertDialog open={deleteWorkshopOpen} onOpenChange={closeDeleteWorkshopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Eliminar un Taller
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esto elimina PERMANENTEMENTE el taller elegido y todo lo que le pertenece: clientes,
                  productos, cotizaciones, ventas, servicios, garantías, archivos multimedia y el
                  acceso de sus empleados. No afecta a otros talleres ni a los datos globales de
                  Herramientas.
                </p>
                <p className="text-destructive font-medium">
                  Esta operación no se puede deshacer. Si no tienes un backup exportado, esa
                  información se pierde para siempre.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="delete-workshop-select" className="text-xs">
                    Taller a eliminar
                  </Label>
                  <Select
                    value={workshopToDeleteId}
                    onValueChange={(value) => {
                      setWorkshopToDeleteId(value);
                      setDeleteWorkshopConfirmText("");
                    }}
                  >
                    <SelectTrigger id="delete-workshop-select">
                      <SelectValue placeholder="Selecciona un taller" />
                    </SelectTrigger>
                    <SelectContent>
                      {workshops.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {workshopToDelete && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="delete-workshop-confirm" className="text-xs">
                      Escribe el código <strong>{workshopToDelete.code}</strong> para continuar
                    </Label>
                    <Input
                      id="delete-workshop-confirm"
                      value={deleteWorkshopConfirmText}
                      onChange={(e) => setDeleteWorkshopConfirmText(e.target.value)}
                      placeholder={workshopToDelete.code}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingWorkshop}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={!workshopToDelete || deleteWorkshopConfirmText !== workshopToDelete.code || isDeletingWorkshop}
              onClick={handleDeleteWorkshop}
            >
              {isDeletingWorkshop && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDeletingWorkshop ? "Eliminando..." : "Sí, eliminar taller"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
