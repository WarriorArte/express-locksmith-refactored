import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carDatabase, type CarRecord, type VehicleCategory } from "@/data/carDatabase";
import { phpApiRequest } from "@/lib/phpApi";

const STORAGE_KEY = "herramientas:vehicle_database";

export interface VehicleImportResult {
  imported: number;
  skippedExisting: number;
}

function normalize(records: CarRecord[]): CarRecord[] {
  const unique = new Map<string, CarRecord>();

  for (const record of records) {
    const make = String(record.Make ?? "").trim();
    const model = String(record.Model ?? "").trim();
    // Allow NaN or 0 if it's just a placeholder for a make/model
    const year = Number(record.Year) || 0;

    if (!make) continue;

    unique.set(`${make.toLowerCase()}|${model.toLowerCase()}|${year}`, {
      Make: make,
      Model: model,
      Year: year,
      Category: (record.Category as VehicleCategory) ?? undefined,
    });
  }

  return Array.from(unique.values()).sort((a, b) => {
    const makeCmp = a.Make.localeCompare(b.Make, "es", { sensitivity: "base" });
    if (makeCmp !== 0) return makeCmp;

    const modelCmp = a.Model.localeCompare(b.Model, "es", { sensitivity: "base" });
    if (modelCmp !== 0) return modelCmp;

    return a.Year - b.Year;
  });
}

function loadInitialRecords(): CarRecord[] {
  if (typeof window === "undefined") return normalize(carDatabase.results);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { results?: CarRecord[] };
      if (Array.isArray(parsed.results)) {
        return normalize(parsed.results);
      }
    }
  } catch {
    // Ignore invalid localStorage payloads and fallback to seed files.
  }

  return normalize(carDatabase.results);
}

