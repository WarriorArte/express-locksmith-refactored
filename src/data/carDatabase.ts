export type VehicleCategory = "Vehiculo" | "Camion" | "Motocicleta";

export const VEHICLE_CATEGORIES: VehicleCategory[] = ["Vehiculo", "Camion", "Motocicleta"];
export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  Vehiculo: "Vehículo",
  Camion: "Camión",
  Motocicleta: "Motocicleta",
};

export interface CarRecord {
  Make: string;
  Year: number;
  Model: string;
  Category?: VehicleCategory;
}

export interface CarDatabaseResult {
  results: CarRecord[];
}

function normalizeRecords(records: CarRecord[]): CarRecord[] {
  const unique = new Map<string, CarRecord>();

  for (const record of records) {
    const make = String(record.Make ?? "").trim();
    const model = String(record.Model ?? "").trim();
    const year = Number(record.Year);

    if (!make || !model || !Number.isFinite(year)) continue;

    const normalized: CarRecord = {
      Make: make,
      Model: model,
      Year: year,
    };

    unique.set(`${make.toLowerCase()}|${model.toLowerCase()}|${year}`, normalized);
  }

  return Array.from(unique.values()).sort((a, b) => {
    const makeCmp = a.Make.localeCompare(b.Make, "es", { sensitivity: "base" });
    if (makeCmp !== 0) return makeCmp;

    const modelCmp = a.Model.localeCompare(b.Model, "es", { sensitivity: "base" });
    if (modelCmp !== 0) return modelCmp;

    return a.Year - b.Year;
  });
}

export function getSeedCarDatabase(): CarDatabaseResult {
  if (!import.meta.env.DEV) {
    return { results: [] };
  }

  const modules = import.meta.glob("/temp_db/auto-list/*.json", { eager: true }) as Record<
    string,
    { default?: CarDatabaseResult; results?: CarRecord[] }
  >;

  const all: CarRecord[] = [];

  for (const mod of Object.values(modules)) {
    const raw = mod.default?.results ?? mod.results ?? [];
    if (Array.isArray(raw)) {
      all.push(...raw);
    }
  }

  return { results: normalizeRecords(all) };
}

export const carDatabase: CarDatabaseResult = getSeedCarDatabase();
