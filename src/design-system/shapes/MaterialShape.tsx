/**
 * Formas orgánicas de Material 3 Expressive (cookie, clover, sunny, soft-burst).
 *
 * Se generan como curvas polares r(θ) = 1 + a·cos(n·θ): n = número de lóbulos,
 * a = profundidad. El resultado es un path SVG suave, sin vértices duros, que
 * se parece a las formas de la librería M3E sin depender de assets externos.
 *
 * Uso: detrás de un número, de un ícono o de una foto, para dar una silueta
 * con identidad en lugar del típico "cuadrito con tinte".
 */
import { cn } from "@/lib/utils";

export type MaterialShapeName = "cookie9" | "cookie6" | "clover4" | "sunny" | "softBurst";

const SHAPES: Record<MaterialShapeName, { lobes: number; depth: number }> = {
  cookie9: { lobes: 9, depth: 0.075 },
  cookie6: { lobes: 6, depth: 0.09 },
  clover4: { lobes: 4, depth: 0.16 },
  sunny: { lobes: 8, depth: 0.045 },
  softBurst: { lobes: 12, depth: 0.05 },
};

const pathCache = new Map<MaterialShapeName, string>();

function buildPath(name: MaterialShapeName): string {
  const cached = pathCache.get(name);
  if (cached) return cached;

  const { lobes, depth } = SHAPES[name];
  const steps = 240;
  const radius = 50 / (1 + depth); // el lóbulo más externo toca el borde del viewBox
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = radius * (1 + depth * Math.cos(lobes * theta));
    const x = 50 + r * Math.cos(theta - Math.PI / 2);
    const y = 50 + r * Math.sin(theta - Math.PI / 2);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  const d = `${points.join(" ")} Z`;
  pathCache.set(name, d);
  return d;
}

interface MaterialShapeProps {
  name: MaterialShapeName;
  className?: string;
  /** Gira lentamente (se desactiva con prefers-reduced-motion). */
  spin?: boolean;
  children?: React.ReactNode;
}

/**
 * Contenedor con silueta M3E. La forma se pinta con `currentColor` en una capa
 * de fondo; los hijos quedan centrados encima y no giran.
 */
export function MaterialShape({ name, className, spin = false, children }: MaterialShapeProps) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={cn("absolute inset-0 h-full w-full", spin && "m3-shape-spin")}
      >
        <path d={buildPath(name)} fill="currentColor" />
      </svg>
      {children !== undefined && <span className="relative">{children}</span>}
    </span>
  );
}
