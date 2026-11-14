import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FolderLock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { phpApiRequest } from "@/lib/phpApi";

type MigrationReport = {
  files: number;
  references: number;
  moved: number;
  copied?: number;
  dry_run: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Pasa las imágenes que el SuperAdmin subió a la carpeta genérica «misc» a su
 * carpeta privada «superadmin» y actualiza los enlaces guardados en Herramientas.
 * La revisión (dry run) se hace al abrir; mover es idempotente y se puede repetir.
 */
export function SuperadminFilesMigration() {
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const data = await phpApiRequest<MigrationReport>("/uploads.php?action=migrate-misc", {
        method: "POST",
        body: JSON.stringify({ dry_run: true }),
      });
      setReport(data);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo revisar la carpeta misc."));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const move = async () => {
    setMoving(true);
    try {
      const data = await phpApiRequest<MigrationReport>("/uploads.php?action=migrate-misc", {
        method: "POST",
        body: JSON.stringify({ dry_run: false }),
      });
      toast.success(`Listo: ${data.moved} archivo(s) movidos y ${data.references} registro(s) actualizados.`);
      await check();
    } catch (e) {
      toast.error(getErrorMessage(e, "No se pudieron mover los archivos. No se cambió ningún enlace; inténtalo de nuevo."));
    } finally {
      setMoving(false);
    }
  };

  const pending = report ? report.files + report.references : 0;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <FolderLock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-sm font-semibold">Archivos privados del SuperAdmin</h4>
          <p className="text-sm text-muted-foreground">
            Las imágenes de Herramientas (Immo, Keycode, procedimientos y notas) se guardan en la carpeta privada
            «superadmin»: solo tú puedes verlas en la galería, cambiarlas o borrarlas. Los técnicos las siguen viendo
            dentro de la información que se les muestra.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={check} disabled={checking || moving} aria-label="Revisar de nuevo">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {report && !error && (
        pending === 0 ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> No queda nada en la carpeta antigua «misc».
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
            <p className="text-sm">
              En la carpeta antigua «misc» hay <strong>{report.files}</strong> archivo(s) y{" "}
              <strong>{report.references}</strong> registro(s) que los enlazan.
            </p>
            <Button size="sm" onClick={move} disabled={moving || checking}>
              {moving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FolderLock className="mr-1.5 h-4 w-4" />}
              {moving ? "Moviendo…" : "Mover a la carpeta privada"}
            </Button>
          </div>
        )
      )}
    </div>
  );
}
