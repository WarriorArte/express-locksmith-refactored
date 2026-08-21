import { useState, useMemo, useRef, useEffect } from "react";
import { m as motion } from "framer-motion";
import { Key, FileJson, Database, Plus, Trash2, Edit, Check, Search, ChevronLeft, ChevronRight, Upload, ArrowLeft, Eye, Settings2, LayoutList, LayoutGrid, ImageIcon, Camera, Wand2, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GeneradorLlaveSVG } from "@/components/llaves/GeneradorLlaveSVG";
import { buildDefaultDecoderConfig, applyDecoderPreset, mapVisualTipoToDecoder } from "@/lib/decoderPresets";
import { useKeycodeVisualSettings } from "@/hooks/useKeycodeVisualSettings";
import { useTheme } from "@/hooks/useTheme";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiDeleteFile, resolveStorageUrl } from "@/lib/phpApi";
import { ImageGalleryDialog } from "@/components/shared/ImageGalleryDialog";

import type { KeycodeProfile, KeyReference, CodeEntry, BittingConfig, ConfiguracionVisualLlave, TipoLlaveSVG, DecoderConfig, DecoderTipoLlave, DecoderAlineacion } from "@/types";

interface JsonSerieImport {
  id: string;
  serie: string;
  registros: { code: string; bitting: string }[];
}

type View = "list" | "import" | "edit";
type EditTab = "references" | "bitting" | "visual" | "imagen" | "decoder" | "codes";

interface KeycodeManagerProps {
  profiles: KeycodeProfile[];
  onSave: (profile: KeycodeProfile, onProgress?: (done: number, total: number) => void) => void | Promise<void>;
  onUpdate: (profile: KeycodeProfile, onProgress?: (done: number, total: number) => void, codesChanged?: boolean) => void | Promise<void>;
  onDelete: (id: string) => void;
  onFetchCodes: (id: string) => Promise<KeycodeProfile | null>;
}

interface VisualRangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onChange: (value: number) => void;
}

