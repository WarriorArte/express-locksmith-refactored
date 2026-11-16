import { IMMO_MODULACIONES, type ImmoAssignmentDetail, type ImmoCatalogItem, type ImmoModulacion, type ImmoProfile } from "@/types";

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

/** Imágenes de un perfil Immo en orden (perfiles antiguos solo tienen `mainImage`). */
export function immoProfileImages(p: Pick<ImmoProfile, "images" | "mainImage">): string[] {
  const list = (p.images ?? []).filter(Boolean);
  if (list.length) return Array.from(new Set(list));
  return p.mainImage ? [p.mainImage] : [];
}

/** Imagen principal de un perfil dentro de una asignación (la elegida o la primera). */
export function immoAssignmentImage(
  p: Pick<ImmoProfile, "images" | "mainImage">,
  detail: Pick<ImmoAssignmentDetail, "imagenPrincipal"> | null | undefined,
): string | undefined {
  const images = immoProfileImages(p);
  const chosen = detail?.imagenPrincipal;
  return chosen && images.includes(chosen) ? chosen : images[0];
}

/** Texto que ve el técnico: el del procedimiento vinculado o, si no existe, la copia propia. */
export function resolveProcedureText(
  detail: Pick<ImmoAssignmentDetail, "procedimientoId" | "procedimientoProgramacion"> | null | undefined,
  catalog: ImmoCatalogItem[],
): string {
  const linked = detail?.procedimientoId
    ? catalog.find((c) => c.id === detail.procedimientoId && c.category === "procedimiento")
    : undefined;
  return (linked?.texto ?? detail?.procedimientoProgramacion ?? "").trim();
}


/**
 * Secciones sin completar de los datos Immo de una asignación. Cada perfil elegido se llena
 * completo; la única forma de no llenarlo es omitir Immo Info entero. Las notas son opcionales.
 * «Sin inmovilizador» deja fuera las secciones de transponder y pincode.
 */
export function immoDetailIssues(detail: Partial<ImmoAssignmentDetail> | null | undefined): string[] {
  const d = detail ?? {};
  const issues: string[] = [];
  const has = (v: unknown) => String(v ?? "").trim().length > 0;
  if (!d.sinInmovilizador) {
    if (!has(d.transponder)) issues.push("Transponder");
    if (!d.pincodeRequerido && !d.sinPincode) issues.push("Pincode (requiere o no lleva)");
    else if (d.pincodeRequerido && !has(d.formaObtencionPincode)) issues.push("Cómo obtener el pincode");
    if (!d.transponderNoGenerable && !(d.generadoConIds?.length)) issues.push("Se genera con (o «no se puede generar»)");
    if (!(d.equiposTransponderIds?.length)) issues.push("Equipos para programar el transponder");
  }
  if (!d.programacionManual && !d.programacionOBD) issues.push("Método de programación del remoto");
  if (d.programacionOBD && !(d.equiposRemotoIds?.length)) issues.push("Equipos para programar el remoto");
  if (!has(d.procedimientoId) && !has(d.procedimientoProgramacion)) issues.push("Pasos para programar el remoto");
  return issues;
}
