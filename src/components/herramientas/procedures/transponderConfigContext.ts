import { createContext, useContext } from "react";
import type { ImmoCatalogItem, ImmoTransponderConfig, ToolAssignment } from "@/types";

export interface TransponderConfigLibraryValue {
  configs: ImmoCatalogItem[];
  getById: (id: string | undefined) => ImmoCatalogItem | undefined;
  usages: (id: string) => ToolAssignment[];
  knownMakes: string[];
  /** Catálogos para el formulario de la configuración. */
  transponderCatalog: ImmoCatalogItem[];
  equipoCatalog: ImmoCatalogItem[];
  transponderOptions: ImmoCatalogItem[];
  catalogName: (id: string) => string | undefined;
  create: (p: { marca: string; titulo: string; config: ImmoTransponderConfig }) => Promise<ImmoCatalogItem | null>;
  /** Guarda la configuración y actualiza la copia en cada vehículo que la usa. */
  update: (item: ImmoCatalogItem) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const TransponderConfigLibraryContext = createContext<TransponderConfigLibraryValue | null>(null);

export const useTransponderConfigLibrary = () => useContext(TransponderConfigLibraryContext);
