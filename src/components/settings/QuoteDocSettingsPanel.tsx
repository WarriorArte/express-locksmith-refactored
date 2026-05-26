import { useMemo, useRef, useState } from "react";
import { Eye, FileText, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { cn } from "@/lib/utils";
import {
  useQuoteDocSettings,
  QUOTE_PRESETS,
  autoAccentInk,
  darken,
} from "@/hooks/useQuoteDocSettings";
import { createSampleQuote } from "@/components/quotes/QuoteDocumentPage";
import { QuotePreviewFrame } from "@/components/quotes/QuotePreviewFrame";
import { QUOTE_TEMPLATES, getQuoteTemplate } from "@/components/quotes/templates";
import "@/styles/quote-doc.css";

type QuoteDocSettingsState = ReturnType<typeof useQuoteDocSettings>;

export function QuoteDocSettingsPanel({
  compact = false,
  state,
}: {
  compact?: boolean;
  state?: QuoteDocSettingsState;
}) {
  const localState = useQuoteDocSettings();
  const { settings, update, save, isLoading, isSaving, hasUnsavedChanges } = state ?? localState;
  const { data: biz } = useBusinessSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const accentInk = useMemo(() => autoAccentInk(settings.accent), [settings.accent]);
  const ink2 = useMemo(() => darken(settings.ink, 0.35), [settings.ink]);

  const applyPreset = (p: typeof QUOTE_PRESETS[number]) => {
    update({ presetId: p.id, ink: p.ink, accent: p.accent, paper: p.paper });
  };

  const setColor = (key: "ink" | "accent" | "paper", val: string) => {
    update({ presetId: "custom", [key]: val } as any);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => update({ bgUrl: String(ev.target?.result || "") });
    r.readAsDataURL(f);
  };

  const mobilePreview = <QuotePreview settings={settings} compact={compact} />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando configuracion
      </div>
    );
  }

  return (
    <div>
      <div className={cn("space-y-6", compact && "space-y-4")}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Plantilla del documento</div>
            <div className="text-xs text-muted-foreground">
              {hasUnsavedChanges ? "Cambios pendientes por guardar" : "Configuracion sincronizada"}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMobilePreviewOpen(true)}
            className={cn("gap-2", !compact && "xl:hidden")}
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
        </div>
      {/* Layout picker */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Disposición</Label>
        <div className="grid grid-cols-3 gap-2">
          {QUOTE_TEMPLATES.map(L => (
            <button
              key={L.id}
              type="button"
              onClick={() => update({ layout: L.id })}
              className={cn(
                "rounded-xl border-2 p-3 text-center transition-all bg-card",
                settings.layout === L.id ? "border-primary shadow-[0_0_16px_hsl(var(--primary)/0.25)]" : "border-border hover:border-muted-foreground/40",
              )}
            >
              <L.Thumb accent={settings.accent} ink={settings.ink} />
              <div className="text-xs font-semibold mt-2">{L.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Palette */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Paletas</Label>
        <div className="grid grid-cols-3 gap-2.5">
          {QUOTE_PRESETS.map(p => {
            const active = settings.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  "rounded-xl border-2 overflow-hidden transition-all text-left",
                  active ? "border-foreground shadow-[0_0_0_1px_hsl(var(--foreground))]" : "border-border hover:border-muted-foreground/50",
                )}
                style={{ background: p.paper }}
              >
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <span
                    className="w-8 h-8 rounded-full ring-1 ring-black/5"
                    style={{ background: p.accent }}
                  />
                  <span
                    className="w-4 h-4 rounded-full ring-1 ring-black/5"
                    style={{ background: p.ink }}
                  />
                </div>
                <div
                  className="text-[11px] font-semibold py-1.5 px-3 border-t"
                  style={{ color: p.ink, borderColor: "rgba(0,0,0,0.08)" }}
                >
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom colors */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
          Colores personalizados {settings.presetId === "custom" && <span className="text-primary">· custom</span>}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <ColorPick label="Base" value={settings.ink} onChange={v => setColor("ink", v)} />
          <ColorPick label="Acento" value={settings.accent} onChange={v => setColor("accent", v)} />
          <div className="col-span-2">
            <ColorPick label="Papel (fondo de página)" value={settings.paper} onChange={v => setColor("paper", v)} />
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground font-mono">
          Tinta secundaria: <span style={{ color: ink2 }}>{ink2}</span> · Texto sobre acento: <span style={{ color: accentInk }}>{accentInk}</span>
        </div>
      </section>

      {/* Background image */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Imagen de fondo (marca de agua)</Label>
        <div className="rounded-xl border border-border bg-card p-3 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-md border border-dashed border-border bg-muted bg-cover bg-center flex-shrink-0"
              style={settings.bgUrl ? { backgroundImage: `url(${settings.bgUrl})` } : {}}
            />
            <div className="flex gap-2 flex-1">
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Subir</Button>
              {settings.bgUrl && (
                <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => update({ bgUrl: "" })}>Quitar</Button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
            </div>
          </div>
          <Input
            placeholder="o pega una URL: https://..."
            value={settings.bgUrl.startsWith("data:") ? "" : settings.bgUrl}
            onChange={e => update({ bgUrl: e.target.value })}
          />
          <div>
            <Label className="text-xs flex justify-between">Opacidad <span className="font-mono">{Math.round(settings.bgOpacity * 100)}%</span></Label>
            <input
              type="range" min={0} max={1} step={0.01}
              value={settings.bgOpacity}
              onChange={e => update({ bgOpacity: parseFloat(e.target.value) })}
              className="w-full mt-1 accent-primary"
            />
          </div>
        </div>
      </section>

      {/* Tax + notes */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Parámetros del documento</Label>
        <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          El documento usa tamaÃ±o Carta 8.5 Ã— 11 in y toma los datos de contacto desde la configuraciÃ³n del negocio
          {biz?.name ? ` (${biz.name})` : ""}.
        </div>
      </section>

      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Notas y términos por defecto</Label>
        <Textarea
          value={settings.notes}
          onChange={e => update({ notes: e.target.value })}
          rows={3}
        />
      </section>

      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Información de pago</Label>
        <div className="grid grid-cols-1 gap-2">
          <Input
            placeholder="Cuenta №"
            value={settings.payment.account}
            onChange={e => update({ payment: { ...settings.payment, account: e.target.value } })}
          />
          <Input
            placeholder="A nombre de"
            value={settings.payment.name}
            onChange={e => update({ payment: { ...settings.payment, name: e.target.value } })}
          />
          <Input
            placeholder="Banco · tipo de cuenta"
            value={settings.payment.bank}
            onChange={e => update({ payment: { ...settings.payment, bank: e.target.value } })}
          />
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
      <p className="text-[11px] text-muted-foreground font-mono">
        <FileText className="w-3 h-3 inline mr-1" />
        Tamaño Carta 8.5 × 11 in · {getQuoteTemplate(settings.layout)?.name.toLowerCase()} · {settings.presetId}
      </p>
      <Button type="button" onClick={() => void save(settings)} disabled={isSaving || !hasUnsavedChanges} className="gap-2">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </Button>
      </div>
      </div>

      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-sm p-3 overflow-auto xl:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Preview</div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setMobilePreviewOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {mobilePreview}
        </div>
      )}
    </div>
  );
}

export function QuoteDocSettingsPreview({ state }: { state?: QuoteDocSettingsState }) {
  const localState = useQuoteDocSettings();
  const { settings, isLoading } = state ?? localState;

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-2rem)] rounded-xl border border-border bg-[hsl(var(--surface-2))] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando preview
      </div>
    );
  }

  return <QuotePreview settings={settings} fillViewport />;
}

function QuotePreview({
  settings,
  compact,
  fillViewport = false,
}: {
  settings: ReturnType<typeof useQuoteDocSettings>["settings"];
  compact?: boolean;
  fillViewport?: boolean;
}) {
  const { data: biz } = useBusinessSettings();
  const sampleQuote = useMemo(() => createSampleQuote(), []);

  return (
    <QuotePreviewFrame
      quote={sampleQuote}
      biz={biz ?? null}
      settings={settings}
      zoom={compact ? 0.44 : 0.44}
      fillHeight={compact || fillViewport}
      className={compact ? "h-[calc(100vh-5rem)]" : fillViewport ? "h-[calc(100vh-2rem)]" : undefined}
    />
  );
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 bg-card border border-border rounded-lg p-2 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-7 border-0 p-0 cursor-pointer bg-transparent rounded"
      />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs uppercase truncate">{value}</span>
      </div>
    </label>
  );
}

