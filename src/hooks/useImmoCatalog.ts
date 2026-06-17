import { useState, useCallback, useEffect } from "react";
import type { ImmoCatalogItem } from "@/types";

const LS_KEY = "herramientas:immo_catalog";

const DEFAULT_CATALOG: ImmoCatalogItem[] = [
  { id: "cat-xt27",    label: "XT27",     category: "transponder" },
  { id: "cat-kd26",    label: "KD26",     category: "transponder" },
  { id: "cat-at100",   label: "AT100",    category: "transponder" },
  { id: "cat-ck100",   label: "CK100",    category: "equipo" },
  { id: "cat-t300",    label: "T300",     category: "equipo" },
  { id: "cat-km100",   label: "KM100",    category: "equipo" },
  { id: "cat-im508",   label: "IM508/608", category: "equipo" },
  { id: "cat-ktplus",  label: "KTPLUS",   category: "equipo" },
  { id: "cat-ktpad",   label: "KTPAD",    category: "equipo" },
];

function loadFromStorage(): ImmoCatalogItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_CATALOG;
    const parsed = JSON.parse(raw) as ImmoCatalogItem[];
    return parsed.length ? parsed : DEFAULT_CATALOG;
  } catch {
    return DEFAULT_CATALOG;
  }
}

export function useImmoCatalog() {
  const [catalog, setCatalog] = useState<ImmoCatalogItem[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(catalog));
  }, [catalog]);

  const addItem = useCallback((item: ImmoCatalogItem) => {
    setCatalog((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((item: ImmoCatalogItem) => {
    setCatalog((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setCatalog((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const reorderItems = useCallback((items: ImmoCatalogItem[]) => {
    setCatalog(items);
  }, []);

  return { catalog, addItem, updateItem, deleteItem, reorderItems };
}
