import { createContext, useContext } from "react";
import type { ImmoCatalogItem, ToolAssignment } from "@/types";

export interface ProcedureLibraryValue {
  procedures: ImmoCatalogItem[];
  getById: (id: string | undefined) => ImmoCatalogItem | undefined;
  usages: (id: string) => ToolAssignment[];
  knownMakes: string[];
  create: (p: { marca: string; titulo: string; texto: string; manual: boolean; obd: boolean }) => Promise<ImmoCatalogItem | null>;
  /** Guarda el procedimiento y actualiza el método (y la copia de los pasos) en cada vehículo que lo usa. */
  update: (item: ImmoCatalogItem) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const ProcedureLibraryContext = createContext<ProcedureLibraryValue | null>(null);

export const useProcedureLibrary = () => useContext(ProcedureLibraryContext);
