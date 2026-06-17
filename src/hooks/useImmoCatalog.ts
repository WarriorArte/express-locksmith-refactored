import { useCallback } from "react";
import type { ImmoCatalogItem } from "@/types";
import { useJsonResource } from "./useJsonResource";

export function useImmoCatalog() {
  const { items, setItems, addItem, updateItem, deleteItem } = useJsonResource<ImmoCatalogItem>({
    endpoint: "/herramientas/immo-catalog",
  });

  const reorderItems = useCallback((next: ImmoCatalogItem[]) => {
    setItems(next);
  }, [setItems]);

  return {
    catalog: items,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  };
}
