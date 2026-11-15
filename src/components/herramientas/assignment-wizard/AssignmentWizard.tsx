/**
 * Asistente del SuperAdmin (móvil y escritorio): en un solo flujo asigna Keycode e
 * Immo Info a un vehículo. En el paso Vehículo se pueden agregar o corregir marcas,
 * modelos y años (ver VehicleStep). Permite crear perfiles Immo al vuelo; los perfiles
 * (series) de Keycode se crean solo en el gestor de escritorio.
 *
 * La lógica es una sola; `layout` cambia únicamente la presentación (pantalla completa
 * en móvil, panel con lista de pasos en escritorio).
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
 *  - Botón Atrás del teléfono/navegador retrocede un paso; salir con cambios pide
 *    confirmación (también con Esc o clic fuera del panel en escritorio).
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
import { useToolsUploadCode } from "@/hooks/useToolsUploadCode";
import { useFileUpload } from "@/hooks/useFileUpload";
import { resolveStorageUrl } from "@/lib/phpApi";
import { formatFrecuencia, getFrecuenciaMHz, getModulacion, transponderLabel, immoProfileImages } from "@/lib/immo";
import { cn } from "@/lib/utils";
import type {
  ImmoAssignmentDetail, ImmoCatalogItem, ImmoProfile, KeycodeProfile,
  LockKey, LockSelectionsMap, ToolAssignment,
} from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";
import { emptyDetail, emptyProfile, profileTitle, ImmoDetailFields, ImmoProfileEditor } from "../ImmoManager";
import { getProfileBittingLength } from "../AssignmentManager";
import { VehicleStep } from "./VehicleStep";
import { mergeLocks, planKeycodeSave, type KeycodeOutcome } from "./keycodeMerge";
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
  /**
   * `mobile`: pantalla completa con barra de progreso.
   * `desktop`: panel centrado sobre un velo, con la lista de pasos a la izquierda.
   * Si cambia con el asistente abierto (p. ej. al redimensionar), se conserva todo lo capturado.
   */
  layout?: AssignmentWizardLayout;
}

export type AssignmentWizardLayout = "mobile" | "desktop";

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

