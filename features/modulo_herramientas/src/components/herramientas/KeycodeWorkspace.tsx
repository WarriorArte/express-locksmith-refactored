import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, ArrowLeft, CheckCircle2, Filter, X, Info, Settings2, Loader2, Camera, Lock } from "lucide-react";
import { toast } from "sonner";
import { GeneradorLlaveSVG } from "@/components/llaves/GeneradorLlaveSVG";
import { KeyPhotoDecoder } from "@/components/herramientas/KeyPhotoDecoder";
import { buildDefaultDecoderConfig } from "@/lib/decoderPresets";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { ToolAssignment, KeycodeProfile, BittingConfig } from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";

interface KeycodeWorkspaceProps {
  assignment: ToolAssignment;
  keycodeProfiles: KeycodeProfile[];
  onBack: () => void;
}

export function KeycodeWorkspace({ assignment, keycodeProfiles, onBack }: KeycodeWorkspaceProps) {
  const profileId = assignment.keycodeProfileIds?.[0] ?? (assignment as any).keycodeProfileId ?? null;
  const profile = keycodeProfiles.find((p) => p.id === profileId);

  const bittingTotalLength = profile
    ? (profile.bittingConfig.axes && profile.bittingConfig.axes.length >= 2
        ? profile.bittingConfig.axes.reduce((s, a) => s + a.length, 0)
        : profile.bittingConfig.length)
    : 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [gridValues, setGridValues] = useState<string[]>(() => Array(bittingTotalLength).fill("?"));
  const [codeState, setCodeState] = useState<"idle" | "exact" | "notfound">("idle");
  const [exactEntry, setExactEntry] = useState<{ codigo: string; bitting: string[] } | null>(null);

  const [bittingResults, setBittingResults] = useState<{ codigo: string; bitting: string[] }[]>([]);
  const [bittingGroups, setBittingGroups] = useState<{ codigo: string; bitting: string[] }[][]>([]);
  const [hasBittingSearched, setHasBittingSearched] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [decoderOpen, setDecoderOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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

  const hasInfo = usesLetterMapping || !!profileLockSelections;

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
    const nextIndex = flatIdx < bittingTotalLength - 1 ? flatIdx + 1 : flatIdx;
    setSelectedCellIdx(nextIndex);
  };

  const handleBittingSearch = () => {
    if (!profile) return;
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
    setSearchTerm("");
    setCodeState("idle");
    setExactEntry(null);
    setBittingResults([]);
    setBittingGroups([]);
    setHasBittingSearched(false);
    setTileVariants(Array(bittingTotalLength).fill(null).map(() => ({ up: false, down: false })));
  };

  const loadEntry = (entry: { codigo: string; bitting: string[] }) => {
    const axesResult = getAxesResult(entry.bitting, profile!.bittingConfig);
    const flatValues = axesResult.flatMap((a) => a.values);
    setGridValues(flatValues);
    setExactEntry(entry);
    setCodeState("exact");
    setSearchTerm(entry.codigo);
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

  const ranges = getAxesQueryRanges();
  const showAxisLabels = ranges.length >= 2;
  const hasAnyValue = gridValues.some((v) => v.trim() !== "" && v !== "?");
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
    <div className="h-[calc(100dvh-4rem-2rem)] lg:h-[calc(100dvh-4rem-3rem)] flex flex-col lg:flex-row lg:gap-4 overflow-hidden">

      {/* ══════════════════════════════════════
          COLUMNA IZQUIERDA — SVG interactivo + controles
          ══════════════════════════════════════ */}
      <div className="shrink-0 pb-2 lg:w-[480px] lg:overflow-y-auto lg:pb-4">

        <Card>
          <CardHeader className="pt-3 pb-2 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <button
                onClick={onBack}
                className="text-primary hover:text-primary/80 transition-colors shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm leading-tight">{assignment.make} {assignment.model}</span>
                <div className="flex items-center gap-x-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">IC {profile.icCard}</span>
                  <span className="text-xs text-muted-foreground">· Serie {profile.series}</span>
                  {profile.references.find(r => r.isPrimary) && (
                    <span className="text-xs text-muted-foreground">· {profile.references.find(r => r.isPrimary)!.brand} {profile.references.find(r => r.isPrimary)!.refCode}</span>
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1 space-y-4">

            {/* Búsqueda por código */}
            <form onSubmit={handleCodeSearch} className="flex gap-2 w-full">
              <Input
                placeholder="Ingresa tu código"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (codeState === "notfound") setCodeState("idle");
                }}
                className={`font-mono text-base uppercase ${codeState === "notfound" ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <Button type="submit" className="shrink-0">Buscar</Button>
              {hasInfo && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setInfoModalOpen(true)}
                  title="Información de la cerradura y mapeo"
                  className="shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <Info className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant={advancedMode ? "default" : "outline"}
                size="icon"
                onClick={() => setAdvancedMode(!advancedMode)}
                title={advancedMode ? "Desactivar búsqueda avanzada" : "Activar búsqueda avanzada (±1)"}
                className="shrink-0"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleOpenDecoder}
                title="Decodificar llave por foto"
                className="shrink-0 text-primary border-primary/40 hover:bg-primary/10"
              >
                <Camera className="w-4 h-4" />
              </Button>
              {hasAnyValue && (
                <Button type="button" variant="outline" size="icon" onClick={handleClear} title="Limpiar" className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </form>

            {/* Feedback código no encontrado */}
            <AnimatePresence>
              {codeState === "notfound" && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-destructive -mt-2"
                >
                  El código <span className="font-mono font-semibold">{searchTerm.toUpperCase()}</span> no existe en esta serie.
                </motion.p>
              )}
            </AnimatePresence>

            <Separator />

            {/* SVG interactivo con inputs inline — siempre visible */}
            {profile.configuracionVisual ? (
              <div className="flex justify-center overflow-x-auto bg-muted/30 border border-dashed border-border rounded-lg p-1">
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
                              onPointerDown={() => setSelectedCellIdx(globalIndex)}
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
              {(hasAnyValue && codeState !== "exact") || hasBittingSearched ? (
                <Button
                  type="button"
                  onClick={handleBittingSearch}
                  variant={hasBittingSearched ? "outline" : "default"}
                  className="flex-1"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {hasBittingSearched ? "Actualizar búsqueda" : "Buscar coincidencias"}
                </Button>
              ) : null}
            </div>

            {/* Código confirmado */}
            <AnimatePresence>
              {codeState === "exact" && exactEntry && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">Código confirmado:</span>
                  <Badge variant="outline" className="font-mono text-base px-3 py-0.5 border-green-500 text-green-700 dark:text-green-400">
                    {exactEntry.codigo}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

          </CardContent>
        </Card>

        {/* Modal de información: cerraduras + mapeo de profundidades */}
        <AnimatePresence>
          {infoModalOpen && hasInfo && profile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => setInfoModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-background rounded-xl border border-amber-300 dark:border-amber-700 shadow-xl p-5 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">Información de la serie</h3>
                  </div>
                  <button onClick={() => setInfoModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sección de cerraduras del vehículo */}
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

                {/* Sección de mapeo de profundidades */}
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

                <Button className="w-full" onClick={() => setInfoModalOpen(false)}>Entendido</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ══════════════════════════════════════
          COLUMNA DERECHA — resultados (scrollable)
          ══════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

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
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                isSelected ? "bg-primary/8" : "hover:bg-muted/60"
                              }`}
                            >
                              <span className={`font-mono text-sm font-semibold w-14 shrink-0 ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {entry.codigo}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                {axesDisplay.map((axis, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-0.5">
                                    {showAxisLabels && (
                                      <span className="text-[10px] font-bold text-muted-foreground mr-0.5 shrink-0">
                                        {axis.label}:
                                      </span>
                                    )}
                                    {axis.values.map((val, posIdx) => {
                                      const flatIdx = ranges[aIdx]?.start + posIdx;
                                      const isWild = !(gridValues[flatIdx] ?? "").trim() || gridValues[flatIdx] === "?";
                                      return (
                                        <span
                                          key={posIdx}
                                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0 ${
                                            isWild ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                          }`}
                                        >
                                          {val}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
                              )}
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
    </div>

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
