/* eslint-disable react-refresh/only-export-components */
import { cn } from "@/lib/utils";

/**
 * Muestra visual del color de un cable ("WHITE/black", "Lt. Blue", "Rojo/Negro").
 * Primer color = cuerpo del cable; segundo = raya (tracer). Si el texto no
 * contiene un color reconocible, no se dibuja nada.
 */

// Claves en minúsculas, de más larga a más corta al buscar.
const WIRE_COLORS: Record<string, string> = {
  "light blue": "#4FC3F7", "lt blue": "#4FC3F7", "lt. blue": "#4FC3F7", "azul claro": "#4FC3F7", celeste: "#4FC3F7",
  "dark blue": "#0D3C8C", "dk blue": "#0D3C8C", "dk. blue": "#0D3C8C", "azul oscuro": "#0D3C8C",
  "light green": "#8BC34A", "lt green": "#8BC34A", "lt. green": "#8BC34A", "verde claro": "#8BC34A",
  "dark green": "#1B5E20", "dk green": "#1B5E20", "dk. green": "#1B5E20", "verde oscuro": "#1B5E20",
  black: "#1F1F1F", negro: "#1F1F1F", blk: "#1F1F1F",
  white: "#F4F4F4", blanco: "#F4F4F4", wht: "#F4F4F4",
  red: "#D32F2F", rojo: "#D32F2F",
  green: "#2E7D32", verde: "#2E7D32", grn: "#2E7D32",
  blue: "#1565C0", azul: "#1565C0", blu: "#1565C0",
  yellow: "#F9D71C", amarillo: "#F9D71C", yel: "#F9D71C",
  orange: "#EF6C00", naranja: "#EF6C00", org: "#EF6C00",
  brown: "#6D4C41", "café": "#6D4C41", cafe: "#6D4C41", "marrón": "#6D4C41", marron: "#6D4C41",
  gray: "#9E9E9E", grey: "#9E9E9E", gris: "#9E9E9E",
  violet: "#7B1FA2", purple: "#7B1FA2", morado: "#7B1FA2", violeta: "#7B1FA2",
  pink: "#EC407A", rosa: "#EC407A",
  tan: "#D2B48C", beige: "#D2B48C",
  // Femeninos ("raya roja", "franja negra")
  roja: "#D32F2F", negra: "#1F1F1F", blanca: "#F4F4F4", amarilla: "#F9D71C", morada: "#7B1FA2",
};
const KEYS = Object.keys(WIRE_COLORS).sort((a, b) => b.length - a.length);

function findColor(part: string): string | null {
  const text = ` ${part.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\s+/g, " ")} `;
  for (const key of KEYS) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`[^a-záéíóúñ]${escaped}[^a-záéíóúñ]`).test(text)) return WIRE_COLORS[key];
  }
  return null;
}

/** "WHITE/black" → ["#F4F4F4", "#1F1F1F"]; null si no hay color reconocible. */
export function parseWireColors(value: string | null | undefined): [string, string | null] | null {
  if (!value) return null;
  const parts = value.split(/\s*(?:\/|\bw\/|\bwith\b|\bcon\b|\braya\b)\s*/i).filter(Boolean);
  const base = parts[0] ? findColor(parts[0]) : null;
  if (!base) return null;
  const stripe = parts[1] ? findColor(parts[1]) : null;
  return [base, stripe && stripe !== base ? stripe : null];
}

function wireBackground([base, stripe]: [string, string | null]) {
  return stripe
    ? `repeating-linear-gradient(135deg, ${base} 0 9px, ${stripe} 9px 13px)`
    : base;
}

interface WireSwatchProps {
  value: string | null | undefined;
  /** "dot": círculo para listas; "cable": tramo de cable horizontal. */
  variant?: "dot" | "cable";
  className?: string;
}

export function WireSwatch({ value, variant = "dot", className }: WireSwatchProps) {
  const colors = parseWireColors(value);
  if (!colors) return null;
  return (
    <span
      aria-hidden="true"
      style={{ background: wireBackground(colors) }}
      className={cn(
        // La sombra interior hace visible un cable blanco sobre fondo claro.
        "block shrink-0 shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.14)]",
        variant === "dot" ? "h-10 w-10 rounded-full" : "h-4 w-full rounded-full",
        className,
      )}
    />
  );
}
