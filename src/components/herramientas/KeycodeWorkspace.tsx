import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { m as motion, AnimatePresence } from "framer-motion";
import { Key, ArrowLeft, CheckCircle2, X, Info, Settings2, Loader2, Camera, Lock, Search, List, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { GeneradorLlaveSVG } from "@/components/llaves/GeneradorLlaveSVG";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";
import { KeyPhotoDecoder } from "@/components/herramientas/KeyPhotoDecoder";
import { buildDefaultDecoderConfig } from "@/lib/decoderPresets";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";

import type { ToolAssignment, KeycodeProfile, BittingConfig } from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";

interface KeycodeWorkspaceProps {
  assignment: ToolAssignment;
  keycodeProfiles: KeycodeProfile[];
  onFetchCodes: (id: string) => Promise<KeycodeProfile | null>;
  onBack: () => void;
  year?: number;
}

export function KeycodeWorkspace({ assignment, keycodeProfiles, onFetchCodes, onBack, year }: KeycodeWorkspaceProps) {
  const profileId = assignment.keycodeProfileIds?.[0] ?? (assignment as any).keycodeProfileId ?? null;
  const baseProfile = keycodeProfiles.find((p) => p.id === profileId);

  // Carga los códigos completos al montar (la lista llega con codesData vacío)
  const [loadedProfile, setLoadedProfile] = useState<KeycodeProfile | null>(null);
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    if (!profileId || !baseProfile) return;
    if (baseProfile.codesData.length === 0 && (baseProfile.codesCount ?? 0) > 0) {
      setLoadingCodes(true);
      onFetchCodes(profileId).then((full) => {
        if (full) setLoadedProfile(full);
        setLoadingCodes(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const profile = loadedProfile ?? baseProfile;

  const bittingTotalLength = profile
    ? (profile.bittingConfig.axes && profile.bittingConfig.axes.length >= 2
        ? profile.bittingConfig.axes.reduce((s, a) => s + a.length, 0)
        : profile.bittingConfig.length)
    : 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [gridValues, setGridValues] = useState<string[]>(() => Array(bittingTotalLength).fill("?"));
  const [searchValues, setSearchValues] = useState<string[]>(() => Array(bittingTotalLength).fill("?"));
  const [codeState, setCodeState] = useState<"idle" | "exact" | "notfound">("idle");
  const [exactEntry, setExactEntry] = useState<{ codigo: string; bitting: string[] } | null>(null);

  const [bittingResults, setBittingResults] = useState<{ codigo: string; bitting: string[] }[]>([]);
  const [bittingGroups, setBittingGroups] = useState<{ codigo: string; bitting: string[] }[][]>([]);
  const [hasBittingSearched, setHasBittingSearched] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [decoderOpen, setDecoderOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const isMobile = useIsMobile();
  const [resultsSheetOpen, setResultsSheetOpen] = useState(false);

  useEffect(() => {
    if (isMobile && (isSearching || hasBittingSearched)) {
      setResultsSheetOpen(true);
    }
  }, [isMobile, isSearching, hasBittingSearched]);
  const [tileVariants, setTileVariants] = useState<{ up: boolean; down: boolean }[]>(() =>
    Array(bittingTotalLength).fill(null).map(() => ({ up: false, down: false }))
  );
  
  // Celda actualmente seleccionada para el teclado virtual
  const [selectedCellIdx, setSelectedCellIdx] = useState<number>(0);

  const allowedValues: Set<string> = (() => {
    if (!profile) return new Set<string>();
    const { maxDepth } = profile.bittingConfig;
    return new Set(Array.from({ length: maxDepth }, (_, i) => String(i + 1)));
  })();

  const usesLetterMapping = !!(profile?.bittingConfig.depthMapping && Object.keys(profile.bittingConfig.depthMapping).length > 0);

  // Cerraduras configuradas por el SuperAdmin para esta asignación + perfil actual
  const profileLockSelections = useMemo(() => {
    if (!profile || !assignment.lockSelections) return null;
    const sel = assignment.lockSelections[profile.id];
    if (!sel || Object.keys(sel).length === 0) return null;
    return sel;
  }, [assignment.lockSelections, profile]);

  const hasInfo = true;

  const getAxesQueryRanges = () => {
    if (!profile) return [] as { label: string | null; start: number; length: number }[];
    const config = profile.bittingConfig;
    if (config.axes && config.axes.length >= 2) {
      let offset = 0;
      return config.axes.map((axis) => {
        const range = { label: axis.label as string | null, start: offset, length: axis.length };
        offset += axis.length;
        return range;
      });
    }
    return [{ label: null as string | null, start: 0, length: config.length }];
  };

  const getAxesResult = (bitting: string[], config: BittingConfig) => {
    const hasMultiAxes = config.axes && config.axes.length >= 2;
    const totalLength = hasMultiAxes
      ? config.axes!.reduce((s, a) => s + a.length, 0)
      : config.length;

    const normalized: string[] =
      bitting.length < totalLength ? bitting.flatMap((v) => v.split("")) : [...bitting];

    if (!hasMultiAxes) {
      return [{ label: null as string | null, values: normalized.slice(0, config.length) }];
    }

    let offset = 0;
    return config.axes!.map((axis) => {
      const values = normalized.slice(offset, offset + axis.length);
      offset += axis.length;
      return { label: axis.label as string | null, values };
    });
  };

  const groupByKey = (results: { codigo: string; bitting: string[] }[], query: string[]) => {
    const wildcardIndices = query.map((q, i) => (q.trim() === "" || q === "?" ? i : -1)).filter((i) => i >= 0);
    if (wildcardIndices.length === 0) return results.map((r) => [r]);

    const getRawFlat = (entry: { bitting: string[] }) => {
      const normalized =
        entry.bitting.length < bittingTotalLength
          ? entry.bitting.flatMap((v) => v.split(""))
          : [...entry.bitting];
      return normalized;
    };

    const canCut = (fromFlat: string[], toFlat: string[]) =>
      wildcardIndices.every((i) => {
        const a = parseInt(fromFlat[i] ?? "0");
        const b = parseInt(toFlat[i] ?? "0");
        return !isNaN(a) && !isNaN(b) ? a <= b : (fromFlat[i] ?? "") <= (toFlat[i] ?? "");
      });

    const sorted = [...results].sort((a, b) => {
      const fA = getRawFlat(a);
      const fB = getRawFlat(b);
      const sA = wildcardIndices.reduce((s, i) => s + (parseInt(fA[i] ?? "0") || 0), 0);
      const sB = wildcardIndices.reduce((s, i) => s + (parseInt(fB[i] ?? "0") || 0), 0);
      return sA - sB;
    });

    const chains: { entries: typeof sorted; lastFlat: string[] }[] = [];
    for (const entry of sorted) {
      const flat = getRawFlat(entry);
      let bestChainIdx = -1;
      let bestSum = -1;
      for (let ci = 0; ci < chains.length; ci++) {
        if (canCut(chains[ci].lastFlat, flat)) {
          const sum = wildcardIndices.reduce((s, i) => s + (parseInt(chains[ci].lastFlat[i] ?? "0") || 0), 0);
          if (sum > bestSum) { bestSum = sum; bestChainIdx = ci; }
        }
      }
      if (bestChainIdx >= 0) {
        chains[bestChainIdx].entries.push(entry);
        chains[bestChainIdx].lastFlat = flat;
      } else {
        chains.push({ entries: [entry], lastFlat: flat });
      }
    }
    return chains.map((c) => c.entries);
  };

  const handleCodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !searchTerm.trim()) return;
    const found = profile.codesData.find(
      (c) => c.codigo.toUpperCase() === searchTerm.toUpperCase().trim()
    );
    if (found) {
      const axesResult = getAxesResult(found.bitting, profile.bittingConfig);
      const flatValues = axesResult.flatMap((a) => a.values);
      setGridValues(flatValues);
      setExactEntry(found);
      setCodeState("exact");
    } else {
      setCodeState("notfound");
      setExactEntry(null);
    }
    setBittingResults([]);
    setBittingGroups([]);
    setHasBittingSearched(false);
  };

  // Handle digit change from SVG inline inputs
  const handleSVGInputChange = (flatIdx: number, raw: string) => {
    const val = raw.slice(-1).toUpperCase();
    if (val !== "" && !allowedValues.has(val)) return;
    const next = [...gridValues];
    next[flatIdx] = val;
    setGridValues(next);
    if (codeState === "exact") {
      setCodeState("idle");
      setExactEntry(null);
    }
  };

  const handleVirtualKeypad = (val: string) => {
    if (!profile) return;
    const flatIdx = selectedCellIdx;
    if (codeState === 'exact') { setCodeState('idle'); setExactEntry(null); }

    // "?" actúa como comodín: marca la celda como faltante y avanza
    setGridValues((prev) => { const n = [...prev]; n[flatIdx] = val; return n; });
    const nextIndex = flatIdx < bittingTotalLength - 1 ? flatIdx + 1 : 0;
    setSelectedCellIdx(nextIndex);
  };

  const handleBittingSearch = () => {
    if (!profile) return;
    if (!canBittingSearch) return;
    setSearchValues([...gridValues]);
    setIsSearching(true);

    setTimeout(() => {
      const maxDepth = profile.bittingConfig.maxDepth;

      const acceptableSets: (Set<string> | null)[] = gridValues.map((q, i) => {
        if (!q.trim() || q === "?") return null;
        const base = parseInt(q.trim(), 10);
        const accepted = new Set<string>();
        accepted.add(String(base));
        if (advancedMode) {
          const v = tileVariants[i];
          if (v.up && base + 1 <= maxDepth) accepted.add(String(base + 1));
          if (v.down && base - 1 >= 1) accepted.add(String(base - 1));
        }
        return accepted;
      });

      const results = profile.codesData.filter((entry) => {
        const axesResult = getAxesResult(entry.bitting, profile.bittingConfig);
        const allValues = axesResult.flatMap((a) => a.values);
        return acceptableSets.every((accepted, i) => {
          if (!accepted) return true;
          return accepted.has(allValues[i]?.toUpperCase() ?? "");
        });
      });
      setBittingResults(results);
      setBittingGroups(groupByKey(results, gridValues));
      setHasBittingSearched(true);
      setIsSearching(false);
      if (results.length === 1) {
        setExactEntry(results[0]);
        setCodeState("exact");
        setSearchTerm(results[0].codigo);
      }
    }, 50);
  };

  const handleClear = () => {
    setGridValues(Array(bittingTotalLength).fill("?"));
    setSearchValues(Array(bittingTotalLength).fill("?"));
    setSearchTerm("");
    setCodeState("idle");
    setExactEntry(null);
    setBittingResults([]);
    setBittingGroups([]);
    setHasBittingSearched(false);
    setTileVariants(Array(bittingTotalLength).fill(null).map(() => ({ up: false, down: false })));
    setResultsSheetOpen(false);
  };

  const loadEntry = (entry: { codigo: string; bitting: string[] }) => {
    const axesResult = getAxesResult(entry.bitting, profile!.bittingConfig);
    const flatValues = axesResult.flatMap((a) => a.values);
    setGridValues(flatValues);
    setExactEntry(entry);
    setCodeState("exact");
    setSearchTerm(entry.codigo);
    setResultsSheetOpen(false);
  };

  // ── Decoder por foto ──
  const handleOpenDecoder = () => {
    if (!profile) return;
    if (!profile.decoderConfig && !profile.configuracionVisual) {
      toast.warning("Esta serie no tiene configuración del decodificador. Pide al SuperAdmin que la configure desde Perfiles → Decoder.");
      return;
    }
    setDecoderOpen(true);
  };

  const handleDecoderConfirm = (bitting: string[]) => {
    if (!profile) return;
    // Truncar/padear a la longitud total esperada
    const total = bittingTotalLength;
    const flat: string[] = [];
    for (let i = 0; i < total; i++) flat.push(bitting[i] ?? "");
    setGridValues(flat);
    setCodeState("idle");
    setExactEntry(null);
    setDecoderOpen(false);
    toast.success(`Bitting decodificado: ${bitting.join('-')}`);
    // Auto-buscar coincidencias después de un microtick
    setTimeout(() => {
      // Disparar búsqueda manualmente reusando lógica
      setIsSearching(true);
      setTimeout(() => {
        const maxDepth = profile.bittingConfig.maxDepth;
        const acceptableSets: (Set<string> | null)[] = flat.map((q) => {
          if (!q.trim() || q === "?") return null;
          const accepted = new Set<string>();
          accepted.add(String(parseInt(q.trim(), 10)));
          return accepted;
        });
        const results = profile.codesData.filter((entry) => {
          const axesResult = getAxesResult(entry.bitting, profile.bittingConfig);
          const allValues = axesResult.flatMap((a) => a.values);
          return acceptableSets.every((accepted, i) => {
            if (!accepted) return true;
            return accepted.has(allValues[i]?.toUpperCase() ?? "");
          });
        });
        setBittingResults(results);
        setBittingGroups(groupByKey(results, flat));
        setHasBittingSearched(true);
        setIsSearching(false);
        if (results.length === 1) {
          setExactEntry(results[0]);
          setCodeState("exact");
          setSearchTerm(results[0].codigo);
        }
        // Silencia maxDepth no usado
        void maxDepth;
      }, 50);
    }, 0);
  };

  // Configuración efectiva del decoder (persistida o auto-derivada del visual)
  const effectiveDecoderConfig = useMemo(() => {
    if (!profile) return null;
    if (profile.decoderConfig) return profile.decoderConfig;
    return buildDefaultDecoderConfig(profile);
  }, [profile]);

  if (!profile) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="text-primary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver a herramientas
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center">
            <Key className="w-12 h-12 mx-auto mb-3 text-destructive/50" />
            <h3 className="text-lg font-bold text-foreground">Perfil de Keycode no encontrado</h3>
            <p className="text-muted-foreground">
              El perfil asignado a este vehículo ya no existe. Contacte al SuperAdmin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingCodes) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="text-primary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver a herramientas
        </Button>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando códigos de la serie…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ranges = getAxesQueryRanges();
  const showAxisLabels = ranges.length >= 2;
  const hasAnyValue = gridValues.some((v) => v.trim() !== "" && v !== "?") || searchTerm.trim() !== "";
  const filledCells = gridValues.filter((v) => v.trim() !== "" && v !== "?").length;
  const canBittingSearch = (codeState !== "exact" || advancedMode) && filledCells >= Math.ceil(bittingTotalLength * 0.5);
  const hasMultiAxes = profile.bittingConfig.axes && profile.bittingConfig.axes.length >= 2;

  // Preparar valores para el SVG interactivo
  const primaryValues = hasMultiAxes
    ? gridValues.slice(0, profile.bittingConfig.axes![0].length)
    : gridValues;
  const secondaryValues = hasMultiAxes
    ? gridValues.slice(profile.bittingConfig.axes![0].length)
    : undefined;

  const primaryNums = primaryValues.map(v => parseInt(v, 10) || 1);
  const secondaryNums = secondaryValues?.map(v => parseInt(v, 10) || 1);

  const handlePrimaryChange = (index: number, value: string) => {
    const flatIdx = hasMultiAxes ? index : index;
    handleSVGInputChange(flatIdx, value);
  };

  const handleSecondaryChange = (index: number, value: string) => {
    if (!hasMultiAxes) return;
    const flatIdx = profile.bittingConfig.axes![0].length + index;
    handleSVGInputChange(flatIdx, value);
  };

  return (
    <>
    <div className="h-full flex flex-col">

      {/* ══════════════════════════════════════
          HERO HEADER
          ══════════════════════════════════════ */}
      <div className="shrink-0 bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
        <section className="ce-hero ce-hero-mobile-bleed p-[22px_16px] lg:p-[22px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                onClick={onBack}
                className="ce-hero-eyebrow inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Herramientas
              </button>
              <AnimatePresence mode="wait">
                <motion.h1
                  key={exactEntry?.codigo ?? "serie"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]"
                >
                  {codeState === "exact" && exactEntry
                    ? <span className="text-primary">{exactEntry.codigo}</span>
                    : profile.series
                      ? <>Serie <span className="text-primary">{profile.series}</span></>
                      : <>IC <span className="text-primary">{profile.icCard}</span></>
                  }
                </motion.h1>
              </AnimatePresence>
              <p className="ce-hero-meta mt-2">{assignment.make} {assignment.model}{year ? ` · ${year}` : ""}</p>
            </div>
            <div className="shrink-0 mt-1">
              <AccountMenu />
            </div>
          </div>

          {/* ── Barra de búsqueda ── */}
          <form onSubmit={handleCodeSearch} className="mt-4 lg:mt-5 flex items-center gap-2">
            <UnifiedSearchInput
              className="flex-1 min-w-0"
              placeholder="Codigo"
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                if (codeState === "notfound") setCodeState("idle");
              }}
              inputClassName="font-mono uppercase placeholder:normal-case"
            />
            <button
              type="submit"
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-white/[.09] border border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setInfoModalOpen(true)}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-white/[.09] border border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] active:scale-95 transition-all"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenDecoder}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-white/[.09] border border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
            </button>
          </form>
          {codeState === "notfound" && (
            <p className="mt-1.5 text-xs text-white/60">
              El código <span className="font-mono font-semibold">{searchTerm.toUpperCase()}</span> no existe en esta serie.
            </p>
          )}
        </section>
      </div>

      {/* ══════════════════════════════════════
          CONTENIDO — dos columnas en desktop
          ══════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:gap-4 overflow-hidden px-5 lg:px-6 pb-24 lg:pb-6">

      {/* ══════════════════════════════════════
          COLUMNA IZQUIERDA — SVG interactivo + controles
          ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-0 pb-2 lg:flex-none lg:shrink-0 lg:w-[480px] lg:pb-4">

        {/* SVG interactivo con inputs inline — siempre visible */}
        <div className="flex-1 min-h-0 flex items-center gap-1 mb-3">

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground -ml-1"
                onClick={() => setSelectedCellIdx(prev => prev > 0 ? prev - 1 : bittingTotalLength - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar">
            {profile.configuracionVisual ? (
              <div className="flex justify-center overflow-x-auto bg-muted/30 border border-dashed border-border rounded-lg p-1" style={{ color: 'hsl(240 16% 10%)' }}>
                <GeneradorLlaveSVG
                  config={{ ...profile.configuracionVisual, maxDepth: profile.bittingConfig.maxDepth }}
                  cortesPrimarios={primaryNums}
                  cortesSecundarios={secondaryNums}
                  valoresPrimarios={primaryValues}
                  valoresSecundarios={secondaryValues}
                  onPrimaryChange={handlePrimaryChange}
                  onSecondaryChange={handleSecondaryChange}
                  advancedMode={advancedMode}
                  tileVariants={tileVariants}
                  selectedGlobalIdx={selectedCellIdx}
                  onSelectCell={setSelectedCellIdx}
                  virtualKeypadMode
                  onVariantToggle={(flatIdx, dir) => {
                    const next = [...tileVariants];
                    next[flatIdx] = { ...next[flatIdx], [dir]: !next[flatIdx][dir] };
                    setTileVariants(next);
                  }}
                />
              </div>
            ) : (
              /* Fallback: tile grid si no hay configuración visual */
              <div className="space-y-3">
                {ranges.map((axisRange, axisIdx) => (
                  <div key={axisIdx} className="space-y-1">
                    {showAxisLabels && (
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Eje {axisRange.label}
                      </p>
                    )}
                    <div className="w-full sm:max-w-md sm:mx-auto">
                      <div
                        className="grid gap-1.5 w-full"
                        style={{ gridTemplateColumns: `repeat(${axisRange.length}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: axisRange.length }, (_, i) => (
                          <div key={`hdr-${axisIdx}-${i}`} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground">
                            {i + 1}
                          </div>
                        ))}
                        {Array.from({ length: axisRange.length }, (_, i) => {
                          const flatIdx = axisRange.start + i;
                          const globalIndex = flatIdx;
                          const totalInputs = bittingTotalLength;
                          const val = gridValues[flatIdx] ?? "";
                          const isExact = codeState === "exact";
                          const maxDepth = profile.bittingConfig.maxDepth;

                          const handleGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Backspace') {
                              e.preventDefault();
                              handleVirtualKeypad('?');
                              return;
                            }
                            if (e.key === 'ArrowLeft') {
                              e.preventDefault();
                              const prevIndex = globalIndex > 0 ? globalIndex - 1 : 0;
                              setSelectedCellIdx(prevIndex);
                              setTimeout(() => { document.getElementById(`grid-bitting-input-${prevIndex}`)?.focus(); }, 10);
                              return;
                            }
                            if (e.key === 'ArrowRight') {
                              e.preventDefault();
                              const nextIndex = globalIndex < totalInputs - 1 ? globalIndex + 1 : globalIndex;
                              setSelectedCellIdx(nextIndex);
                              setTimeout(() => { document.getElementById(`grid-bitting-input-${nextIndex}`)?.focus(); }, 10);
                              return;
                            }
                            if (['Tab','Enter','Escape','Delete'].includes(e.key)) return;

                            if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
                            e.preventDefault();
                            const num = parseInt(e.key);
                            if (isNaN(num) || num < 1 || num > maxDepth) return;
                            handleVirtualKeypad(e.key);
                          };

                          const isSelected = selectedCellIdx === globalIndex;
                          const isValued = val && val !== "?";
                          return (
                            <input
                              key={`tile-${axisIdx}-${i}`}
                              id={`grid-bitting-input-${globalIndex}`}
                              value={val}
                              onChange={() => {}}
                              onKeyDown={handleGridKeyDown}
                              onFocus={() => setSelectedCellIdx(globalIndex)}
                              onPointerDown={(e) => { e.preventDefault(); setSelectedCellIdx(globalIndex); }}
                              inputMode="none"
                              maxLength={2}
                              autoComplete="off"
                              className={`h-10 sm:h-14 w-full text-center font-mono font-bold text-base sm:text-2xl rounded-md border-2 transition-colors focus:outline-none uppercase
                                ${isExact && isValued
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : isSelected
                                    ? "bg-primary/10 text-primary border-primary ring-2 ring-primary/40"
                                    : isValued
                                      ? "bg-primary/15 text-primary border-primary/40"
                                      : "bg-background text-muted-foreground border-input"
                                }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>{/* fin contenedor figura */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground -mr-1"
                onClick={() => setSelectedCellIdx(prev => prev < bittingTotalLength - 1 ? prev + 1 : 0)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
        </div>{/* fin flex flechas */}

        <Card>
          <CardContent className="px-4 pb-4 pt-4 space-y-4">
            {/* Teclado Virtual Numérico / Profundidades */}
            {profile && (
              <div className="flex flex-wrap justify-center gap-2 sm:max-w-md sm:mx-auto mt-4 mb-4">
                {Array.from(allowedValues).map((keyVal) => (
                  <Button
                    key={`keypad-${keyVal}`}
                    type="button"
                    variant="outline"
                    onPointerDown={(e) => { e.preventDefault(); handleVirtualKeypad(keyVal); }}
                    className="w-12 h-12 flex items-center justify-center text-lg font-bold p-0"
                  >
                    {keyVal}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onPointerDown={(e) => { e.preventDefault(); handleVirtualKeypad("?"); }}
                  className="w-12 h-12 flex items-center justify-center text-lg font-bold p-0"
                >
                  ?
                </Button>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 sm:max-w-md sm:mx-auto">
              <Button
                type="button"
                size="icon"
                onClick={handleBittingSearch}
                variant={hasBittingSearched ? "outline" : "default"}
                title={hasBittingSearched ? "Actualizar búsqueda" : "Buscar coincidencias"}
                disabled={!canBittingSearch}
                className="shrink-0"
              >
                <Key className="w-4 h-4" />
              </Button>
              {isMobile && (
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setResultsSheetOpen(true)}
                  title="Ver resultados"
                  disabled={!hasBittingSearched}
                  className="shrink-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant={advancedMode ? "default" : "outline"}
                size="icon"
                onClick={() => setAdvancedMode(!advancedMode)}
                title={advancedMode ? "Desactivar búsqueda avanzada" : "Activar búsqueda avanzada (±1)"}
                className="shrink-0 ml-auto"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleClear}
                title="Limpiar"
                disabled={!hasAnyValue}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>


          </CardContent>
        </Card>

        {/* Modal de información */}
        <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Información de la serie
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pb-2">
              {/* Vehículo e IC */}
              <div className="space-y-1 bg-muted/40 rounded-md p-2.5 border">
                <p className="text-sm font-semibold text-foreground">{assignment.make} {assignment.model}</p>
                <p className="text-xs text-muted-foreground">{assignment.yearStart} – {assignment.yearEnd}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                  <span className="text-xs text-muted-foreground">IC: <span className="font-mono font-semibold text-foreground">{profile.icCard}</span></span>
                  {profile.series && (
                    <span className="text-xs text-muted-foreground">Serie: <span className="font-semibold text-foreground">{profile.series}</span></span>
                  )}
                  {profile.references.find(r => r.isPrimary) && (
                    <span className="text-xs text-muted-foreground">
                      Ref: <span className="font-semibold text-foreground">{profile.references.find(r => r.isPrimary)!.brand} {profile.references.find(r => r.isPrimary)!.refCode}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Cerraduras del vehículo */}
              {profileLockSelections && (() => {
                const axes = profile.bittingConfig.axes;
                const isDosEjes = !!(axes && axes.length >= 2);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Cerraduras de este vehículo</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Cortes incluidos en cada cerradura ({assignment.make} {assignment.model} {assignment.yearStart}-{assignment.yearEnd}):
                    </p>
                    <div className="space-y-1.5 bg-muted/40 rounded-md p-2.5 border">
                      {LOCK_ORDER.filter((lk) => profileLockSelections[lk]).map((lk) => {
                        const arr = profileLockSelections[lk]!;
                        const renderRow = (start: number, end: number) =>
                          arr.slice(start, end).map((checked, i) => (
                            <span
                              key={start + i}
                              className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border text-[9px] font-bold ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground/40 border-input'}`}
                            >
                              {checked ? '✓' : ''}
                            </span>
                          ));
                        return (
                          <div key={lk} className="flex items-center gap-2 text-xs">
                            <span className="w-20 shrink-0 font-medium">{LOCK_LABELS[lk]}:</span>
                            {isDosEjes ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] font-bold text-muted-foreground">{axes![0].label}</span>
                                <div className="flex gap-0.5">{renderRow(0, axes![0].length)}</div>
                                <span className="text-[9px] font-bold text-muted-foreground ml-1">{axes![1].label}</span>
                                <div className="flex gap-0.5">{renderRow(axes![0].length, axes![0].length + axes![1].length)}</div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-0.5">{renderRow(0, arr.length)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Mapeo de profundidades */}
              {usesLetterMapping && profile.bittingConfig.depthMapping && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Mapeo de profundidades</h4>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Es posible que las llaves de esta cerradura tengan impresos números, letras o marcas distintas. Usa esta tabla para interpretarlos:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.bittingConfig.depthMapping).map(([num, letter]) => (
                      <div key={num} className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded px-2 py-1">
                        <span className="font-mono font-bold text-sm text-foreground">{letter}</span>
                        <span className="text-amber-500 text-xs">=</span>
                        <span className="font-mono text-sm text-muted-foreground">{num}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>

      {/* ══════════════════════════════════════
          COLUMNA DERECHA — resultados (solo desktop)
          ══════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden">

      {/* Loading overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="shrink-0 flex items-center justify-center gap-2 py-4"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Buscando coincidencias…</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasBittingSearched && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <Separator className="shrink-0" />
            {bittingResults.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 shrink-0 py-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {bittingResults.length} código{bittingResults.length !== 1 ? "s" : ""}
                    {" · "}
                    {bittingGroups.length} llave{bittingGroups.length !== 1 ? "s" : ""} necesaria{bittingGroups.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                  {bittingGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
                          Llave {groupIdx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.length} código{group.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                        {group.map((entry, entryIdx) => {
                          const axesDisplay = getAxesResult(entry.bitting, profile.bittingConfig);
                          const isSelected = exactEntry?.codigo === entry.codigo;
                          return (
                            <motion.button
                              key={entry.codigo}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: (groupIdx * 4 + entryIdx) * 0.03 }}
                              onClick={() => loadEntry(entry)}
                              className={`w-full flex flex-col gap-1.5 px-3 py-2.5 text-left transition-colors ${
                                isSelected ? "bg-primary/8" : "hover:bg-muted/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-mono text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                                  {entry.codigo}
                                </span>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                              </div>
                              <div className="flex flex-col gap-1 w-full">
                                {axesDisplay.map((axis, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-1.5 w-full">
                                    {showAxisLabels && (
                                      <span className="text-[10px] font-bold text-muted-foreground shrink-0 w-3">
                                        {axis.label}:
                                      </span>
                                    )}
                                    <div
                                      className="grid"
                                      style={{ gridTemplateColumns: `repeat(${axis.values.length}, 1.75rem)`, gap: '2px' }}
                                    >
                                      {axis.values.map((val, posIdx) => {
                                        const flatIdx = ranges[aIdx]?.start + posIdx;
                                        const searchVal = searchValues[flatIdx] ?? "";
                                        const isWild = !searchVal.trim() || searchVal === "?";
                                        const isAdvanced = advancedMode && !isWild && val !== searchVal;
                                        return (
                                          <span
                                            key={posIdx}
                                            className={`h-6 flex items-center justify-center rounded text-[11px] font-bold ${
                                              isWild
                                                ? "bg-primary text-primary-foreground"
                                                : isAdvanced
                                                  ? "bg-amber-400/25 text-amber-600 dark:text-amber-400"
                                                  : "bg-muted text-muted-foreground"
                                            }`}
                                          >
                                            {val}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center bg-muted/50 p-8 rounded-xl border border-dashed border-border">
                <p className="font-semibold text-foreground mb-1">Sin coincidencias</p>
                <p className="text-sm text-muted-foreground">
                  Ningún código coincide con el patrón de cortes ingresado.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      </div>{/* fin columna derecha */}
      </div>{/* fin área de contenido */}
    </div>

    {/* ── Bottom sheet de resultados (solo mobile) ── */}
    <Dialog open={resultsSheetOpen} onOpenChange={setResultsSheetOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Buscando...</span>
              </>
            ) : bittingResults.length > 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-green-700 dark:text-green-400">
                  {bittingResults.length} código{bittingResults.length !== 1 ? "s" : ""}
                  {" · "}
                  {bittingGroups.length} llave{bittingGroups.length !== 1 ? "s" : ""} necesaria{bittingGroups.length !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <span>Sin coincidencias</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isSearching ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Buscando coincidencias…</span>
          </div>
        ) : bittingResults.length > 0 ? (
          <div className="space-y-3 pb-2">
            {bittingGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
                    Llave {groupIdx + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.length} código{group.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                  {group.map((entry, entryIdx) => {
                    const axesDisplay = getAxesResult(entry.bitting, profile!.bittingConfig);
                    const isSelected = exactEntry?.codigo === entry.codigo;
                    return (
                      <motion.button
                        key={entry.codigo}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (groupIdx * 4 + entryIdx) * 0.03 }}
                        onClick={() => loadEntry(entry)}
                        className={`w-full flex flex-col gap-1.5 px-3 py-2.5 text-left transition-colors ${
                          isSelected ? "bg-primary/8" : "hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {entry.codigo}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                          {axesDisplay.map((axis, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-1.5 w-full">
                              {showAxisLabels && (
                                <span className="text-[10px] font-bold text-muted-foreground shrink-0 w-3">
                                  {axis.label}:
                                </span>
                              )}
                              <div
                                className="grid"
                                style={{ gridTemplateColumns: `repeat(${axis.values.length}, 1.75rem)`, gap: '2px' }}
                              >
                                {axis.values.map((val, posIdx) => {
                                  const flatIdx = ranges[aIdx]?.start + posIdx;
                                  const searchVal = searchValues[flatIdx] ?? "";
                                  const isWild = !searchVal.trim() || searchVal === "?";
                                  const isAdvanced = advancedMode && !isWild && val !== searchVal;
                                  return (
                                    <span
                                      key={posIdx}
                                      className={`h-6 flex items-center justify-center rounded text-[11px] font-bold ${
                                        isWild
                                          ? "bg-primary text-primary-foreground"
                                          : isAdvanced
                                            ? "bg-amber-400/25 text-amber-600 dark:text-amber-400"
                                            : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {val}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-muted/50 p-8 rounded-xl border border-dashed border-border">
            <p className="font-semibold text-foreground mb-1">Sin coincidencias</p>
            <p className="text-sm text-muted-foreground">
              Ningún código coincide con el patrón de cortes ingresado.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {decoderOpen && effectiveDecoderConfig && profile && (
      <KeyPhotoDecoder
        initialConfig={effectiveDecoderConfig}
        bittingConfig={profile.bittingConfig}
        onClose={() => setDecoderOpen(false)}
        onConfirm={handleDecoderConfirm}
      />
    )}
    </>
  );
}
