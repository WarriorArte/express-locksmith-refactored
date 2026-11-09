/**
 * Asistente móvil del SuperAdmin: en un solo flujo asigna Keycode e Immo Info a un
 * vehículo. En el paso Vehículo se pueden agregar o corregir marcas, modelos y años
 * (ver VehicleStep). Permite crear perfiles Immo al vuelo; los perfiles (series) de
 * Keycode siguen siendo exclusivos de escritorio.
 *
 * Al guardar se crean registros independientes por herramienta (uno de Keycode y
 * otro de Immo), igual que en escritorio, para que cada gestor de escritorio pueda
 * editarlos o borrarlos sin tocar los datos de la otra herramienta.
 *
 * Verificaciones:
 *  - Marca, modelo y años elegidos de la base de vehículos (lo nuevo se agrega antes).
 *  - Cerraduras activas con al menos un corte.
 *  - Perfiles Immo duplicados (misma marca + FCC ID) bloqueados al crear.
 *  - Aviso y confirmación si el vehículo ya tiene asignaciones que se traslapan.
 *  - Guardado confirmado por el servidor; si una parte falla se puede reintentar
 *    sin duplicar la que ya se guardó.
 *  - Botón Atrás del teléfono retrocede un paso; salir con cambios pide confirmación.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Car, Check, ChevronLeft, ChevronRight, Cpu, Key, Loader2, Plus, RotateCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ModuleHeader } from "@/design-system/layout/ModuleHeader";
import { FilterChip } from "@/design-system/detail/DetailScreen";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useFileUpload } from "@/hooks/useFileUpload";
import { resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";
import type {
  ImmoAssignmentDetail, ImmoCatalogItem, ImmoProfile, KeycodeProfile,
  LockKey, LockSelectionsMap, ToolAssignment,
} from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";
import { emptyDetail, emptyProfile, profileTitle, ImmoDetailFields, ImmoProfileEditor } from "../ImmoManager";
import { getProfileBittingLength } from "../AssignmentManager";
import { VehicleStep } from "./VehicleStep";
import {
  CATEGORY_LABELS, EMPTY_VEHICLE, clean, sameText, uid, validateYearRange,
  type VehicleEditor, type VehicleValue, type WizardVehicleDb,
} from "./wizardUtils";

type Detail = Omit<ImmoAssignmentDetail, "profileId">;
type Part = "keycode" | "immo";

interface Props {
  onClose: () => void;
  keycodeProfiles: KeycodeProfile[];
  immoProfiles: ImmoProfile[];
  /** Debe resolver `true` solo cuando el servidor confirmó el guardado. */
  onCreateImmoProfile: (p: ImmoProfile) => Promise<boolean>;
  catalog: ImmoCatalogItem[];
  vehicleDb: WizardVehicleDb;
  assignments: ToolAssignment[];
  /** Debe resolver `true` solo cuando el servidor confirmó el guardado. */
  onSaveAssignment: (a: ToolAssignment) => Promise<boolean>;
  /** Se usa al renombrar marcas o modelos para mantener sus asignaciones al día. */
  onUpdateAssignment: (a: ToolAssignment) => Promise<boolean>;
}

const STEPS = ["Vehículo", "Keycode", "Immo Info", "Datos Immo", "Resumen"] as const;
const STEP_VEHICLE = 0;
const STEP_KEYCODE = 1;
const STEP_IMMO = 2;
const STEP_IMMO_DATA = 3;
const STEP_SUMMARY = 4;

const PART_LABELS: Record<Part, string> = { keycode: "Keycode", immo: "Immo Info" };

