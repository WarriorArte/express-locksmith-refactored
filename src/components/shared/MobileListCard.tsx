import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { m as motion } from "framer-motion";

interface MobileListCardProps {
  onClick: () => void;
  /** Folio / código — se muestra arriba a la derecha en mono apagado */
  code: string;
  /** Texto del indicador de estado (arriba a la izquierda) */
  statusLabel: string;
  /** Clase de color del texto del estado, e.g. "text-warning" */
  statusTextClass: string;
  /** Clase de color del dot del estado, e.g. "bg-warning" */
  statusDotClass: string;
  /** Si el dot debe pulsar (para estados activos/urgentes) */
  statusPulse?: boolean;
  /** Contenido opcional junto al label de estado (ej: aviso de días) */
  statusExtra?: ReactNode;
  /** Texto principal de la tarjeta — hero. Soporta hasta 2 líneas. */
  title: string;
  /** Texto secundario izquierdo del footer (cliente, contacto…) */
  subtitle?: string;
  /** Valor derecho del footer (precio, días restantes…) */
  valueText?: string;
  /** Clase de color del valor, e.g. "text-success" */
  valueClass?: string;
}

export function MobileListCard({
  onClick,
  code,
  statusLabel,
  statusTextClass,
  statusDotClass,
  statusPulse = false,
  statusExtra,
  title,
  subtitle,
  valueText,
  valueClass,
}: MobileListCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1 }}
      className="card-elevated p-4 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={onClick}
    >
      {/* Fila 1: estado | código */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "w-[7px] h-[7px] rounded-full shrink-0",
              statusDotClass,
              statusPulse && "animate-pulse"
            )}
          />
          <span className={cn("text-[11px] font-semibold tracking-wide leading-none", statusTextClass)}>
            {statusLabel}
          </span>
          {statusExtra}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/50 tracking-widest shrink-0 ml-2">
          {code}
        </span>
      </div>

      {/* Fila 2: título hero (hasta 2 líneas) */}
      <p className="text-[13.5px] font-semibold text-foreground line-clamp-2 leading-snug">
        {title}
      </p>

      {/* Fila 3: footer con separador */}
      {(subtitle !== undefined || valueText) && (
        <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-border/40">
          <span className="text-[11.5px] text-muted-foreground truncate min-w-0">
            {subtitle ?? ""}
          </span>
          {valueText && (
            <span
              className={cn(
                "text-[13px] font-bold shrink-0 tabular-nums leading-none",
                valueClass ?? "text-foreground/80"
              )}
            >
              {valueText}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function MobileListCardSkeleton() {
  return (
    <div className="card-elevated p-4 animate-pulse">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-[7px] h-[7px] rounded-full bg-muted/70 shrink-0" />
          <div className="h-2.5 w-14 rounded bg-muted/60" />
        </div>
        <div className="h-2 w-16 rounded bg-muted/60" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-[72%] rounded bg-muted/60" />
        <div className="h-3.5 w-[45%] rounded bg-muted/60" />
      </div>
      <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-border/40">
        <div className="h-2.5 w-28 rounded bg-muted/60" />
        <div className="h-3 w-14 rounded bg-muted/60" />
      </div>
    </div>
  );
}
