import { useCallback, useEffect, useState } from "react";
import { useWorkshop } from "@/hooks/useWorkshop";

export type QuoteLayoutId = "bold" | "banner" | "classic";
export type QuoteBlendMode = "normal" | "multiply" | "luminosity";

export type QuoteDocSettings = {
  layout: QuoteLayoutId;
  presetId: string;
  ink: string;
  accent: string;
  paper: string;
  taxRate: number;
  notes: string;
  payment: {
    account: string;
    name: string;
    bank: string;
  };
  bgUrl: string;
  bgOpacity: number;
  bgBlend: QuoteBlendMode;
  signatureName: string;
};

export const QUOTE_PRESETS = [
  { id: "navy-yellow",   name: "Navy/Yellow",   ink: "#1a1f2e", accent: "#f4c430", paper: "#ffffff" },
  { id: "navy-blue",     name: "Navy/Blue",     ink: "#0d2546", accent: "#3b82f6", paper: "#ffffff" },
  { id: "charcoal",      name: "Carbón/Ámbar",  ink: "#1c1c1c", accent: "#ff9c2a", paper: "#ffffff" },
  { id: "forest",        name: "Bosque/Lima",   ink: "#0f2a1f", accent: "#c6ee5b", paper: "#ffffff" },
  { id: "wine",          name: "Vino/Rosa",     ink: "#2a0f1a", accent: "#ff8da1", paper: "#f9f6f3" },
  { id: "mono",          name: "Mono",          ink: "#0a0a0a", accent: "#e6e6e6", paper: "#ffffff" },
  { id: "plum-cream",    name: "Ciruela/Crema", ink: "#3b1f3f", accent: "#f1d5b4", paper: "#fbf6ee" },
  { id: "teal-coral",    name: "Teal/Coral",    ink: "#0e3a3f", accent: "#ff6b5a", paper: "#ffffff" },
  { id: "paper-ink",     name: "Papel/Tinta",   ink: "#1a1714", accent: "#b04a2f", paper: "#f6f2ea" },
];

const DEFAULTS: QuoteDocSettings = {
  layout: "bold",
  presetId: "navy-yellow",
  ink: "#1a1f2e",
  accent: "#f4c430",
  paper: "#ffffff",
  taxRate: 0,
  notes: "Forma de pago: 50% anticipo, 50% contra entrega.",
  payment: { account: "", name: "", bank: "" },
  bgUrl: "",
  bgOpacity: 0.08,
  bgBlend: "multiply",
  signatureName: "",
};

const key = (wid?: string) => `quote-doc-settings:${wid || "default"}`;

export function loadQuoteDocSettings(workshopId?: string): QuoteDocSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(key(workshopId));
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw), payment: { ...DEFAULTS.payment, ...(JSON.parse(raw).payment || {}) } };
  } catch {
    return DEFAULTS;
  }
}

export function useQuoteDocSettings() {
  const { currentWorkshop } = useWorkshop();
  const wid = currentWorkshop?.id;
  const [settings, setSettings] = useState<QuoteDocSettings>(() => loadQuoteDocSettings(wid));

  useEffect(() => {
    setSettings(loadQuoteDocSettings(wid));
  }, [wid]);

  const save = useCallback((next: QuoteDocSettings) => {
    setSettings(next);
    try { localStorage.setItem(key(wid), JSON.stringify(next)); } catch {}
  }, [wid]);

  const update = useCallback((patch: Partial<QuoteDocSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(key(wid), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [wid]);

  return { settings, save, update };
}

/* ---------- color helpers ---------- */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0");
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

export function autoAccentInk(accent: string): string {
  const [r, g, b] = hexToRgb(accent).map(v => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.55 ? "#1a1f2e" : "#ffffff";
}

export function darken(hex: string, amt = 0.3): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - amt;
  const toHex = (v: number) => Math.round(v * f).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}
