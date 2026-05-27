import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { QuoteLayoutId } from "@/components/quotes/templates";

export type QuoteBlendMode = "normal" | "multiply" | "luminosity";

export type QuoteDocSettings = {
  layout: QuoteLayoutId;
  presetId: string;
  ink: string;
  accent: string;
  accentInk: string;
  header: string;
  headerInk: string;
  tableHead: string;
  tableHeadInk: string;
  muted: string;
  soft: string;
  rule: string;
  paper: string;
  logoSize: number;
  notes: string;
  payment: {
    account: string;
    name: string;
    bank: string;
  };
  bgUrl: string;
  bgOpacity: number;
  bgBlend: QuoteBlendMode;
};

export const QUOTE_PRESETS = [
  { id: "navy-yellow",   name: "Navy/Yellow",   ink: "#1a1f2e", accent: "#f4c430", paper: "#ffffff" },
  { id: "navy-blue",     name: "Navy/Blue",     ink: "#0d2546", accent: "#3b82f6", paper: "#ffffff" },
  { id: "charcoal",      name: "Carbón/Ámbar",  ink: "#1c1c1c", accent: "#ff9c2a", paper: "#ffffff" },
  { id: "forest",        name: "Bosque/Lima",   ink: "#0f2a1f", accent: "#c6ee5b", paper: "#ffffff" },
  { id: "wine",          name: "Vino/Rosa",     ink: "#2a0f1a", accent: "#ff8da1", paper: "#f9f6f3" },
  { id: "mono",          name: "Mono",          ink: "#0a0a0a", accent: "#e6e6e6", paper: "#ffffff" },
  { id: "teal-coral",    name: "Teal/Coral",    ink: "#0e3a3f", accent: "#ff6b5a", paper: "#ffffff" },
  { id: "night-gold",    name: "Noche/Oro",     ink: "#f8fafc", accent: "#f6c453", paper: "#111827" },
  { id: "graphite-lime", name: "Grafito/Lima",  ink: "#f4f4f5", accent: "#a3e635", paper: "#18181b" },
];

type BaseQuotePreset = typeof QUOTE_PRESETS[number];

export type QuoteVisualPreset = Pick<
  QuoteDocSettings,
  "ink" | "accent" | "accentInk" | "header" | "headerInk" | "tableHead" | "tableHeadInk" | "muted" | "soft" | "rule" | "paper"
>;

