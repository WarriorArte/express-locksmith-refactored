import { IMMO_MODULACIONES, type ImmoModulacion, type ImmoProfile } from "@/types";

/** Devuelve la modulación solo si es un valor válido (protege contra datos viejos o mal escritos). */
export function getModulacion(p: Pick<ImmoProfile, "modulacion">): ImmoModulacion | null {
  const v = String(p.modulacion ?? "").trim().toUpperCase();
  return (IMMO_MODULACIONES as string[]).includes(v) ? (v as ImmoModulacion) : null;
}

/**
 * Número de frecuencia sin la unidad escrita a mano: «313», «313 MHz» y «315mhz»
 * dan el mismo valor, así basta con teclear el número.
 */
export function getFrecuenciaMHz(frecuencia: string | null | undefined): string {
  return String(frecuencia ?? "").replace(/mhz/gi, "").trim();
}

/** Frecuencia con su modulación en una sola etiqueta: «433 MHz · FSK», «433 MHz», «ASK» o "". */
export function formatFrecuencia(p: Pick<ImmoProfile, "frecuencia" | "modulacion">): string {
  const mhz = getFrecuenciaMHz(p.frecuencia);
  return [mhz ? `${mhz} MHz` : "", getModulacion(p)].filter(Boolean).join(" · ");
}