/** Minúsculas, sin acentos y con espacios simples, para comparar búsquedas. */
const normalizeSearch = (s: string) => clean(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Referencia principal del perfil Keycode (p. ej. «Lishi HU66»), o la primera con marca. */
function referenceLabel(p: KeycodeProfile): string {
  const refs = (p.references ?? []).filter((r) => clean(r.brand) || clean(r.refCode));
  const ref = refs.find((r) => r.isPrimary) ?? refs[0];
  return ref ? clean(`${ref.brand} ${ref.refCode}`) : "";
}

function SelectableRow({ selected, onClick, title, subtitle, image }: { selected: boolean; onClick: () => void; title: string; subtitle?: string; image?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        selected ? "border-primary bg-secondary" : "border-border bg-card hover:bg-muted",
      )}
    >
      {image ? (
        <img src={resolveStorageUrl(image) ?? undefined} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
        {selected && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="text-xs font-medium text-destructive">{children}</p>;
}

export function MobileAssignmentWizard({
  onClose, keycodeProfiles, immoProfiles, onCreateImmoProfile, catalog, vehicleDb, assignments, onSaveAssignment, onUpdateAssignment,
}: Props) {
  const [step, setStep] = useState(STEP_VEHICLE);

  // ── Vehículo ──
  const [vehicleValue, setVehicleValue] = useState<VehicleValue>(EMPTY_VEHICLE);
  const [vehicleEditor, setVehicleEditor] = useState<VehicleEditor | null>(null);
  const [vehicleBusy, setVehicleBusy] = useState(false);
  const [showVehicleErrors, setShowVehicleErrors] = useState(false);
  const { yearStart, yearEnd } = vehicleValue;

  // ── Keycode ──
  const [kcSearch, setKcSearch] = useState("");
  const [kcIds, setKcIds] = useState<string[]>([]);
  const [locks, setLocks] = useState<LockSelectionsMap>({});

  // ── Immo ──
  const [imSearch, setImSearch] = useState("");
  const [imIds, setImIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(emptyProfile());
  const [savingProfile, setSavingProfile] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { currentWorkshop } = useWorkshop();
  const { uploadFile, isUploading } = useFileUpload({ folder: "immo", workshopCode: currentWorkshop?.code });

  // ── Guardado ──
  const [saving, setSaving] = useState(false);
  const [savedParts, setSavedParts] = useState<Record<Part, boolean>>({ keycode: false, immo: false });
  const [overlapAck, setOverlapAck] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const anyPartSaved = savedParts.keycode || savedParts.immo;

  // ── Vehículo elegido (siempre proviene de la base; lo nuevo se agrega en VehicleStep) ──
  const vehicle = useMemo(() => {
    const make = clean(vehicleValue.make);
    const model = clean(vehicleValue.model);
    const makeExists = !!make && vehicleDb.makes.includes(make);
    const modelExists = makeExists && !!model && vehicleDb.getModelsByMake(make).includes(model);
    const known = new Set(modelExists ? vehicleDb.getYearsByMakeModel(make, model) : []);
    return {
      make,
      model,
      makeExists,
      modelExists,
      ys: Number(yearStart),
      ye: Number(yearEnd),
      yearsKnown: known.has(Number(yearStart)) && known.has(Number(yearEnd)),
    };
  }, [vehicleValue, yearStart, yearEnd, vehicleDb]);

  const vehicleError = useMemo((): string | null => {
    if (!vehicle.make) return "Elige la marca o agrega una nueva.";
    if (!vehicle.makeExists) return "La marca elegida ya no existe en la base. Elígela de nuevo.";
    if (!vehicle.model) return "Elige el modelo o agrega uno nuevo.";
    if (!vehicle.modelExists) return "El modelo elegido ya no existe en la base. Elígelo de nuevo.";
    if (!yearStart || !yearEnd) return "Elige los años o usa «Agregar años».";
    const rangeError = validateYearRange(yearStart, yearEnd);
    if (rangeError) return rangeError;
    if (!vehicle.yearsKnown) return "Esos años no están registrados para este modelo. Usa «Agregar años».";
    return null;
  }, [vehicle, yearStart, yearEnd]);
  const vehicleValid = !vehicleError;
  const vehicleCategory = vehicle.makeExists ? vehicleDb.getMakeCategory(vehicle.make) : null;

  // ── Perfiles vigentes (por si alguno se borró desde otro dispositivo) ──
  const keycodeById = useMemo(() => new Map(keycodeProfiles.map((p) => [p.id, p])), [keycodeProfiles]);
  const immoById = useMemo(() => new Map(immoProfiles.map((p) => [p.id, p])), [immoProfiles]);
  const validKcIds = useMemo(() => kcIds.filter((id) => keycodeById.has(id)), [kcIds, keycodeById]);
  const validImIds = useMemo(() => imIds.filter((id) => immoById.has(id)), [imIds, immoById]);

  const transponderCatalog = useMemo(() => catalog.filter((i) => i.category === "transponder"), [catalog]);
  const equipoCatalog = useMemo(() => catalog.filter((i) => i.category === "equipo"), [catalog]);

  const filteredKc = useMemo(() => {
    // Todas las palabras deben aparecer (p. ej. «lishi hu66»), sin importar mayúsculas ni acentos.
    const terms = normalizeSearch(kcSearch).split(" ").filter(Boolean);
    if (!terms.length) return keycodeProfiles;
    return keycodeProfiles.filter((p) => {
      const haystack = normalizeSearch([
        p.series,
        p.icCard,
        p.internalReference,
        ...(p.seriesAliases ?? []),
        // Marca y código de cada referencia (donde normalmente va «Lishi»).
        ...(p.references ?? []).flatMap((r) => [r.brand, r.refCode, `${r.brand} ${r.refCode}`]),
      ].filter(Boolean).join(" "));
      return terms.every((t) => haystack.includes(t));
    });
  }, [keycodeProfiles, kcSearch]);

  const filteredIm = useMemo(() => {
    const q = imSearch.trim().toLowerCase();
    if (!q) return immoProfiles;
    return immoProfiles.filter((p) => [profileTitle(p), p.frecuencia, p.bateria].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [immoProfiles, imSearch]);

  // ── Cerraduras ──
  const toggleKc = (id: string) => setKcIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleLock = (pid: string, lk: LockKey, length: number) =>
    setLocks((prev) => {
      const pl = { ...(prev[pid] ?? {}) };
      if (pl[lk]) delete pl[lk];
      else pl[lk] = Array.from({ length }, () => true);
      return { ...prev, [pid]: pl };
    });
  const toggleLockCut = (pid: string, lk: LockKey, idx: number) =>
    setLocks((prev) => {
      const pl = { ...(prev[pid] ?? {}) };
      const arr = pl[lk];
      if (!arr) return prev;
      const next = [...arr];
      next[idx] = !next[idx];
      pl[lk] = next;
      return { ...prev, [pid]: pl };
    });

  /** Cerraduras activas sin ningún corte marcado (no tendrían sentido para el técnico). */
  const emptyLockIssues = useMemo(() => {
    const issues: string[] = [];
    validKcIds.forEach((pid) => {
      const p = keycodeById.get(pid)!;
      LOCK_ORDER.forEach((lk) => {
        const arr = locks[pid]?.[lk];
        if (arr && !arr.some(Boolean)) issues.push(`${LOCK_LABELS[lk]} de IC ${p.icCard}`);
      });
    });
    return issues;
  }, [validKcIds, keycodeById, locks]);

  // ── Immo ──
  const selectIm = (id: string) => {
    setImIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDetails((prev) => (prev[id] ? prev : { ...prev, [id]: emptyDetail() }));
  };
  const toggleIm = (id: string) => {
    if (imIds.includes(id)) setImIds((prev) => prev.filter((x) => x !== id));
    else selectIm(id);
  };

  const saveNewProfile = async () => {
    if (savingProfile) return;
    if (isUploading) { toast.error("Espera a que termine de subir la imagen."); return; }
    const marca = clean(profileDraft.marca);
    const fccId = clean(profileDraft.fccId);
    if (!marca && !fccId) {
      toast.error("Ingresa al menos Marca o FCC ID.");
      return;
    }
    const duplicate = immoProfiles.find((p) => sameText(clean(p.marca), marca) && sameText(clean(p.fccId), fccId));
    if (duplicate) {
      toast.error(`Ya existe el perfil «${profileTitle(duplicate)}».`, {
        action: {
          label: "Usar ese",
          onClick: () => { selectIm(duplicate.id); setCreatingProfile(false); },
        },
      });
      return;
    }
    const p: ImmoProfile = {
      ...profileDraft,
      marca,
      fccId,
      frecuencia: clean(profileDraft.frecuencia),
      bateria: clean(profileDraft.bateria),
      id: uid(),
      dateAdded: new Date().toLocaleDateString(),
    };
    setSavingProfile(true);
    const ok = await onCreateImmoProfile(p);
    setSavingProfile(false);
    if (!ok) {
      toast.error("No se pudo guardar el perfil Immo. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    selectIm(p.id);
    setProfileDraft(emptyProfile());
    setCreatingProfile(false);
    toast.success("Perfil Immo creado y seleccionado.");
  };

  // ── Traslapes con asignaciones existentes ──
  const overlaps = useMemo(() => {
    const empty = { keycode: [] as ToolAssignment[], immo: [] as ToolAssignment[] };
    if (!vehicleValid) return empty;
    const same = assignments.filter(
      (a) => sameText(clean(a.make), vehicle.make) && sameText(clean(a.model), vehicle.model)
        && a.yearStart <= vehicle.ye && a.yearEnd >= vehicle.ys,
    );
    return {
      keycode: validKcIds.length && !savedParts.keycode ? same.filter((a) => (a.keycodeProfileIds?.length ?? 0) > 0) : [],
      immo: validImIds.length && !savedParts.immo ? same.filter((a) => (a.immoDetails?.length ?? 0) > 0) : [],
    };
  }, [assignments, vehicle, vehicleValid, validKcIds.length, validImIds.length, savedParts]);
  const hasOverlaps = overlaps.keycode.length + overlaps.immo.length > 0;

  // ── Validación por paso ──
  const stepError = (s: number): string | null => {
    if (s === STEP_VEHICLE && vehicleEditor) return "Guarda o cancela la edición del vehículo antes de continuar.";
    if (s === STEP_VEHICLE && vehicleError) return vehicleError;
    if (s === STEP_KEYCODE && emptyLockIssues.length) {
      return `Marca al menos un corte en: ${emptyLockIssues.join(", ")}.`;
    }
    if (s === STEP_IMMO && validKcIds.length === 0 && validImIds.length === 0) {
      return "Selecciona al menos una serie de Keycode o un perfil de Immo Info.";
    }
    return null;
  };

  const validateStep = (s: number): boolean => {
    const err = stepError(s);
    if (s === STEP_VEHICLE) setShowVehicleErrors(true);
    if (err) toast.error(err);
    return !err;
  };

  const goTo = (s: number) => {
    setStep(s);
    if (s === STEP_SUMMARY) setOverlapAck(false);
  };

  const next = () => {
    if (!validateStep(step)) return;
    // Si no hay perfiles Immo, se salta el paso de datos Immo.
    if (step === STEP_IMMO && validImIds.length === 0) goTo(STEP_SUMMARY);
    else goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const busy = saving || savingProfile || vehicleBusy;
  const isDirty = step > STEP_VEHICLE || !!vehicleValue.make || kcIds.length > 0 || imIds.length > 0 || creatingProfile;

  const requestClose = useCallback(() => {
    if (busy) return;
    if (isDirty && !anyPartSaved) setConfirmExitOpen(true);
    else onClose();
  }, [busy, isDirty, anyPartSaved, onClose]);

  const back = () => {
    if (busy) return;
    if (creatingProfile) { setCreatingProfile(false); return; }
    if (vehicleEditor) { setVehicleEditor(null); return; }
    // Tras guardar una parte ya no se puede volver a editar: solo reintentar o salir.
    if (anyPartSaved || step === STEP_VEHICLE) { requestClose(); return; }
    if (step === STEP_SUMMARY && validImIds.length === 0) goTo(STEP_IMMO);
    else goTo(step - 1);
  };

  // Botón Atrás del sistema (Android / gesto): retrocede un paso en lugar de salir de la pantalla.
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const entryId = `ce-wizard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.history.pushState({ ...(window.history.state ?? {}), __ceWizardId: entryId }, "");
    const onPopState = (e: PopStateEvent) => {
      // Si seguimos en nuestra entrada, lo que se cerró fue un diálogo encima del asistente.
      if ((e.state as { __ceWizardId?: string } | null)?.__ceWizardId === entryId) return;
      window.history.pushState({ ...(window.history.state ?? {}), __ceWizardId: entryId }, "");
      backRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if ((window.history.state as { __ceWizardId?: string } | null)?.__ceWizardId === entryId) window.history.back();
    };
  }, []);

  // ── Guardar ──
  const handleSave = async () => {
    if (saving) return;
    for (const s of [STEP_VEHICLE, STEP_KEYCODE, STEP_IMMO]) {
      if (!validateStep(s)) { if (!anyPartSaved) goTo(s); return; }
    }
    if (hasOverlaps && !overlapAck) {
      toast.error("Confirma que quieres guardar aunque ya existan asignaciones para este vehículo.");
      return;
    }

    const base = {
      make: vehicle.make,
      model: vehicle.model,
      yearStart: vehicle.ys,
      yearEnd: vehicle.ye,
      workshops: [] as string[],
      dateAdded: new Date().toLocaleDateString(),
    };

    const tasks: Promise<[Part, boolean]>[] = [];
    if (validKcIds.length && !savedParts.keycode) {
      const cleanedLocks: LockSelectionsMap = {};
      validKcIds.forEach((pid) => {
        const pl = locks[pid];
        if (pl && Object.keys(pl).length) cleanedLocks[pid] = pl;
      });
      tasks.push(
        onSaveAssignment({
          ...base,
          id: uid(),
          tools: ["keycode"],
          keycodeProfileIds: validKcIds,
          lockSelections: Object.keys(cleanedLocks).length ? cleanedLocks : undefined,
        }).then((ok): [Part, boolean] => ["keycode", ok], (): [Part, boolean] => ["keycode", false]),
      );
    }
    if (validImIds.length && !savedParts.immo) {
      tasks.push(
        onSaveAssignment({
          ...base,
          id: uid(),
          tools: ["immo"],
          keycodeProfileIds: [],
          immoDetails: validImIds.map((id) => ({ ...emptyDetail(), ...(details[id] ?? {}), profileId: id })),
        }).then((ok): [Part, boolean] => ["immo", ok], (): [Part, boolean] => ["immo", false]),
      );
    }
    if (!tasks.length) { onClose(); return; }

    setSaving(true);
    const results = await Promise.all(tasks);
    setSaving(false);

    const nextSaved = { ...savedParts };
    results.forEach(([part, ok]) => { if (ok) nextSaved[part] = true; });
    setSavedParts(nextSaved);

    const failed = results.filter(([, ok]) => !ok).map(([part]) => PART_LABELS[part]);
    if (!failed.length) {
      toast.success(`Asignación guardada para ${vehicle.make} ${vehicle.model}.`);
      onClose();
      return;
    }
    const savedLabels = (Object.keys(nextSaved) as Part[]).filter((p) => nextSaved[p]).map((p) => PART_LABELS[p]);
    toast.error(
      savedLabels.length
        ? `Se guardó ${savedLabels.join(" y ")}, pero falló ${failed.join(" y ")}. Pulsa «Reintentar».`
        : "No se pudo guardar la asignación. Revisa tu conexión e inténtalo de nuevo.",
    );
  };

  const vehicleLabel = vehicle.make
    ? `${vehicle.make}${vehicle.model ? ` ${vehicle.model}` : ""}${yearStart && yearEnd ? ` · ${yearStart}–${yearEnd}` : ""}`
    : "Nueva asignación";
  const isLast = step === STEP_SUMMARY;

  const describeAssignment = (a: ToolAssignment, part: Part) => {
    const names = part === "keycode"
      ? (a.keycodeProfileIds ?? []).map((id) => keycodeById.get(id)).filter(Boolean).map((p) => `IC ${p!.icCard}`)
      : (a.immoDetails ?? []).map((d) => immoById.get(d.profileId)).filter(Boolean).map((p) => profileTitle(p!));
    return `${a.yearStart}–${a.yearEnd}${names.length ? ` · ${names.join(", ")}` : ""}`;
  };

  return (
    <div className="m3e-form fixed inset-0 z-50 flex flex-col bg-background">
      <div className="shrink-0 px-5 pt-app-top pb-3">
        <ModuleHeader
          title={creatingProfile ? "Nuevo perfil Immo" : vehicleEditor ? "Base de vehículos" : STEPS[step]}
          subtitle={creatingProfile ? "Se agregará a esta asignación" : vehicleEditor ? "Los cambios se guardan al momento" : `Paso ${step + 1} de ${STEPS.length} · ${vehicleLabel}`}
          onBack={back}
          backLabel={creatingProfile ? "Volver a perfiles Immo" : vehicleEditor ? "Cancelar edición" : step === STEP_VEHICLE || anyPartSaved ? "Cerrar asistente" : "Paso anterior"}
          actions={
            <Button variant="ghost" size="icon" className="rounded-full" onClick={requestClose} disabled={busy} aria-label="Cerrar asistente">
              <X className="h-5 w-5" />
            </Button>
          }
        />
        {!creatingProfile && !vehicleEditor && (
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                  i === STEP_IMMO_DATA && step > STEP_IMMO && validImIds.length === 0 && "opacity-40",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 no-scrollbar">
        {creatingProfile ? (
          <ImmoProfileEditor
            draft={profileDraft}
            onChange={setProfileDraft}
            onImageChange={(url) => setProfileDraft((d) => ({ ...d, mainImage: url }))}
            isUploadingImage={isUploading}
            uploadFile={uploadFile}
            galleryOpen={galleryOpen}
            setGalleryOpen={setGalleryOpen}
            workshopCode={currentWorkshop?.code}
          />
        ) : step === STEP_VEHICLE ? (
          <VehicleStep
            value={vehicleValue}
            onChange={(v) => { setVehicleValue(v); setShowVehicleErrors(false); }}
            editor={vehicleEditor}
            onEditorChange={setVehicleEditor}
            onBusyChange={setVehicleBusy}
            vehicleDb={vehicleDb}
            assignments={assignments}
            onUpdateAssignment={onUpdateAssignment}
            error={showVehicleErrors ? vehicleError : null}
          />
        ) : step === STEP_KEYCODE ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige las series de Keycode (opcional). Las series nuevas se crean desde una computadora.</p>
            {keycodeProfiles.length === 0 ? (
              <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                Aún no hay series de Keycode. Créalas desde una PC; puedes continuar solo con Immo Info.
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={kcSearch} onChange={(e) => setKcSearch(e.target.value)} placeholder="Buscar marca (Lishi…), serie o IC…" className="pl-9" />
                </div>
                {filteredKc.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hay series que coincidan.</p>}
                {filteredKc.map((p) => {
                  const sel = kcIds.includes(p.id);
                  const len = getProfileBittingLength(p);
                  const pl = locks[p.id] ?? {};
                  const activeLocks = LOCK_ORDER.filter((lk) => pl[lk]);
                  return (
                    <div key={p.id} className="space-y-2">
                      <SelectableRow selected={sel} onClick={() => toggleKc(p.id)} title={`IC ${p.icCard} · ${p.series}`} subtitle={[referenceLabel(p), p.internalReference, `${len} cortes`].filter(Boolean).join(" · ")} />
                      {sel && (
                        <div className="space-y-3 rounded-2xl bg-card p-3 shadow-sm">
                          <p className="text-xs font-medium text-muted-foreground">Cerraduras (opcional)</p>
                          <div className="flex flex-wrap gap-2">
                            {LOCK_ORDER.map((lk) => (
                              <FilterChip key={lk} onCard selected={!!pl[lk]} onClick={() => toggleLock(p.id, lk, len)}>{LOCK_LABELS[lk]}</FilterChip>
                            ))}
                          </div>
                          {activeLocks.map((lk) => {
                            const arr = pl[lk]!;
                            const none = !arr.some(Boolean);
                            return (
                              <div key={lk} className="space-y-1.5">
                                <p className="text-xs font-semibold text-foreground">{LOCK_LABELS[lk]} · cortes presentes</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {arr.map((checked, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => toggleLockCut(p.id, lk, idx)}
                                      aria-pressed={checked}
                                      aria-label={`Corte ${idx + 1}`}
                                      className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold tabular-nums transition-colors",
                                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground",
                                      )}
                                    >
                                      {idx + 1}
                                    </button>
                                  ))}
                                </div>
                                {none && <FieldError>Marca al menos un corte o quita esta cerradura.</FieldError>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ) : step === STEP_IMMO ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige los remotos de Immo Info o crea uno nuevo si no existe.</p>
            <Button variant="secondary" className="w-full rounded-full" onClick={() => { setProfileDraft(emptyProfile()); setCreatingProfile(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> Crear perfil Immo
            </Button>
            {immoProfiles.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={imSearch} onChange={(e) => setImSearch(e.target.value)} placeholder="Buscar marca, FCC ID o frecuencia…" className="pl-9" />
              </div>
            )}
            {filteredIm.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {immoProfiles.length === 0 ? "Aún no hay perfiles Immo. Crea el primero." : "No hay perfiles que coincidan. Crea uno nuevo."}
              </p>
            )}
            {filteredIm.map((p) => (
              <SelectableRow key={p.id} selected={imIds.includes(p.id)} onClick={() => toggleIm(p.id)} title={profileTitle(p)} subtitle={[p.frecuencia, p.bateria].filter(Boolean).join(" · ")} image={p.mainImage} />
            ))}
            {validKcIds.length === 0 && validImIds.length === 0 && (
              <p className="text-xs text-muted-foreground">Necesitas al menos una serie de Keycode o un perfil Immo para continuar.</p>
            )}
          </div>
        ) : step === STEP_IMMO_DATA ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Datos de cada remoto para este vehículo. Todos son opcionales.</p>
            {validImIds.map((id) => {
              const p = immoById.get(id)!;
              return (
                <section key={id} className="space-y-4 rounded-3xl bg-card p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground"><Cpu className="h-4 w-4 text-primary-text" /> {profileTitle(p)}</h3>
                  <ImmoDetailFields
                    id={`wiz-${id}`}
                    detail={details[id] ?? emptyDetail()}
                    onChange={(k, v) => setDetails((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyDetail()), [k]: v } }))}
                    transponderCatalog={transponderCatalog}
                    equipoCatalog={equipoCatalog}
                  />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Car className="h-4 w-4" /> Vehículo</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{vehicle.make} {vehicle.model}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{yearStart}–{yearEnd}{vehicleCategory ? ` · ${CATEGORY_LABELS[vehicleCategory]}` : ""}</p>
            </div>
            <div className="rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Key className="h-4 w-4" /> Keycode
                {savedParts.keycode && <span className="ml-auto flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" /> Guardado</span>}
              </p>
              {validKcIds.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Sin series</p> : validKcIds.map((id) => {
                const p = keycodeById.get(id)!;
                const lk = LOCK_ORDER.filter((k) => locks[id]?.[k]);
                return <p key={id} className="mt-1 text-sm font-medium text-foreground">IC {p.icCard} · {p.series}{lk.length ? <span className="text-muted-foreground"> · {lk.map((k) => LOCK_LABELS[k]).join(", ")}</span> : null}</p>;
              })}
            </div>
            <div className="rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Cpu className="h-4 w-4" /> Immo Info
                {savedParts.immo && <span className="ml-auto flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" /> Guardado</span>}
              </p>
              {validImIds.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Sin perfiles</p> : validImIds.map((id) => {
                const p = immoById.get(id)!;
                return <p key={id} className="mt-1 text-sm font-medium text-foreground">{profileTitle(p)}{details[id]?.transponder ? <span className="text-muted-foreground"> · {details[id].transponder}</span> : null}</p>;
              })}
            </div>

            {hasOverlaps && (
              <div className="space-y-3 rounded-3xl border border-warning/40 bg-warning/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Este vehículo ya tiene asignaciones
                </p>
                {(["keycode", "immo"] as Part[]).map((part) => overlaps[part].length > 0 && (
                  <div key={part} className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{PART_LABELS[part]}</p>
                    {overlaps[part].map((a) => <p key={a.id} className="text-sm tabular-nums text-foreground">{describeAssignment(a, part)}</p>)}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Se creará una asignación adicional; el técnico verá los perfiles de ambas. Si querías cambiar la existente, edítala desde una PC.</p>
                <div className="flex items-center gap-2">
                  <Checkbox id="wizard-overlap-ack" checked={overlapAck} onCheckedChange={(v) => setOverlapAck(!!v)} />
                  <Label htmlFor="wizard-overlap-ack" className="cursor-pointer text-sm">Entiendo, guardar de todos modos</Label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* El editor de la base de vehículos trae sus propios botones. */}
      {!vehicleEditor && (
        <div className="shrink-0 border-t border-border bg-background px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {creatingProfile ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setCreatingProfile(false)} disabled={savingProfile}>Cancelar</Button>
              <Button className="flex-1 rounded-full" onClick={saveNewProfile} disabled={isUploading || savingProfile}>
                {savingProfile ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                {savingProfile ? "Guardando…" : "Guardar perfil"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={back} disabled={busy}>
                {anyPartSaved ? <><X className="mr-1 h-4 w-4" /> Cerrar</> : <><ChevronLeft className="mr-1 h-4 w-4" /> {step === STEP_VEHICLE ? "Cancelar" : "Atrás"}</>}
              </Button>
              {isLast ? (
                <Button className="flex-1 rounded-full" onClick={handleSave} disabled={saving || (hasOverlaps && !overlapAck)}>
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : anyPartSaved ? <RotateCw className="mr-1.5 h-4 w-4" /> : <Check className="mr-1.5 h-4 w-4" />}
                  {saving ? "Guardando…" : anyPartSaved ? "Reintentar" : "Guardar"}
                </Button>
              ) : (
                <Button className="flex-1 rounded-full" onClick={next}>Siguiente <ChevronRight className="ml-1 h-4 w-4" /></Button>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán los datos de esta asignación. Los perfiles Immo y los cambios a la base de vehículos que ya hiciste se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            {/* Se cierra en el siguiente tick para que el diálogo libere primero su entrada del historial. */}
            <AlertDialogAction onClick={() => setTimeout(onClose, 0)}>Salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
