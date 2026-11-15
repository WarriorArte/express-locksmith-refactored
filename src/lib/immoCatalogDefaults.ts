/**
 * Listas iniciales del catálogo Immo (Herramientas y Suministros). Se cargan solas la
 * primera vez que la sección está vacía; después se editan desde la pestaña.
 */
import type { ImmoCatalogItem } from "@/types";

/** Opciones del campo «Transponder» de cada asignación. */
export const DEFAULT_TRANSPONDERS_VEHICULO = [
  "Temic ID 11",
  "Temic ID 12",
  "Temic ID 8C",
  "Megamos ID 13",
  "Phillips ID 33",
  "Phillips ID 40",
  "Phillips ID 41",
  "Phillips ID 42",
  "Phillips ID 44",
  "Phillips ID 45",
  "Phillips ID 73",
  "Phillips ID 46",
  "Phillips ID 46E",
  "NXP ID 47",
  "NXP ID 49",
  "NXP 4A",
  "NXP 6A",
  "Texas 4C",
  "Texas 4D 60",
  "Texas 4D 61",
  "Texas 4D 62",
  "Texas 4D 63",
  "Texas 4D 64 (4E)",
  "Texas 4D 65",
  "Texas 4D 66",
  "Texas 4D 67",
  "Texas 4D 68",
  "Texas 4D 69",
  "Texas 4D 70",
  "Texas 4D 70 (80-bits)",
  "Texas 4D 72 (80-bits)",
  "Texas 4D 82 (80-bits)",
  "Texas 4D 83 (80-bits)",
  "Texas 8A",
  "Megamos 48",
  "Megamos 48 MQB",
  "Megamos 49",
  "Sokymat 8E",
];

/** Opciones del campo «Batería» del perfil (incluye recargables LIR / VL). */
export const DEFAULT_BATERIAS = [
  "CR1216",
  "CR1220",
  "CR1225",
  "CR1616",
  "CR1620",
  "CR1632",
  "CR2012",
  "CR2016",
  "CR2025",
  "CR2032",
  "CR2050",
  "CR2320",
  "CR2430",
  "CR2450",
  "CR2477",
  "LIR1220",
  "LIR1620",
  "LIR1632",
  "LIR2016",
  "LIR2025",
  "LIR2032",
  "LIR2430",
  "LIR2450",
  "VL1220",
  "VL2020",
  "VL2330",
  "ML2016",
  "ML2020",
  "BR1225",
  "BR2032",
  "LR41",
  "LR44",
  "A23 (12V)",
  "A27 (12V)",
];

export const IMMO_TEXT_CATEGORIES = ["transponderVehiculo", "bateria"] as const;
export type ImmoTextCategory = (typeof IMMO_TEXT_CATEGORIES)[number];

export const DEFAULTS_BY_CATEGORY: Record<ImmoTextCategory, string[]> = {
  transponderVehiculo: DEFAULT_TRANSPONDERS_VEHICULO,
  bateria: DEFAULT_BATERIAS,
};

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/** Orden alfabético natural («ID 8C» antes que «ID 11»). */
export function sortLabels(labels: string[]): string[] {
  return [...labels].sort(collator.compare);
}

export function sortCatalogItems(items: ImmoCatalogItem[]): ImmoCatalogItem[] {
  return [...items].sort((a, b) => collator.compare(a.label, b.label));
}

export const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Opciones de un selector de catálogo: las del catálogo en orden alfabético y, si el
 * valor guardado no está en la lista (dato anterior o renombrado), se agrega para no perderlo.
 */
export function catalogOptions(items: ImmoCatalogItem[], current?: string | null): string[] {
  const labels = sortLabels(Array.from(new Set(items.map((i) => i.label.trim()).filter(Boolean))));
  const cur = current?.trim();
  if (cur && !labels.some((l) => sameLabel(l, cur))) labels.unshift(cur);
  return labels;
}