const QUOTE_PRESET_VARIANTS: Record<string, Partial<Record<QuoteLayoutId, Partial<QuoteVisualPreset>>>> = {
  "navy-yellow": {
    banner: { header: "#1a1f2e", headerInk: "#ffffff", tableHead: "#1a1f2e", tableHeadInk: "#ffffff", soft: "#f7f5ef", rule: "#ded9c9" },
    bold: { header: "#ffffff", headerInk: "#1a1f2e", tableHead: "#1a1f2e", tableHeadInk: "#ffffff", soft: "#f6f4ed", rule: "#e5dfca" },
    classic: { header: "#ffffff", headerInk: "#1a1f2e", tableHead: "#f4c430", tableHeadInk: "#1a1f2e", soft: "#fbf7e5", rule: "#1a1f2e" },
  },
  "navy-blue": {
    banner: { header: "#0d2546", headerInk: "#ffffff", tableHead: "#0d2546", tableHeadInk: "#ffffff", soft: "#eef5ff", rule: "#c9d8ea" },
    bold: { header: "#f8fbff", headerInk: "#0d2546", tableHead: "#0d2546", tableHeadInk: "#ffffff", soft: "#edf4fc", rule: "#cbd9ea" },
    classic: { header: "#ffffff", headerInk: "#0d2546", tableHead: "#dceafe", tableHeadInk: "#0d2546", soft: "#f4f8fd", rule: "#0d2546" },
  },
  charcoal: {
    banner: { header: "#1c1c1c", headerInk: "#ffffff", tableHead: "#1c1c1c", tableHeadInk: "#ffffff", soft: "#f7f3ee", rule: "#ded6cd" },
    bold: { header: "#fffaf4", headerInk: "#1c1c1c", tableHead: "#1c1c1c", tableHeadInk: "#ffffff", soft: "#f7f1ea", rule: "#ded4c8" },
    classic: { header: "#ffffff", headerInk: "#1c1c1c", tableHead: "#ff9c2a", tableHeadInk: "#1c1c1c", soft: "#fff2df", rule: "#1c1c1c" },
  },
  forest: {
    banner: { header: "#0f2a1f", headerInk: "#ffffff", tableHead: "#0f2a1f", tableHeadInk: "#ffffff", soft: "#f0f6e4", rule: "#ccd8bd" },
    bold: { header: "#f7fbef", headerInk: "#0f2a1f", tableHead: "#0f2a1f", tableHeadInk: "#ffffff", soft: "#eef6df", rule: "#cad9b6" },
    classic: { header: "#ffffff", headerInk: "#0f2a1f", tableHead: "#c6ee5b", tableHeadInk: "#0f2a1f", soft: "#f5fbe6", rule: "#0f2a1f" },
  },
  wine: {
    banner: { header: "#2a0f1a", headerInk: "#ffffff", tableHead: "#2a0f1a", tableHeadInk: "#ffffff", soft: "#fbedf0", rule: "#e3cbd0" },
    bold: { header: "#fff7f8", headerInk: "#2a0f1a", tableHead: "#2a0f1a", tableHeadInk: "#ffffff", soft: "#faedf1", rule: "#e4cbd2" },
    classic: { header: "#f9f6f3", headerInk: "#2a0f1a", tableHead: "#ff8da1", tableHeadInk: "#2a0f1a", soft: "#fff0f2", rule: "#2a0f1a" },
  },
  mono: {
    banner: { header: "#0a0a0a", headerInk: "#ffffff", tableHead: "#0a0a0a", tableHeadInk: "#ffffff", soft: "#f4f4f4", rule: "#d8d8d8" },
    bold: { header: "#ffffff", headerInk: "#0a0a0a", tableHead: "#0a0a0a", tableHeadInk: "#ffffff", soft: "#f3f3f3", rule: "#d6d6d6" },
    classic: { header: "#ffffff", headerInk: "#0a0a0a", tableHead: "#e6e6e6", tableHeadInk: "#0a0a0a", soft: "#f5f5f5", rule: "#0a0a0a" },
  },
  "teal-coral": {
    banner: { header: "#0e3a3f", headerInk: "#ffffff", tableHead: "#0e3a3f", tableHeadInk: "#ffffff", soft: "#ecf6f5", rule: "#c5dddd" },
    bold: { header: "#f6fbfa", headerInk: "#0e3a3f", tableHead: "#0e3a3f", tableHeadInk: "#ffffff", soft: "#eaf6f5", rule: "#c4dddd" },
    classic: { header: "#ffffff", headerInk: "#0e3a3f", tableHead: "#ffb2a8", tableHeadInk: "#0e3a3f", soft: "#fff0ee", rule: "#0e3a3f" },
  },
  "night-gold": {
    banner: { header: "#020617", headerInk: "#f8fafc", tableHead: "#030712", tableHeadInk: "#f8fafc", muted: "#cbd5e1", soft: "#1f2937", rule: "#334155" },
    bold: { header: "#020617", headerInk: "#f8fafc", tableHead: "#030712", tableHeadInk: "#f8fafc", muted: "#cbd5e1", soft: "#1f2937", rule: "#334155" },
    classic: { header: "#111827", headerInk: "#f8fafc", tableHead: "#f6c453", tableHeadInk: "#111827", muted: "#d1d5db", soft: "#1f2937", rule: "#f8fafc" },
  },
  "graphite-lime": {
    banner: { header: "#09090b", headerInk: "#f4f4f5", tableHead: "#09090b", tableHeadInk: "#f4f4f5", muted: "#d4d4d8", soft: "#27272a", rule: "#3f3f46" },
    bold: { header: "#18181b", headerInk: "#f4f4f5", tableHead: "#09090b", tableHeadInk: "#f4f4f5", muted: "#d4d4d8", soft: "#27272a", rule: "#3f3f46" },
    classic: { header: "#18181b", headerInk: "#f4f4f5", tableHead: "#a3e635", tableHeadInk: "#18181b", muted: "#d4d4d8", soft: "#27272a", rule: "#f4f4f5" },
  },
};

export function resolveQuotePreset(p: BaseQuotePreset, layout: QuoteLayoutId): QuoteVisualPreset {
  const base: QuoteVisualPreset = {
    ink: p.ink,
    accent: p.accent,
    accentInk: autoAccentInk(p.accent),
    header: p.ink,
    headerInk: autoAccentInk(p.ink),
    tableHead: p.ink,
    tableHeadInk: autoAccentInk(p.ink),
    muted: darken(p.ink, 0.28),
    soft: "#f5f5f3",
    rule: "#e6e4dd",
    paper: p.paper,
  };
  return { ...base, ...(QUOTE_PRESET_VARIANTS[p.id]?.[layout] || {}) };
}

const DEFAULTS: QuoteDocSettings = {
  layout: "bold",
  presetId: "navy-yellow",
  ink: "#1a1f2e",
  accent: "#f4c430",
  accentInk: "#1a1f2e",
  header: "#1a1f2e",
  headerInk: "#ffffff",
  tableHead: "#1a1f2e",
  tableHeadInk: "#ffffff",
  muted: "#7c7c74",
  soft: "#f5f5f3",
  rule: "#e6e4dd",
  paper: "#ffffff",
  logoSize: 110,
  notes: "Forma de pago: 50% anticipo, 50% contra entrega.",
  payment: { account: "", name: "", bank: "" },
  bgUrl: "",
  bgOpacity: 0.08,
  bgBlend: "multiply",
};

const key = (wid?: string) => `quote-doc-settings:${wid || "default"}`;

