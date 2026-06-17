import { useCallback, useEffect, useRef, useState } from "react";
import { phpApiRequest } from "@/lib/phpApi";

/**
 * Hook genérico para perfiles del módulo Herramientas que viven como
 * documento JSON completo en el backend (alarma_profiles, immo_profiles, etc).
 *
 * - Carga inicial desde la API; cae a localStorage si la API falla.
 * - Mutaciones (add/update/delete) son optimistas y se persisten en API + cache.
 * - Mantiene la misma interfaz que los hooks originales basados en localStorage,
 *   por lo que los componentes consumidores no requieren cambios.
 */
export function useJsonResource<T extends { id: string }>(opts: {
  endpoint: string;              // ej. "/herramientas/alarma-profiles"
  cacheKey: string;              // localStorage key
  migrate?: (items: any[]) => T[];
  fallback?: T[];                // valor inicial si no hay cache ni API
}) {
  const { endpoint, cacheKey, migrate, fallback } = opts;

  const loadCache = useCallback((): T[] => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return fallback ?? [];
      const parsed = JSON.parse(raw);
      return migrate ? migrate(parsed) : (parsed as T[]);
    } catch {
      return fallback ?? [];
    }
  }, [cacheKey, migrate, fallback]);

  const [items, setItems] = useState<T[]>(loadCache);
  const loadedFromApi = useRef(false);

  // Cargar desde API una vez al montar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await phpApiRequest<any[]>(endpoint, { method: "GET" });
        if (cancelled) return;
        const next = migrate ? migrate(data || []) : ((data || []) as T[]);
        setItems(next);
        loadedFromApi.current = true;
      } catch {
        // Silencio: usamos el cache de localStorage si la API no está disponible
      }
    })();
    return () => { cancelled = true; };
  }, [endpoint, migrate]);

  // Persistir cache local cada vez que cambia.
  useEffect(() => {
    try { localStorage.setItem(cacheKey, JSON.stringify(items)); } catch { /* noop */ }
  }, [items, cacheKey]);

  const addItem = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
    phpApiRequest(endpoint, { method: "POST", body: JSON.stringify(item) }).catch(() => { /* offline-safe */ });
  }, [endpoint]);

  const updateItem = useCallback((item: T) => {
    setItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));
    phpApiRequest(`${endpoint}?id=${encodeURIComponent(item.id)}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }).catch(() => { /* offline-safe */ });
  }, [endpoint]);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    phpApiRequest(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      .catch(() => { /* offline-safe */ });
  }, [endpoint]);

  return { items, setItems, addItem, updateItem, deleteItem };
}
