import { useMemo } from "react";
import { m as motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Cpu, Loader2, Trophy } from "lucide-react";
import { useToolAssignments } from "@/hooks/useToolAssignments";
import { cn } from "@/lib/utils";
import {
  IMMO_DAILY_MAX,
  IMMO_DAILY_MIN,
  computeImmoProgress,
} from "@/lib/immoProgress";

const dayFmt = new Intl.DateTimeFormat("es", { weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });
const numberFmt = new Intl.NumberFormat("es");

/**
 * Estadística interna del SuperAdmin: autos ingresados en Immo Info frente a la meta
 * (900) y al ritmo diario planeado (20–25). Forma: número protagonista + medidor de
 * avance + barras de los últimos 7 días (una sola serie, un solo color).
 */
export function ImmoProgressCard() {
  const { assignments, loading } = useToolAssignments();
  const p = useMemo(() => computeImmoProgress(assignments), [assignments]);

  const todayStatus =
    p.today >= IMMO_DAILY_MAX
      ? { tone: "success", icon: Trophy, label: p.today > IMMO_DAILY_MAX ? "Superaste la meta del día" : "Meta del día cumplida" }
      : p.today >= IMMO_DAILY_MIN
        ? { tone: "success", icon: CheckCircle2, label: "Dentro de la meta del día" }
        : { tone: "warning", icon: AlertTriangle, label: `Faltan ${IMMO_DAILY_MIN - p.today} para la meta del día` };
  const StatusIcon = todayStatus.icon;

  const maxBar = Math.max(IMMO_DAILY_MAX, ...p.last7.map((d) => d.count));
  const avg7 = p.last7Total / 7;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      aria-labelledby="immo-progress-title"
      className="rounded-sm bg-muted p-4 text-foreground sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[hsl(var(--surface-2))]">
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 id="immo-progress-title" className="text-sm font-bold text-foreground">Autos con Immo Info</h3>
            <p className="text-xs text-muted-foreground">Estadística interna · meta {numberFmt.format(p.goal)} autos</p>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Cargando" />}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        {/* Total y avance */}
        <div className="space-y-3">
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight">{numberFmt.format(p.total)}</span>
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">de {numberFmt.format(p.goal)} · {p.percent}%</span>
          </p>
          <div
            role="meter"
            aria-label="Avance hacia la meta de autos"
            aria-valuemin={0}
            aria-valuemax={p.goal}
            aria-valuenow={p.total}
            className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-2))]"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${p.percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {p.remaining === 0 ? (
              <>¡Meta alcanzada!</>
            ) : (
              <>
                Faltan <span className="font-semibold text-foreground tabular-nums">{numberFmt.format(p.remaining)}</span>. A{" "}
                {IMMO_DAILY_MIN}–{IMMO_DAILY_MAX} por día:{" "}
                <span className="font-semibold text-foreground tabular-nums">{p.daysAtMax}–{p.daysAtMin} días</span>
                {p.etaAtMax && p.etaAtMin && (
                  <> (entre el {dateFmt.format(p.etaAtMax)} y el {dateFmt.format(p.etaAtMin)})</>
                )}
                .
              </>
            )}
          </p>
        </div>

        {/* Hoy + últimos 7 días */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-semibold">Hoy:</span>{" "}
              <span className="text-lg font-extrabold tabular-nums">{p.today}</span>
              <span className="text-muted-foreground"> / {IMMO_DAILY_MIN}–{IMMO_DAILY_MAX}</span>
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                todayStatus.tone === "success" ? "bg-success-light text-foreground dark:text-success" : "bg-warning-light text-foreground",
              )}
            >
              <StatusIcon className={cn("h-3.5 w-3.5", todayStatus.tone === "success" ? "text-success" : "text-warning")} />
              {todayStatus.label}
            </span>
          </div>

          {/* Barras de una sola serie: sin leyenda; el valor se ve en «hoy» y en el tooltip de cada día. */}
          <div className="flex h-24 items-end gap-0.5" aria-hidden>
            {p.last7.map((d, i) => {
              const isToday = i === p.last7.length - 1;
              const h = d.count === 0 ? 0 : Math.max(6, Math.round((d.count / maxBar) * 100));
              return (
                <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
                  {isToday && d.count > 0 && (
                    <span className="mb-1 text-center text-[11px] font-bold tabular-nums text-foreground">{d.count}</span>
                  )}
                  <div
                    className={cn("w-full rounded-t-[4px] bg-primary", !isToday && "opacity-60", d.count === 0 && "h-px rounded-none bg-border opacity-100")}
                    style={d.count ? { height: `${h}%` } : undefined}
                  />
                  {/* Tooltip por día (zona de hover = toda la columna) */}
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background shadow group-hover:block">
                    {dateFmt.format(d.date)}: {d.count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-0.5" aria-hidden>
            {p.last7.map((d, i) => (
              <span key={d.key} className={cn("flex-1 text-center text-[11px] capitalize text-muted-foreground", i === p.last7.length - 1 && "font-bold text-foreground")}>
                {i === p.last7.length - 1 ? "Hoy" : dayFmt.format(d.date).replace(".", "")}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Últimos 7 días: <span className="font-semibold text-foreground tabular-nums">{p.last7Total}</span> · promedio{" "}
            <span className="font-semibold text-foreground tabular-nums">{avg7.toFixed(1)}</span> por día
          </p>

          {/* Vista de tabla para lectores de pantalla */}
          <table className="sr-only">
            <caption>Autos ingresados en Immo Info por día, últimos 7 días</caption>
            <thead><tr><th scope="col">Día</th><th scope="col">Autos</th></tr></thead>
            <tbody>
              {p.last7.map((d) => (
                <tr key={d.key}><td>{longDateFmt.format(d.date)}</td><td>{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {p.undated > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {p.undated} auto(s) sin fecha de alta reconocible: cuentan en el total, no en los días.
        </p>
      )}
    </motion.section>
  );
}