export function useVehicleDatabase() {
  const [records, setRecords] = useState<CarRecord[]>(loadInitialRecords);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: records }));
    } catch {
      // Ignore write failures in dev browsers with blocked storage.
    }
  }, [records]);

  const patchRecords = useCallback((updater: (current: CarRecord[]) => CarRecord[]) => {
    setRecords((current) => normalize(updater(current)));
  }, []);

  const indexes = useMemo(() => {
    const makeSet = new Set<string>();
    const modelsByMake = new Map<string, Set<string>>();
    const yearsByMakeModel = new Map<string, Set<number>>();
    const categoryByMake = new Map<string, VehicleCategory>();

    records.forEach((record) => {
      if (!record.Make) return;

      makeSet.add(record.Make);
      if (!categoryByMake.has(record.Make)) {
        categoryByMake.set(record.Make, (record.Category as VehicleCategory) ?? "Vehiculo");
      }

      if (record.Model) {
        if (!modelsByMake.has(record.Make)) modelsByMake.set(record.Make, new Set());
        modelsByMake.get(record.Make)!.add(record.Model);
      }

      if (record.Model && record.Year > 0) {
        const key = `${record.Make}|${record.Model}`;
        if (!yearsByMakeModel.has(key)) yearsByMakeModel.set(key, new Set());
        yearsByMakeModel.get(key)!.add(record.Year);
      }
    });

    const sortText = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });
    return {
      makes: Array.from(makeSet).sort(sortText),
      modelsByMake,
      yearsByMakeModel,
      categoryByMake,
      sortText,
    };
  }, [records]);

  const makes = indexes.makes;

  const getModelsByMake = useCallback(
    (make: string) =>
      Array.from(indexes.modelsByMake.get(make) ?? []).sort(indexes.sortText),
    [indexes]
  );

  const getYearsByMakeModel = useCallback(
    (make: string, model: string) =>
      Array.from(indexes.yearsByMakeModel.get(`${make}|${model}`) ?? []).sort((a, b) => a - b),
    [indexes]
  );

  const addMake = useCallback(
    (make: string, category: VehicleCategory) => {
      patchRecords((current) => [...current, { Make: make, Model: "", Year: 0, Category: category }]);
    },
    [patchRecords]
  );

  const renameMake = useCallback(
    (oldMake: string, newMake: string) => {
      patchRecords((current) => current.map((r) => (r.Make === oldMake ? { ...r, Make: newMake } : r)));
    },
    [patchRecords]
  );

  const deleteMake = useCallback(
    (make: string) => {
      patchRecords((current) => current.filter((r) => r.Make !== make));
    },
    [patchRecords]
  );

  const addModel = useCallback(
    (make: string, model: string, yearStart: number, yearEnd: number) => {
      patchRecords((current) => {
        const category = current.find((r) => r.Make === make)?.Category;
        const minYear = Math.min(yearStart, yearEnd);
        const maxYear = Math.max(yearStart, yearEnd);
        const generated: CarRecord[] = [];

        for (let y = minYear; y <= maxYear; y += 1) {
          generated.push({ Make: make, Model: model, Year: y, Category: category });
        }

        return [...current, ...generated];
      });
    },
    [patchRecords]
  );

  const renameModel = useCallback(
    (make: string, oldModel: string, newModel: string) => {
      patchRecords((current) =>
        current.map((r) => (r.Make === make && r.Model === oldModel ? { ...r, Model: newModel } : r))
      );
    },
    [patchRecords]
  );

  const deleteModel = useCallback(
    (make: string, model: string) => {
      patchRecords((current) => current.filter((r) => !(r.Make === make && r.Model === model)));
    },
    [patchRecords]
  );

  const addYear = useCallback(
    (make: string, model: string, year: number) => {
      patchRecords((current) => {
        const category = current.find((r) => r.Make === make)?.Category;
        return [...current, { Make: make, Model: model, Year: year, Category: category }];
      });
    },
    [patchRecords]
  );

  const renameYear = useCallback(
    (make: string, model: string, oldYear: number, newYear: number) => {
      patchRecords((current) =>
        current.map((r) => (r.Make === make && r.Model === model && r.Year === oldYear ? { ...r, Year: newYear } : r))
      );
    },
    [patchRecords]
  );

  const deleteYear = useCallback(
    (make: string, model: string, year: number) => {
      patchRecords((current) => current.filter((r) => !(r.Make === make && r.Model === model && r.Year === year)));
    },
    [patchRecords]
  );

  const getMakeCategory = useCallback(
    (make: string): VehicleCategory =>
      indexes.categoryByMake.get(make) ?? "Vehiculo",
    [indexes]
  );

  const setCategoryForMake = useCallback(
    (make: string, category: VehicleCategory) => {
      patchRecords((current) => current.map((r) => r.Make === make ? { ...r, Category: category } : r));
    },
    [patchRecords]
  );

  const importVehicleRecords = useCallback(
    (incoming: CarRecord[], category: VehicleCategory): VehicleImportResult => {
      const importable = incoming
        .map((record) => ({
          Make: String(record.Make ?? "").trim(),
          Model: String(record.Model ?? "").trim(),
          Year: Number(record.Year),
          Category: category,
        }))
        .filter((record) => record.Make && record.Model && Number.isFinite(record.Year) && record.Year > 0);

      let imported = 0;
      let skippedExisting = 0;

      if (importable.length > 0) {
        const existingKeys = new Set(
          records.map((record) =>
            `${record.Make.toLowerCase()}|${record.Model.toLowerCase()}|${record.Year}`
          )
        );
        const importedMakes = new Set(importable.map((record) => record.Make.toLowerCase()));
        const nextRecords = records.map((record) =>
          importedMakes.has(record.Make.toLowerCase()) ? { ...record, Category: category } : record
        );

        importable.forEach((record) => {
          const key = `${record.Make.toLowerCase()}|${record.Model.toLowerCase()}|${record.Year}`;
          if (existingKeys.has(key)) {
            skippedExisting += 1;
            return;
          }

          existingKeys.add(key);
          nextRecords.push(record);
          imported += 1;
        });

        setRecords(normalize(nextRecords));
      }

      return { imported, skippedExisting };
    },
    [records]
  );

  const resetToSeed = useCallback(() => {
    setRecords(normalize(carDatabase.results));
  }, []);

  return {
    records,
    makes,
    getModelsByMake,
    getYearsByMakeModel,
    getMakeCategory,
    setCategoryForMake,
    importVehicleRecords,
    addMake,
    renameMake,
    deleteMake,
    addModel,
    renameModel,
    deleteModel,
    addYear,
    renameYear,
    deleteYear,
    resetToSeed,
  };
}
