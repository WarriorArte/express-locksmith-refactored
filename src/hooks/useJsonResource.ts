import { useCallback, useEffect, useState } from "react";
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

  const addItem = useCallback((item: T) => {
    const prev = items;
    setItems((p) => [item, ...p]);
    phpApiRequest(endpoint, { method: "POST", body: JSON.stringify(item) })
      .catch(() => setItems(prev));
  }, [endpoint, items]);

  const updateItem = useCallback((item: T) => {
    const prev = items;
    setItems((p) => p.map((x) => (x.id === item.id ? item : x)));
    phpApiRequest(`${endpoint}?id=${encodeURIComponent(item.id)}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }).catch(() => setItems(prev));
  }, [endpoint, items]);

  const deleteItem = useCallback((id: string) => {
    const prev = items;
    setItems((p) => p.filter((x) => x.id !== id));
    phpApiRequest(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      .catch(() => setItems(prev));
  }, [endpoint, items]);

  return { items, setItems, addItem, updateItem, deleteItem, loading };
}
