import { useState, useMemo, useRef, useEffect } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Radio, Search, ChevronDown, X, ImageIcon, AlertTriangle, Info, CalendarDays, List, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { AlarmaProfile, AlarmaDataValue, AlarmaDetalle, AlarmaYearImage } from "@/types";
import { useImageFolder, getImageByFile } from "@/hooks/useImageFolder";

// ── Category system ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "alimentacion", label: "Alimentación", keywords: ["12 volt", "ground", "starter", "ignition", "accessory"] },
  { id: "smartkey",     label: "Smart Key",    keywords: ["pts", "slp"] },
  { id: "can",          label: "CAN / OBD",    keywords: ["can bus", "obd", "rx data", "tx data", "immo data"] },
  { id: "cerraduras",   label: "Cerraduras",   keywords: ["power lock", "power unlock", "lock motor", "driver unlock", "passenger unlock"] },
  { id: "puertas",      label: "Puertas",      keywords: ["door trigger", "trunk/hatch", "hood pin", "trunk release"] },
  { id: "alarma",       label: "Alarma",       keywords: ["factory alarm", "disarm no unlock", "security light"] },
  { id: "luces",        label: "Luces",        keywords: ["parking light", "headlight", "turn signal", "hazard", "reverse light", "autolights", "dome light"] },
  { id: "audio",        label: "Audio",        keywords: ["radio", "speaker", "tweeter", "amplifier"] },
  { id: "sensores",     label: "Sensores",     keywords: ["speed sense", "tachometer", "brake wire", "fuel pump", "parking brake"] },
  { id: "confort",      label: "Confort",      keywords: ["heated seat", "defroster", "wiper", "window", "sun roof"] },
  { id: "otros",        label: "Otros",        keywords: [] },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

function getDataPointCategory(title: string): CategoryId {
  const t = title.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.id === "otros") continue;
    if ((cat.keywords as readonly string[]).some((kw) => t.includes(kw))) return cat.id;
  }
  return "otros";
}

// ── Searchable dropdown ───────────────────────────────────────────────────────

