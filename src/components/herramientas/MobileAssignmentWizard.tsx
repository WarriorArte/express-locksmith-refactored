/**
 * Asistente móvil del SuperAdmin: crea en un solo flujo una asignación que combina
 * Keycode e Immo Info para un vehículo (existente o nuevo). Permite crear perfiles
 * Immo al vuelo; los perfiles Keycode solo se crean en escritorio.
 */
import { useMemo, useState } from "react";
import { Car, Check, ChevronLeft, ChevronRight, Cpu, Key, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleHeader } from "@/design-system/layout/ModuleHeader";
import { ChipRow, FilterChip } from "@/design-system/detail/DetailScreen";
import { NativeSelectField } from "@/design-system/pickers";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useFileUpload } from "@/hooks/useFileUpload";
import { resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@/data/carDatabase";
import type {
  ImmoAssignmentDetail, ImmoCatalogItem, ImmoProfile, KeycodeProfile,
  LockKey, LockSelectionsMap, ToolAssignment,
} from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";
import { emptyDetail, emptyProfile, profileTitle, ImmoDetailFields, ImmoProfileEditor } from "./ImmoManager";

type Detail = Omit<ImmoAssignmentDetail, "profileId">;

interface VehicleDbLike {
  makes: string[];
  getModelsByMake: (make: string) => string[];
  getYearsByMakeModel: (make: string, model: string) => number[];
  addMake: (make: string, category: VehicleCategory) => void;
  addModel: (make: string, model: string, yearStart: number, yearEnd: number) => void;
}

interface Props {
  onClose: () => void;
  keycodeProfiles: KeycodeProfile[];
  immoProfiles: ImmoProfile[];
  onCreateImmoProfile: (p: ImmoProfile) => void;
  catalog: ImmoCatalogItem[];
  vehicleDb: VehicleDbLike;
  onSaveAssignment: (a: ToolAssignment) => void;
}

const STEPS = ["Vehículo", "Keycode", "Immo Info", "Datos Immo", "Resumen"] as const;
const CATEGORY_LABELS: Record<VehicleCategory, string> = { Vehiculo: "Auto", Camion: "Camión", Motocicleta: "Moto" };

function keycodeBittingLength(p: KeycodeProfile) {
  const axes = p.bittingConfig.axes;
  return axes && axes.length >= 2 ? axes.reduce((s, a) => s + a.length, 0) : p.bittingConfig.length;
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

export function MobileAssignmentWizard({ onClose, keycodeProfiles, immoProfiles, onCreateImmoProfile, catalog, vehicleDb, onSaveAssignment }: Props) {
  const [step, setStep] = useState(0);

  // ── Vehículo ──
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [category, setCategory] = useState<VehicleCategory>("Vehiculo");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  const models = useMemo(() => (make ? vehicleDb.getModelsByMake(make).filter(Boolean) : []), [make, vehicleDb]);
  const years = useMemo(() => (make && model ? vehicleDb.getYearsByMakeModel(make, model).filter((y) => y > 0) : []), [make, model, vehicleDb]);

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [createdProfiles, setCreatedProfiles] = useState<ImmoProfile[]>([]);
  const { currentWorkshop } = useWorkshop();
  const { uploadFile, isUploading } = useFileUpload({ folder: "immo", workshopCode: currentWorkshop?.code });

  const allImmoProfiles = useMemo(() => {
    const ids = new Set(immoProfiles.map((p) => p.id));
    return [...immoProfiles, ...createdProfiles.filter((p) => !ids.has(p.id))];
  }, [immoProfiles, createdProfiles]);

  const transponderCatalog = useMemo(() => catalog.filter((i) => i.category === "transponder"), [catalog]);
  const equipoCatalog = useMemo(() => catalog.filter((i) => i.category === "equipo"), [catalog]);

  const filteredKc = useMemo(() => {
    const q = kcSearch.trim().toLowerCase();
    if (!q) return keycodeProfiles;
    return keycodeProfiles.filter((p) => [p.series, p.icCard, p.internalReference].some((v) => (v || "").toLowerCase().includes(q)));
  }, [keycodeProfiles, kcSearch]);

  const filteredIm = useMemo(() => {
    const q = imSearch.trim().toLowerCase();
    if (!q) return allImmoProfiles;
    return allImmoProfiles.filter((p) => profileTitle(p).toLowerCase().includes(q));
  }, [allImmoProfiles, imSearch]);

  const toggleKc = (id: string) => setKcIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleLock = (pid: string, lk: LockKey, length: number) =>
    setLocks((prev) => {
      const pl = { ...(prev[pid] ?? {}) };
      if (pl[lk]) delete pl[lk];
      else pl[lk] = Array.from({ length }, () => true);
      return { ...prev, [pid]: pl };
    });

  const toggleIm = (id: string) => {
    setImIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setDetails((prev) => (prev[id] ? prev : { ...prev, [id]: emptyDetail() }));
  };

  const saveNewProfile = () => {
    if (!profileDraft.marca.trim() && !profileDraft.fccId.trim()) {
      toast.error("Ingresa al menos Marca o FCC ID.");
      return;
    }
    const p: ImmoProfile = { id: crypto.randomUUID(), dateAdded: new Date().toLocaleDateString(), ...profileDraft };
    onCreateImmoProfile(p);
    setCreatedProfiles((prev) => [...prev, p]);
    toggleIm(p.id);
    setProfileDraft(emptyProfile());
    setCreatingProfile(false);
    toast.success("Perfil Immo creado y seleccionado.");
  };

  const ys = parseInt(yearStart);
  const ye = parseInt(yearEnd);
  const vehicleValid = !!make.trim() && !!model.trim() && !isNaN(ys) && !isNaN(ye) && ys <= ye && ys > 1900 && ye < 2100;

  const validateStep = (s: number): boolean => {
    if (s === 0 && !vehicleValid) {
      toast.error(isNewVehicle ? "Escribe marca, modelo y un rango de años válido." : "Elige marca, modelo y rango de años.");
      return false;
    }
    if (s === 2 && kcIds.length === 0 && imIds.length === 0) {
      toast.error("Selecciona al menos un perfil de Keycode o de Immo Info.");
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    // Si no hay perfiles Immo, se salta el paso de datos Immo.
    if (step === 2 && imIds.length === 0) setStep(4);
    else setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    if (creatingProfile) { setCreatingProfile(false); return; }
    if (step === 0) { onClose(); return; }
    if (step === 4 && imIds.length === 0) setStep(2);
    else setStep((s) => s - 1);
  };

  const handleSave = () => {
    if (!validateStep(0) || !validateStep(2)) return;
    const mk = make.trim();
    const md = model.trim();
    if (isNewVehicle) {
      const makeExists = vehicleDb.makes.some((m) => m.toLowerCase() === mk.toLowerCase());
      if (!makeExists) vehicleDb.addMake(mk, category);
      const existingYears = new Set(vehicleDb.getYearsByMakeModel(mk, md));
      const missing = Array.from({ length: ye - ys + 1 }, (_, i) => ys + i).some((y) => !existingYears.has(y));
      if (missing) vehicleDb.addModel(mk, md, ys, ye);
    }
    const cleanedLocks: LockSelectionsMap = {};
    kcIds.forEach((pid) => { if (locks[pid] && Object.keys(locks[pid]!).length) cleanedLocks[pid] = locks[pid]!; });
    const tools = [...(kcIds.length ? ["keycode"] : []), ...(imIds.length ? ["immo"] : [])];
    onSaveAssignment({
      id: crypto.randomUUID(),
      make: mk,
      model: md,
      yearStart: ys,
      yearEnd: ye,
      tools,
      workshops: [],
      dateAdded: new Date().toLocaleDateString(),
      keycodeProfileIds: kcIds,
      lockSelections: Object.keys(cleanedLocks).length ? cleanedLocks : undefined,
      immoDetails: imIds.map((id) => ({ profileId: id, ...(details[id] ?? emptyDetail()) })),
    });
    toast.success("Asignación creada.");
    onClose();
  };

  const vehicleLabel = make && model ? `${make} ${model}${yearStart && yearEnd ? ` · ${yearStart}–${yearEnd}` : ""}` : "Nueva asignación";
  const isLast = step === STEPS.length - 1;

  return (
    <div className="m3e-form fixed inset-0 z-50 flex flex-col bg-background">
      <div className="shrink-0 px-5 pt-app-top pb-3">
        <ModuleHeader
          title={creatingProfile ? "Nuevo perfil Immo" : STEPS[step]}
          subtitle={creatingProfile ? "Se agregará a esta asignación" : `Paso ${step + 1} de ${STEPS.length} · ${vehicleLabel}`}
          onBack={back}
          backLabel={step === 0 && !creatingProfile ? "Cerrar asistente" : "Paso anterior"}
          actions={
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose} aria-label="Cerrar asistente">
              <X className="h-5 w-5" />
            </Button>
          }
        />
        {!creatingProfile && (
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
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
        ) : step === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
              {[false, true].map((isNew) => (
                <button
                  key={String(isNew)}
                  type="button"
                  onClick={() => { setIsNewVehicle(isNew); setMake(""); setModel(""); setYearStart(""); setYearEnd(""); }}
                  className={cn("rounded-full py-2.5 text-sm font-semibold transition-colors", isNewVehicle === isNew ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                >
                  {isNew ? "Auto nuevo" : "Auto existente"}
                </button>
              ))}
            </div>

            {isNewVehicle ? (
              <div className="space-y-3">
                <ChipRow label="Tipo de vehículo">
                  {VEHICLE_CATEGORIES.map((c) => (
                    <FilterChip key={c} selected={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABELS[c]}</FilterChip>
                  ))}
                </ChipRow>
                <div className="space-y-1.5">
                  <Label>Marca</Label>
                  <Input list="wizard-makes" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota, Honda…" />
                  <datalist id="wizard-makes">{vehicleDb.makes.map((m) => <option key={m} value={m} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Corolla, Civic…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Año inicio</Label>
                    <Input inputMode="numeric" value={yearStart} onChange={(e) => setYearStart(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2015" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Año fin</Label>
                    <Input inputMode="numeric" value={yearEnd} onChange={(e) => setYearEnd(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2020" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">El auto se agregará a la base de vehículos al guardar la asignación.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <NativeSelectField label="Marca" value={make || null} placeholder="Elige la marca" options={vehicleDb.makes.map((m) => ({ value: m }))} onChange={(v) => { setMake(v); setModel(""); setYearStart(""); setYearEnd(""); }} />
                <NativeSelectField label="Modelo" value={model || null} placeholder="Elige el modelo" options={models.map((m) => ({ value: m }))} onChange={(v) => { setModel(v); setYearStart(""); setYearEnd(""); }} disabled={!make} />
                <div className="grid grid-cols-2 gap-2">
                  <NativeSelectField label="Año inicio" value={yearStart || null} placeholder="Desde" options={years.filter((y) => !yearEnd || y <= parseInt(yearEnd)).map((y) => ({ value: String(y) }))} onChange={setYearStart} disabled={!model} />
                  <NativeSelectField label="Año fin" value={yearEnd || null} placeholder="Hasta" options={years.filter((y) => !yearStart || y >= parseInt(yearStart)).map((y) => ({ value: String(y) }))} onChange={setYearEnd} disabled={!model} />
                </div>
                <p className="pt-1 text-xs text-muted-foreground">¿No aparece? Usa «Auto nuevo» para crearlo.</p>
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige las series de Keycode (opcional). Las series nuevas se crean desde una computadora.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={kcSearch} onChange={(e) => setKcSearch(e.target.value)} placeholder="Buscar serie o IC…" className="pl-9" />
            </div>
            {filteredKc.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hay series que coincidan.</p>}
            {filteredKc.map((p) => {
              const sel = kcIds.includes(p.id);
              const len = keycodeBittingLength(p);
              const pl = locks[p.id] ?? {};
              return (
                <div key={p.id} className="space-y-2">
                  <SelectableRow selected={sel} onClick={() => toggleKc(p.id)} title={`IC ${p.icCard} · ${p.series}`} subtitle={[p.internalReference, `${len} cortes`].filter(Boolean).join(" · ")} />
                  {sel && (
                    <div className="flex flex-wrap gap-2 pl-2">
                      {LOCK_ORDER.map((lk) => (
                        <FilterChip key={lk} selected={!!pl[lk]} onClick={() => toggleLock(p.id, lk, len)}>{LOCK_LABELS[lk]}</FilterChip>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige los remotos de Immo Info o crea uno nuevo si no existe.</p>
            <Button variant="secondary" className="w-full rounded-full" onClick={() => { setProfileDraft(emptyProfile()); setCreatingProfile(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> Crear perfil Immo
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={imSearch} onChange={(e) => setImSearch(e.target.value)} placeholder="Buscar marca o FCC ID…" className="pl-9" />
            </div>
            {filteredIm.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hay perfiles que coincidan. Crea uno nuevo.</p>}
            {filteredIm.map((p) => (
              <SelectableRow key={p.id} selected={imIds.includes(p.id)} onClick={() => toggleIm(p.id)} title={profileTitle(p)} subtitle={[p.frecuencia, p.bateria].filter(Boolean).join(" · ")} image={p.mainImage} />
            ))}
          </div>
        ) : step === 3 ? (
          <div className="space-y-6">
            {imIds.map((id) => {
              const p = allImmoProfiles.find((x) => x.id === id);
              if (!p) return null;
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
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Car className="h-4 w-4" /> Vehículo{isNewVehicle ? " nuevo" : ""}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{make} {model}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{yearStart}–{yearEnd}</p>
            </div>
            <div className="rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Key className="h-4 w-4" /> Keycode</p>
              {kcIds.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Sin series</p> : kcIds.map((id) => {
                const p = keycodeProfiles.find((x) => x.id === id);
                const lk = Object.keys(locks[id] ?? {}) as LockKey[];
                return p ? <p key={id} className="mt-1 text-sm font-medium text-foreground">IC {p.icCard} · {p.series}{lk.length ? <span className="text-muted-foreground"> · {lk.map((k) => LOCK_LABELS[k]).join(", ")}</span> : null}</p> : null;
              })}
            </div>
            <div className="rounded-3xl bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Cpu className="h-4 w-4" /> Immo Info</p>
              {imIds.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Sin perfiles</p> : imIds.map((id) => {
                const p = allImmoProfiles.find((x) => x.id === id);
                return p ? <p key={id} className="mt-1 text-sm font-medium text-foreground">{profileTitle(p)}{details[id]?.transponder ? <span className="text-muted-foreground"> · {details[id].transponder}</span> : null}</p> : null;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-background px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        {creatingProfile ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setCreatingProfile(false)}>Cancelar</Button>
            <Button className="flex-1 rounded-full" onClick={saveNewProfile} disabled={isUploading}><Check className="mr-1.5 h-4 w-4" /> Guardar perfil</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={back}>
              <ChevronLeft className="mr-1 h-4 w-4" /> {step === 0 ? "Cancelar" : "Atrás"}
            </Button>
            {isLast ? (
              <Button className="flex-1 rounded-full" onClick={handleSave}><Check className="mr-1.5 h-4 w-4" /> Guardar</Button>
            ) : (
              <Button className="flex-1 rounded-full" onClick={next}>Siguiente <ChevronRight className="ml-1 h-4 w-4" /></Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
