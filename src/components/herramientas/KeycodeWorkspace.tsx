import { Fragment, useState, useRef, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Key, Check, X, Info, Camera, Lock, Search, List, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { GeneradorLlaveSVG } from "@/components/llaves/GeneradorLlaveSVG";
import { KeyPhotoDecoder } from "@/components/herramientas/KeyPhotoDecoder";
import { buildDefaultDecoderConfig } from "@/lib/decoderPresets";
import { useKeycodeVisualSettings } from "@/hooks/useKeycodeVisualSettings";
import { useTheme } from "@/hooks/useTheme";
import { spawnRipple } from "@/lib/ripple";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { ModuleHeader } from "@/design-system/layout/ModuleHeader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import {
  CopyableValue,
  DetailScreen,
  DetailSection,
  FilterChip,
  SpecRow,
  SubHeading,
  TonalChip,
} from "@/design-system/detail/DetailScreen";

/*
 * Keycode — herramienta interactiva con el criterio M3E (docs/CRITERIO-DISENO-M3E.md).
 * Protagonista: el código encontrado (CopyableValue). La lógica de búsqueda no cambió.
 */

import type { ToolAssignment, KeycodeProfile, BittingConfig, CodeEntry } from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";

/** Un resultado de búsqueda: código + bitting, con el bitting Valet (si existe) cuando el backend lo adjunta. */
type KeyResultEntry = {
  codigo: string;
  bitting: string[];
  valetBitting?: string[] | null;
  matchSource?: "master" | "valet";
};

export type KeycodeSearchFn = (
  profileId: string,
  opts: { codigo?: string; positions?: (string[] | null)[]; partial?: string; limit?: number; offset?: number },
) => Promise<{ total: number; results: KeyResultEntry[] }>;

/** A partir de este número de códigos la serie se busca en el servidor en vez de descargarse completa. */
const REMOTE_SEARCH_THRESHOLD = 5000;
/** Máximo de coincidencias que traemos del servidor por búsqueda de bitting. */
const REMOTE_RESULT_LIMIT = 500;

/**
 * Extrae el valor numérico puro de un código (quita prefijos de letras y ceros
 * a la izquierda), p.ej. "HA00008100" → "8100". Devuelve null si no hay dígitos.
 * Permite que "8100", "008100" y "HA00008100" encuentren el mismo código.
 */
function extractCodigoNumeric(codigo: string): string | null {
  const digits = codigo.replace(/\D/g, "");
  if (!digits) return null;
  const trimmed = digits.replace(/^0+/, "");
  return trimmed === "" ? "0" : trimmed;
}

/** Los 3 niveles de normalización de siempre (exacto, numérico puro, sufijo único), en memoria. */
function findCodigoTiersLocal(codesData: CodeEntry[], term: string): CodeEntry | null {
  const exact = codesData.find((c) => c.codigo.toUpperCase() === term);
  if (exact) return exact;

  // Igual que el nivel de sufijo: solo se acepta si hay una única coincidencia
  // posible (series como "K021/L021/M021/N021" comparten el mismo valor numérico
  // con prefijos que sí son parte real del código — ahí no hay que adivinar).
  const termNumeric = extractCodigoNumeric(term);
  if (termNumeric !== null) {
    const numericCandidates = codesData.filter((c) => extractCodigoNumeric(c.codigo) === termNumeric);
    if (numericCandidates.length === 1) return numericCandidates[0];
  }

  // El prefijo también tiene dígitos (p.ej. "A70000-A75928", prefijo "A7"):
  // compara por sufijo exacto de dígitos. Solo se acepta si hay una única
  // coincidencia posible; con varias, no adivinamos.
  const digits = term.replace(/\D/g, "");
  if (digits !== "") {
    const candidates = codesData.filter((c) => c.codigo.replace(/\D/g, "").endsWith(digits));
    if (candidates.length === 1) return candidates[0];
  }
  return null;
}

/**
 * Búsqueda de código exacto respetando "multi-prefijo" (mismo criterio que
 * KeycodeSearchController::findCodigo en el backend, para series chicas que se
 * buscan en memoria). Los niveles permisivos (numérico, sufijo) SOLO corren
 * sobre la parte pelona: si el texto tiene alguna letra, esa letra debe
 * coincidir con uno de los prefijos registrados (se quita y se procesa el
 * resto); si no coincide con ninguno, no hay match — nunca se procesan los
 * dígitos ignorando una letra no registrada, porque eso anularía la lista blanca.
 */
function findCodigoLocal(codesData: CodeEntry[], rawTerm: string, multiPrefixes: string[] | undefined): CodeEntry | null {
  const term = rawTerm.toUpperCase().trim();
  if (!multiPrefixes || multiPrefixes.length === 0) {
    return findCodigoTiersLocal(codesData, term);
  }

  const exact = codesData.find((c) => c.codigo.toUpperCase() === term);
  if (exact) return exact;

  // Sin ninguna letra: es el código pelón tal cual (sin prefijo).
  if (!/[A-Z]/.test(term)) {
    return findCodigoTiersLocal(codesData, term);
  }

  // Con letras: solo es válido si coincide con uno de los prefijos registrados.
  const sortedPrefixes = multiPrefixes
    .map((p) => p.toUpperCase())
    .sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (prefix && term.startsWith(prefix)) {
      const bare = term.slice(prefix.length);
      if (bare === "") continue;
      const found = findCodigoTiersLocal(codesData, bare);
      if (found) return found;
    }
  }
  return null;
}

