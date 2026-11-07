import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { spawnRipple } from "@/lib/ripple";

/**
 * Elemento de lista de dos líneas (M3 / Android).
 *
 *   Título principal ..................... $1,200
 *   ● Estado · Cliente
 *
 * Va dentro de un contenedor `.m3-list`, que agrupa los elementos con 2px de
 * separación y esquinas grandes solo en los extremos (estilo Android 16).
 *
 * El folio/código ya NO se muestra en la lista: vive en la vista de detalle.
 * La prop `code` se conserva para accesibilidad (se lee en el aria-label).
 */
interface MobileListCardProps {
  onClick: () => void;
  /** Folio / código. Solo se anuncia a lectores de pantalla; se ve en el detalle. */
  code?: string;
  /** Texto del indicador de estado */
  statusLabel: string;
  /** Clase de color del texto del estado, e.g. "text-warning" */
  statusTextClass: string;
  /** Clase de color del punto de estado, e.g. "bg-warning" */
  statusDotClass: string;
  /** Si el punto debe pulsar (para estados activos/urgentes) */
  statusPulse?: boolean;
  /** Contenido opcional junto al estado (ej: aviso de días) */
  statusExtra?: ReactNode;
  /** Texto principal (una línea) */
  title: string;
  /** Texto secundario (cliente, contacto…) */
  subtitle?: string;
  /** Valor a la derecha (precio, días restantes…) */
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
    <button
      type="button"
      onClick={onClick}
      onPointerDown={spawnRipple}
      aria-label={code ? `${title}, ${code}` : undefined}
      className="m3-list-item flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium leading-6 text-foreground">{title}</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm leading-5 text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              statusDotClass,
              statusPulse && "animate-pulse",
            )}
          />
          <span className={cn("shrink-0 font-medium", statusTextClass)}>{statusLabel}</span>
          {statusExtra}
          {subtitle && (
            <>
              <span aria-hidden="true" className="shrink-0">·</span>
              <span className="truncate">{subtitle}</span>
            </>
          )}
        </div>
      </div>

      {valueText && (
        <span
          className={cn(
            "shrink-0 text-base font-semibold tabular-nums",
            valueClass ?? "text-foreground",
          )}
        >
          {valueText}
        </span>
      )}
    </button>
  );
}

export function MobileListCardSkeleton() {
  return (
    <div className="m3-list-item flex min-h-[72px] items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-[65%] animate-pulse rounded bg-muted" />
        <div className="h-3 w-[45%] animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-14 animate-pulse rounded bg-muted" />
    </div>
  );
}