interface ComboboxProps {
  dataValues: AlarmaDataValue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

function DataPointCombobox({ dataValues, selectedId, onSelect, onClear }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return dataValues;
    const q = query.toLowerCase();
    return dataValues.filter(
      (dv) =>
        dv.title.toLowerCase().includes(q) ||
        dv.details.some(
          (d) => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q)
        )
    );
  }, [dataValues, query]);

  const selected = useMemo(
    () => dataValues.find((dv) => dv.id === selectedId) ?? null,
    [dataValues, selectedId]
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 bg-card text-left transition-all ${
          open
            ? "border-primary shadow-sm"
            : "border-border hover:border-primary/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Radio className="w-4 h-4 text-muted-foreground shrink-0" />
          {selected ? (
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {selected.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                {selected.details.length} campo{selected.details.length !== 1 ? "s" : ""}
                {(selected.imageUrl || (selected.yearImages?.length ?? 0) > 0) && (
                  <>
                    <span>·</span>
                    <ImageIcon className="w-3 h-3 text-primary" />
                  </>
                )}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">
              Seleccionar punto de datos…
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selected && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 tabular-nums">
            {dataValues.length}
          </Badge>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: "top" }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {/* Search inside dropdown */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Buscar entre ${dataValues.length} puntos…`}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-lg outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Sin resultados para &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((dv) => {
                  const originalIndex = dataValues.indexOf(dv);
                  const isActive = dv.id === selectedId;

                  return (
                    <button
                      key={dv.id}
                      onClick={() => handleSelect(dv.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                        isActive
                          ? "bg-primary/8 text-primary font-medium"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <span className="text-[11px] font-mono text-muted-foreground w-6 shrink-0 text-right">
                        {originalIndex + 1}
                      </span>
                      <span className="flex-1 truncate">{dv.title || "Sin título"}</span>
                      {(dv.imageUrl || (dv.yearImages?.length ?? 0) > 0) && (
                        <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getValueForYear(det: AlarmaDetalle, year: number): { value: string; isYearSpecific: boolean } {
  if (!det.yearValues?.length) return { value: det.value, isYearSpecific: false };
  const match = det.yearValues.find((yv) => yv.years.includes(String(year)));
  if (match) return { value: match.value, isYearSpecific: true };
  return { value: det.value, isYearSpecific: false };
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DataPointDetail({ dv, year }: { dv: AlarmaDataValue; year: number }) {
  const { folderName } = useImageFolder();
  const hasYearSpecific = dv.details.some((d) => d.yearValues?.length);

  // All image variants resolved from folder (or single base64)
  const resolvedImageVariants = useMemo(() => {
    if (dv.imageUrl) {
      return [{ url: dv.imageUrl, years: [] as string[], sku: "", file: "" }];
    }
    if (!dv.yearImages?.length) return [];
    return dv.yearImages
      .map((yi) => ({ ...yi, url: getImageByFile(yi.file) }))
      .filter((yi) => yi.url !== null) as (AlarmaYearImage & { url: string })[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dv.imageUrl, dv.yearImages, folderName]);

  return (
    <motion.div
      key={dv.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <Card className="border-primary/20 shadow-sm">
        <CardContent className="p-5 space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-base text-foreground leading-snug">
              {dv.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasYearSpecific && (
                <Badge variant="outline" className="text-[10px] px-1.5 gap-1 border-primary/30 text-primary dark:text-primary">
                  <CalendarDays className="w-3 h-3" />
                  {year}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {dv.details.length} campo{dv.details.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Fields */}
          {dv.details.length > 0 ? (
            <div className="space-y-2.5">
              {dv.details.map((det) => {
                const { value, isYearSpecific } = getValueForYear(det, year);
                return (
                  <div
                    key={det.id}
                    className="grid text-sm gap-x-3 gap-y-0.5"
                    style={{ gridTemplateColumns: "7rem 1fr" }}
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide leading-5 pt-px">
                      {det.label || "—"}
                    </span>
                    <div className="min-w-0">
                      <span className={`font-medium break-words leading-5 ${isYearSpecific ? "text-foreground" : "text-foreground"}`}>
                        {value || "—"}
                      </span>
                      {isYearSpecific && (
                        <span className="ml-1.5 inline-flex items-center text-[10px] text-primary font-normal">
                          · año {year}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin campos cargados</p>
          )}

          {/* Images — all year variants */}
          {resolvedImageVariants.length > 0 ? (
            <div className="space-y-3 pt-1">
              {resolvedImageVariants.map((yi, i) => {
                const yearLabel =
                  yi.years.length >= 2
                    ? `${yi.years[0]}–${yi.years[yi.years.length - 1]}`
                    : yi.years[0] ?? "";
                return (
                  <div key={i} className="space-y-1.5">
                    {yearLabel && (
                      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                        {yearLabel}
                      </p>
                    )}
                    <img
                      src={yi.url}
                      alt={`${dv.title}${yearLabel ? ` · ${yearLabel}` : ""}`}
                      className="rounded-xl border border-border w-full max-h-64 object-contain bg-white"
                    />
                  </div>
                );
              })}
            </div>
          ) : dv.yearImages && dv.yearImages.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Imagen disponible — selecciona la carpeta en el administrador</span>
            </div>
          ) : null}

          {/* Notes */}
          {dv.notes && dv.notes.length > 0 && (
            <div className="space-y-2 pt-1">
              {dv.notes.map((note) =>
                note.type === "image_variation" ? (
                  <div
                    key={note.id}
                    className="flex items-start gap-2 rounded-lg bg-warning/10 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{note.title}</p>
                      {note.text && <p className="mt-0.5 opacity-80 leading-relaxed">{note.text}</p>}
                    </div>
                  </div>
                ) : (
                  <div
                    key={note.id}
                    className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 text-xs text-primary dark:text-primary"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{note.title}</p>
                      {note.documented && note.documented.length > 0 && (
                        <p className="mt-0.5">
                          <span className="opacity-70">Aplica a: </span>
                          {note.documented[0]} – {note.documented[note.documented.length - 1]}
                        </p>
                      )}
                      {note.probable && note.probable.length > 0 && (
                        <p>
                          <span className="opacity-70">Puede funcionar en: </span>
                          {note.probable[0]} – {note.probable[note.probable.length - 1]}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── AlarmasWorkspace ──────────────────────────────────────────────────────────

interface AlarmasWorkspaceProps {
  year: number;
  make: string;
  model: string;
  profileIds: string[];
  allProfiles: AlarmaProfile[];
  onBack: () => void;
}

export function AlarmasWorkspace({
  year,
  make,
  model,
  profileIds,
  allProfiles,
  onBack,
}: AlarmasWorkspaceProps) {
  const profiles = useMemo(
    () =>
      profileIds
        .map((id) => allProfiles.find((p) => p.id === id))
        .filter((p): p is AlarmaProfile => !!p),
    [profileIds, allProfiles]
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedDvId, setSelectedDvId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"buscar" | "explorar">("buscar");
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);

  const activeProfile = profiles[activeIdx] ?? null;

  // Reset selected point when profile changes
  const handleProfileChange = (idx: number) => {
    setActiveIdx(idx);
    setSelectedDvId(null);
    setActiveCategory(null);
  };

  const selectedDv = useMemo(
    () => activeProfile?.dataValues.find((dv) => dv.id === selectedDvId) ?? null,
    [activeProfile, selectedDvId]
  );

  // Category counts for explore mode
  const categoryCounts = useMemo(() => {
    if (!activeProfile) return {} as Record<CategoryId, number>;
    const counts = {} as Record<CategoryId, number>;
    for (const dv of activeProfile.dataValues) {
      const cat = getDataPointCategory(dv.title);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [activeProfile]);

  const availableCategories = useMemo(
    () => CATEGORIES.filter((c) => (categoryCounts[c.id] ?? 0) > 0),
    [categoryCounts]
  );

  const exploreDataValues = useMemo(() => {
    if (!activeProfile) return [];
    if (!activeCategory) return activeProfile.dataValues;
    return activeProfile.dataValues.filter((dv) => getDataPointCategory(dv.title) === activeCategory);
  }, [activeProfile, activeCategory]);

  const { folderName } = useImageFolder();

  const vehicleImg = useMemo(() => {
    if (!activeProfile?.vehicleImages?.length) return null;
    const match = activeProfile.vehicleImages.find(
      (vi) => vi.kind === "vehicle" && vi.years.includes(String(year))
    ) ?? activeProfile.vehicleImages.find((vi) => vi.kind === "vehicle");
    if (!match) return null;
    return getImageByFile(match.file);
  }, [activeProfile, year, folderName]);

  const logoImg = useMemo(() => {
    if (!activeProfile) return null;
    const logoEntry = activeProfile.vehicleImages?.find((vi) => vi.kind === "logo");
    if (!logoEntry) return null;
    return getImageByFile(logoEntry.file);
  }, [activeProfile, folderName]);

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Radio className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground font-medium">Sin perfil de alarma disponible</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-primary/5 border-none shadow-sm rounded-[24px] overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {vehicleImg ? (
                <div className="h-14 w-20 rounded-xl overflow-hidden border border-primary/20 shrink-0 bg-white">
                  <img src={vehicleImg} alt={`${make} ${model}`} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shrink-0">
                  <Radio className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {logoImg && (
                    <img src={logoImg} alt="Logo" className="h-4 w-auto object-contain inline-block" />
                  )}
                  Auto Alarmas
                </p>
                <CardTitle className="text-xl font-bold text-foreground">
                  {make} {model} · {year}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeProfile.nombre}
                  {activeProfile.yearRange && ` · ${activeProfile.yearRange}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground dark:hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
          </div>

          {/* Multi-profile tabs */}
          {profiles.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
              {profiles.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => handleProfileChange(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i === activeIdx
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/70 text-foreground hover:bg-white dark:bg-foreground/60 dark:text-muted-foreground"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* View mode toggle */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-muted-foreground mr-1">Vista:</span>
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => { setViewMode("buscar"); setActiveCategory(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "buscar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Buscar
          </button>
          <button
            onClick={() => setViewMode("explorar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "explorar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Explorar
          </button>
        </div>
      </div>

      {/* ── Buscar mode ── */}
      {viewMode === "buscar" && (
        <>
          <DataPointCombobox
            dataValues={activeProfile.dataValues}
            selectedId={selectedDvId}
            onSelect={setSelectedDvId}
            onClear={() => setSelectedDvId(null)}
          />
          <AnimatePresence mode="wait">
            {selectedDv ? (
              <DataPointDetail key={selectedDv.id} dv={selectedDv} year={year} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-xl text-center"
              >
                <Radio className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecciona un punto para ver sus detalles
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Explorar mode ── */}
      {viewMode === "explorar" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveCategory(null); setSelectedDvId(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                !activeCategory
                  ? "bg-primary text-primary-foreground border-primary dark:text-foreground dark:border-border"
                  : "bg-transparent text-muted-foreground border-border hover:border-border hover:text-foreground"
              }`}
            >
              Todos <span className="opacity-60 ml-1">({activeProfile.dataValues.length})</span>
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSelectedDvId(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat.label} <span className="opacity-60 ml-1">({categoryCounts[cat.id] ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Data points compact list */}
          <div className="space-y-1.5">
            {exploreDataValues.map((dv) => {
              const cableDetail = dv.details.find((d) => d.label.toLowerCase() === "cable");
              const polarDetail = dv.details.find((d) => d.label.toLowerCase() === "polaridad");
              const cableVal = cableDetail ? getValueForYear(cableDetail, year).value : null;
              const polarVal = polarDetail ? getValueForYear(polarDetail, year).value : null;
              const hasImage = !!(dv.imageUrl || (dv.yearImages?.length ?? 0) > 0);
              const isSelected = dv.id === selectedDvId;

              return (
                <button
                  key={dv.id}
                  onClick={() => setSelectedDvId(isSelected ? null : dv.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-primary/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-primary dark:text-primary" : "text-foreground"}`}>
                      {dv.title}
                    </p>
                    {(cableVal || polarVal) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {[cableVal, polarVal].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasImage && <ImageIcon className="w-3.5 h-3.5 text-primary" />}
                    {dv.notes && dv.notes.length > 0 && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {getDataPointCategory(dv.title) === "otros"
                        ? "—"
                        : CATEGORIES.find((c) => c.id === getDataPointCategory(dv.title))?.label ?? "—"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel for explore mode */}
          <AnimatePresence mode="wait">
            {selectedDv && (
              <DataPointDetail key={selectedDv.id} dv={selectedDv} year={year} />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
