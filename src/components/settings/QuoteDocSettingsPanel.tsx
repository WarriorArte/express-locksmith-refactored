import { useMemo, useRef, useState } from "react";
import { Eye, FileText, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { cn } from "@/lib/utils";
import {
  useQuoteDocSettings,
  QUOTE_PRESETS,
  autoAccentInk,
  resolveQuotePreset,
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const applyPreset = (p: typeof QUOTE_PRESETS[number]) => {
    update({ presetId: p.id, ...resolveQuotePreset(p, settings.layout) });
  };

  const setColor = (
    key: "ink" | "accent" | "accentInk" | "header" | "headerInk" | "tableHead" | "tableHeadInk" | "muted" | "soft" | "rule" | "paper",
    val: string,
  ) => {
    const patch: Partial<typeof settings> = { presetId: "custom", [key]: val };
    if (key === "accent") patch.accentInk = autoAccentInk(val);
    if (key === "header") patch.headerInk = autoAccentInk(val);
    if (key === "tableHead") patch.tableHeadInk = autoAccentInk(val);
    update(patch);
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
              onClick={() => {
                const activePreset = QUOTE_PRESETS.find(p => p.id === settings.presetId);
                update({
                  layout: L.id,
                  ...(activePreset ? resolveQuotePreset(activePreset, L.id) : {}),
                });
              }}
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
            const preview = resolveQuotePreset(p, settings.layout);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  "rounded-xl border-2 overflow-hidden transition-all text-left group",
                  active ? "border-foreground shadow-[0_0_0_1px_hsl(var(--foreground))]" : "border-border hover:border-muted-foreground/50",
                )}
                style={{ background: preview.paper }}
              >
                <div className="p-2.5">
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      preview.header,
                      preview.accent,
                      preview.tableHead,
                      preview.soft,
                      preview.ink,
                    ].map((color, i) => (
                      <span
                        key={`${p.id}-${i}`}
                        className="h-9 rounded-md border border-black/10 shadow-sm transition-transform group-hover:-translate-y-0.5"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="text-[11px] font-semibold py-1.5 px-3 border-t truncate"
                  style={{ color: preview.ink, borderColor: preview.rule }}
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
          <ColorPick label="Texto principal" value={settings.ink} onChange={v => setColor("ink", v)} />
          <ColorPick label="Texto secundario" value={settings.muted} onChange={v => setColor("muted", v)} />
          <ColorPick label="Acento" value={settings.accent} onChange={v => setColor("accent", v)} />
          <ColorPick label="Texto en acento" value={settings.accentInk} onChange={v => setColor("accentInk", v)} />
          <ColorPick label="Header" value={settings.header} onChange={v => setColor("header", v)} />
          <ColorPick label="Texto header" value={settings.headerInk} onChange={v => setColor("headerInk", v)} />
          <ColorPick label="Encabezado tabla" value={settings.tableHead} onChange={v => setColor("tableHead", v)} />
          <ColorPick label="Texto tabla" value={settings.tableHeadInk} onChange={v => setColor("tableHeadInk", v)} />
          <ColorPick label="Lineas" value={settings.rule} onChange={v => setColor("rule", v)} />
          <ColorPick label="Fondos suaves" value={settings.soft} onChange={v => setColor("soft", v)} />
          <div className="col-span-2">
            <ColorPick label="Papel (fondo de página)" value={settings.paper} onChange={v => setColor("paper", v)} />
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Colores automaticos de contraste activos para mantener los textos legibles.
        </div>
      </section>

      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex justify-between">
          Logo <span className="font-mono normal-case">{settings.logoSize}px</span>
        </Label>
        <div className="rounded-xl border border-border bg-card p-3">
          <input
            type="range"
            min={48}
            max={150}
            step={1}
            value={settings.logoSize}
            onChange={e => update({ logoSize: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="mt-2 grid grid-cols-3 text-[10px] text-muted-foreground">
            <span>Pequeno</span>
            <span className="text-center">Medio</span>
            <span className="text-right">Grande</span>
          </div>
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
      className={compact ? "h-[calc(100vh-5rem)]" : fillViewport ? "h-full" : undefined}
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
        <span className="text-[11px] font-medium text-foreground truncate">{label}</span>
        <span className="text-[10px] text-muted-foreground">Cambiar color</span>
      </div>
    </label>
  );
}

