import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ImmoCatalogItem } from "@/types";
import { useJsonResource } from "./useJsonResource";
import { DEFAULTS_BY_CATEGORY, IMMO_TEXT_CATEGORIES } from "@/lib/immoCatalogDefaults";

/**
 * @param seedDefaults solo el SuperAdmin: si las listas de Transponder / Batería están vacías
 *   (y la lectura del servidor salió bien) se cargan las listas iniciales una vez.
 */
export function useImmoCatalog({ seedDefaults = false }: { seedDefaults?: boolean } = {}) {
  const { items, setItems, addItem, updateItem, deleteItem, loaded } = useJsonResource<ImmoCatalogItem>({
    endpoint: "/herramientas/immo-catalog",
  });

  const seededRef = useRef(false);
  useEffect(() => {
    if (!seedDefaults || !loaded || seededRef.current) return;
    seededRef.current = true;
    for (const category of IMMO_TEXT_CATEGORIES) {
      if (items.some((i) => i.category === category)) continue;
      DEFAULTS_BY_CATEGORY[category].forEach((label) => {
        void addItem({ id: crypto.randomUUID(), label, category });
      });
    }
  }, [seedDefaults, loaded, items, addItem]);

  // El listado del servidor viene ordenado por fecha de creación, no por el
  // orden en que se arrastraron los elementos — por eso el orden real se guarda
  // en `position` y se aplica aquí.
  const catalog = useMemo(
    () => [...items].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)),
    [items],
  );

  // Reordenamiento en vivo mientras se arrastra: solo actualiza el estado local
  // (sin red) para que un mismo arrastre no dispare docenas de peticiones.
  const previewReorder = useCallback((next: ImmoCatalogItem[]) => {
    setItems(next.map((item, index) => ({ ...item, position: index })));
  }, [setItems]);

  // Se llama una sola vez, al soltar: guarda en el servidor la posición final
  // de cada elemento (el preview ya dejó `position` sincronizado con el índice
  // local, así que aquí simplemente se persiste tal cual quedó).
  const commitReorder = useCallback(() => {
    setItems((current) => {
      current.forEach((item, index) => updateItem({ ...item, position: index }));
      return current;
    });
  }, [setItems, updateItem]);

  return {
    catalog,
    loaded,
    addItem,
    updateItem,
    deleteItem,
    previewReorder,
    commitReorder,
  };
}
