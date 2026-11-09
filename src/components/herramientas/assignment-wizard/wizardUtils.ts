/**
 * Utilidades compartidas por el asistente móvil de asignaciones: normalización de
 * nombres, validación de años y el contrato mínimo de la base de vehículos.
 */
import type { VehicleCategory } from "@/data/carDatabase";

export const MIN_YEAR = 1950;
export const MAX_YEAR = new Date().getFullYear() + 2;
export const MAX_YEAR_SPAN = 60;
export const MAX_NAME_LENGTH = 60;

export const CATEGORY_LABELS: Record<VehicleCategory, string> = { Vehiculo: "Auto", Camion: "Camión", Motocicleta: "Moto" };

/** Colapsa espacios repetidos y recorta los extremos. */
export const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();

/** Comparación sin distinguir mayúsculas ni acentos. */
export const sameText = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" }) === 0;

/** Deja solo dígitos y como máximo 4 (para inputs de año). */
export const yearInput = (raw: string) => raw.replace(/\D/g, "").slice(0, 4);

/** Valida un nombre de marca o modelo. Devuelve el mensaje de error o null. */
export function validateName(value: string, what: "la marca" | "el modelo"): string | null {
  const v = clean(value);
  if (!v) return `Escribe ${what}.`;
  if (v.length > MAX_NAME_LENGTH) return `Máximo ${MAX_NAME_LENGTH} caracteres.`;
  return null;
}

/** Valida un rango de años escrito como texto. Devuelve el mensaje de error o null. */
export function validateYearRange(start: string, end: string): string | null {
  if (!start || !end) return "Indica el año de inicio y el de fin.";
  if (!/^\d{4}$/.test(start) || !/^\d{4}$/.test(end)) return "Los años deben tener 4 dígitos.";
  const ys = Number(start);
  const ye = Number(end);
  if (ys < MIN_YEAR || ye > MAX_YEAR) return `Los años deben estar entre ${MIN_YEAR} y ${MAX_YEAR}.`;
  if (ys > ye) return "El año de inicio no puede ser mayor que el año de fin.";
  if (ye - ys > MAX_YEAR_SPAN) return `El rango no puede superar ${MAX_YEAR_SPAN} años.`;
  return null;
}

/** Agrupa años consecutivos para mostrarlos compactos: [2010,2011,2012,2015] → "2010–2012, 2015". */
export function formatYearList(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(i === j ? String(sorted[i]) : `${sorted[i]}–${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/** UUID con respaldo: `crypto.randomUUID` no existe fuera de contextos seguros (http por IP en el teléfono). */
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Editor abierto en el paso Vehículo (agregar o corregir un nivel de la base). */
export type VehicleEditor = "newMake" | "editMake" | "newModel" | "editModel" | "addYears";

/** Vehículo elegido en el asistente (años como texto, tal como vienen de los selects). */
export interface VehicleValue {
  make: string;
  model: string;
  yearStart: string;
  yearEnd: string;
}

export const EMPTY_VEHICLE: VehicleValue = { make: "", model: "", yearStart: "", yearEnd: "" };

/** Subconjunto de `useVehicleDatabase` que usa el asistente. */
export interface WizardVehicleDb {
  makes: string[];
  getModelsByMake: (make: string) => string[];
  getYearsByMakeModel: (make: string, model: string) => number[];
  getMakeCategory: (make: string) => VehicleCategory;
  setCategoryForMake: (make: string, category: VehicleCategory) => void;
  addMake: (make: string, category: VehicleCategory) => void;
  renameMake: (oldMake: string, newMake: string) => void;
  addModel: (make: string, model: string, yearStart: number, yearEnd: number) => void;
  renameModel: (make: string, oldModel: string, newModel: string) => void;
}
