/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

/**
 * Paletas de color. "acero" (Acero y naranja) es la base: sus valores están en
 * :root/.dark de index.css y no usa atributo. Las demás redefinen tokens con
 * <html data-palette="…">.
 */
export type Palette = "acero" | "laton" | "petroleo" | "cobre";

export const DEFAULT_PALETTE: Palette = "acero";

export const PALETTES: { id: Palette; name: string; brand: string; selection: string }[] = [
  { id: "acero", name: "Acero y naranja", brand: "#3F6A8F", selection: "#F7741B" },
  { id: "laton", name: "Latón y grafito", brand: "#E2A41C", selection: "#30353F" },
  { id: "petroleo", name: "Petróleo y latón", brand: "#227382", selection: "#E9A93A" },
  { id: "cobre", name: "Cobre y carbón", brand: "#AE5528", selection: "#323B48" },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "ce-theme";
const PALETTE_KEY = "ce-palette";

function getInitialPalette(): Palette {
  if (typeof window === "undefined") return DEFAULT_PALETTE;
  try {
    const stored = localStorage.getItem(PALETTE_KEY);
    if (PALETTES.some((p) => p.id === stored)) return stored as Palette;
  } catch {
    /* almacenamiento no disponible: usar la paleta por defecto */
  }
  return DEFAULT_PALETTE;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Default = light (per user request)
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [palette, setPalette] = useState<Palette>(getInitialPalette);

  useEffect(() => {
    const root = document.documentElement;
    if (palette === DEFAULT_PALETTE) root.removeAttribute("data-palette");
    else root.setAttribute("data-palette", palette);
    try {
      localStorage.setItem(PALETTE_KEY, palette);
    } catch {
      /* sin almacenamiento: la paleta dura solo esta sesión */
    }
  }, [palette]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    // Keep the mobile status bar dark/black regardless of app theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", "#0A0A0F");
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((p) => (p === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
