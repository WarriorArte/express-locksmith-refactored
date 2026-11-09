import { useCallback, useEffect, useRef, useState } from "react";
import { phpApiRequest } from "@/lib/phpApi";

/**
 * Hook generico para perfiles del modulo Herramientas que viven como
 * documento JSON en el backend (alarma_profiles, immo_profiles, etc).
 *
 * 100% conectado al servidor: sin cache de localStorage ni seeds locales.
 * Mutaciones optimistas con rollback si la API falla.
 */
export function useJsonResource<T extends { id: string }>(opts: {
  endpoint: string;
  migrate?: (items: any[]) => T[];
}) {
  const { endpoint, migrate } = opts;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await phpApiRequest<any[]>(endpoint, { method: "GET" });
        if (cancelled) return;
        const next = migrate ? migrate(data || []) : ((data || []) as T[]);
        setItems(next);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [endpoint, migrate]);

  // Espejo del estado para leer la versión previa de un elemento sin depender
  // de `items` en las mutaciones (evita restaurar instantáneas obsoletas).
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /**
   * Las mutaciones son optimistas y devuelven `true` si el servidor confirmó.
   * Si falla, se revierte SOLO el elemento afectado (no toda la lista), para no
   * deshacer otros cambios hechos mientras la petición estaba en curso.
   */
  const addItem = useCallback(async (item: T): Promise<boolean> => {
    setItems((p) => [item, ...p.filter((x) => x.id !== item.id)]);
    try {
      await phpApiRequest(endpoint, { method: "POST", body: JSON.stringify(item) });
      return true;
    } catch {
      setItems((p) => p.filter((x) => x.id !== item.id));
      return false;
    }
  }, [endpoint]);

  const updateItem = useCallback(async (item: T): Promise<boolean> => {
    const previous = itemsRef.current.find((x) => x.id === item.id);
    setItems((p) => p.map((x) => (x.id === item.id ? item : x)));
    try {
      await phpApiRequest(`${endpoint}?id=${encodeURIComponent(item.id)}`, {
        method: "PUT",
        body: JSON.stringify(item),
      });
      return true;
    } catch {
      if (previous) setItems((p) => p.map((x) => (x.id === item.id ? previous : x)));
      return false;
    }
  }, [endpoint]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    const list = itemsRef.current;
    const index = list.findIndex((x) => x.id === id);
    const previous = index >= 0 ? list[index] : undefined;
    setItems((p) => p.filter((x) => x.id !== id));
    try {
      await phpApiRequest(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return true;
    } catch {
      if (previous) {
        setItems((p) => {
          if (p.some((x) => x.id === id)) return p;
          const next = [...p];
          next.splice(Math.min(index, next.length), 0, previous);
          return next;
        });
      }
      return false;
    }
  }, [endpoint]);

  return { items, setItems, addItem, updateItem, deleteItem, loading };
}
