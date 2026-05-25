import { useMemo, useRef } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useQuoteDocSettings,
  QUOTE_PRESETS,
  autoAccentInk,
  darken,
  type QuoteLayoutId,
  type QuoteBlendMode,
} from "@/hooks/useQuoteDocSettings";

const LAYOUTS: Array<{ id: QuoteLayoutId; name: string }> = [
  { id: "bold", name: "Hero" },
  { id: "banner", name: "Banda" },
  { id: "classic", name: "Clásica" },
];

export function QuoteDocSettingsPanel({ compact = false }: { compact?: boolean }) {
  const { settings, update } = useQuoteDocSettings();
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Layout picker */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Disposición</Label>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(L => (
            <button
              key={L.id}
              type="button"
              onClick={() => update({ layout: L.id })}
              className={cn(
                "rounded-xl border-2 p-3 text-center transition-all bg-card",
                settings.layout === L.id ? "border-primary shadow-[0_0_16px_hsl(var(--primary)/0.25)]" : "border-border hover:border-muted-foreground/40",
              )}
            >
              <LayoutThumb id={L.id} accent={settings.accent} ink={settings.ink} />
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
          <div>
            <Label className="text-xs mb-1 block">Modo de mezcla</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["normal", "multiply", "luminosity"] as QuoteBlendMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ bgBlend: m })}
                  className={cn(
                    "px-2 py-1.5 rounded-md border text-xs transition-colors",
                    settings.bgBlend === m ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/60",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tax + notes */}
      <section>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Parámetros del documento</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs flex justify-between">Impuesto <span className="font-mono">{settings.taxRate}%</span></Label>
            <input
              type="range" min={0} max={25} step={1}
              value={settings.taxRate}
              onChange={e => update({ taxRate: parseInt(e.target.value, 10) })}
              className="w-full mt-1 accent-primary"
            />
          </div>
          <div>
            <Label className="text-xs">Firma autorizada</Label>
            <Input
              value={settings.signatureName}
              onChange={e => update({ signatureName: e.target.value })}
              placeholder="Nombre del firmante"
            />
          </div>
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

      <p className="text-[11px] text-muted-foreground font-mono pt-2 border-t border-border">
        <FileText className="w-3 h-3 inline mr-1" />
        Los cambios se guardan automáticamente · Tamaño Carta 8.5 × 11 in · {LAYOUTS.find(l => l.id === settings.layout)?.name.toLowerCase()} · {settings.presetId}
      </p>
    </div>
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

function LayoutThumb({ id, accent, ink }: { id: QuoteLayoutId; accent: string; ink: string }) {
  if (id === "bold") {
    return (
      <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto">
        <rect width="40" height="52" rx="2" fill="hsl(var(--muted))" />
        <rect width="40" height="18" fill={ink} />
        <rect x="22" y="14" width="14" height="6" rx="1" fill={accent} />
        <rect x="4" y="24" width="32" height="3" rx="1" fill={ink} opacity=".35" />
        <rect x="4" y="29" width="32" height="2" rx="1" fill={ink} opacity=".2" />
        <rect x="4" y="33" width="32" height="2" rx="1" fill={ink} opacity=".2" />
        <rect x="4" y="37" width="32" height="2" rx="1" fill={ink} opacity=".2" />
        <rect y="44" width="40" height="8" fill={ink} />
      </svg>
    );
  }
  if (id === "banner") {
    return (
      <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto">
        <rect width="40" height="52" rx="2" fill="hsl(var(--muted))" />
        <rect x="4" y="4" width="14" height="3" rx="1" fill={ink} />
        <rect x="22" y="4" width="14" height="2" rx="1" fill={ink} opacity=".4" />
        <rect y="14" width="40" height="9" fill={accent} />
        <rect x="4" y="27" width="32" height="3" rx="1" fill={ink} opacity=".35" />
        <rect x="4" y="32" width="32" height="2" rx="1" fill={ink} opacity=".2" />
        <rect x="4" y="36" width="32" height="2" rx="1" fill={ink} opacity=".2" />
        <rect x="22" y="44" width="14" height="4" rx="1" fill={accent} />
      </svg>
    );
  }
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto">
      <rect width="40" height="52" rx="2" fill="hsl(var(--muted))" />
      <circle cx="8" cy="8" r="3" fill={accent} />
      <rect x="24" y="4" width="12" height="4" rx="1" fill={ink} />
      <rect x="26" y="10" width="10" height="3" rx=".5" fill="none" stroke={ink} strokeWidth=".5" />
      <line x1="4" y1="18" x2="18" y2="18" stroke={ink} strokeWidth=".8" />
      <line x1="22" y1="18" x2="36" y2="18" stroke={ink} strokeWidth=".8" />
      <line x1="4" y1="22" x2="36" y2="22" stroke={ink} strokeWidth=".8" />
      <rect x="4" y="26" width="32" height="14" rx=".5" fill="none" stroke={ink} strokeWidth=".5" />
      <line x1="4" y1="48" x2="16" y2="48" stroke={ink} strokeWidth=".8" />
      <circle cx="32" cy="47" r="4" fill="none" stroke={accent} strokeWidth=".8" />
    </svg>
  );
}
