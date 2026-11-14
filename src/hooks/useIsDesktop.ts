import { useEffect, useState } from "react";

/** Mismo corte que el prefijo `lg:` de Tailwind, donde la app cambia a la vista de escritorio. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/** true cuando la ventana está en el ancho de escritorio (`lg`); se actualiza al redimensionar. */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