function VisualRangeField({ label, value, min, max, step = 1, defaultValue, onChange }: VisualRangeFieldProps) {
  const safeValue = Number.isFinite(value) ? value : min;
  const isDefault = safeValue === defaultValue;

  return (
    <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] font-bold leading-none">{label}</Label>
        <div className="flex items-center gap-1">
          <span className="min-w-10 rounded-md bg-primary/10 px-1.5 py-0.5 text-right font-mono text-[10px] font-semibold text-primary">
            {safeValue}
          </span>
          <button
            type="button"
            title="Restaurar valor predeterminado"
            onClick={() => onChange(defaultValue)}
            disabled={isDefault}
            className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[hsl(var(--primary))]"
      />
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function getProfilePreviewData(profile: KeycodeProfile): { primary: number[]; secondary: number[] | undefined } {
  // En la vista de lista codesData llega vacío; usamos codeSample como fallback.
  const codes = profile.codesData.length > 0 ? profile.codesData : (profile.codeSample ?? []);
  if (codes.length === 0) return { primary: [3, 2, 4, 1], secondary: undefined };
  const midIdx = Math.floor(codes.length / 2);
  const sample = codes[midIdx];
  const hasMultiAxes = profile.bittingConfig.axes && profile.bittingConfig.axes.length >= 2;
  const totalLen = hasMultiAxes
    ? profile.bittingConfig.axes!.reduce((s, a) => s + a.length, 0)
    : profile.bittingConfig.length;
  const flat = sample.bitting.length < totalLen
    ? sample.bitting.flatMap(v => v.split(""))
    : [...sample.bitting];
  if (hasMultiAxes) {
    const primaryLen = profile.bittingConfig.axes![0].length;
    return {
      primary: flat.slice(0, primaryLen).map(v => parseInt(v, 10) || 1),
      secondary: flat.slice(primaryLen).map(v => parseInt(v, 10) || 1),
    };
  }
  return { primary: flat.map(v => parseInt(v, 10) || 1), secondary: undefined };
}

export function KeycodeManager({ profiles, onSave, onUpdate, onDelete, onFetchCodes }: KeycodeManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>("list");

  // --- Imagen del perfil: sube al servidor (carpeta "keycode") en vez de guardar base64 ---
  const { currentWorkshop } = useWorkshop();
  const { uploadFile, isUploading: isUploadingImage } = useFileUpload({ folder: "keycode", workshopCode: currentWorkshop?.code });
  const [galleryOpen, setGalleryOpen] = useState(false);

  // --- Ajustes visuales universales (colores/trazo, aplican a todas las series) ---
  const { settings: visualSettings, setSettings: setVisualSettings, saveSettings: saveVisualSettings } = useKeycodeVisualSettings();
  const { theme } = useTheme();
  const resolvedStrokeColor = theme === "dark" ? visualSettings.strokeColorDark : visualSettings.strokeColorLight;
  const [savingVisualSettings, setSavingVisualSettings] = useState(false);
  const handleSaveVisualSettings = async () => {
    setSavingVisualSettings(true);
    try {
      await saveVisualSettings(visualSettings);
      toast.success("Ajustes universales guardados.");
    } catch {
      toast.error("No se pudieron guardar los ajustes universales.");
    } finally {
      setSavingVisualSettings(false);
    }
  };

  // --- Edit state ---
  const [editingProfile, setEditingProfile] = useState<KeycodeProfile | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [references, setReferences] = useState<KeyReference[]>([]);
  const [bittingConfig, setBittingConfig] = useState<BittingConfig>({ length: 8, maxDepth: 9 });
  const [currentCodes, setCurrentCodes] = useState<CodeEntry[]>([]);
  // true solo cuando la pestaña "Códigos" tuvo una modificación real (agregar/eliminar/fusionar).
  // Evita re-subir los códigos al guardar si el usuario solo tocó otra pestaña (visual, decoder, etc.).
  const [codesDirty, setCodesDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [configuracionVisual, setConfiguracionVisual] = useState<ConfiguracionVisualLlave | undefined>(undefined);
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  // Cambia/elimina la imagen del perfil y borra el archivo del servidor si ya nadie más lo usa
  // (otras series pueden compartir la misma imagen al elegirla de la galería).
  const replaceProfileImage = async (newUrl: string | undefined) => {
    const oldUrl = profileImage;
    setProfileImage(newUrl);
    if (oldUrl && oldUrl !== newUrl) {
      const stillUsedElsewhere = profiles.some((p) => p.id !== editingProfile?.id && p.profileImage === oldUrl);
      if (!stillUsedElsewhere) await phpApiDeleteFile(oldUrl);
    }
  };
  const [decoderConfig, setDecoderConfig] = useState<DecoderConfig | undefined>(undefined);
  const [decoderHasErrors, setDecoderHasErrors] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>("references");
  const [icCard, setIcCard] = useState("");
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const itemsPerPage = 50;

  // --- Manual code entry / JSON merge ---
  const [manualCodigo, setManualCodigo] = useState("");
  const [manualBitting, setManualBitting] = useState("");
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // --- List view state ---
  const [profilesSearch, setProfilesSearch] = useState("");
  const [profilesViewMode, setProfilesViewMode] = useState<"list" | "grid">("list");
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [deleteCodeTarget, setDeleteCodeTarget] = useState<string | null>(null);
  const [confirmDeleteAllCodesOpen, setConfirmDeleteAllCodesOpen] = useState(false);
  const [deletingAllCodes, setDeletingAllCodes] = useState(false);
  
  // --- Preview override test ---
  const [manualPreviewInput, setManualPreviewInput] = useState("");
  // --- Interactive preview (mirrors the workshop's key search UI) ---
  const [previewGridValues, setPreviewGridValues] = useState<string[]>([]);
  const [previewSelectedCellIdx, setPreviewSelectedCellIdx] = useState(0);

  // ── JSON import ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as JsonSerieImport;
        if (!parsed.id || !parsed.serie || !Array.isArray(parsed.registros)) {
          toast.error("El JSON no tiene el formato esperado (id, serie, registros).");
          return;
        }
        const detectedLength = parsed.registros[0]?.bitting?.length || 8;
        const codesData: CodeEntry[] = parsed.registros.map((r) => ({
          codigo: r.code,
          bitting: r.bitting.split(""),
        }));
        
        const primaryRef: KeyReference = { id: Date.now(), brand: "", refCode: parsed.id, isPrimary: true };
        const newProfile: KeycodeProfile = {
          id: Date.now().toString(),
          references: [primaryRef],
          icCard: "",
          series: parsed.serie,
          bittingConfig: { length: detectedLength, maxDepth: 9 },
          codesData,
          dateAdded: new Date().toLocaleDateString(),
        };

        startEdit(newProfile, true);
        toast.info("JSON cargado. Completa los datos y guarda la serie.");
      } catch {
        toast.error("Error al leer el archivo JSON. Verifica que sea un JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Edit ─────────────────────────────────────────────────────
  const startEdit = async (profile: KeycodeProfile, isNew = false) => {
    // Si los códigos no están cargados (vista de lista), los traemos del servidor.
    let fullProfile = profile;
    if (!isNew && profile.codesData.length === 0 && (profile.codesCount ?? 0) > 0) {
      setLoadingEditId(profile.id);
      const fetched = await onFetchCodes(profile.id);
      setLoadingEditId(null);
      if (!fetched) { toast.error("No se pudieron cargar los códigos del perfil."); return; }
      fullProfile = fetched;
    }

    setIsNewProfile(isNew);
    setEditingProfile(fullProfile);
    setReferences([...fullProfile.references]);
    setBittingConfig({ ...fullProfile.bittingConfig });
    setCurrentCodes([...fullProfile.codesData]);
    setCodesDirty(false);
    setConfiguracionVisual(fullProfile.configuracionVisual ? { ...fullProfile.configuracionVisual } : undefined);
    setProfileImage(fullProfile.profileImage);
    setDecoderConfig(fullProfile.decoderConfig ? { ...fullProfile.decoderConfig } : undefined);
    setIcCard(fullProfile.icCard ?? "");
    setDecoderHasErrors(false);
    setSearchTerm("");
    setCurrentPage(1);
    setEditTab("references");
    setView("edit");
  };

  // Detecta cambios en cualquiera de las pestañas comparando con el perfil original.
  const hasChanges = useMemo(() => {
    if (!editingProfile) return false;
    if (isNewProfile) return true; // nueva serie: siempre puede guardarse
    const snap = JSON.stringify({ references, bittingConfig, codesData: currentCodes, configuracionVisual, profileImage, decoderConfig, icCard });
    const orig = JSON.stringify({
      references: editingProfile.references,
      bittingConfig: editingProfile.bittingConfig,
      codesData: editingProfile.codesData,
      configuracionVisual: editingProfile.configuracionVisual,
      profileImage: editingProfile.profileImage,
      decoderConfig: editingProfile.decoderConfig,
      icCard: editingProfile.icCard ?? "",
    });
    return snap !== orig;
  }, [editingProfile, isNewProfile, references, bittingConfig, currentCodes, configuracionVisual, profileImage, decoderConfig, icCard]);

  const canSave = hasChanges && !decoderHasErrors;

  const saveEdit = async () => {
    if (!editingProfile) return;
    
    // Validate required fields
    if (!references.some(r => r.brand.trim())) {
      toast.error("Debes ingresar al menos una marca en las referencias.");
      return;
    }
    
    const finalProfile = { ...editingProfile, references, bittingConfig, codesData: currentCodes, configuracionVisual, profileImage, decoderConfig, icCard };
    // Solo se re-suben los códigos si la pestaña "Códigos" tuvo cambios reales (o es una serie nueva).
    // Si solo se tocó otra pestaña (visual, decoder, referencias...), nos ahorramos la subida completa.
    const codesChanged = isNewProfile || codesDirty;

    const onProgress = (done: number, total: number) => setSaveProgress({ done, total });
    setSaving(true);
    setSaveProgress(codesChanged && currentCodes.length > 3000 ? { done: 0, total: currentCodes.length } : null);
    try {
      if (isNewProfile) {
        await onSave(finalProfile, onProgress);
        toast.success("Serie importada y guardada exitosamente.");
      } else {
        await onUpdate(finalProfile, onProgress, codesChanged);
        toast.success("Perfil actualizado.");
      }
    } catch {
      toast.error("Ocurrió un error al guardar la serie. Intenta de nuevo.");
      setSaving(false);
      setSaveProgress(null);
      return;
    }
    setSaving(false);
    setSaveProgress(null);
    setCodesDirty(false);
    // Mantener el editor abierto: actualizamos la línea base para que
    // hasChanges vuelva a false hasta que se hagan nuevos cambios.
    // codesIncomplete solo se limpia si esta vez sí se subieron y verificaron los códigos;
    // si no se tocaron, se conserva el estado que ya tenía en el servidor.
    setEditingProfile(codesChanged ? { ...finalProfile, codesIncomplete: false } : finalProfile);
    setIsNewProfile(false);
  };

  // ── References CRUD ──────────────────────────────────────────
  const addReferenceRow = () =>
    setReferences((prev) => [...prev, { id: Date.now(), brand: "", refCode: "", isPrimary: false }]);

  const removeReferenceRow = (id: number) => {
    if (references.length === 1) return;
    const next = references.filter((r) => r.id !== id);
    if (!next.some((r) => r.isPrimary)) next[0].isPrimary = true;
    setReferences(next);
  };

  const updateReference = (id: number, field: keyof KeyReference, value: string | boolean) =>
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const setPrimaryReference = (id: number) =>
    setReferences((prev) => prev.map((r) => ({ ...r, isPrimary: r.id === id })));

  const confirmDeleteCode = () => {
    if (!deleteCodeTarget) return;
    setCurrentCodes((prev) => prev.filter((c) => c.codigo !== deleteCodeTarget));
    setCodesDirty(true);
    setDeleteCodeTarget(null);
    toast.success(`Código "${deleteCodeTarget}" eliminado.`);
  };

  const confirmDeleteProfile = () => {
    if (!deleteProfileId) return;
    onDelete(deleteProfileId);
    setDeleteProfileId(null);
    toast.success("Serie eliminada.");
  };

  // Vacía por completo los códigos de la serie y lo persiste de inmediato (no
  // espera al botón "Guardar" general), para asegurar que no queden códigos
  // huérfanos en la base de datos si se cargó un JSON equivocado.
  const confirmDeleteAllCodes = async () => {
    if (isNewProfile || !editingProfile) {
      setCurrentCodes([]);
      setCodesDirty(true);
      setConfirmDeleteAllCodesOpen(false);
      toast.success("Códigos eliminados.");
      return;
    }
    setDeletingAllCodes(true);
    try {
      const finalProfile: KeycodeProfile = {
        ...editingProfile, references, bittingConfig, codesData: [], configuracionVisual, profileImage, decoderConfig, icCard,
      };
      await onUpdate(finalProfile, undefined, true);
      setCurrentCodes([]);
      setCodesDirty(false);
      setEditingProfile(finalProfile);
      toast.success("Todos los códigos fueron eliminados de la base de datos.");
    } catch {
      toast.error("No se pudieron eliminar los códigos. Intenta de nuevo.");
    } finally {
      setDeletingAllCodes(false);
      setConfirmDeleteAllCodesOpen(false);
    }
  };

  // Longitud total de bitting esperada según la config actual (suma de ejes si está dividido).
  const expectedBittingLength = useMemo(() => {
    return bittingConfig.axes && bittingConfig.axes.length >= 2
      ? bittingConfig.axes.reduce((s, a) => s + a.length, 0)
      : bittingConfig.length;
  }, [bittingConfig]);

  // ── Agregar código manualmente ──────────────────────────────────
  const addManualCode = () => {
    const codigo = manualCodigo.trim();
    const bitting = manualBitting.trim();

    if (!codigo) {
      toast.error("Ingresa un código.");
      return;
    }
    if (currentCodes.some((c) => c.codigo.toLowerCase() === codigo.toLowerCase())) {
      toast.error(`El código "${codigo}" ya existe en esta serie.`);
      return;
    }
    if (!/^\d+$/.test(bitting)) {
      toast.error("El bitting debe contener solo dígitos.");
      return;
    }
    if (bitting.length !== expectedBittingLength) {
      toast.error(`El bitting debe tener ${expectedBittingLength} dígitos (recibidos ${bitting.length}).`);
      return;
    }

    setCurrentCodes((prev) => [...prev, { codigo, bitting: bitting.split("") }]);
    setCodesDirty(true);
    setManualCodigo("");
    setManualBitting("");
    toast.success(`Código "${codigo}" agregado.`);
  };

  // ── Importar JSON y fusionar (omite duplicados, agrega solo los nuevos) ──
  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as JsonSerieImport;
        if (!Array.isArray(parsed.registros)) {
          toast.error("El JSON no tiene el formato esperado (registros).");
          return;
        }

        const existing = new Set(currentCodes.map((c) => c.codigo.toLowerCase()));
        const nuevos: CodeEntry[] = [];
        const vistosEnArchivo = new Set<string>();
        let duplicados = 0;

        for (const r of parsed.registros) {
          if (!r.code || !r.bitting) continue;
          const key = r.code.toLowerCase();
          if (existing.has(key) || vistosEnArchivo.has(key)) {
            duplicados++;
            continue;
          }
          vistosEnArchivo.add(key);
          nuevos.push({ codigo: r.code, bitting: r.bitting.split("") });
        }

        if (nuevos.length > 0) {
          setCurrentCodes((prev) => [...prev, ...nuevos]);
          setCodesDirty(true);
        }

        if (nuevos.length === 0 && duplicados === 0) {
          toast.info("El JSON no contiene registros válidos.");
        } else if (nuevos.length === 0) {
          toast.warning(`Todos los códigos del JSON (${duplicados}) ya existen. No se agregó nada.`);
        } else if (duplicados === 0) {
          toast.success(`${nuevos.length} código(s) nuevo(s) agregado(s).`);
        } else {
          toast.success(`${nuevos.length} código(s) nuevo(s) agregado(s). ${duplicados} duplicado(s) omitido(s).`);
        }
      } catch {
        toast.error("Error al leer el archivo JSON. Verifica que sea un JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Pagination ───────────────────────────────────────────────
  const filteredCodes = useMemo(() => {
    if (!searchTerm) return currentCodes;
    const term = searchTerm.toLowerCase();
    return currentCodes.filter(
      (c) => c.codigo.toLowerCase().includes(term) || c.bitting.join("").includes(term)
    );
  }, [currentCodes, searchTerm]);

  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const paginatedCodes = filteredCodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Preview data from real series ────────────────────────────
  const previewData = useMemo(() => {
    if (!editingProfile) return { primary: [3, 2, 4, 1], secondary: [1, 3, 2, 4], source: "Default" };
    const codes = currentCodes;
    if (codes.length === 0) return { primary: [3, 2, 4, 1], secondary: [1, 3, 2, 4], source: "Default" };
    
    // Pick a representative code (middle of the list for variety)
    const midIdx = Math.floor(codes.length / 2);
    let sample = codes[midIdx];
    let source = sample.codigo;

    if (manualPreviewInput.trim() !== "") {
      const input = manualPreviewInput.trim();
      const match = codes.find(c => c.codigo.toLowerCase() === input.toLowerCase());
      if (match) {
        sample = match;
        source = match.codigo;
      } else {
        // Try to parse as direct bitting
        const bittingInput = input.replace(/[\s\D]/g, ""); // Remove non-digits
        if (bittingInput.length > 0) {
          sample = { codigo: "Manual", bitting: bittingInput.split("") };
          source = "Bitting Manual";
        }
      }
    }

    const hasMultiAxes = bittingConfig.axes && bittingConfig.axes.length >= 2;
    
    const flat = sample.bitting.length < (hasMultiAxes
      ? bittingConfig.axes!.reduce((s, a) => s + a.length, 0)
      : bittingConfig.length)
      ? sample.bitting.flatMap(v => v.split(""))
      : [...sample.bitting];

    if (hasMultiAxes) {
      const primaryLen = bittingConfig.axes![0].length;
      return {
        primary: flat.slice(0, primaryLen).map(v => parseInt(v, 10) || 1),
        secondary: flat.slice(primaryLen).map(v => parseInt(v, 10) || 1),
        source
      };
    }
    return {
      primary: flat.map(v => parseInt(v, 10) || 1),
      secondary: undefined as number[] | undefined,
      source
    };
  }, [currentCodes, bittingConfig, editingProfile, manualPreviewInput]);

  // Sincroniza las cajas interactivas de la vista previa cuando cambia el código/bitting de prueba.
  useEffect(() => {
    const flat = [...previewData.primary, ...(previewData.secondary ?? [])].map(String);
    setPreviewGridValues(flat);
    setPreviewSelectedCellIdx(0);
  }, [previewData]);

  const previewHasMultiAxes = !!(bittingConfig.axes && bittingConfig.axes.length >= 2);
  const previewTotalLength = previewHasMultiAxes
    ? bittingConfig.axes!.reduce((s, a) => s + a.length, 0)
    : bittingConfig.length;

  const previewPrimaryValues = previewHasMultiAxes
    ? previewGridValues.slice(0, bittingConfig.axes![0].length)
    : previewGridValues;
  const previewSecondaryValues = previewHasMultiAxes
    ? previewGridValues.slice(bittingConfig.axes![0].length)
    : undefined;
  const previewPrimaryNums = previewPrimaryValues.map((v) => parseInt(v, 10) || 1);
  const previewSecondaryNums = previewSecondaryValues?.map((v) => parseInt(v, 10) || 1);

  const handlePreviewPrimaryChange = (index: number, value: string) => {
    const val = value.slice(-1);
    setPreviewGridValues((prev) => { const n = [...prev]; n[index] = val; return n; });
  };
  const handlePreviewSecondaryChange = (index: number, value: string) => {
    if (!previewHasMultiAxes) return;
    const flatIdx = bittingConfig.axes![0].length + index;
    const val = value.slice(-1);
    setPreviewGridValues((prev) => { const n = [...prev]; n[flatIdx] = val; return n; });
  };
  const filteredProfiles = useMemo(() => {
    if (!profilesSearch.trim()) return profiles;
    const q = profilesSearch.toLowerCase();
    return profiles.filter((p) =>
      p.series.toLowerCase().includes(q) ||
      p.icCard.toLowerCase().includes(q) ||
      p.references.some((r) => r.brand.toLowerCase().includes(q) || r.refCode.toLowerCase().includes(q))
    );
  }, [profiles, profilesSearch]);

  // ════════════════════════════════════════════════════════════
  // VISTA: Lista de series
  // ════════════════════════════════════════════════════════════
  if (view === "list") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="mr-auto">
            <h2 className="text-lg font-bold text-foreground">Series en Sistema</h2>
            <p className="text-sm text-muted-foreground">{profiles.length} serie(s) cargada(s)</p>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar serie, IC, marca..."
              value={profilesSearch}
              onChange={(e) => setProfilesSearch(e.target.value)}
              className="pl-9 w-52"
            />
          </div>

          {/* Toggle vista */}
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button
              variant={profilesViewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setProfilesViewMode("list")}
              title="Vista lista"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={profilesViewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setProfilesViewMode("grid")}
              title="Vista miniatura"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Cargar JSON
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Estado vacío: sin perfiles */}
        {profiles.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileJson className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground">No hay series cargadas</p>
              <p className="text-sm mt-1">Usa el botón "Cargar JSON" para importar una serie.</p>
            </CardContent>
          </Card>

        /* Estado vacío: búsqueda sin resultados */
        ) : filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground">Sin resultados</p>
              <p className="text-sm mt-1">No hay series que coincidan con "{profilesSearch}".</p>
            </CardContent>
          </Card>

        /* Vista lista */
        ) : profilesViewMode === "list" ? (
          <div className="space-y-2">
            {filteredProfiles.map((profile) => {
              const primaryRef = profile.references.find((r) => r.isPrimary) || profile.references[0];
              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">{primaryRef.brand} {primaryRef.refCode}</span>
                      <Badge variant="secondary">Serie: {profile.series}</Badge>
                      <Badge variant="outline">IC: {profile.icCard}</Badge>
                      {profile.codesIncomplete && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" /> Carga incompleta
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profile.codesCount ?? profile.codesData.length} códigos · {profile.dateAdded}
                      {profile.references.length > 1 && ` · ${profile.references.length - 1} ref. alternativa(s)`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(profile)} disabled={loadingEditId !== null}>
                      {loadingEditId === profile.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteProfileId(profile.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

        /* Vista miniatura (grid) */
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProfiles.map((profile) => {
              const primaryRef = profile.references.find((r) => r.isPrimary) || profile.references[0];
              const prev = getProfilePreviewData(profile);
              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col rounded-lg border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden"
                >
                  {/* SVG Preview */}
                  <div className="bg-muted/30 border-b border-border flex items-center justify-center h-28 overflow-hidden">
                    {profile.configuracionVisual ? (
                      <div
                        className="pointer-events-none select-none flex items-center justify-center"
                        style={{ transform: "scale(0.45)", transformOrigin: "center center" }}
                      >
                        <GeneradorLlaveSVG
                          config={{ ...profile.configuracionVisual, maxDepth: profile.bittingConfig.maxDepth }}
                          cortesPrimarios={prev.primary}
                          cortesSecundarios={prev.secondary}
                          strokeColor={resolvedStrokeColor}
                          strokeWidth={visualSettings.strokeWidth}
                          boxSize={profile.configuracionVisual.tamCaja}
                          numberSize={profile.configuracionVisual.tamNumero}
                          numberWeight={profile.configuracionVisual.numeroGrosor}
                        />
                      </div>
                    ) : (
                      <Key className="w-10 h-10 text-muted-foreground/20" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="font-bold text-sm text-foreground truncate leading-tight">
                      {primaryRef.brand} {primaryRef.refCode}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Serie: {profile.series}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">IC: {profile.icCard}</Badge>
                      {profile.codesIncomplete && (
                        <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                          <AlertTriangle className="w-3 h-3" /> Incompleta
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{profile.codesCount ?? profile.codesData.length} códigos · {profile.dateAdded}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-border">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                      onClick={() => startEdit(profile)}
                      disabled={loadingEditId !== null}
                    >
                      {loadingEditId === profile.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit className="w-3.5 h-3.5" />}
                      Editar
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      onClick={() => setDeleteProfileId(profile.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteProfileId} onOpenChange={(open) => !open && setDeleteProfileId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta serie?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará permanentemente la serie y todos sus códigos. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VISTA: Editar perfil — Full-height, no-scroll layout
  // ════════════════════════════════════════════════════════════
  if (view === "edit" && editingProfile) {
    const tabs: { id: EditTab; label: string; icon: React.ReactNode }[] = [
      { id: "references", label: "Refs.", icon: <Key className="w-3.5 h-3.5" /> },
      { id: "bitting", label: "Bitting", icon: <Settings2 className="w-3.5 h-3.5" /> },
      { id: "visual", label: "Visual", icon: <Eye className="w-3.5 h-3.5" /> },
      { id: "imagen", label: "Imagen", icon: <ImageIcon className="w-3.5 h-3.5" /> },
      { id: "decoder", label: "Decoder", icon: <Camera className="w-3.5 h-3.5" /> },
      { id: "codes", label: "Códigos", icon: <Database className="w-3.5 h-3.5" /> },
    ];

    return (
      <div className="h-full flex flex-col">
        {/* Header compacto */}
        <div className="flex items-center justify-between gap-3 pb-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setView("list")} className="text-primary hover:text-primary/80 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">Serie: {editingProfile.series}</h2>
              <p className="text-xs text-muted-foreground">IC: {icCard || "—"} · {currentCodes.length} códigos</p>
            </div>
          </div>
          <Button onClick={saveEdit} size="sm" className="shrink-0" disabled={!canSave || saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                {saveProgress
                  ? `Subiendo ${Math.round((saveProgress.done / Math.max(saveProgress.total, 1)) * 100)}%`
                  : "Guardando…"}
              </>
            ) : (
              <><Check className="w-4 h-4 mr-1" /> Guardar</>
            )}
          </Button>

        </div>

        {editingProfile.codesIncomplete && !isNewProfile && (
          <div className="mb-3 shrink-0 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Esta serie quedó con una carga de códigos incompleta (se interrumpió antes de terminar). Guarda de nuevo para volver a subir todos los códigos.
          </div>
        )}

        {/* Main content: 2 columns on desktop */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr,minmax(280px,360px)] gap-4">
          
          {/* LEFT: Tabbed config panel */}
          <div className="flex flex-col min-h-0">
            {/* Tab bar */}
            <div className="flex gap-1 pb-3 shrink-0 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEditTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    editTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {/* ── TAB: Referencias ── */}
              {editTab === "references" && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-muted-foreground">IC (Identificador de Corte)</Label>
                    <Input
                      placeholder="Ej. IC-001, A1234..."
                      value={icCard}
                      onChange={(e) => setIcCard(e.target.value)}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                    <div className="col-span-4">Marca</div>
                    <div className="col-span-4">Referencia</div>
                    <div className="col-span-3 text-center">Principal</div>
                    <div className="col-span-1" />
                  </div>
                  {references.map((ref) => (
                    <div key={ref.id} className="grid grid-cols-12 gap-2 items-center bg-muted/50 p-2 rounded-lg border border-border">
                      <div className="col-span-4">
                        <Input placeholder="Marca" value={ref.brand} onChange={(e) => updateReference(ref.id, "brand", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-4">
                        <Input placeholder="Ref." value={ref.refCode} onChange={(e) => updateReference(ref.id, "refCode", e.target.value)} className="h-8 text-sm font-mono" />
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <input type="radio" name="primaryRef-edit" checked={ref.isPrimary} onChange={() => setPrimaryReference(ref.id)} className="w-4 h-4 cursor-pointer accent-[hsl(var(--primary))]" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removeReferenceRow(ref.id)} disabled={references.length === 1} className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addReferenceRow} className="text-primary text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Alternativa
                  </Button>
                </div>
              )}

              {/* ── TAB: Bitting Config ── */}
              {editTab === "bitting" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Ejes (longitud)</Label>
                      <Input type="number" min="1" max="20" value={bittingConfig.length}
                        onChange={(e) => setBittingConfig((c) => ({ ...c, length: parseInt(e.target.value) || 8 }))} className="font-mono h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Prof. máxima</Label>
                      <Input type="number" min="1" max="9" value={bittingConfig.maxDepth}
                        onChange={(e) => setBittingConfig((c) => ({ ...c, maxDepth: parseInt(e.target.value) || 9 }))} className="font-mono h-8" />
                    </div>
                  </div>

                  {/* Mapeo de profundidades */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Mapeo de profundidades <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: bittingConfig.maxDepth }, (_, i) => {
                        const k = (i + 1).toString();
                        return (
                          <div key={k} className="space-y-0.5">
                            <label className="text-[10px] font-semibold text-muted-foreground">{k} =</label>
                            <Input placeholder="-" value={bittingConfig.depthMapping?.[k] ?? ""}
                              onChange={(e) => {
                                const m = { ...bittingConfig.depthMapping };
                                if (e.target.value.trim()) m[k] = e.target.value; else delete m[k];
                                setBittingConfig((c) => ({ ...c, depthMapping: Object.keys(m).length ? m : undefined }));
                              }} className="font-mono text-center h-7 text-sm" maxLength={1} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* División de ejes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-bold">División de ejes</Label>
                      <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs"
                        onClick={() => {
                          if (bittingConfig.axes && bittingConfig.axes.length >= 2) {
                            setBittingConfig(c => ({ ...c, axes: undefined }));
                          } else {
                            const half = Math.floor(bittingConfig.length / 2);
                            setBittingConfig(c => ({ ...c, axes: [
                              { label: "A", length: half },
                              { label: "B", length: bittingConfig.length - half },
                            ]}));
                          }
                        }}
                      >
                        {bittingConfig.axes && bittingConfig.axes.length >= 2 ? "Quitar" : "Dividir"}
                      </Button>
                    </div>
                    {bittingConfig.axes && bittingConfig.axes.length >= 2 && (
                      <div className="space-y-1.5 p-2 bg-muted/50 rounded-lg border border-border">
                        {bittingConfig.axes.map((axis, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary w-10 shrink-0">Eje {axis.label}:</span>
                            <Input type="number" min="1" max="20" value={axis.length}
                              onChange={(e) => {
                                const newAxes = bittingConfig.axes!.map((a, idx) => idx === i ? { ...a, length: parseInt(e.target.value) || 1 } : a);
                                setBittingConfig(c => ({ ...c, axes: newAxes }));
                              }} className="font-mono w-16 h-7 text-sm" />
                            <span className="text-xs text-muted-foreground flex-1">pos.</span>
                          </div>
                        ))}
                        <div className="pt-1">
                          <span className="text-[10px] text-muted-foreground">
                            Total: <span className="font-bold text-foreground">{bittingConfig.axes.reduce((s, a) => s + a.length, 0)}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB: Visual Config ── */}
              {editTab === "visual" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Habilitar visualización</Label>
                    <Button
                      variant={configuracionVisual ? "default" : "outline"}
                      size="sm" className="h-7 text-xs"
                      onClick={() => {
                        if (configuracionVisual) {
                          setConfiguracionVisual(undefined);
                        } else {
                          setConfiguracionVisual({
                            tipo: 'doble_lado', shoulderDrop: 12, grosorLlave: 60,
                            maxDepth: bittingConfig.maxDepth, distanciaHombro: 30,
                            spacing: 18, distanciaPunta: 15, depthStep: 5,
                            valleyWidth: 11, crestWidth: 11,
                          });
                        }
                      }}
                    >
                      {configuracionVisual ? "Activado" : "Activar"}
                    </Button>
                  </div>

                  {/* Ajustes universales: colores y trazo — aplican a TODAS las series */}
                  <div className="space-y-2.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5">
                    <div>
                      <p className="text-xs font-bold text-foreground">Colores y trazo</p>
                      <p className="text-[10px] text-muted-foreground">Ajuste universal: aplica a todas las series, no solo a esta.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 bg-background border border-border rounded-lg p-1.5 cursor-pointer">
                        <input
                          type="color"
                          value={visualSettings.strokeColorLight}
                          onChange={(e) => setVisualSettings((s) => ({ ...s, strokeColorLight: e.target.value }))}
                          className="w-7 h-6 border-0 p-0 cursor-pointer bg-transparent rounded shrink-0"
                        />
                        <span className="text-[10px] font-medium text-foreground">Trazo (tema claro)</span>
                      </label>
                      <label className="flex items-center gap-2 bg-background border border-border rounded-lg p-1.5 cursor-pointer">
                        <input
                          type="color"
                          value={visualSettings.strokeColorDark}
                          onChange={(e) => setVisualSettings((s) => ({ ...s, strokeColorDark: e.target.value }))}
                          className="w-7 h-6 border-0 p-0 cursor-pointer bg-transparent rounded shrink-0"
                        />
                        <span className="text-[10px] font-medium text-foreground">Trazo (tema oscuro)</span>
                      </label>
                    </div>
                    <VisualRangeField
                      label="Grosor del trazo"
                      min={1}
                      max={10}
                      step={0.5}
                      defaultValue={3.5}
                      value={visualSettings.strokeWidth}
                      onChange={(value) => setVisualSettings((s) => ({ ...s, strokeWidth: value }))}
                    />
                    <Button size="sm" className="h-7 text-xs w-full" onClick={handleSaveVisualSettings} disabled={savingVisualSettings}>
                      {savingVisualSettings ? "Guardando..." : "Guardar ajustes universales"}
                    </Button>
                  </div>

                  {configuracionVisual && (
                    <div className="space-y-3">
                      {/* Tipo de llave */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Tipo de llave</Label>
                        <div className="flex flex-wrap gap-1">
                          {([
                            ['doble_lado', 'Doble Lado'],
                            ['estandar_1_lado', '1 Lado'],
                            ['2_ejes_exterior', '2 Ejes Ext.'],
                            ['2_ejes_internos', '2 Ejes Int.'],
                            ['pista_canal', 'Pista Canal'],
                            ['pista_semi_canal', 'Semi Canal'],
                            ['1_eje_lateral', '1 Eje Lat.'],
                          ] as [TipoLlaveSVG, string][]).map(([key, name]) => (
                            <Button key={key}
                              variant={configuracionVisual.tipo === key ? "default" : "outline"}
                              size="sm" className="flex-1 whitespace-nowrap text-[10px] h-7 px-2"
                              onClick={() => setConfiguracionVisual(c => c ? { ...c, tipo: key } : c)}
                            >
                              {name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Tamaño de caja y número — ajuste por serie */}
                      <div className="grid grid-cols-2 gap-2">
                        <VisualRangeField
                          label="Tamaño de caja"
                          min={12}
                          max={32}
                          defaultValue={18}
                          value={configuracionVisual.tamCaja ?? 18}
                          onChange={(value) => setConfiguracionVisual(c => c ? { ...c, tamCaja: value } : c)}
                        />
                        <VisualRangeField
                          label="Tamaño de número"
                          min={8}
                          max={24}
                          defaultValue={14}
                          value={configuracionVisual.tamNumero ?? 14}
                          onChange={(value) => setConfiguracionVisual(c => c ? { ...c, tamNumero: value } : c)}
                        />
                      </div>

                      <VisualRangeField
                        label="Grosor del número"
                        min={100}
                        max={900}
                        step={100}
                        defaultValue={700}
                        value={configuracionVisual.numeroGrosor ?? 700}
                        onChange={(value) => setConfiguracionVisual(c => c ? { ...c, numeroGrosor: value } : c)}
                      />

                      <Separator />

                      {/* Estructura base — compact grid */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {([
                          { label: "Grosor", key: "grosorLlave", min: 30, max: 130, def: 60 },
                          { label: "Hombro", key: "distanciaHombro", min: 0, max: 60, def: 30 },
                          { label: "Spacing", key: "spacing", min: 14, max: 50, def: 18 },
                          { label: "Punta", key: "distanciaPunta", min: 0, max: 80, def: 15 },
                          { label: "Alt. Hombro", key: "shoulderDrop", min: 0, max: 30, def: 12 },
                        ] as const).map(f => (
                          <VisualRangeField
                            key={f.key}
                            label={f.label}
                            min={f.min}
                            max={f.max}
                            defaultValue={f.def}
                            value={configuracionVisual[f.key] ?? f.def}
                            onChange={(value) => setConfiguracionVisual(c => c ? { ...c, [f.key]: value } : c)}
                          />
                        ))}
                      </div>

                      {/* Serrucho fields */}
                      {(configuracionVisual.tipo === 'doble_lado' || configuracionVisual.tipo === 'estandar_1_lado' || configuracionVisual.tipo === '2_ejes_exterior') && (
                        <>
                          <Separator />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Perfil de Corte</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {([
                              { label: "Escalón", key: "depthStep", min: 1, max: 15, def: 5 },
                              { label: "A. Fondo", key: "valleyWidth", min: 2, max: 30, def: 11 },
                              { label: "A. Cresta", key: "crestWidth", min: 2, max: 30, def: 11 },
                            ] as const).map(f => (
                              <VisualRangeField
                                key={f.key}
                                label={f.label}
                                min={f.min}
                                max={f.max}
                                defaultValue={f.def}
                                value={configuracionVisual[f.key] ?? f.def}
                                onChange={(value) => setConfiguracionVisual(c => c ? { ...c, [f.key]: value } : c)}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Corte extra en punta (solo doble_lado y estandar_1_lado) */}
                      {(configuracionVisual.tipo === 'doble_lado' || configuracionVisual.tipo === 'estandar_1_lado') && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Corte Extra en Punta</p>
                            <Button
                              type="button"
                              size="sm"
                              variant={configuracionVisual.corteExtra ? "default" : "outline"}
                              className="h-6 text-[10px] px-2"
                              onClick={() => setConfiguracionVisual(c => c ? { ...c, corteExtra: !c.corteExtra } : c)}
                            >
                              {configuracionVisual.corteExtra ? "Activado" : "Desactivado"}
                            </Button>
                          </div>
                          {configuracionVisual.corteExtra && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <VisualRangeField
                                label="Dist. Corte Extra"
                                min={4}
                                max={40}
                                defaultValue={Math.round((configuracionVisual.spacing ?? 18) * 0.7)}
                                value={configuracionVisual.distanciaCorteExtra ?? Math.round((configuracionVisual.spacing ?? 18) * 0.7)}
                                onChange={(value) => setConfiguracionVisual(c => c ? { ...c, distanciaCorteExtra: value } : c)}
                              />
                              <VisualRangeField
                                label="Profundidad Extra"
                                min={1}
                                max={configuracionVisual.maxDepth ?? bittingConfig.maxDepth}
                                defaultValue={1}
                                value={configuracionVisual.profundidadCorteExtra ?? 1}
                                onChange={(value) => setConfiguracionVisual(c => c ? { ...c, profundidadCorteExtra: value } : c)}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Bisel punta */}
                      {configuracionVisual.tipo !== 'doble_lado' && configuracionVisual.tipo !== 'estandar_1_lado' && (
                        <VisualRangeField
                          label="Bisel Punta"
                          min={0}
                          max={30}
                          defaultValue={8}
                          value={configuracionVisual.biselPunta ?? 8}
                          onChange={(value) => setConfiguracionVisual(c => c ? { ...c, biselPunta: value } : c)}
                        />
                      )}

                      {/* Pista fields */}
                      {(['pista_canal', 'pista_semi_canal', '1_eje_lateral', '2_ejes_internos'] as TipoLlaveSVG[]).includes(configuracionVisual.tipo) && (
                        <>
                          <Separator />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Forma de Pista</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <VisualRangeField
                              label="Posición Y (%)"
                              min={0}
                              max={100}
                              defaultValue={40}
                              value={configuracionVisual.anclaYPorcentaje ?? 40}
                              onChange={(value) => setConfiguracionVisual(c => c ? { ...c, anclaYPorcentaje: value } : c)}
                            />
                            {configuracionVisual.tipo !== '1_eje_lateral' && (
                              <VisualRangeField
                                label="Sep. Base"
                                min={5}
                                max={60}
                                defaultValue={28}
                                value={configuracionVisual.separacionBase ?? 28}
                                onChange={(value) => setConfiguracionVisual(c => c ? { ...c, separacionBase: value } : c)}
                              />
                            )}
                            {(configuracionVisual.tipo === 'pista_canal' || configuracionVisual.tipo === 'pista_semi_canal' || configuracionVisual.tipo === '1_eje_lateral') && (
                              <div className="space-y-0.5">
                                <Label className="text-[10px]">Orientación</Label>
                                <Button variant="outline" size="sm" className="w-full h-7 text-[10px]"
                                  onClick={() => setConfiguracionVisual(c => c ? { ...c, orientacion: c.orientacion === 'superior' ? 'inferior' : 'superior' } : c)}
                                >
                                  {configuracionVisual.orientacion === 'superior' ? '↓ Abajo' : '↑ Arriba'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Pista canal sup/inf */}
                      {configuracionVisual.tipo === 'pista_canal' && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                            {([
                              { title: "Borde Sup.", prefix: "Sup", profKey: "profSup", anchoKey: "anchoSup", dinKey: "dinamismoSup" },
                              { title: "Borde Inf.", prefix: "Inf", profKey: "profInf", anchoKey: "anchoInf", dinKey: "dinamismoInf" },
                            ] as const).map(side => (
                              <div key={side.prefix} className="space-y-1.5 p-2 bg-muted/50 rounded-lg border border-border">
                                <p className="text-[10px] font-bold text-center uppercase text-muted-foreground">{side.title}</p>
                                {[
                                  { label: "Prof.", key: side.profKey, def: 4, step: 0.5, min: 1, max: 10 },
                                  { label: "Ancho", key: side.anchoKey, def: 11, min: 0, max: 35 },
                                  { label: "Dinam.", key: side.dinKey, def: 3, step: 0.5, min: 0, max: 10 },
                                ].map(f => (
                                  <VisualRangeField
                                    key={f.key}
                                    label={f.label}
                                    min={f.min}
                                    max={f.max}
                                    step={f.step}
                                    defaultValue={f.def}
                                    value={configuracionVisual[f.key] ?? f.def}
                                    onChange={(value) => setConfiguracionVisual(c => c ? { ...c, [f.key]: value } : c)}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 2 ejes internos sup/inf */}
                      {configuracionVisual.tipo === '2_ejes_internos' && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                            {([
                              { title: "Eje Sup.", fields: [{ l: "Prof.", k: "profSup", d: 4 }, { l: "Ancho", k: "anchoSup", d: 11 }] },
                              { title: "Eje Inf.", fields: [{ l: "Prof.", k: "profInf", d: 4 }, { l: "Ancho", k: "anchoInf", d: 11 }] },
                            ] as const).map(side => (
                              <div key={side.title} className="space-y-1.5 p-2 bg-muted/50 rounded-lg border border-border">
                                <p className="text-[10px] font-bold text-center uppercase text-muted-foreground">{side.title}</p>
                                {side.fields.map(f => (
                                  <VisualRangeField
                                    key={f.k}
                                    label={f.l}
                                    min={1}
                                    max={35}
                                    step={0.5}
                                    defaultValue={f.d}
                                    value={configuracionVisual[f.k] ?? f.d}
                                    onChange={(value) => setConfiguracionVisual(c => c ? { ...c, [f.k]: value } : c)}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Semi-canal / 1 eje lateral */}
                      {(configuracionVisual.tipo === 'pista_semi_canal' || configuracionVisual.tipo === '1_eje_lateral') && (
                        <>
                          <Separator />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Lado Activo</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {([
                              { label: "Prof.", key: "profundidadActiva", def: 4, step: 0.5 },
                              { label: "Ancho", key: "anchoPlanoActivo", def: 11 },
                              { label: "Dinam.", key: "dinamismoActivo", def: 3, step: 0.5 },
                            ] as const).map(f => (
                              <VisualRangeField
                                key={f.key}
                                label={f.label}
                                min={0}
                                max={35}
                                step={f.step}
                                defaultValue={f.def}
                                value={configuracionVisual[f.key] ?? f.def}
                                onChange={(value) => setConfiguracionVisual(c => c ? { ...c, [f.key]: value } : c)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: Imagen ── */}
              {editTab === "imagen" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sube una imagen de referencia (recomendado: <span className="font-semibold text-foreground">500 × 95 px</span>). Aparece en la vista del taller para identificar visualmente el perfil cuando un vehículo tiene más de uno asignado.
                  </p>

                  {profileImage ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border overflow-hidden bg-muted/30 flex items-center justify-center p-2">
                        <img
                          src={resolveStorageUrl(profileImage) ?? undefined}
                          alt="Imagen del perfil"
                          className="max-w-full rounded object-contain"
                          style={{ maxHeight: "95px" }}
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>
                          {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 mr-1.5" />}
                          Cambiar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setGalleryOpen(true)} disabled={isUploadingImage}>
                          <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Elegir de galería
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => void replaceProfileImage(undefined)}
                          disabled={isUploadingImage}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="w-full border-2 border-dashed border-border rounded-xl py-12 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors disabled:opacity-60"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="w-10 h-10 opacity-30 animate-spin" />
                        ) : (
                          <ImageIcon className="w-10 h-10 opacity-30" />
                        )}
                        <span className="text-sm font-medium">{isUploadingImage ? "Subiendo…" : "Haz clic para subir imagen"}</span>
                        <span className="text-xs opacity-70">PNG, JPG, WEBP · Recomendado 500 × 95 px</span>
                      </button>
                      <Button variant="outline" size="sm" onClick={() => setGalleryOpen(true)} disabled={isUploadingImage}>
                        <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Elegir de galería
                      </Button>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const result = await uploadFile(file);
                      if (result.success && result.url) {
                        await replaceProfileImage(result.url);
                      }
                    }}
                  />

                  <ImageGalleryDialog
                    open={galleryOpen}
                    onOpenChange={setGalleryOpen}
                    folder="keycode"
                    workshopCode={currentWorkshop?.code}
                    onSelect={(url) => void replaceProfileImage(url)}
                    layout="list"
                  />
                </div>
              )}

              {/* ── TAB: Decoder por foto ── */}
              {editTab === "decoder" && (
                <DecoderEditor
                  decoderConfig={decoderConfig}
                  setDecoderConfig={setDecoderConfig}
                  configuracionVisual={configuracionVisual}
                  bittingConfig={bittingConfig}
                  onValidityChange={setDecoderHasErrors}
                />
              )}

              {/* ── TAB: Códigos ── */}
              {editTab === "codes" && (
                <div className="space-y-3">
                  {/* Agregar código manualmente */}
                  <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
                    <Label className="text-xs font-semibold text-muted-foreground">Agregar código manualmente</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Código"
                        value={manualCodigo}
                        onChange={(e) => setManualCodigo(e.target.value)}
                        className="h-8 text-sm font-mono flex-1"
                      />
                      <Input
                        placeholder={`Bitting (${expectedBittingLength} dígitos)`}
                        value={manualBitting}
                        onChange={(e) => setManualBitting(e.target.value)}
                        className="h-8 text-sm font-mono flex-1"
                        maxLength={expectedBittingLength}
                      />
                      <Button size="sm" className="h-8 shrink-0" onClick={addManualCode}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                      </Button>
                    </div>
                  </div>

                  {/* Importar JSON y fusionar con los códigos actuales */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
                    <div className="min-w-0">
                      <Label className="text-xs font-semibold text-muted-foreground block">Importar JSON (fusiona)</Label>
                      <p className="text-[10px] text-muted-foreground">Omite códigos repetidos, agrega solo los nuevos.</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => mergeFileInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Cargar JSON
                    </Button>
                    <input ref={mergeFileInputRef} type="file" accept=".json" className="hidden" onChange={handleMergeFileChange} />
                  </div>

                  {/* Eliminar todos los códigos de la serie */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="min-w-0">
                      <Label className="text-xs font-semibold text-destructive block">Eliminar todos los códigos</Label>
                      <p className="text-[10px] text-muted-foreground">Borra permanentemente todos los códigos de esta serie de la base de datos. Útil si cargaste el JSON equivocado.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setConfirmDeleteAllCodesOpen(true)}
                      disabled={currentCodes.length === 0}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar todos
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2" />
                    <Input placeholder="Buscar código..." value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pl-8 h-8 text-sm" />
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs py-1.5">Código</TableHead>
                          <TableHead className="text-xs py-1.5">Bitting</TableHead>
                          <TableHead className="w-10 py-1.5" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCodes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">
                              Sin resultados.
                            </TableCell>
                          </TableRow>
                        ) : paginatedCodes.map((c) => (
                          <TableRow key={c.codigo}>
                            <TableCell className="font-mono font-bold text-xs py-1.5">{c.codigo}</TableCell>
                            <TableCell className="font-mono text-muted-foreground tracking-widest text-xs py-1.5">{c.bitting.join(" ")}</TableCell>
                            <TableCell className="text-right py-1.5">
                              <Button variant="ghost" size="icon" onClick={() => setDeleteCodeTarget(c.codigo)} className="h-6 w-6 text-destructive hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Pág. {currentPage}/{totalPages}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Always-visible SVG preview */}
          <div className="hidden lg:flex flex-col min-h-0 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 pb-2 shrink-0 border-b border-border mb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Vista Previa</span>
                {currentCodes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {previewData.source}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Código o bitting para test..."
                  className="h-7 text-xs bg-background"
                  value={manualPreviewInput}
                  onChange={(e) => setManualPreviewInput(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={() => setManualPreviewInput("")}
                  disabled={!manualPreviewInput}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-auto pb-1">
              {configuracionVisual ? (
                <div className="flex-1 min-h-0 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground -ml-1"
                    onClick={() => setPreviewSelectedCellIdx((p) => (p > 0 ? p - 1 : previewTotalLength - 1))}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 min-w-0 flex justify-center overflow-x-auto bg-background border border-dashed border-border rounded-lg p-1">
                    <GeneradorLlaveSVG
                      config={{ ...configuracionVisual, maxDepth: bittingConfig.maxDepth }}
                      cortesPrimarios={previewPrimaryNums}
                      cortesSecundarios={previewSecondaryNums}
                      valoresPrimarios={previewPrimaryValues}
                      valoresSecundarios={previewSecondaryValues}
                      onPrimaryChange={handlePreviewPrimaryChange}
                      onSecondaryChange={handlePreviewSecondaryChange}
                      selectedGlobalIdx={previewSelectedCellIdx}
                      onSelectCell={setPreviewSelectedCellIdx}
                      strokeColor={resolvedStrokeColor}
                      strokeWidth={visualSettings.strokeWidth}
                      boxSize={configuracionVisual.tamCaja}
                      numberSize={configuracionVisual.tamNumero}
                      numberWeight={configuracionVisual.numeroGrosor}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground -mr-1"
                    onClick={() => setPreviewSelectedCellIdx((p) => (p < previewTotalLength - 1 ? p + 1 : 0))}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-6">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-semibold">Visualización desactivada</p>
                  <p className="text-[10px] mt-1">Actívala en la pestaña "Visual"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialog open={!!deleteCodeTarget} onOpenChange={(open) => !open && setDeleteCodeTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este código?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el código "{deleteCodeTarget}" de esta serie. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmDeleteAllCodesOpen} onOpenChange={(open) => !open && !deletingAllCodes && setConfirmDeleteAllCodesOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar TODOS los códigos de esta serie?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán permanentemente los {currentCodes.length} código(s) de esta serie de la base de datos. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAllCodes}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); confirmDeleteAllCodes(); }}
                disabled={deletingAllCodes}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingAllCodes ? "Eliminando..." : "Eliminar todos"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTE: Editor de configuración del Decodificador por foto
// ════════════════════════════════════════════════════════════
interface DecoderEditorProps {
  decoderConfig: DecoderConfig | undefined;
  setDecoderConfig: (cfg: DecoderConfig | undefined) => void;
  configuracionVisual: ConfiguracionVisualLlave | undefined;
  bittingConfig: BittingConfig;
  onValidityChange?: (hasErrors: boolean) => void;
}

function DecoderEditor({ decoderConfig, setDecoderConfig, configuracionVisual, bittingConfig, onValidityChange }: DecoderEditorProps) {
  const inferredTipo = mapVisualTipoToDecoder(configuracionVisual?.tipo);
  const isDosEjes = decoderConfig?.tipoLlave === 'dos_ejes_exterior' || decoderConfig?.tipoLlave === 'dos_ejes_interior';
  const isUnLado = decoderConfig?.tipoLlave === 'estandar_un' || decoderConfig?.tipoLlave === 'pista_canal' || decoderConfig?.tipoLlave === '1_eje_lateral';

  // Longitudes esperadas según el bitting del perfil
  const expectedProfsLen = bittingConfig.maxDepth;
  const totalBittingLen = bittingConfig.axes && bittingConfig.axes.length >= 2
    ? bittingConfig.axes.reduce((s, a) => s + a.length, 0)
    : bittingConfig.length;
  const expectedDistsLen = isDosEjes
    ? (bittingConfig.axes?.[0]?.length ?? Math.ceil(totalBittingLen / 2))
    : totalBittingLen;
  const expectedDistsDerLen = isDosEjes
    ? (bittingConfig.axes?.[1]?.length ?? Math.floor(totalBittingLen / 2))
    : 0;

  // Texto editable de listas
  const [profsTxt, setProfsTxt] = useState(decoderConfig?.profundidades.join(', ') ?? '');
  const [distsTxt, setDistsTxt] = useState(decoderConfig?.distanciasCortes.join(', ') ?? '');
  const [distsDerTxt, setDistsDerTxt] = useState(decoderConfig?.distanciasCortesDer.join(', ') ?? '');

  // Sincronizar textos sólo cuando el decoderConfig se reemplaza por completo
  // (p.ej. autoConfigurar, eliminar). NO al cambiar tipoLlave/alineacion: en ese
  // caso conservamos los datos ingresados por el usuario para revalidarlos.
  useEffect(() => {
    if (decoderConfig) {
      setProfsTxt(decoderConfig.profundidades.join(', '));
      setDistsTxt(decoderConfig.distanciasCortes.join(', '));
      setDistsDerTxt(decoderConfig.distanciasCortesDer.join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoderConfig === undefined]);

  const autoConfigurar = () => {
    const cfg = buildDefaultDecoderConfig({ configuracionVisual, bittingConfig });
    if (!cfg) {
      toast.error("Configura primero el tipo de llave en la pestaña 'Visual'.");
      return;
    }
    setDecoderConfig(cfg);
    setProfsTxt(cfg.profundidades.join(', '));
    setDistsTxt(cfg.distanciasCortes.join(', '));
    setDistsDerTxt(cfg.distanciasCortesDer.join(', '));
    toast.success("Configuración del decoder generada desde el preset visual.");
  };

  /** Parsea una cadena de números separados por coma. Devuelve [] si hay tokens inválidos. */
  const parseList = (txt: string): { values: number[]; invalid: boolean } => {
    const tokens = txt.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const values: number[] = [];
    for (const t of tokens) {
      const n = parseFloat(t);
      if (isNaN(n)) return { values: [], invalid: true };
      values.push(n);
    }
    return { values, invalid: false };
  };

  /** Verifica si la lista es estrictamente monótona (creciente o decreciente). */
  const isMonotonic = (arr: number[]): boolean => {
    if (arr.length < 2) return true;
    let inc = true, dec = true;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] <= arr[i - 1]) inc = false;
      if (arr[i] >= arr[i - 1]) dec = false;
    }
    return inc || dec;
  };

  /** Estrictamente creciente */
  const isStrictlyIncreasing = (arr: number[]): boolean => {
    for (let i = 1; i < arr.length; i++) if (arr[i] <= arr[i - 1]) return false;
    return true;
  };
  /** Estrictamente decreciente */
  const isStrictlyDecreasing = (arr: number[]): boolean => {
    for (let i = 1; i < arr.length; i++) if (arr[i] >= arr[i - 1]) return false;
    return true;
  };

  // Validación de dirección de distancias según alineación:
  //  - 'punta'  → distancias estrictamente DECRECIENTES (de izq a der)
  //  - 'hombro' → distancias estrictamente CRECIENTES   (de izq a der)
  const alineacion = decoderConfig?.alineacion;
  const distDirOk = (arr: number[]): boolean => {
    if (arr.length < 2) return true;
    return alineacion === 'punta' ? isStrictlyDecreasing(arr) : isStrictlyIncreasing(arr);
  };
  const distDirMsg = alineacion === 'punta'
    ? "Con alineación a la PUNTA, las distancias deben ser estrictamente decrecientes (cada valor menor que el anterior)."
    : "Con alineación al HOMBRO, las distancias deben ser estrictamente crecientes (cada valor mayor que el anterior).";

  // Validaciones en vivo
  const profsParsed = parseList(profsTxt);
  const distsParsed = parseList(distsTxt);
  const distsDerParsed = parseList(distsDerTxt);

  const profsError = profsParsed.invalid
    ? "Hay valores no numéricos."
    : profsParsed.values.length !== expectedProfsLen
      ? `Se esperan ${expectedProfsLen} valores (uno por nivel de profundidad), recibidos ${profsParsed.values.length}.`
      : !isMonotonic(profsParsed.values)
        ? "Las profundidades deben ser estrictamente crecientes o decrecientes."
        : null;

  const distsError = distsParsed.invalid
    ? "Hay valores no numéricos."
    : distsParsed.values.length !== expectedDistsLen
      ? `Se esperan ${expectedDistsLen} distancias (igual a la longitud del bitting${isDosEjes ? ' del eje A' : ''}), recibidas ${distsParsed.values.length}.`
      : !distDirOk(distsParsed.values)
        ? distDirMsg
        : null;

  const distsDerError = !isDosEjes
    ? null
    : distsDerParsed.invalid
      ? "Hay valores no numéricos."
      : distsDerParsed.values.length !== expectedDistsDerLen
        ? `Se esperan ${expectedDistsDerLen} distancias (igual a la longitud del eje B), recibidas ${distsDerParsed.values.length}.`
        : !distDirOk(distsDerParsed.values)
          ? distDirMsg
          : null;

  const hasErrors = !!(profsError || distsError || distsDerError);

  // Reporta validez al padre. Si no hay decoder configurado, no hay errores.
  useEffect(() => {
    onValidityChange?.(!!decoderConfig && hasErrors);
  }, [hasErrors, decoderConfig, onValidityChange]);

  // Sincroniza automáticamente las listas válidas al decoderConfig (sin botón "Aplicar").
  useEffect(() => {
    if (!decoderConfig) return;
    if (hasErrors) return;
    const sameProfs = arraysEqual(decoderConfig.profundidades, profsParsed.values);
    const sameDists = arraysEqual(decoderConfig.distanciasCortes, distsParsed.values);
    const sameDistsDer = !isDosEjes || arraysEqual(decoderConfig.distanciasCortesDer, distsDerParsed.values);
    if (sameProfs && sameDists && sameDistsDer) return;
    setDecoderConfig({
      ...decoderConfig,
      profundidades: profsParsed.values,
      distanciasCortes: distsParsed.values,
      distanciasCortesDer: isDosEjes ? distsDerParsed.values : decoderConfig.distanciasCortesDer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profsTxt, distsTxt, distsDerTxt, hasErrors, isDosEjes]);

  if (!decoderConfig) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-3">
          <Camera className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-semibold text-foreground">Decodificador por foto desactivado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Permite al taller decodificar el bitting de una llave a partir de una foto.
              {inferredTipo && configuracionVisual && (
                <> Se detectó el tipo visual <span className="font-mono font-semibold text-primary">{inferredTipo}</span>.</>
              )}
            </p>
          </div>
          <Button onClick={autoConfigurar} disabled={!inferredTipo}>
            <Wand2 className="w-4 h-4 mr-2" /> Auto-configurar desde Visual
          </Button>
          {!inferredTipo && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Configura el tipo de llave en la pestaña <span className="font-semibold">Visual</span> primero.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Decodificador por foto
          </p>
          <p className="text-xs text-muted-foreground">Parámetros físicos para alineación de cámara.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={autoConfigurar} disabled={!inferredTipo}>
            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Re-aplicar preset
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDecoderConfig(undefined)} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo de llave (decoder)</Label>
          <select
            value={decoderConfig.tipoLlave}
            onChange={(e) => setDecoderConfig(applyDecoderPreset(decoderConfig, e.target.value as DecoderTipoLlave, decoderConfig.alineacion))}
            className="w-full mt-1 bg-background border border-input rounded-md px-2 py-1.5 text-sm"
          >
            <option value="estandar_doble">Estándar Doble Lado</option>
            <option value="estandar_un">Estándar Un Lado</option>
            <option value="dos_ejes_exterior">Dos Ejes Exterior</option>
            <option value="dos_ejes_interior">Dos Ejes Interior</option>
            <option value="pista_canal">Pista / Canal / Lateral</option>
          </select>
          {inferredTipo && inferredTipo !== decoderConfig.tipoLlave && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
              ⚠ El visual sugiere <span className="font-mono">{inferredTipo}</span>
            </p>
          )}
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Alineación</Label>
          <select
            value={decoderConfig.alineacion}
            onChange={(e) => setDecoderConfig(applyDecoderPreset(decoderConfig, decoderConfig.tipoLlave, e.target.value as DecoderAlineacion))}
            className="w-full mt-1 bg-background border border-input rounded-md px-2 py-1.5 text-sm"
          >
            <option value="punta">Punta</option>
            <option value="hombro">Hombro</option>
          </select>
        </div>

        {isUnLado && (
          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Lado activo de corte</Label>
            <select
              value={decoderConfig.ladoEstandarUn}
              onChange={(e) => setDecoderConfig({ ...decoderConfig, ladoEstandarUn: e.target.value as 'izq' | 'der' })}
              className="w-full mt-1 bg-background border border-amber-500/40 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="izq">Izquierdo</option>
              <option value="der">Derecho</option>
            </select>
          </div>
        )}

        <div className="col-span-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ancho total de la llave (unidades)</Label>
          <Input
            type="number"
            value={decoderConfig.anchoLlave}
            onChange={(e) => setDecoderConfig({ ...decoderConfig, anchoLlave: parseInt(e.target.value) || 0 })}
            className="h-8 mt-1 font-mono text-center"
          />
        </div>

        <div className="col-span-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Escala (px/mm)</Label>
          <Input
            type="number"
            step="0.01"
            value={decoderConfig.escalaPixelMm}
            onChange={(e) => setDecoderConfig({ ...decoderConfig, escalaPixelMm: parseFloat(e.target.value) || 0 })}
            className="h-8 mt-1 font-mono text-center"
          />
        </div>

        <div className="col-span-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Extensión de la grilla más allá del corte extremo
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={decoderConfig.extensionGrilla ?? 1}
            onChange={(e) => setDecoderConfig({ ...decoderConfig, extensionGrilla: parseFloat(e.target.value) || 0 })}
            className="h-8 mt-1 font-mono text-center"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Multiplicador del excedente que se dibuja más allá del corte más lejano a la referencia. 1 = por defecto, 0 = sin excedente.
          </p>
        </div>
      </div>

      <div className={`rounded-xl border p-3 space-y-2 ${profsError ? 'border-destructive/60 bg-destructive/5' : 'border-border bg-muted/30'}`}>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Profundidades (unidades, separadas por coma)
        </Label>
        <Input
          value={profsTxt}
          onChange={(e) => setProfsTxt(e.target.value)}
          className={`font-mono text-xs ${profsError ? 'border-destructive' : ''}`}
          placeholder="380, 320, 260, 200"
        />
        <p className="text-[10px] text-muted-foreground">
          Debe contener exactamente <span className="font-semibold">{expectedProfsLen}</span> valores (uno por nivel de profundidad), estrictamente crecientes o decrecientes.
        </p>
        {profsError && <p className="text-[10px] text-destructive font-semibold">⚠ {profsError}</p>}
      </div>

      {isDosEjes ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Distancias de cortes
            </Label>
            <p className="text-[10px] text-muted-foreground mt-1">
              Cada eje debe tener tantos valores como cortes, en orden estrictamente creciente o decreciente.
            </p>
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">Eje A (izq.) — esperados: {expectedDistsLen}</Label>
            <textarea
              value={distsTxt}
              onChange={(e) => setDistsTxt(e.target.value)}
              rows={3}
              className={`w-full mt-1 bg-background border rounded-md p-2 font-mono text-[11px] resize-none ${distsError ? 'border-destructive' : 'border-input'}`}
            />
            {distsError && <p className="text-[10px] text-destructive font-semibold mt-1">⚠ {distsError}</p>}
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">Eje B (der.) — esperados: {expectedDistsDerLen}</Label>
            <textarea
              value={distsDerTxt}
              onChange={(e) => setDistsDerTxt(e.target.value)}
              rows={3}
              className={`w-full mt-1 bg-background border rounded-md p-2 font-mono text-[11px] resize-none ${distsDerError ? 'border-destructive' : 'border-input'}`}
            />
            {distsDerError && <p className="text-[10px] text-destructive font-semibold mt-1">⚠ {distsDerError}</p>}
          </div>
        </div>
      ) : (
        <div className={`rounded-xl border p-3 space-y-2 ${distsError ? 'border-destructive/60 bg-destructive/5' : 'border-border bg-muted/30'}`}>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Distancias de cortes a la referencia
          </Label>
          <textarea
            value={distsTxt}
            onChange={(e) => setDistsTxt(e.target.value)}
            rows={3}
            className={`w-full bg-background border rounded-md p-2 font-mono text-[11px] resize-none ${distsError ? 'border-destructive' : 'border-input'}`}
          />
          <p className="text-[10px] text-muted-foreground">
            Debe contener exactamente <span className="font-semibold">{expectedDistsLen}</span> valores (uno por corte del bitting), estrictamente crecientes o decrecientes.
          </p>
          {distsError && <p className="text-[10px] text-destructive font-semibold">⚠ {distsError}</p>}
        </div>
      )}
    </div>
  );
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

