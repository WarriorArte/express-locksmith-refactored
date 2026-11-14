import { IMMO_MODULACIONES, type ImmoAssignmentDetail, type ImmoModulacion, type ImmoProfile } from "@/types";

/** Texto que ve el técnico cuando el modelo no tiene inmovilizador. */
export const SIN_INMOVILIZADOR_TEXTO = "Este modelo no viene equipado con sistema inmovilizador";

/**
 * Valores escritos a mano en «Transponder» para decir que no hay inmovilizador
 * («N/A», «no aplica», «sin transponder»…). Sirven para sugerir marcar la opción.
 */
export function looksLikeNoImmobilizer(transponder: string | null | undefined): boolean {
  const v = String(transponder ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return /^(n\/?a|n\.a\.?|no aplica|ninguno|ninguna|sin transponder|sin inmovilizador|no tiene|no lleva|-+)$/.test(v);
}

/** Etiqueta corta para listas: «Sin inmovilizador», el transponder, o "". */
export function transponderLabel(detail: Pick<ImmoAssignmentDetail, "transponder" | "sinInmovilizador"> | null | undefined): string {
  if (!detail) return "";
  if (detail.sinInmovilizador) return "Sin inmovilizador";
  return String(detail.transponder ?? "").trim();
}

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
