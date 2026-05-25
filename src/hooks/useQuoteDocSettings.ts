import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
import { useToast } from "@/hooks/use-toast";
import { useWorkshop } from "@/hooks/useWorkshop";

export type QuoteLayoutId = "bold" | "banner" | "classic";
export type QuoteBlendMode = "normal" | "multiply" | "luminosity";

export type QuoteDocSettings = {
  layout: QuoteLayoutId;
  presetId: string;
  ink: string;
  accent: string;
  paper: string;
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
  paper?: string | null;
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
    paper: raw.paper || DEFAULTS.paper,
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
    paper: settings.paper,
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
      try { localStorage.removeItem(key(wid)); } catch {}
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
