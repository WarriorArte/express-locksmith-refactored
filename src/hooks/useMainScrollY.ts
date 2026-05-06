import { useState, useEffect } from "react";

export function useMainScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) return;

    const handler = () => setScrollY(main.scrollTop);
    main.addEventListener("scroll", handler, { passive: true });
    return () => main.removeEventListener("scroll", handler);
  }, []);

  return scrollY;
}