export function AssignmentWizard({
  onClose, keycodeProfiles, immoProfiles, onCreateImmoProfile, catalog, vehicleDb, assignments, onSaveAssignment, onUpdateAssignment,
  layout = "mobile",
}: Props) {
  const isDesktop = layout === "desktop";
  const rootRef = useRef<HTMLDivElement>(null);
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
  const toolsUploadCode = useToolsUploadCode();
  const { uploadFile, isUploading } = useFileUpload({ folder: "immo", workshopCode: toolsUploadCode });

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
    return immoProfiles.filter((p) => [profileTitle(p), formatFrecuencia(p), p.bateria].some((v) => String(v ?? "").toLowerCase().includes(q)));
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
      frecuencia: getFrecuenciaMHz(profileDraft.frecuencia),
      modulacion: getModulacion(profileDraft) ?? "",
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
  // Keycode no necesita confirmación: el plan reutiliza o amplía lo existente sin duplicar.
  const hasOverlaps = overlaps.immo.length > 0;

  /** Qué pasará con cada serie de Keycode elegida (crear, ampliar años o nada). */
  const keycodePlan = useMemo(() => {
    if (!vehicleValid || !validKcIds.length || savedParts.keycode) return null;
    const vehicleKc = assignments.filter(
      (a) => sameText(clean(a.make), vehicle.make) && sameText(clean(a.model), vehicle.model)
        && (a.keycodeProfileIds?.length ?? 0) > 0,
    );
    return planKeycodeSave(vehicleKc, validKcIds, vehicle.ys, vehicle.ye);
  }, [assignments, vehicle, vehicleValid, validKcIds, savedParts.keycode]);
  const keycodeTouchesExisting = !!keycodePlan?.outcomes.some((o) => o.kind !== "create" || o.partial);

  /** Lo que el vehículo ya tiene asignado por herramienta (sin importar lo elegido ahora). */
  const existingForVehicle = useMemo(() => {
    const empty = { keycode: [] as ToolAssignment[], immo: [] as ToolAssignment[] };
    if (!vehicleValid) return empty;
    const same = assignments.filter(
      (a) => sameText(clean(a.make), vehicle.make) && sameText(clean(a.model), vehicle.model)
        && a.yearStart <= vehicle.ye && a.yearEnd >= vehicle.ys,
    );
    return {
      keycode: same.filter((a) => (a.keycodeProfileIds?.length ?? 0) > 0),
      immo: same.filter((a) => (a.immoDetails?.length ?? 0) > 0),
    };
  }, [assignments, vehicle, vehicleValid]);

  /**
   * Omitir una herramienta: p. ej. el auto comparte el Keycode de otro pero su Immo es
   * distinto (o al revés). Se quita lo elegido de esa parte y se avanza.
   * No se pueden omitir las dos: al menos una debe guardarse.
   */
  const skipPart = (part: Part) => {
    if (part === "keycode") {
      if (kcIds.length) toast.info("Se quitaron las series de Keycode elegidas.");
      setKcIds([]);
      goTo(STEP_IMMO);
      return;
    }
    if (validKcIds.length === 0) {
      toast.error("No puedes omitir Keycode e Immo Info a la vez. Elige al menos una serie de Keycode o un perfil Immo.");
      return;
    }
    if (imIds.length) toast.info("Se quitaron los perfiles Immo elegidos.");
    setImIds([]);
    goTo(STEP_SUMMARY);
  };

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

  // Escritorio: Esc cierra el editor abierto o pide salir. Si hay otro diálogo encima
  // (galería, confirmación…), ese diálogo atiende su propio Esc.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  useEffect(() => {
    if (!isDesktop) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // El panel del asistente no lleva data-state, así que cualquier coincidencia es otro diálogo encima.
      if (document.querySelector('[role="alertdialog"], [role="dialog"][data-state="open"]')) return;
      if (creatingProfile || vehicleEditor) backRef.current();
      else requestCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktop, creatingProfile, vehicleEditor]);

  /** Pasos ya recorridos a los que se puede volver con un clic desde la lista lateral. */
  const canJumpTo = (i: number) =>
    i < step && !busy && !anyPartSaved && !creatingProfile && !vehicleEditor
    && !(i === STEP_IMMO_DATA && validImIds.length === 0);

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
    let keycodeNoop = false;
    if (validKcIds.length && !savedParts.keycode && keycodePlan) {
      const cleanedLocks: LockSelectionsMap = {};
      validKcIds.forEach((pid) => {
        const pl = locks[pid];
        if (pl && Object.keys(pl).length) cleanedLocks[pid] = pl;
      });
      const locksFor = (pids: string[]) => {
        const out: LockSelectionsMap = {};
        pids.forEach((pid) => { if (cleanedLocks[pid]) out[pid] = cleanedLocks[pid]; });
        return Object.keys(out).length ? out : undefined;
      };
      const ops: Promise<boolean>[] = [
        // Misma serie: se amplían los años de la asignación existente (sus cerraduras se conservan).
        ...keycodePlan.updates.map((u) =>
          onUpdateAssignment({
            ...u.assignment,
            yearStart: u.yearStart,
            yearEnd: u.yearEnd,
            lockSelections: mergeLocks(u.assignment.lockSelections, cleanedLocks, u.pids),
          }),
        ),
        // Series nuevas o años que no se pueden pegar a una existente.
        ...keycodePlan.creates.map((c) =>
          onSaveAssignment({
            ...base,
            yearStart: c.yearStart,
            yearEnd: c.yearEnd,
            id: uid(),
            tools: ["keycode"],
            keycodeProfileIds: c.pids,
            lockSelections: locksFor(c.pids),
          }),
        ),
      ];
      if (ops.length) {
        tasks.push(
          Promise.all(ops).then(
            (oks): [Part, boolean] => ["keycode", oks.every(Boolean)],
            (): [Part, boolean] => ["keycode", false],
          ),
        );
      } else {
        keycodeNoop = true;
        setSavedParts((prev) => ({ ...prev, keycode: true }));
      }
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
    if (!tasks.length) {
      if (keycodeNoop) toast.success("El Keycode ya estaba asignado con esos años; no hubo cambios.");
      onClose();
      return;
    }

    setSaving(true);
    const results = await Promise.all(tasks);
    setSaving(false);

    const nextSaved = { ...savedParts, ...(keycodeNoop ? { keycode: true } : {}) };
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

  const range = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
  const describeOutcome = (o: KeycodeOutcome) => {
    const name = keycodeById.get(o.pid) ? `IC ${keycodeById.get(o.pid)!.icCard}` : "Serie";
    if (o.kind === "unchanged") return `${name}: ya existe con esos años, no se hará nada`;
    if (o.kind === "extend") {
      return `${name}: ya existe (${range(o.existing.yearStart, o.existing.yearEnd)}), se ampliará a ${range(o.yearStart, o.yearEnd)}`;
    }
    const segs = o.segments.map((sg) => range(sg.yearStart, sg.yearEnd)).join(", ");
    return o.partial ? `${name}: se agregarán los años que faltan (${segs})` : `${name}: serie nueva, se creará (${segs})`;
  };

  const footerBtn = cn("rounded-full", isDesktop ? "min-w-36" : "flex-1");
  /** Paso recorrido sin elegir nada (la herramienta se omitió). */
  const stepSkipped = (i: number) =>
    (i === STEP_KEYCODE && step > STEP_KEYCODE && validKcIds.length === 0)
    || ((i === STEP_IMMO || i === STEP_IMMO_DATA) && step > STEP_IMMO && validImIds.length === 0);

  /** Aviso al inicio de Keycode / Immo: qué tiene ya el vehículo y botón para omitir esta parte. */
  const renderSkipCard = (part: Part) => {
    const existing = existingForVehicle[part];
    const selectedCount = part === "keycode" ? validKcIds.length : validImIds.length;
    const blocked = part === "immo" && validKcIds.length === 0;
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 space-y-1">
          {existing.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-foreground">Este vehículo ya tiene {PART_LABELS[part]}</p>
              {existing.map((a) => <p key={a.id} className="text-xs tabular-nums text-muted-foreground">{describeAssignment(a, part)}</p>)}
              <p className="text-xs text-muted-foreground">Si es el mismo, omite este paso y asigna solo lo que cambia.</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {part === "keycode"
                ? "¿Este auto no necesita Keycode ahora? Puedes omitirlo y asignar solo Immo Info."
                : blocked
                  ? "Omitiste Keycode, así que aquí necesitas elegir al menos un perfil Immo."
                  : "¿Solo cambia el Keycode? Puedes omitir Immo Info y guardar solo las series."}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 rounded-full"
          onClick={() => skipPart(part)}
          disabled={blocked}
        >
          {selectedCount ? "Quitar selección y omitir" : `Omitir ${PART_LABELS[part]}`}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "m3e-form fixed inset-0 z-50 flex",
        isDesktop ? "items-center justify-center bg-black/50 p-6" : "flex-col bg-background",
      )}
      // Escritorio: clic en el velo = intentar salir (pide confirmación si hay cambios).
      onMouseDown={isDesktop ? (e) => { if (e.target === e.currentTarget) requestClose(); } : undefined}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Asistente de asignación"
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isDesktop && "h-[min(880px,100%)] w-full max-w-6xl flex-none flex-row overflow-hidden rounded-[28px] bg-background shadow-2xl",
        )}
      >
      {isDesktop && (
        <aside className="flex w-72 shrink-0 flex-col gap-6 border-r border-border bg-muted/40 p-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asistente de asignación</p>
            <p className="text-lg font-semibold leading-tight text-foreground">{vehicleLabel}</p>
          </div>
          <ol className="space-y-1" aria-label="Pasos">
            {STEPS.map((s, i) => {
              const done = i < step && !stepSkipped(i);
              const current = i === step && !creatingProfile && !vehicleEditor;
              const jumpable = canJumpTo(i);
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => jumpable && goTo(i)}
                    disabled={!jumpable}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                      i === step ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground",
                      jumpable && "hover:bg-secondary hover:text-foreground",
                      !jumpable && i !== step && "cursor-default",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums",
                        done ? "border-primary bg-primary text-primary-foreground"
                          : current ? "border-primary text-primary-text"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s}</span>
                    {stepSkipped(i) && <span className="text-[11px] font-medium">Omitido</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
            Se guarda un registro por herramienta. Las series de Keycode se crean en Keycode › Perfiles y Keycodes.
          </p>
        </aside>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn("shrink-0 pb-3", isDesktop ? "px-8 pt-6" : "px-5 pt-app-top")}>
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
        {!isDesktop && !creatingProfile && !vehicleEditor && (
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                  stepSkipped(i) && "opacity-40",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className={cn("flex-1 min-h-0 overflow-y-auto pb-6", isDesktop ? "px-8 custom-scrollbar" : "px-5 no-scrollbar")}>
        {/* En escritorio el contenido se limita a una columna legible. */}
        <div className={isDesktop ? "mx-auto w-full max-w-3xl" : undefined}>
        {creatingProfile ? (
          <ImmoProfileEditor
            draft={profileDraft}
            onChange={setProfileDraft}
            onImagesChange={(imgs) => setProfileDraft((d) => ({ ...d, images: imgs, mainImage: imgs[0] }))}
            isUploadingImage={isUploading}
            uploadFile={uploadFile}
            galleryOpen={galleryOpen}
            setGalleryOpen={setGalleryOpen}
            workshopCode={toolsUploadCode}
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
            {renderSkipCard("keycode")}
            <p className="text-sm text-muted-foreground">
              Elige las series de Keycode (opcional). Las series nuevas se crean {isDesktop ? "en Keycode › Perfiles y Keycodes" : "desde una computadora"}.
            </p>
            {keycodeProfiles.length === 0 ? (
              <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                Aún no hay series de Keycode. Créalas {isDesktop ? "en Keycode › Perfiles y Keycodes" : "desde una PC"}; puedes continuar solo con Immo Info.
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
            {renderSkipCard("immo")}
            <p className="text-sm text-muted-foreground">Elige los remotos de Immo Info o crea uno nuevo si no existe.</p>
            <Button variant="secondary" className="w-full rounded-full" onClick={() => { setProfileDraft(emptyProfile()); setCreatingProfile(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> Crear perfil Immo
            </Button>
            {immoProfiles.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={imSearch} onChange={(e) => setImSearch(e.target.value)} placeholder="Buscar marca, FCC ID, frecuencia, FSK/ASK…" className="pl-9" />
              </div>
            )}
            {filteredIm.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {immoProfiles.length === 0 ? "Aún no hay perfiles Immo. Crea el primero." : "No hay perfiles que coincidan. Crea uno nuevo."}
              </p>
            )}
            {filteredIm.map((p) => (
              <SelectableRow key={p.id} selected={imIds.includes(p.id)} onClick={() => toggleIm(p.id)} title={profileTitle(p)} subtitle={[formatFrecuencia(p), p.bateria].filter(Boolean).join(" · ")} image={immoProfileImages(p)[0]} />
            ))}
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
                    profileImages={immoProfileImages(p)}
                  />
                </section>
              );
            })}
          </div>
        ) : (
          <div className={cn(isDesktop ? "grid grid-cols-2 items-start gap-3" : "space-y-3")}>
            <div className="col-span-2 rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Car className="h-4 w-4" /> Vehículo</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{vehicle.make} {vehicle.model}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{yearStart}–{yearEnd}{vehicleCategory ? ` · ${CATEGORY_LABELS[vehicleCategory]}` : ""}</p>
            </div>
            <div className="rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Key className="h-4 w-4" /> Keycode
                {savedParts.keycode && <span className="ml-auto flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" /> Guardado</span>}
              </p>
              {validKcIds.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Omitido · no se creará asignación de Keycode</p> : validKcIds.map((id) => {
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
              {validImIds.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Omitido · no se creará asignación de Immo Info</p> : validImIds.map((id) => {
                const p = immoById.get(id)!;
                return <p key={id} className="mt-1 text-sm font-medium text-foreground">{profileTitle(p)}{transponderLabel(details[id]) ? <span className="text-muted-foreground"> · {transponderLabel(details[id])}</span> : null}</p>;
              })}
            </div>

            {(hasOverlaps || keycodeTouchesExisting) && (
              <div className="col-span-2 space-y-3 rounded-3xl border border-warning/40 bg-warning/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Este vehículo ya tiene asignaciones
                </p>
                {keycodeTouchesExisting && keycodePlan && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">Keycode · sin duplicar</p>
                    {keycodePlan.outcomes.map((o, i) => (
                      <p key={`${o.pid}-${o.kind}-${i}`} className="text-sm tabular-nums text-foreground">{describeOutcome(o)}</p>
                    ))}
                  </div>
                )}
                {hasOverlaps && (
                  <>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">Immo Info</p>
                      {overlaps.immo.map((a) => <p key={a.id} className="text-sm tabular-nums text-foreground">{describeAssignment(a, "immo")}</p>)}
                    </div>
                    <p className="text-xs text-muted-foreground">Se agregará la nueva asignación de Immo Info; el técnico verá los perfiles de ambas. Si querías cambiar la existente, {isDesktop ? "edítala en la pestaña de asignaciones" : "edítala desde una PC"}.</p>
                    <div className="flex items-center gap-2">
                      <Checkbox id="wizard-overlap-ack" checked={overlapAck} onCheckedChange={(v) => setOverlapAck(!!v)} />
                      <Label htmlFor="wizard-overlap-ack" className="cursor-pointer text-sm">Entiendo, guardar de todos modos</Label>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* El editor de la base de vehículos trae sus propios botones. */}
      {!vehicleEditor && (
        <div
          className={cn(
            "shrink-0 border-t border-border bg-background pt-3",
            isDesktop ? "px-8 pb-4 [&>div]:mx-auto [&>div]:max-w-3xl" : "px-5 pb-[max(env(safe-area-inset-bottom),12px)]",
          )}
        >
          {creatingProfile ? (
            <div className={cn("flex gap-2", isDesktop && "justify-end")}>
              <Button variant="outline" className={footerBtn} onClick={() => setCreatingProfile(false)} disabled={savingProfile}>Cancelar</Button>
              <Button className={footerBtn} onClick={saveNewProfile} disabled={isUploading || savingProfile}>
                {savingProfile ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                {savingProfile ? "Guardando…" : "Guardar perfil"}
              </Button>
            </div>
          ) : (
            <div className={cn("flex gap-2", isDesktop && "justify-end")}>
              <Button variant="outline" className={cn("rounded-full", isDesktop ? "mr-auto min-w-32" : "flex-1")} onClick={back} disabled={busy}>
                {anyPartSaved ? <><X className="mr-1 h-4 w-4" /> Cerrar</> : <><ChevronLeft className="mr-1 h-4 w-4" /> {step === STEP_VEHICLE ? "Cancelar" : "Atrás"}</>}
              </Button>
              {isLast ? (
                <Button className={footerBtn} onClick={handleSave} disabled={saving || (hasOverlaps && !overlapAck)}>
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : anyPartSaved ? <RotateCw className="mr-1.5 h-4 w-4" /> : <Check className="mr-1.5 h-4 w-4" />}
                  {saving ? "Guardando…" : anyPartSaved ? "Reintentar" : "Guardar"}
                </Button>
              ) : (
                <Button className={footerBtn} onClick={next}>
                  {/* Sin selección, «Siguiente» equivale a omitir: se dice explícitamente. */}
                  {step === STEP_KEYCODE && validKcIds.length === 0
                    ? "Omitir Keycode"
                    : step === STEP_IMMO && validImIds.length === 0 && validKcIds.length > 0
                      ? "Omitir Immo Info"
                      : "Siguiente"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      </div>
      </div>

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