type QuoteDocSettingsRow = {
  id?: string;
  workshop_id?: string;
  layout?: QuoteLayoutId | null;
  preset_id?: string | null;
  ink?: string | null;
  accent?: string | null;
  accent_ink?: string | null;
  header?: string | null;
  header_ink?: string | null;
  table_head?: string | null;
  table_head_ink?: string | null;
  muted?: string | null;
  soft?: string | null;
  rule?: string | null;
  paper?: string | null;
  logo_size?: number | string | null;
  notes?: string | null;
  payment_account?: string | null;
  payment_name?: string | null;
  payment_bank?: string | null;
  bg_url?: string | null;
  bg_opacity?: number | string | null;
  bg_blend?: QuoteBlendMode | null;
};

function normalizeQuoteDocSettings(raw: QuoteDocSettingsRow | null | undefined, workshopId?: string): QuoteDocSettings {
  const fallback = loadQuoteDocSettings(workshopId);
  if (!raw) return fallback;

  return {
    ...DEFAULTS,
    layout: raw.layout || DEFAULTS.layout,
    presetId: raw.preset_id || DEFAULTS.presetId,
    ink: raw.ink || DEFAULTS.ink,
    accent: raw.accent || DEFAULTS.accent,
    accentInk: raw.accent_ink || autoAccentInk(raw.accent || DEFAULTS.accent),
    header: raw.header || fallback.header || DEFAULTS.header,
    headerInk: raw.header_ink || fallback.headerInk || DEFAULTS.headerInk,
    tableHead: raw.table_head || fallback.tableHead || DEFAULTS.tableHead,
    tableHeadInk: raw.table_head_ink || fallback.tableHeadInk || DEFAULTS.tableHeadInk,
    muted: raw.muted || fallback.muted || DEFAULTS.muted,
    soft: raw.soft || fallback.soft || DEFAULTS.soft,
    rule: raw.rule || fallback.rule || DEFAULTS.rule,
    paper: raw.paper || DEFAULTS.paper,
    logoSize: Number(raw.logo_size ?? fallback.logoSize ?? DEFAULTS.logoSize),
    notes: raw.notes ?? DEFAULTS.notes,
    payment: {
      account: raw.payment_account || "",
      name: raw.payment_name || "",
      bank: raw.payment_bank || "",
    },
    bgUrl: raw.bg_url || "",
    bgOpacity: Number(raw.bg_opacity ?? DEFAULTS.bgOpacity),
    bgBlend: raw.bg_blend || DEFAULTS.bgBlend,
  };
}

function toApiPayload(settings: QuoteDocSettings) {
  return {
    layout: settings.layout,
    preset_id: settings.presetId,
    ink: settings.ink,
    accent: settings.accent,
    accent_ink: settings.accentInk,
    header: settings.header,
    header_ink: settings.headerInk,
    table_head: settings.tableHead,
    table_head_ink: settings.tableHeadInk,
    muted: settings.muted,
    soft: settings.soft,
    rule: settings.rule,
    paper: settings.paper,
    logo_size: settings.logoSize,
    notes: settings.notes,
    payment_account: settings.payment.account,
    payment_name: settings.payment.name,
    payment_bank: settings.payment.bank,
    bg_url: settings.bgUrl,
    bg_opacity: settings.bgOpacity,
    bg_blend: settings.bgBlend,
  };
}

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wid = currentWorkshop?.id;
  const query = useQuery({
    queryKey: ["quote-doc-settings", wid],
    queryFn: async () => {
      if (!wid) return null;
      const data = await phpApiRequest<QuoteDocSettingsRow | null>(
        `/quote-doc-settings.php?workshop_id=${encodeURIComponent(wid)}`,
        { method: "GET" },
      );
      return {
        exists: !!data,
        settings: normalizeQuoteDocSettings(data, wid),
      };
    },
    enabled: !!wid,
  });

  const serverSettings = useMemo(
    () => query.data?.settings || loadQuoteDocSettings(wid),
    [query.data, wid],
  );
  const [settings, setSettings] = useState<QuoteDocSettings>(serverSettings);

  useEffect(() => {
    setSettings(serverSettings);
  }, [serverSettings]);

  const mutation = useMutation({
    mutationFn: async (next: QuoteDocSettings) => {
      if (!wid) throw new Error("No hay taller seleccionado");
      const data = await phpApiRequest<QuoteDocSettingsRow>("/quote-doc-settings.php", {
        method: "PUT",
        body: JSON.stringify({
          workshop_id: wid,
          ...toApiPayload(next),
        }),
      });
      return normalizeQuoteDocSettings(data, wid);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["quote-doc-settings", wid], { exists: true, settings: saved });
      try {
        localStorage.removeItem(key(wid));
      } catch (error) {
        console.warn("No se pudo limpiar la copia local de cotización", error);
      }
      toast({
        title: "Cotización guardada",
        description: "Los cambios del documento se guardaron en la base de datos",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la configuración",
        variant: "destructive",
      });
    },
  });

  const save = useCallback((next: QuoteDocSettings = settings) => {
    setSettings(next);
    return mutation.mutateAsync(next);
  }, [mutation, settings]);

  const update = useCallback((patch: Partial<QuoteDocSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const hasUnsavedChanges = query.data?.exists === false || JSON.stringify(settings) !== JSON.stringify(serverSettings);

  return {
    settings,
    save,
    update,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    hasUnsavedChanges,
  };
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
