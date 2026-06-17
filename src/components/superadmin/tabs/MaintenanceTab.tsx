import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, Trash2, KeyRound, Bell, Shield, Link2, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phpApiRequest } from "@/lib/phpApi";

type MaintenanceStats = {
  keycode: { profiles: number; codes: number };
  alarmas: { profiles: number };
  immo: { profiles: number; catalogItems: number };
  assignments: number;
  vehicles: number;
};

type Module = "keycode" | "alarmas" | "immo" | "assignments" | "vehicles";

export function MaintenanceTab() {
  const { toast } = useToast();
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [purging, setPurging] = useState<Module | null>(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await phpApiRequest<MaintenanceStats>("/herramientas/maintenance");
      setStats(data);
    } catch (err) {
      toast({
        title: "Error al cargar estadísticas",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoadingStats(false);
    }
  }, [toast]);

  const handlePurge = async (module: Module) => {
    setPurging(module);
    try {
      await phpApiRequest(`/herramientas/maintenance?module=${module}`, { method: "DELETE" });
      toast({ title: "Módulo purgado correctamente" });
      await fetchStats();
    } catch (err) {
      toast({
        title: "Error al purgar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setPurging(null);
    }
  };

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
      description: "Perfiles de programación de alarmas",
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Mantenimiento de Datos
              </CardTitle>
              <CardDescription>
                Consulta y limpia los datos de cada módulo para evitar registros huérfanos durante la carga
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={fetchStats}
              disabled={loadingStats}
            >
              {loadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {stats ? "Actualizar" : "Ver estado actual"}
            </Button>
          </div>
        </CardHeader>

        {stats && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modules.map((mod) => {
                const lines = mod.statsLines(stats);
                const total = mod.total(stats);
                const isPurging = purging === mod.id;

                return (
                  <Card key={mod.id} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {mod.icon}
                        {mod.label}
                      </CardTitle>
                      <CardDescription className="text-xs">{mod.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
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

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full gap-2"
                            disabled={isPurging || total === 0}
                          >
                            {isPurging ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            {total === 0 ? "Sin datos" : `Purgar ${total.toLocaleString()} registros`}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Purgar módulo {mod.label}?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-3">
                                <p>Esta acción eliminará permanentemente todos los datos del módulo:</p>
                                <div className="rounded-md bg-muted p-3 space-y-1">
                                  {lines.map((line) => (
                                    <div key={line.label} className="flex justify-between text-sm">
                                      <span>{line.label}</span>
                                      <span className="font-semibold">{line.value.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-destructive font-medium">
                                  Esta operación no se puede deshacer.
                                </p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handlePurge(mod.id)}
                            >
                              Sí, purgar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
