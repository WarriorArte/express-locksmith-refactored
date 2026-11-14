import { useEffect, useState } from "react";

/** true mientras la media query coincide; se actualiza al redimensionar o cambiar el zoom. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Mismo corte que el prefijo `lg:` de Tailwind, donde la app cambia a la vista de escritorio. */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}

/**
 * Hay espacio para mostrar un panel tipo diálogo (corte `md`). Útil en PCs con escalado
 * de pantalla alto, donde la ventana mide menos de `lg` aunque no sea un teléfono.
 */
export function useHasRoomForPanel() {
  return useMediaQuery("(min-width: 768px)");
}
