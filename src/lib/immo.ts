import { IMMO_MODULACIONES, type ImmoAssignmentDetail, type ImmoCatalogItem, type ImmoModulacion, type ImmoProfile } from "@/types";

/** Texto que ve el técnico cuando el modelo no tiene inmovilizador. */
export const SIN_INMOVILIZADOR_TEXTO = "Este modelo no utiliza transponder";

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


export type ImmoDetailField =
  | "transponder" | "pincode" | "generadoCon" | "equiposTransponder"
  | "metodo" | "equiposRemoto" | "pasos";

/**
 * Campos sin completar de los datos Immo de una asignación. Cada perfil elegido se llena
 * completo; la única forma de no llenarlo es omitir Immo Info entero. Las notas son opcionales.
 * «Sin inmovilizador» deja fuera las secciones de transponder y pincode.
 */
export function immoDetailMissing(detail: Partial<ImmoAssignmentDetail> | null | undefined): { field: ImmoDetailField; label: string }[] {
  const d = detail ?? {};
  const out: { field: ImmoDetailField; label: string }[] = [];
  const has = (v: unknown) => String(v ?? "").trim().length > 0;
  if (!d.sinInmovilizador) {
    if (!has(d.transponder)) out.push({ field: "transponder", label: "Transponder" });
    // Pincode: «No lleva», o cómo obtenerlo (con o sin «Requiere» marcado).
    if (!d.sinPincode && !has(d.formaObtencionPincode)) {
      out.push({ field: "pincode", label: d.pincodeRequerido ? "Cómo obtener el pincode" : "Pincode (marca «No lleva» o escribe cómo obtenerlo)" });
    }
    if (!d.transponderNoGenerable && !(d.generadoConIds?.length)) out.push({ field: "generadoCon", label: "Se genera con (o «no se puede generar»)" });
    if (!d.omitirEquiposTransponder && !(d.equiposTransponderIds?.length)) out.push({ field: "equiposTransponder", label: "Equipos para programar el transponder" });
  }
  if (!d.programacionManual && !d.programacionOBD) out.push({ field: "metodo", label: "Método de programación del remoto" });
  if (!d.omitirEquiposRemoto && !(d.equiposRemotoIds?.length)) out.push({ field: "equiposRemoto", label: "Equipos para programar el remoto" });
  if (!has(d.procedimientoId) && !has(d.procedimientoProgramacion)) out.push({ field: "pasos", label: "Pasos para programar el remoto" });
  return out;
}

/** Igual que `immoDetailMissing`, solo los nombres. */
export function immoDetailIssues(detail: Partial<ImmoAssignmentDetail> | null | undefined): string[] {
  return immoDetailMissing(detail).map((m) => m.label);
}

export type ImmoProfileField = "images" | "marca" | "fccId" | "frecuencia" | "modulacion" | "bateria" | "generacion";

/** Campos sin completar de un perfil Immo (todos se piden; la generación se puede omitir). */
export function immoProfileMissing(p: Partial<ImmoProfile> | null | undefined): { field: ImmoProfileField; label: string }[] {
  const d = p ?? {};
  const out: { field: ImmoProfileField; label: string }[] = [];
  const has = (v: unknown) => String(v ?? "").trim().length > 0;
  if (!immoProfileImages(d as ImmoProfile).length) out.push({ field: "images", label: "Al menos una imagen" });
  if (!has(d.marca)) out.push({ field: "marca", label: "Marca" });
  if (!has(d.fccId)) out.push({ field: "fccId", label: "FCC ID" });
  if (!has(d.frecuencia)) out.push({ field: "frecuencia", label: "Frecuencia" });
  if (!has(d.modulacion)) out.push({ field: "modulacion", label: "Modulación (FSK o ASK)" });
  if (!has(d.bateria)) out.push({ field: "bateria", label: "Batería" });
  if (!d.generacionOmitida && !(d.generacionRemoto ?? []).some((f) => has(f.value))) {
    out.push({ field: "generacion", label: "Generación de remoto (al menos un dato, o «Omitir»)" });
  }
  return out;
}
