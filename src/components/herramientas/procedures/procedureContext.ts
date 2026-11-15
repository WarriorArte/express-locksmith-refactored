import { createContext, useContext } from "react";
import type { ImmoCatalogItem, ToolAssignment } from "@/types";

export interface ProcedureLibraryValue {
  procedures: ImmoCatalogItem[];
  getById: (id: string | undefined) => ImmoCatalogItem | undefined;
  usages: (id: string) => ToolAssignment[];
  knownMakes: string[];
  create: (p: { marca: string; titulo: string; texto: string }) => Promise<ImmoCatalogItem | null>;
  update: (item: ImmoCatalogItem) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const ProcedureLibraryContext = createContext<ProcedureLibraryValue | null>(null);

export const useProcedureLibrary = () => useContext(ProcedureLibraryContext);
