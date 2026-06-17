import { useCallback } from "react";
import type { ImmoCatalogItem } from "@/types";
import { useJsonResource } from "./useJsonResource";

const DEFAULT_CATALOG: ImmoCatalogItem[] = [
  { id: "cat-xt27",    label: "XT27",      category: "transponder" },
  { id: "cat-kd26",    label: "KD26",      category: "transponder" },
  { id: "cat-at100",   label: "AT100",     category: "transponder" },
  { id: "cat-ck100",   label: "CK100",     category: "equipo" },
  { id: "cat-t300",    label: "T300",      category: "equipo" },
  { id: "cat-km100",   label: "KM100",     category: "equipo" },
  { id: "cat-im508",   label: "IM508/608", category: "equipo" },
  { id: "cat-ktplus",  label: "KTPLUS",    category: "equipo" },
  { id: "cat-ktpad",   label: "KTPAD",     category: "equipo" },
];

export function useImmoCatalog() {
  const { items, setItems, addItem, updateItem, deleteItem } = useJsonResource<ImmoCatalogItem>({
    endpoint: "/herramientas/immo-catalog",
    cacheKey: "herramientas:immo_catalog",
    fallback: DEFAULT_CATALOG,
  });

  const reorderItems = useCallback((next: ImmoCatalogItem[]) => {
    setItems(next);
    // Para reordenamiento no enviamos al backend ítem por ítem; el orden se persiste local.
  }, [setItems]);

  return {
    catalog: items.length ? items : DEFAULT_CATALOG,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  };
}
