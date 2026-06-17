export interface KeyReference {
  id: number;
  brand: string;
  refCode: string;
  isPrimary: boolean;
}

export interface DepthMapping {
  [key: string]: string;
}

export interface AxisConfig {
  label: string;
  length: number;
}

export interface BittingConfig {
  length: number;
  maxDepth: number;
  depthMapping?: DepthMapping;
  axes?: AxisConfig[];
}

export interface CodeEntry {
  codigo: string;
  bitting: string[];
}

export type TipoLlaveSVG =
  | 'doble_lado'
  | 'estandar_1_lado'
  | '2_ejes_exterior'
  | '2_ejes_internos'
  | 'pista_canal'
  | 'pista_semi_canal'
  | '1_eje_lateral';

export interface ConfiguracionVisualLlave {
  tipo: TipoLlaveSVG;
  shoulderDrop?: number;
  grosorLlave: number;
  maxDepth: number;
  distanciaHombro: number;
  spacing: number;
  distanciaPunta: number;
  depthStep?: number;
  valleyWidth?: number;
  crestWidth?: number;
  biselPunta?: number;
  anclaYPorcentaje?: number;
  separacionBase?: number;
  profundidadActiva?: number;
  anchoPlanoActivo?: number;
  dinamismoActivo?: number;
  profSup?: number;
  anchoSup?: number;
  dinamismoSup?: number;
  profInf?: number;
  anchoInf?: number;
  dinamismoInf?: number;
  orientacion?: 'inferior' | 'superior';
}

/**
 * Tipos físicos del decodificador-por-foto.
 * Mapeo desde TipoLlaveSVG:
 *   doble_lado          → estandar_doble
 *   estandar_1_lado     → estandar_un
 *   2_ejes_exterior     → dos_ejes_exterior
 *   2_ejes_internos     → dos_ejes_interior
 *   pista_canal         → pista_canal
 *   pista_semi_canal    → pista_canal (comparte preset)
 *   1_eje_lateral       → pista_canal (comparte preset, ver decisión usuario)
 */
export type DecoderTipoLlave =
  | 'estandar_doble'
  | 'estandar_un'
  | 'dos_ejes_exterior'
  | 'dos_ejes_interior'
  | 'pista_canal'
  | '1_eje_lateral';

export type DecoderAlineacion = 'punta' | 'hombro';
export type DecoderLado = 'izq' | 'der';

export interface DecoderConfig {
  tipoLlave: DecoderTipoLlave;
  alineacion: DecoderAlineacion;
  ladoEstandarUn: DecoderLado;
  anchoLlave: number;
  /** Profundidades en unidades físicas, ordenadas del nivel 1 al N (longitud = bittingConfig.maxDepth idealmente) */
  profundidades: number[];
  /** Distancias de cada corte respecto al borde de referencia (eje izq / eje único) */
  distanciasCortes: number[];
  /** Sólo usado para tipos de dos ejes (eje B / der) */
  distanciasCortesDer: number[];
  escalaPixelMm: number;
}

export interface KeycodeProfile {
  id: string;
  references: KeyReference[];
  icCard: string;
  series: string;
  bittingConfig: BittingConfig;
  codesData: CodeEntry[];
  /** Total de códigos en DB (presente en respuestas de lista, donde codesData llega vacío). */
  codesCount?: number;
  /** Una entrada de muestra para la vista previa SVG en la lista (presente cuando codesData está vacío). */
  codeSample?: CodeEntry[];
  dateAdded: string;
  configuracionVisual?: ConfiguracionVisualLlave;
  profileImage?: string;
  decoderConfig?: DecoderConfig;
}

// Workshop type is defined canonically in @/hooks/useWorkshop.
// Re-exported here for backward compatibility with the standalone module.
export type { Workshop } from "@/hooks/useWorkshop";

/** Llaves de cerradura disponibles por asignación de vehículo. */
export type LockKey = 'ignicion' | 'puerta' | 'guantera' | 'maletero' | 'compuerta' | 'gas';

export const LOCK_LABELS: Record<LockKey, string> = {
  ignicion: 'Ignición',
  puerta: 'Puerta',
  guantera: 'Guantera',
  maletero: 'Maletero',
  compuerta: 'Compuerta',
  gas: 'Gas',
};

export const LOCK_ORDER: LockKey[] = ['ignicion', 'puerta', 'guantera', 'maletero', 'compuerta', 'gas'];

/**
 * Mapa de cerraduras por perfil dentro de una asignación.
 * Estructura: { [profileId]: { [lockKey]: boolean[] } }
 *  - boolean[] tiene la misma longitud que el bitting total del perfil.
 *  - true = ese corte está presente en esa cerradura, false = no está.
 *  - Si una cerradura no está incluida para el perfil, su clave NO existe en el objeto.
 */
export type LockSelectionsMap = Record<string, Partial<Record<LockKey, boolean[]>>>;

export interface ToolAssignment {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  tools: string[];
  workshops: string[];
  dateAdded: string;
  /** @deprecated Use keycodeProfileIds instead */
  keycodeProfileId?: string | null;
  keycodeProfileIds: string[];
  /** Cerraduras configuradas por el SuperAdmin para este vehículo + serie. */
  lockSelections?: LockSelectionsMap;
  alarmaProfileIds?: string[];
  /** @deprecated migrated to immoDetails on load */
  immoProfileIds?: string[];
  immoDetails?: ImmoAssignmentDetail[];
}

// ── Immo Info ────────────────────────────────────────────────────────────────

/** Single item in the centralized Immo catalog (equipment or transponder type). */
export interface ImmoCatalogItem {
  id: string;
  label: string;
  image?: string;
  category: 'equipo' | 'transponder';
}

export interface ImmoGenField {
  id: string;
  label: string;
  value: string;
}

/** Remote/FCC profile — vehicle-independent data. */
export interface ImmoProfile {
  id: string;
  marca: string;
  fccId: string;
  frecuencia: string;
  bateria: string;
  mainImage?: string;
  generacionRemoto: ImmoGenField[];
  dateAdded: string;
}

/**
 * Vehicle-specific Immo data attached to a ToolAssignment.
 * The same remote can have a different transponder or programming
 * procedure depending on which vehicle it is assigned to.
 */
export interface ImmoAssignmentDetail {
  profileId: string;
  transponder: string;
  generadoConIds: string[];
  equiposRemotoIds: string[];
  equiposTransponderIds: string[];
  programacionManual: boolean;
  programacionOBD: boolean;
  procedimientoProgramacion: string;
}

// ── Auto Alarmas ─────────────────────────────────────────────────────────────

export interface AlarmaYearValue {
  years: string[];
  value: string;
}

export interface AlarmaDetalle {
  id: string;
  label: string;
  value: string;
  yearValues?: AlarmaYearValue[];
}

export interface AlarmaNote {
  id: string;
  type: 'image_variation' | 'coverage';
  title: string;
  text?: string;
  documented?: string[];
  probable?: string[];
}

export interface AlarmaYearImage {
  sku: string;
  file: string;
  years: string[];
}

export interface AlarmaDataValue {
  id: string;
  title: string;
  details: AlarmaDetalle[];
  imageUrl?: string;
  yearImages?: AlarmaYearImage[];
  notes?: AlarmaNote[];
}

export interface AlarmaVehicleImage {
  sku: string;
  file: string;
  years: string[];
  kind: 'logo' | 'vehicle';
}

export interface AlarmaProfile {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  variante?: string;
  yearRange?: string;
  vehicleImages?: AlarmaVehicleImage[];
  dataValues: AlarmaDataValue[];
  dateAdded: string;
}
