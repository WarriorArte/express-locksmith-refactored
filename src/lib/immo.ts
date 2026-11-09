import { IMMO_MODULACIONES, type ImmoModulacion, type ImmoProfile } from "@/types";

/** Devuelve la modulación solo si es un valor válido (protege contra datos viejos o mal escritos). */
export function getModulacion(p: Pick<ImmoProfile, "modulacion">): ImmoModulacion | null {
  const v = String(p.modulacion ?? "").trim().toUpperCase();
  return (IMMO_MODULACIONES as string[]).includes(v) ? (v as ImmoModulacion) : null;
}

/** Frecuencia con su modulación en una sola etiqueta: «433 MHz · FSK», «433 MHz», «ASK» o "". */
export function formatFrecuencia(p: Pick<ImmoProfile, "frecuencia" | "modulacion">): string {
  return [String(p.frecuencia ?? "").trim(), getModulacion(p)].filter(Boolean).join(" · ");
}
