/**
 * Regla única para los años de vehículos (base de vehículos y asistente).
 *
 * Un año escrito por error (p. ej. 22000 en vez de 2020) generaba miles de años
 * de golpe al agregar un modelo con rango. Por eso todo alta o cambio de año pasa
 * por aquí: entre MIN_VEHICLE_YEAR y el año en curso + 1 (modelos del año próximo).
 */

export const MIN_VEHICLE_YEAR = 1950;

/** Año máximo permitido: el año en curso + 1. Se calcula en cada uso (no se congela al cargar). */
export function maxVehicleYear(): number {
  return new Date().getFullYear() + 1;
}

/** Rango máximo de años de un modelo en una sola alta. */
export const MAX_VEHICLE_YEAR_SPAN = 60;

/** Mensaje de error para un año, o null si es válido. Acepta número o texto. */
export function vehicleYearError(value: number | string): string | null {
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return "El año debe tener 4 dígitos.";
  const year = Number(text);
  const max = maxVehicleYear();
  if (year < MIN_VEHICLE_YEAR || year > max) return `El año debe estar entre ${MIN_VEHICLE_YEAR} y ${max}.`;
  return null;
}

/** Mensaje de error para un rango, o null si es válido. */
export function vehicleYearRangeError(start: number | string, end: number | string): string | null {
  const startError = vehicleYearError(start);
  if (startError) return `Año inicio: ${startError.charAt(0).toLowerCase()}${startError.slice(1)}`;
  const endError = vehicleYearError(end);
  if (endError) return `Año fin: ${endError.charAt(0).toLowerCase()}${endError.slice(1)}`;
  const ys = Number(start);
  const ye = Number(end);
  if (ys > ye) return "El año de inicio no puede ser mayor que el año de fin.";
  if (ye - ys > MAX_VEHICLE_YEAR_SPAN) return `El rango no puede superar ${MAX_VEHICLE_YEAR_SPAN} años.`;
  return null;
}

export function isValidVehicleYear(value: number | string): boolean {
  return vehicleYearError(value) === null;
}