interface KeycodeWorkspaceProps {
  assignment: ToolAssignment;
  keycodeProfiles: KeycodeProfile[];
  onFetchCodes: (id: string) => Promise<KeycodeProfile | null>;
  onSearchCodes?: KeycodeSearchFn;
  onBack: () => void;
  year?: number;
  /** Ajusta solo el contexto de navegacion cuando el SuperAdmin prueba un borrador. */
  previewMode?: boolean;
}

export function KeycodeWorkspace({ assignment, keycodeProfiles, onFetchCodes, onSearchCodes, onBack, year, previewMode = false }: KeycodeWorkspaceProps) {
  const profileId = assignment.keycodeProfileIds?.[0] ?? assignment.keycodeProfileId ?? null;
  const baseProfile = keycodeProfiles.find((p) => p.id === profileId);

  const { settings: visualSettings } = useKeycodeVisualSettings();
  const { theme } = useTheme();
  const resolvedStrokeColor = theme === "dark" ? visualSettings.strokeColorDark : visualSettings.strokeColorLight;

  // Series grandes: no se descargan completas, se consultan en el servidor.
  const remoteMode = !!(
    onSearchCodes &&
    baseProfile &&
    baseProfile.codesData.length === 0 &&
    (baseProfile.codesCount ?? 0) > REMOTE_SEARCH_THRESHOLD
  );

  // Carga los códigos completos al montar (la lista llega con codesData vacío)
  const needsCodesFetch = !!(
    profileId &&
    baseProfile &&
    !remoteMode &&
    baseProfile.codesData.length === 0 &&
    (baseProfile.codesCount ?? 0) > 0
  );

  const [loadedProfile, setLoadedProfile] = useState<KeycodeProfile | null>(null);
  // Inicia en true si hace falta traer códigos, para evitar el "flash" del UI ya renderizado
  const [loadingCodes, setLoadingCodes] = useState(needsCodesFetch);

  useEffect(() => {
    if (!needsCodesFetch) {
      setLoadingCodes(false);
      return;
    }
    setLoadingCodes(true);
    let cancelled = false;
    onFetchCodes(profileId!).then((full) => {
      if (cancelled) return;
      if (full) setLoadedProfile(full);
      setLoadingCodes(false);
    });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, needsCodesFetch]);


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
  const [exactEntry, setExactEntry] = useState<KeyResultEntry | null>(null);

  const [bittingResults, setBittingResults] = useState<KeyResultEntry[]>([]);
  const [bittingGroups, setBittingGroups] = useState<KeyResultEntry[][]>([]);
  const [hasBittingSearched, setHasBittingSearched] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  // Búsqueda parcial: encuentra bittings que contengan esta secuencia de dígitos
  // en cualquier posición (a diferencia de la búsqueda por celdas, que es posicional).
  const [partialSearchMode, setPartialSearchMode] = useState(false);
  const [partialSearchInput, setPartialSearchInput] = useState("");
  const [isPartialResults, setIsPartialResults] = useState(false);
  const [decoderOpen, setDecoderOpen] = useState(false);
  const [capturaModalOpen, setCapturaModalOpen] = useState(false);
  const [decoderImageUrl, setDecoderImageUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const isMobile = useIsMobile();
  const [resultsSheetOpen, setResultsSheetOpen] = useState(false);
  // Solo las búsquedas por bitting/decodificador deben abrir el panel de resultados
  const [allowResultsSheet, setAllowResultsSheet] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMobile && allowResultsSheet && (isSearching || hasBittingSearched)) {
      setResultsSheetOpen(true);
    }
  }, [isMobile, allowResultsSheet, isSearching, hasBittingSearched]);
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

  const applyCodeResult = (found: KeyResultEntry | null | undefined) => {
    if (!profile) return;
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
    setIsPartialResults(false);
  };

  /** Construye el arreglo de posiciones aceptadas para la búsqueda remota. */
  const buildRemotePositions = (values: string[], variants: { up: boolean; down: boolean }[] | null) => {
    const maxDepth = profile!.bittingConfig.maxDepth;
    return values.map((q, i) => {
      if (!q.trim() || q === "?") return null;
      const base = parseInt(q.trim(), 10);
      if (isNaN(base)) return [q.trim().toUpperCase()];
      const accepted = [String(base)];
      if (variants && variants[i]) {
        if (variants[i].up && base + 1 <= maxDepth) accepted.push(String(base + 1));
        if (variants[i].down && base - 1 >= 1) accepted.push(String(base - 1));
      }
      return accepted;
    });
  };

  const entryMatchesAcceptableSets = (
    bitting: string[],
    acceptableSets: (Set<string> | null)[],
  ): boolean => {
    if (!profile) return false;
    const axesResult = getAxesResult(bitting, profile.bittingConfig);
    const allValues = axesResult.flatMap((a) => a.values);
    return acceptableSets.every((accepted, i) => {
      if (!accepted) return true;
      return accepted.has(allValues[i]?.toUpperCase() ?? "");
    });
  };

  const handleCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !searchTerm.trim()) return;

    // Búsqueda directa por código: nunca abrir el panel de resultados
    setAllowResultsSheet(false);
    setResultsSheetOpen(false);
    // Cierra el teclado del dispositivo al buscar
    codeInputRef.current?.blur();

    if (remoteMode && onSearchCodes) {
      setIsSearching(true);
      const { results } = await onSearchCodes(profile.id, { codigo: searchTerm.trim(), limit: 1 });
      setIsSearching(false);
      applyCodeResult(results[0] ?? null);
      return;
    }

    const found = findCodigoLocal(profile.codesData, searchTerm, profile.multiPrefixes);
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
    setIsPartialResults(false);
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

  const handleBittingSearch = async () => {
    if (!profile) return;
    if (!canBittingSearch) return;
    setAllowResultsSheet(true);
    setIsPartialResults(false);
    setSearchValues([...gridValues]);
    setIsSearching(true);

    if (remoteMode && onSearchCodes) {
      const positions = buildRemotePositions(gridValues, advancedMode ? tileVariants : null);
      const { total, results } = await onSearchCodes(profile.id, {
        positions,
        limit: REMOTE_RESULT_LIMIT,
      });
      setBittingResults(results);
      setBittingGroups(groupByKey(results, gridValues));
      setHasBittingSearched(true);
      setIsSearching(false);
      if (total > results.length) {
        toast.info(`Se encontraron ${total} coincidencias. Mostrando las primeras ${results.length}; agrega más dígitos para afinar.`);
      }
      if (results.length === 1) {
        setExactEntry(results[0]);
        setCodeState("exact");
        setSearchTerm(results[0].codigo);
      }
      return;
    }

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

      const masterResults = profile.codesData
        .filter((entry) => entryMatchesAcceptableSets(entry.bitting, acceptableSets))
        .map((entry) => ({ ...entry, matchSource: "master" as const }));
      const masterCodes = new Set(masterResults.map((entry) => entry.codigo));
      const valetOnlyResults = (profile.valetCodesData ?? [])
        .filter((entry) => !masterCodes.has(entry.codigo))
        .filter((entry) => entryMatchesAcceptableSets(entry.bitting, acceptableSets))
        .map((entry) => ({
          ...entry,
          valetBitting: entry.bitting,
          matchSource: "valet" as const,
        }));
      const results = [...masterResults, ...valetOnlyResults];
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

  /** Búsqueda parcial: encuentra bittings que contengan esta secuencia de dígitos, sin importar la posición. */
  const handlePartialSearch = async () => {
    if (!profile) return;
    const digits = partialSearchInput.replace(/\D/g, "");
    if (digits.length < Math.ceil(bittingTotalLength * 0.5)) return;
    setAllowResultsSheet(true);
    setIsPartialResults(true);
    setIsSearching(true);

    if (remoteMode && onSearchCodes) {
      const { total, results } = await onSearchCodes(profile.id, { partial: digits, limit: REMOTE_RESULT_LIMIT });
      setBittingResults(results);
      setBittingGroups([]);
      setHasBittingSearched(true);
      setIsSearching(false);
      if (total > results.length) {
        toast.info(`Se encontraron ${total} coincidencias. Mostrando las primeras ${results.length}.`);
      }
      return;
    }

    setTimeout(() => {
      const matchesPartial = (entry: CodeEntry) => {
        const bittingStr = Array.isArray(entry.bitting) ? entry.bitting.join("") : entry.bitting;
        return bittingStr.includes(digits);
      };
      const masterResults = profile.codesData
        .filter(matchesPartial)
        .map((entry) => ({ ...entry, matchSource: "master" as const }));
      const masterCodes = new Set(masterResults.map((entry) => entry.codigo));
      const valetOnlyResults = (profile.valetCodesData ?? [])
        .filter((entry) => !masterCodes.has(entry.codigo))
        .filter(matchesPartial)
        .map((entry) => ({
          ...entry,
          valetBitting: entry.bitting,
          matchSource: "valet" as const,
        }));
      const results = [...masterResults, ...valetOnlyResults];
      setBittingResults(results);
      setBittingGroups([]);
      setHasBittingSearched(true);
      setIsSearching(false);
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
    setPartialSearchInput("");
    setIsPartialResults(false);
  };

  const loadEntry = (entry: KeyResultEntry) => {
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
    setCapturaModalOpen(true);
  };

  const handleCapturaImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDecoderImageUrl(url);
    setCapturaModalOpen(false);
    setDecoderOpen(true);
  };

  const handleDecoderConfirm = (bitting: string[]) => {
    if (!profile) return;
    // Truncar/padear a la longitud total esperada
    const total = bittingTotalLength;
    const flat: string[] = [];
    for (let i = 0; i < total; i++) flat.push(bitting[i] ?? "");
    setGridValues(flat);
    setSearchValues(flat);
    setCodeState("idle");
    setExactEntry(null);
    setDecoderOpen(false);
    setAllowResultsSheet(true);
    setIsPartialResults(false);
    // Auto-buscar coincidencias después de un microtick
    if (remoteMode && onSearchCodes) {
      setIsSearching(true);
      void (async () => {
        const positions = buildRemotePositions(flat, null);
        const { results } = await onSearchCodes(profile.id, { positions, limit: REMOTE_RESULT_LIMIT });
        setBittingResults(results);
        setBittingGroups(groupByKey(results, flat));
        setHasBittingSearched(true);
        setIsSearching(false);
        if (results.length === 1) {
          setExactEntry(results[0]);
          setCodeState("exact");
          setSearchTerm(results[0].codigo);
        }
      })();
      return;
    }
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
        const masterResults = profile.codesData
          .filter((entry) => entryMatchesAcceptableSets(entry.bitting, acceptableSets))
          .map((entry) => ({ ...entry, matchSource: "master" as const }));
        const masterCodes = new Set(masterResults.map((entry) => entry.codigo));
        const valetOnlyResults = (profile.valetCodesData ?? [])
          .filter((entry) => !masterCodes.has(entry.codigo))
          .filter((entry) => entryMatchesAcceptableSets(entry.bitting, acceptableSets))
          .map((entry) => ({
            ...entry,
            valetBitting: entry.bitting,
            matchSource: "valet" as const,
          }));
        const results = [...masterResults, ...valetOnlyResults];
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

  if (!profile || loadingCodes) {
    return (
      <DetailScreen
        title={!profile ? "Keycode" : baseProfile?.series ? `Serie ${baseProfile.series}` : "Keycode"}
        meta={`${assignment.make} ${assignment.model}${year ? ` · ${year}` : ""}`}
        onBack={onBack}
        backLabel="Volver a vehículos"
      >
        {!profile ? (
          <DetailSection title="Perfil no encontrado" tone="destructive" icon={<Key className="h-5 w-5 shrink-0" />}>
            <p className="text-[15px] leading-relaxed text-foreground">
              El perfil asignado a este vehículo ya no existe. Contacta al SuperAdmin.
            </p>
          </DetailSection>
        ) : (
          <div aria-busy="true" className="space-y-3">
            <div className="h-44 animate-pulse rounded-[28px] bg-card shadow-sm" />
            <div className="h-56 animate-pulse rounded-[28px] bg-card shadow-sm" />
            <p className="text-center text-sm text-muted-foreground">Cargando códigos de la serie…</p>
          </div>
        )}
      </DetailScreen>
    );
  }

  const ranges = getAxesQueryRanges();
  const showAxisLabels = ranges.length >= 2;
  const hasAnyValue = gridValues.some((v) => v.trim() !== "" && v !== "?") || searchTerm.trim() !== "" || partialSearchInput.trim() !== "";
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

  const partialDigits = partialSearchInput.replace(/\D/g, "");
  const partialMinDigits = Math.ceil(bittingTotalLength * 0.5);
  const canPartialSearch = partialDigits.length >= partialMinDigits;

  /**
   * Tarjeta de un resultado (código + cajas de bitting), compartida entre la
   * búsqueda posicional (agrupada por "llave") y la búsqueda parcial (lista
   * plana, sin esa agrupación). `getHighlightState` decide, por posición,
   * si se resalta como comodín/coincidencia (isWild) o como variante ±1 (isAdvanced).
   */
  // La serie tiene un set de códigos Valet cargado (valetCodesCount cubre listas
  // grandes donde valetCodesData llega vacío; valetCodesData cubre series chicas ya cargadas).
  const seriesHasValet = (profile?.valetCodesCount ?? profile?.valetCodesData?.length ?? 0) > 0;

  /**
   * Bitting Valet para un resultado, si existe: lo trae el backend (positions/partial
   * remotos) o, si la serie está cargada localmente, se busca en valetCodesData.
   */
  const getValetBitting = (entry: KeyResultEntry): string[] | null => {
    if (entry.valetBitting !== undefined) return entry.valetBitting;
    return profile?.valetCodesData?.find((v) => v.codigo === entry.codigo)?.bitting ?? null;
  };

  const matchesCurrentPositionalQuery = (bitting: string[]): boolean => {
    if (!profile) return false;
    const query = searchValues.some((q) => q.trim() !== "" && q !== "?") ? searchValues : gridValues;
    const axesResult = getAxesResult(bitting, profile.bittingConfig);
    const allValues = axesResult.flatMap((a) => a.values);
    const maxDepth = profile.bittingConfig.maxDepth;

    return query.every((q, i) => {
      const clean = q.trim().toUpperCase();
      if (!clean || clean === "?") return true;

      const val = (allValues[i] ?? "").toUpperCase();
      const base = parseInt(clean, 10);
      if (isNaN(base)) return val === clean;
      if (val === String(base)) return true;

      if (advancedMode) {
        const variants = tileVariants[i];
        if (variants?.up && base + 1 <= maxDepth && val === String(base + 1)) return true;
        if (variants?.down && base - 1 >= 1 && val === String(base - 1)) return true;
      }

      return false;
    });
  };

  const renderResultEntry = (
    entry: { codigo: string; bitting: string[] },
    getHighlightState: (flatIdx: number, val: string) => { isWild: boolean; isAdvanced: boolean },
    badge?: "MASTER" | "VALET",
  ) => {
    const axesDisplay = getAxesResult(entry.bitting, profile!.bittingConfig);
    const isSelected = exactEntry?.codigo === entry.codigo && exactEntry?.bitting.join("") === entry.bitting.join("");
    return (
      <button
        key={badge ? `${entry.codigo}-${badge}` : entry.codigo}
        type="button"
        onClick={() => loadEntry(entry)}
        onPointerDown={spawnRipple}
        aria-pressed={isSelected}
        className={`m3-list-item flex w-full flex-col gap-2 px-4 py-3 text-left ${isSelected ? "bg-primary-light" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold tabular-nums text-foreground">{entry.codigo}</span>
            {badge && (
              <span
                className={`inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs font-semibold ${
                  badge === "MASTER" ? "bg-warning-light text-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {badge === "MASTER" ? "Master" : "Valet"}
              </span>
            )}
          </div>
          {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" />}
        </div>
        <div className="flex w-full flex-col gap-1">
          {axesDisplay.map((axis, aIdx) => (
            <div key={aIdx} className="flex w-full items-center gap-2">
              {showAxisLabels && (
                <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{axis.label}</span>
              )}
              <div
                className="grid min-w-0 flex-1"
                style={{
                  gridTemplateColumns: `repeat(${axis.values.length}, minmax(0, 1fr))`,
                  gap: "3px",
                  // Tope para que en pantallas anchas no se estiren de más;
                  // en pantallas angostas se encogen en vez de cortarse.
                  maxWidth: `${axis.values.length * 28 + (axis.values.length - 1) * 3}px`,
                }}
              >
                {axis.values.map((val, posIdx) => {
                  const flatIdx = (ranges[aIdx]?.start ?? 0) + posIdx;
                  const { isWild, isAdvanced } = getHighlightState(flatIdx, val);
                  return (
                    <span
                      key={posIdx}
                      className={`flex h-7 items-center justify-center rounded-md text-lg font-bold leading-none tabular-nums ${
                        isWild
                          ? "bg-primary text-primary-foreground"
                          : isAdvanced
                            ? "bg-warning-light text-foreground"
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
      </button>
    );
  };

  /**
   * Tarjeta(s) de un resultado: si la serie tiene códigos Valet cargados, la normal
   * se marca "MASTER" y, si este código en particular tiene contraparte Valet, se
   * agrega justo debajo su propia tarjeta marcada "VALET" con ese bitting.
   */
  const renderResultPair = (
    entry: KeyResultEntry,
    getHighlightStateFor: (e: { codigo: string; bitting: string[] }) => (flatIdx: number, val: string) => { isWild: boolean; isAdvanced: boolean },
    // Si se da, el Valet solo se muestra cuando SU bitting también cumple la búsqueda
    // — que el Master haya coincidido no implica que el Valet también lo haga.
    matchesQuery?: (bitting: string[]) => boolean,
  ) => {
    if (entry.matchSource === "valet") {
      return (
        <Fragment key={`${entry.codigo}-valet-only`}>
          {renderResultEntry(entry, getHighlightStateFor(entry), "VALET")}
        </Fragment>
      );
    }

    const valetBitting = getValetBitting(entry);
    const showValet = valetBitting && (!matchesQuery || matchesQuery(valetBitting));
    return (
      <Fragment key={entry.codigo}>
        {renderResultEntry(entry, getHighlightStateFor(entry), seriesHasValet ? "MASTER" : undefined)}
        {showValet && (() => {
          const valetEntry = { codigo: entry.codigo, bitting: valetBitting };
          return renderResultEntry(valetEntry, getHighlightStateFor(valetEntry), "VALET");
        })()}
      </Fragment>
    );
  };

  /** Resalta la secuencia buscada como si fuera comodín, sin importar en qué posición cayó. */
  const partialHighlight = (entry: { codigo: string; bitting: string[] }) => {
    const bittingStr = Array.isArray(entry.bitting) ? entry.bitting.join("") : entry.bitting;
    const matchStart = partialDigits ? bittingStr.indexOf(partialDigits) : -1;
    return (flatIdx: number) => ({
      isWild: matchStart >= 0 && flatIdx >= matchStart && flatIdx < matchStart + partialDigits.length,
      isAdvanced: false,
    });
  };

  // Lista plana para resultados de búsqueda parcial: mismas tarjetas que la
  // búsqueda normal, sin la agrupación por "llave" (que solo aplica a
  // búsquedas posicionales con comodines).
  const renderPartialResults = () => (
    <div className="m3-list">
      {bittingResults.map((entry) => renderResultPair(
        entry,
        partialHighlight,
        (bitting) => partialDigits !== "" && bitting.join("").includes(partialDigits),
      ))}
    </div>
  );

  const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;
  const resultsTitle = isSearching
    ? "Buscando…"
    : bittingResults.length > 0
      ? plural(bittingResults.length, "código")
      : "Sin coincidencias";
  const resultsMeta = isPartialResults
    ? "Coincidencias por secuencia"
    : bittingResults.length > 0
      ? `${plural(bittingGroups.length, "llave")} necesaria${bittingGroups.length !== 1 ? "s" : ""}`
      : "Resultados de la búsqueda";

  const positionalHighlight = () => (flatIdx: number, val: string) => {
    const searchVal = searchValues[flatIdx] ?? "";
    const isWild = !searchVal.trim() || searchVal === "?";
    const isAdvanced = advancedMode && !isWild && val !== searchVal;
    return { isWild, isAdvanced };
  };

  /** Cuerpo de resultados, compartido por la columna de escritorio y la hoja móvil. */
  const renderResultsBody = () => {
    if (isSearching) {
      return (
        <div className="m3-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="m3-list-item space-y-2 px-4 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>
      );
    }
    if (bittingResults.length === 0) {
      return (
        <div className="rounded-[28px] bg-muted px-5 py-8 text-center">
          <p className="text-base font-semibold text-foreground">Sin coincidencias</p>
          <p className="mt-1 text-sm text-muted-foreground">Ningún código coincide con los cortes ingresados.</p>
        </div>
      );
    }
    if (isPartialResults) return renderPartialResults();
    return (
      <div className="space-y-5">
        {bittingGroups.map((group, groupIdx) => (
          <section key={groupIdx}>
            <div className="mb-2.5 flex items-center gap-3">
              <MaterialShape name="cookie9" className="h-9 w-9 text-primary-light">
                <span className="text-sm font-bold tabular-nums text-foreground">{groupIdx + 1}</span>
              </MaterialShape>
              <p className="text-base font-semibold text-foreground">Llave {groupIdx + 1}</p>
              <span className="text-sm text-muted-foreground">{plural(group.length, "código")}</span>
            </div>
            <div className="m3-list">
              {group.map((entry) => renderResultPair(entry, positionalHighlight, matchesCurrentPositionalQuery))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const vehicleLine = previewMode
    ? "Vista de prueba · cambios sin guardar"
    : `${assignment.make} ${assignment.model}${year ? ` · ${year}` : ""}`;
  const seriesName = profile.series ? `Serie ${profile.series}` : `IC ${profile.icCard}`;
  const primaryRef = profile.references.find((r) => r.isPrimary);

  return (
    <>
    <div className="h-full flex flex-col">

      {/* ── Barra superior + protagonista + búsqueda por código ── */}
      <div className="shrink-0 px-5 pt-11 lg:px-6 lg:pt-4">
        <ModuleHeader className="-mx-2" title={seriesName} subtitle={vehicleLine} onBack={onBack} backLabel={previewMode ? "Salir de la prueba" : "Volver a vehículos"} backIcon={previewMode ? <X className="!h-6 !w-6" /> : undefined} accountTrigger={!previewMode ? <AccountMenu /> : undefined} />

        {/* El código encontrado es el protagonista: grande y copiable */}
        {codeState === "exact" && exactEntry && (
          <div className="mt-1 flex min-h-[3.5rem] items-end">
            <CopyableValue
              label={seriesName}
              value={searchTerm.trim().toUpperCase() || exactEntry.codigo}
              copiedMessage="Código copiado"
            />
          </div>
        )}

        <form
          onSubmit={handleCodeSearch}
          className="mt-3 flex h-14 items-center gap-1 rounded-full bg-card pl-1.5 pr-1.5 shadow-sm"
        >
          <Button type="submit" variant="ghost" size="icon" aria-label="Buscar código">
            <Search className="!h-5 !w-5" />
          </Button>
          <input
            ref={codeInputRef}
            type="search"
            enterKeyHint="search"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (codeState === "notfound") setCodeState("idle");
            }}
            placeholder="Buscar código"
            aria-label="Código de la llave"
            className="min-w-0 flex-1 bg-transparent text-base tabular-nums text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => setInfoModalOpen(true)} aria-label="Información de la serie">
            <Info className="!h-5 !w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={handleOpenDecoder} aria-label="Leer llave con foto">
            <Camera className="!h-5 !w-5" />
          </Button>
        </form>
        {codeState === "notfound" && (
          <p className="mt-2 px-2 text-sm text-destructive">
            El código <span className="font-semibold tabular-nums">{searchTerm.toUpperCase()}</span> no existe en esta serie.
          </p>
        )}
      </div>

      {/* ── Contenido: llave + teclado | resultados (escritorio) ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:gap-4 overflow-hidden px-4 pt-3 lg:px-6 pb-mobile-nav">

      <div className="flex-1 flex flex-col min-h-0 gap-3 pb-2 lg:flex-none lg:shrink-0 lg:w-[480px] lg:pb-4">

        {/* Llave interactiva */}
        <div className="flex-1 min-h-0 flex items-center gap-1 rounded-[28px] bg-card px-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            aria-label="Corte anterior"
            onClick={() => setSelectedCellIdx(prev => prev > 0 ? prev - 1 : bittingTotalLength - 1)}
          >
            <ChevronLeft className="!h-5 !w-5" />
          </Button>
          <div className="flex-1 min-w-0 max-h-full overflow-y-auto no-scrollbar py-2">
            {profile.configuracionVisual ? (
              <div className="flex justify-center overflow-x-auto">
                <GeneradorLlaveSVG
                  config={{ ...profile.configuracionVisual, maxDepth: profile.bittingConfig.maxDepth }}
                  cortesPrimarios={primaryNums}
                  cortesSecundarios={secondaryNums}
                  invertDepths={profile.bittingConfig.invertDepths}
                  valoresPrimarios={primaryValues}
                  valoresSecundarios={secondaryValues}
                  onPrimaryChange={handlePrimaryChange}
                  onSecondaryChange={handleSecondaryChange}
                  advancedMode={advancedMode}
                  tileVariants={tileVariants}
                  selectedGlobalIdx={selectedCellIdx}
                  onSelectCell={setSelectedCellIdx}
                  virtualKeypadMode
                  strokeColor={resolvedStrokeColor}
                  strokeWidth={visualSettings.strokeWidth}
                  boxSize={profile.configuracionVisual.tamCaja}
                  numberSize={profile.configuracionVisual.tamNumero}
                  numberWeight={profile.configuracionVisual.numeroGrosor}
                  onVariantToggle={(flatIdx, dir) => {
                    const next = [...tileVariants];
                    next[flatIdx] = { ...next[flatIdx], [dir]: !next[flatIdx][dir] };
                    setTileVariants(next);
                  }}
                />
              </div>
            ) : (
              /* Sin configuración visual: casillas de cortes */
              <div className="space-y-3 px-1">
                {ranges.map((axisRange, axisIdx) => (
                  <div key={axisIdx} className="space-y-1.5">
                    {showAxisLabels && (
                      <p className="text-sm font-medium text-muted-foreground">Eje {axisRange.label}</p>
                    )}
                    <div className="w-full sm:max-w-md sm:mx-auto">
                      <div
                        className="grid gap-1.5 w-full"
                        style={{ gridTemplateColumns: `repeat(${axisRange.length}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: axisRange.length }, (_, i) => (
                          <div key={`hdr-${axisIdx}-${i}`} className="text-center text-xs font-medium text-muted-foreground">
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
                              aria-label={`Corte ${globalIndex + 1}`}
                              className={`h-11 sm:h-14 w-full rounded-xl text-center tabular-nums font-bold text-lg sm:text-2xl transition-colors focus:outline-none ${
                                isExact && isValued
                                  ? "bg-primary text-primary-foreground"
                                  : isSelected
                                    ? "bg-primary-light text-foreground ring-2 ring-primary"
                                    : isValued
                                      ? "bg-primary-light text-foreground"
                                      : "bg-muted text-muted-foreground"
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
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            aria-label="Corte siguiente"
            onClick={() => setSelectedCellIdx(prev => prev < bittingTotalLength - 1 ? prev + 1 : 0)}
          >
            <ChevronRight className="!h-5 !w-5" />
          </Button>
        </div>

        {/* Teclado de profundidades + acciones */}
        <div className="shrink-0 space-y-4 rounded-[28px] bg-card p-4 shadow-sm">
          {!partialSearchMode ? (
            <div className="flex flex-wrap justify-center gap-2 sm:mx-auto sm:max-w-md">
              {Array.from(allowedValues).map((keyVal) => (
                <Button
                  key={`keypad-${keyVal}`}
                  type="button"
                  variant="ghost"
                  onPointerDown={(e) => { e.preventDefault(); handleVirtualKeypad(keyVal); }}
                  aria-label={`Profundidad ${keyVal}`}
                  className="h-12 w-12 rounded-full bg-muted p-0 text-xl font-semibold tabular-nums hover:bg-muted"
                >
                  {keyVal}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                onPointerDown={(e) => { e.preventDefault(); handleVirtualKeypad("?"); }}
                aria-label="Corte desconocido"
                className="h-12 w-12 rounded-full bg-accent p-0 text-xl font-semibold text-accent-foreground hover:bg-accent"
              >
                ?
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 sm:mx-auto sm:max-w-md">
              <Input
                value={partialSearchInput}
                onChange={(e) => setPartialSearchInput(e.target.value.replace(/\D/g, ""))}
                placeholder={`Mínimo ${partialMinDigits} dígitos, ej. 13112433`}
                inputMode="numeric"
                aria-label="Secuencia de cortes"
                className="text-center tabular-nums"
              />
              {partialDigits.length > 0 && !canPartialSearch && (
                <p className="text-center text-xs text-muted-foreground">
                  Faltan {partialMinDigits - partialDigits.length} dígitos ({partialDigits.length}/{partialMinDigits}).
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 sm:mx-auto sm:max-w-md">
            <div className="flex items-center gap-2">
              <FilterChip onCard selected={advancedMode} onClick={() => setAdvancedMode(!advancedMode)}>
                ±1
              </FilterChip>
              <FilterChip
                onCard
                selected={partialSearchMode}
                onClick={() => {
                  setPartialSearchMode((v) => !v);
                  if (partialSearchMode) { setPartialSearchInput(""); setIsPartialResults(false); }
                }}
              >
                Secuencia
              </FilterChip>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                disabled={!hasAnyValue}
                aria-label="Limpiar"
                className="ml-auto"
              >
                <X className="!h-5 !w-5" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={partialSearchMode ? handlePartialSearch : handleBittingSearch}
                variant={hasBittingSearched ? "secondary" : "default"}
                disabled={partialSearchMode ? !canPartialSearch : !canBittingSearch}
                className="flex-1"
              >
                <Key />
                {hasBittingSearched ? "Buscar de nuevo" : "Buscar"}
              </Button>
              {isMobile && hasBittingSearched && (
                <Button type="button" variant="secondary" onClick={() => setResultsSheetOpen(true)} aria-label="Ver resultados">
                  <List />
                  <span className="tabular-nums">{bittingResults.length}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resultados (escritorio) */}
      <div className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden">
        {isSearching || hasBittingSearched ? (
          <>
            <div className="shrink-0 pb-3">
              <p className="text-lg font-semibold text-foreground">{resultsTitle}</p>
              {!isSearching && <p className="text-sm text-muted-foreground">{resultsMeta}</p>}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4 no-scrollbar">
              {renderResultsBody()}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MaterialShape name="cookie9" className="mb-4 h-20 w-20 text-muted">
              <Key className="h-8 w-8 text-muted-foreground" />
            </MaterialShape>
            <p className="max-w-xs text-[15px] text-muted-foreground">
              Marca los cortes que conoces y pulsa Buscar para ver qué códigos coinciden.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>

    {/* Información de la serie */}
    <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">{seriesName}</DialogTitle>
          <DialogDescription>
            {assignment.make} {assignment.model} · {assignment.yearStart}–{assignment.yearEnd}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pb-4">
          <DetailSection title="Serie" className="bg-muted shadow-none">
            <div className="-my-1.5">
              <SpecRow label="IC" value={profile.icCard} />
              {profile.series && <SpecRow label="Serie" value={profile.series} />}
              {primaryRef && <SpecRow label="Referencia" value={`${primaryRef.brand} ${primaryRef.refCode}`} />}
              {!!profile.seriesAliases?.length && (
                <SpecRow label="También incluye" value={profile.seriesAliases.join(", ")} />
              )}
            </div>
          </DetailSection>

          {profileLockSelections && (() => {
            const axes = profile.bittingConfig.axes;
            const isDosEjes = !!(axes && axes.length >= 2);
            const renderCuts = (arr: boolean[], start: number, end: number) =>
              arr.slice(start, end).map((checked, i) => (
                <span
                  key={start + i}
                  aria-label={`Corte ${start + i + 1}${checked ? " incluido" : ""}`}
                  className={`flex h-6 w-6 items-center justify-center rounded-md ${
                    checked ? "bg-primary text-primary-foreground" : "bg-background"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              ));
            return (
              <DetailSection title="Cerraduras" className="bg-muted shadow-none" icon={<Lock className="h-5 w-5 text-primary" />}>
                <SubHeading>Cortes que lleva cada cerradura</SubHeading>
                <div className="space-y-3">
                  {LOCK_ORDER.filter((lk) => profileLockSelections[lk]).map((lk) => {
                    const arr = profileLockSelections[lk]!;
                    return (
                      <div key={lk} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm font-medium text-foreground">{LOCK_LABELS[lk]}</span>
                        {isDosEjes ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">{axes![0].label}</span>
                            <div className="flex gap-1">{renderCuts(arr, 0, axes![0].length)}</div>
                            <span className="ml-1 text-xs font-semibold text-muted-foreground">{axes![1].label}</span>
                            <div className="flex gap-1">{renderCuts(arr, axes![0].length, axes![0].length + axes![1].length)}</div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">{renderCuts(arr, 0, arr.length)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DetailSection>
            );
          })()}

          {usesLetterMapping && profile.bittingConfig.depthMapping && (
            <DetailSection title="Mapeo de profundidades" className="bg-muted shadow-none">
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                Las llaves pueden traer impresas letras o marcas distintas. Equivalencias:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(profile.bittingConfig.depthMapping).map(([num, letter]) => (
                  <TonalChip
                    key={num}
                    tone="warning"
                    label={
                      <>
                        <span className="font-bold tabular-nums">{letter}</span>
                        <span className="tabular-nums text-muted-foreground">= {num}</span>
                      </>
                    }
                  />
                ))}
              </div>
            </DetailSection>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Resultados (hoja móvil) */}
    <Dialog open={resultsSheetOpen} onOpenChange={setResultsSheetOpen}>
      <DialogContent>
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">{resultsTitle}</DialogTitle>
          <DialogDescription>{isSearching ? "Buscando coincidencias" : resultsMeta}</DialogDescription>
        </DialogHeader>
        <div className="pb-4">{renderResultsBody()}</div>
      </DialogContent>
    </Dialog>

    {decoderOpen && effectiveDecoderConfig && profile && (
      <KeyPhotoDecoder
        initialConfig={effectiveDecoderConfig}
        bittingConfig={profile.bittingConfig}
        initialImageUrl={decoderImageUrl}
        onClose={() => setDecoderOpen(false)}
        onConfirm={handleDecoderConfirm}
      />
    )}

    {/* Origen de la foto para el decodificador */}
    <Dialog open={capturaModalOpen} onOpenChange={setCapturaModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">Leer llave con foto</DialogTitle>
          <DialogDescription className="sr-only">Elige si tomar una foto o abrir una de la galería.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <label
            onPointerDown={spawnRipple}
            className="relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-[28px] bg-primary-light px-4 py-6 text-center"
          >
            <MaterialShape name="cookie9" className="h-14 w-14 text-background/70">
              <Camera className="h-6 w-6 text-foreground" />
            </MaterialShape>
            <span className="text-base font-semibold text-foreground">Cámara</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapturaImagen} />
          </label>
          <label
            onPointerDown={spawnRipple}
            className="relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-[28px] bg-muted px-4 py-6 text-center"
          >
            <MaterialShape name="cookie9" className="h-14 w-14 text-background/70">
              <ImageIcon className="h-6 w-6 text-foreground" />
            </MaterialShape>
            <span className="text-base font-semibold text-foreground">Galería</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleCapturaImagen} />
          </label>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
