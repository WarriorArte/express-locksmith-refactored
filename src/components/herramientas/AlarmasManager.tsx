import { useState, useMemo, useRef, useCallback } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Upload, Radio,
  Search, Car, X, Save, ShieldCheck,
  FileText, Edit3, Check, AlertCircle, FolderOpen, Info, Images,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import type {
  AlarmaProfile, AlarmaDataValue, AlarmaDetalle, AlarmaNote, AlarmaYearImage, AlarmaYearValue, AlarmaVehicleImage, ToolAssignment,
} from "@/types";
import { useImageFolder, getImageByFile, openImageFolder } from "@/hooks/useImageFolder";

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID();
}

function emptyDetalle(): AlarmaDetalle {
  return { id: uid(), label: "", value: "" };
}

function defaultDetalles(): AlarmaDetalle[] {
  return [
    { id: uid(), label: "Cable", value: "" },
    { id: uid(), label: "Polaridad", value: "" },
    { id: uid(), label: "Ubicación", value: "" },
  ];
}

function emptyDataValue(): AlarmaDataValue {
  return { id: uid(), title: "", details: defaultDetalles(), imageUrl: undefined, notes: [] };
}

function emptyProfile(): Omit<AlarmaProfile, "id" | "dateAdded"> {
  return { nombre: "", marca: "", modelo: "", variante: "", yearRange: "", dataValues: [] };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Corrige mojibake latin1→utf8 (ej. "UbicaciÃ³n" → "Ubicación")
function fixEncoding(s: string): string {
  if (!s) return s;
  try {
    return decodeURIComponent(escape(s));
  } catch {
    return s;
  }
}

type ProfileDraft = Omit<AlarmaProfile, "id" | "dateAdded">;

function parseImportedJson(raw: unknown): ProfileDraft {
  if (typeof raw !== "object" || raw === null) throw new Error("JSON inválido");
  const j = raw as Record<string, unknown>;

  const nombre = [j.brand, j.base_model, j.variant, j.year_range]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ") || "Perfil importado";

  const rawValues = Array.isArray(j.dataValues) ? j.dataValues : [];

  const dataValues: AlarmaDataValue[] = rawValues.map((item: unknown) => {
    const dv = item as Record<string, unknown>;
    const rawDetails = Array.isArray(dv.details) ? dv.details : [];

    const details: AlarmaDetalle[] = rawDetails.map((d: unknown) => {
      const det = d as Record<string, unknown>;

      // year_values: valores específicos por rango de año
      const rawYearVals = Array.isArray(det.year_values) ? det.year_values : [];
      const yearValues: AlarmaYearValue[] = rawYearVals.map((yv: unknown) => {
        const y = yv as Record<string, unknown>;
        return {
          years: Array.isArray(y.years) ? (y.years as string[]) : [],
          value: fixEncoding(String(y.value ?? "")),
        };
      });

      return {
        id: uid(),
        label: fixEncoding(String(det.label ?? "")),
        value: fixEncoding(String(det.value ?? "")),
        yearValues: yearValues.length > 0 ? yearValues : undefined,
      };
    });

    // images[]: referencias de imágenes por año (rutas locales, sin URL accesible)
    const rawImages = Array.isArray(dv.images) ? dv.images : [];
    const yearImages: AlarmaYearImage[] = rawImages.map((img: unknown) => {
      const i = img as Record<string, unknown>;
      return {
        sku: String(i.sku ?? ""),
        file: String(i.file ?? ""),
        years: Array.isArray(i.years) ? (i.years as string[]) : [],
      };
    });

    // imageUrl queda vacío: button.onclick ahora son rutas locales no accesibles.
    // El usuario sube la imagen manualmente.

    // Importa notas (image_variation y coverage)
    const rawNotes = Array.isArray(dv.notes) ? dv.notes : [];
    const notes: AlarmaNote[] = rawNotes.map((n: unknown) => {
      const note = n as Record<string, unknown>;
      return {
        id: uid(),
        type: note.type === "coverage" ? "coverage" : "image_variation",
        title: fixEncoding(String(note.title ?? "")),
        text: typeof note.text === "string" ? fixEncoding(note.text) : undefined,
        documented: Array.isArray(note.documented) ? note.documented as string[] : undefined,
        probable: Array.isArray(note.probable) ? note.probable as string[] : undefined,
      };
    });

    return {
      id: uid(),
      title: fixEncoding(String(dv.title ?? "")),
      details,
      imageUrl: undefined,
      yearImages: yearImages.length > 0 ? yearImages : undefined,
      notes: notes.length > 0 ? notes : undefined,
    };
  });

  // vehicle_images: logo y fotos del vehículo por rango de año
  const rawVehicleImages = Array.isArray(j.vehicle_images) ? j.vehicle_images : [];
  const vehicleImages: AlarmaVehicleImage[] = rawVehicleImages.map((vi: unknown) => {
    const v = vi as Record<string, unknown>;
    return {
      sku: String(v.sku ?? ""),
      file: String(v.file ?? ""),
      years: Array.isArray(v.years) ? (v.years as string[]) : [],
      kind: v.kind === "logo" ? "logo" : "vehicle",
    };
  });

  return {
    nombre,
    marca: typeof j.brand === "string" ? j.brand : "",
    modelo: typeof j.base_model === "string" ? j.base_model : "",
    variante: typeof j.variant === "string" ? j.variant : "",
    yearRange: typeof j.year_range === "string" ? j.year_range : "",
    vehicleImages: vehicleImages.length > 0 ? vehicleImages : undefined,
    dataValues,
  };
}

// ── VehicleDb interface (subset needed here) ─────────────────────────────────

interface VehicleDbRef {
  makes: string[];
  getModelsByMake: (make: string) => string[];
  getYearsByMakeModel: (make: string, model: string) => number[];
}

// ── AlarmaDataValueCard ───────────────────────────────────────────────────────

interface DataValueCardProps {
  dv: AlarmaDataValue;
  index: number;
  onChange: (updated: AlarmaDataValue) => void;
  onDelete: () => void;
}

function AlarmaDataValueCard({ dv, index, onChange, onDelete }: DataValueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const { folderName } = useImageFolder();

  // Todas las variantes de imagen resueltas desde la carpeta
  const folderImageVariants = useMemo(() => {
    if (dv.imageUrl || !dv.yearImages?.length) return [];
    return dv.yearImages
      .map((yi) => ({ ...yi, url: getImageByFile(yi.file) }))
      .filter((yi) => yi.url !== null) as (typeof dv.yearImages[0] & { url: string })[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dv.imageUrl, dv.yearImages, folderName]);

  const updateTitle = (title: string) => onChange({ ...dv, title });

  const updateDetalle = (id: string, field: "label" | "value", val: string) =>
    onChange({
      ...dv,
      details: dv.details.map((d) => (d.id === id ? { ...d, [field]: val } : d)),
    });

  const addDetalle = () =>
    onChange({ ...dv, details: [...dv.details, emptyDetalle()] });

  const deleteDetalle = (id: string) =>
    onChange({ ...dv, details: dv.details.filter((d) => d.id !== id) });

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La imagen no puede superar 3 MB");
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      onChange({ ...dv, imageUrl: b64 });
    } catch {
      toast.error("Error al cargar la imagen");
    }
  };

  const removeImage = () => onChange({ ...dv, imageUrl: undefined });

  return (
    <Card className={`transition-all border ${expanded ? "border-primary/50 shadow-sm" : "border-border hover:border-primary/30"}`}>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">
            {index + 1}
          </span>
          <Input
            value={dv.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Título del punto (ej. 12 Volts, Arranque…)"
            className="h-8 text-sm font-medium border-0 shadow-none focus-visible:ring-0 px-1 flex-1"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-1 shrink-0">
            {dv.imageUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Tiene imagen" />
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {dv.details.length}
            </Badge>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded body */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
                {/* Details table */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Campos
                  </p>
                  {dv.details.map((det) => (
                    <div key={det.id} className="flex items-center gap-2">
                      <Input
                        value={det.label}
                        onChange={(e) => updateDetalle(det.id, "label", e.target.value)}
                        placeholder="Etiqueta"
                        className="h-7 text-xs w-28 shrink-0"
                      />
                      <Input
                        value={det.value}
                        onChange={(e) => updateDetalle(det.id, "value", e.target.value)}
                        placeholder="Valor"
                        className="h-7 text-xs flex-1"
                      />
                      <button
                        onClick={() => deleteDetalle(det.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addDetalle}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar campo
                  </button>
                </div>

                <Separator />

                {/* Image section */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Imagen de referencia
                  </p>

                  {/* Uploaded image (priority) */}
                  {dv.imageUrl && (
                    <div className="relative w-full max-w-xs group">
                      <img
                        src={dv.imageUrl}
                        alt="Referencia"
                        className="rounded-lg border border-border object-cover w-full max-h-40"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-border hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Folder-resolved variants (all year ranges) */}
                  {!dv.imageUrl && folderImageVariants.length > 0 && (
                    <div className="space-y-2">
                      {folderImageVariants.map((yi, i) => {
                        const yearLabel = `${yi.years[0]}–${yi.years[yi.years.length - 1]}`;
                        return (
                          <div key={i} className="space-y-1">
                            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {yearLabel}
                            </p>
                            <div className="relative group">
                              <img
                                src={yi.url}
                                alt={`Referencia ${yearLabel}`}
                                className="rounded-lg border border-border object-contain w-full max-h-36 bg-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => imgRef.current?.click()}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Reemplazar con imagen personalizada
                      </button>
                    </div>
                  )}

                  {/* No image resolved — pending folder or no images in JSON */}
                  {!dv.imageUrl && folderImageVariants.length === 0 && (
                    <div className="space-y-1.5">
                      {dv.yearImages?.length ? (
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
                          <Images className="w-3.5 h-3.5 shrink-0" />
                          {dv.yearImages.length} imagen{dv.yearImages.length !== 1 ? "es" : ""} en JSON — selecciona la carpeta para previsualizar
                        </div>
                      ) : null}
                      <button
                        onClick={() => imgRef.current?.click()}
                        className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg px-4 py-2.5 hover:border-primary/40 hover:text-primary transition-colors w-full"
                      >
                        <Upload className="w-4 h-4" /> Subir imagen personalizada
                      </button>
                    </div>
                  )}

                  <input
                    ref={imgRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImage}
                  />
                </div>

                {/* Notes (read-only, imported from JSON) */}
                {dv.notes && dv.notes.length > 0 && (
                  <div className="space-y-1.5">
                    <Separator />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Notas
                    </p>
                    {dv.notes.map((note) =>
                      note.type === "image_variation" ? (
                        <div
                          key={note.id}
                          className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">{note.title}</p>
                            {note.text && <p className="mt-0.5 opacity-80">{note.text}</p>}
                          </div>
                        </div>
                      ) : (
                        <div
                          key={note.id}
                          className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-800 dark:text-blue-300"
                        >
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">{note.title}</p>
                            {note.documented && note.documented.length > 0 && (
                              <p className="mt-0.5">
                                <span className="opacity-70">Documentado: </span>
                                {note.documented[0]} – {note.documented[note.documented.length - 1]}
                              </p>
                            )}
                            {note.probable && note.probable.length > 0 && (
                              <p>
                                <span className="opacity-70">Probable: </span>
                                {note.probable[0]} – {note.probable[note.probable.length - 1]}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── AlarmaProfileEditor ───────────────────────────────────────────────────────

interface ProfileEditorProps {
  initial: AlarmaProfile | null;
  defaultValues?: ProfileDraft;
  onSave: (p: AlarmaProfile) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

function AlarmaProfileEditor({ initial, defaultValues, onSave, onDelete, onCancel }: ProfileEditorProps) {
  const isNew = !initial;
  const [form, setForm] = useState<ProfileDraft>(
    initial
      ? {
          nombre: initial.nombre,
          marca: initial.marca ?? "",
          modelo: initial.modelo ?? "",
          variante: initial.variante ?? "",
          yearRange: initial.yearRange ?? "",
          vehicleImages: initial.vehicleImages,
          dataValues: initial.dataValues,
        }
      : (defaultValues ?? emptyProfile())
  );

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const updateDataValue = useCallback((updated: AlarmaDataValue) => {
    setForm((prev) => ({
      ...prev,
      dataValues: prev.dataValues.map((dv) => (dv.id === updated.id ? updated : dv)),
    }));
  }, []);

  const deleteDataValue = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      dataValues: prev.dataValues.filter((dv) => dv.id !== id),
    }));
  }, []);

  const addDataValue = () => {
    const newDv = emptyDataValue();
    setForm((prev) => ({ ...prev, dataValues: [...prev.dataValues, newDv] }));
  };

  const handleSave = () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre del perfil es requerido");
      return;
    }
    const profile: AlarmaProfile = {
      id: initial?.id ?? uid(),
      dateAdded: initial?.dateAdded ?? new Date().toISOString(),
      ...form,
      nombre: form.nombre.trim(),
    };
    onSave(profile);
    toast.success(isNew ? "Perfil de alarma creado" : "Perfil actualizado");
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!confirm(`¿Eliminar el perfil "${initial.nombre}"? Esta acción no se puede deshacer.`)) return;
    onDelete?.(initial.id);
    toast.success("Perfil eliminado");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {isNew ? "Nuevo Perfil" : "Editar Perfil"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && onDelete && (
            <Button variant="ghost" size="sm" onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1" /> Guardar
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto custom-scrollbar min-h-0 pt-4 space-y-5">
        {/* Header info */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Información del Perfil
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nombre <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.nombre}
                onChange={(e) => setField("nombre", e.target.value)}
                placeholder="Ej. Toyota 4Runner 2010-2011"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Marca del vehículo</label>
              <Input
                value={form.marca}
                onChange={(e) => setField("marca", e.target.value)}
                placeholder="Toyota, Honda…"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Modelo</label>
              <Input
                value={form.modelo}
                onChange={(e) => setField("modelo", e.target.value)}
                placeholder="4Runner, Civic…"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Variante</label>
              <Input
                value={form.variante}
                onChange={(e) => setField("variante", e.target.value)}
                placeholder="SR5, EX, LX…"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rango de años</label>
              <Input
                value={form.yearRange}
                onChange={(e) => setField("yearRange", e.target.value)}
                placeholder="2010-2011"
                className="h-9"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Data values */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Puntos de Datos
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.dataValues.length} punto{form.dataValues.length !== 1 ? "s" : ""} cargado{form.dataValues.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addDataValue}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Punto
            </Button>
          </div>

          {form.dataValues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-xl text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin puntos de datos</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Haz clic en "Agregar Punto" para cargar el primero
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {form.dataValues.map((dv, i) => (
                <AlarmaDataValueCard
                  key={dv.id}
                  dv={dv}
                  index={i}
                  onChange={updateDataValue}
                  onDelete={() => deleteDataValue(dv.id)}
                />
              ))}
            </div>
          )}

          {form.dataValues.length > 0 && (
            <Button variant="outline" size="sm" className="w-full" onClick={addDataValue}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar otro punto
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AlarmaAsignacionTab ───────────────────────────────────────────────────────

interface AsignacionTabProps {
  alarmaProfiles: AlarmaProfile[];
  assignments: ToolAssignment[];
  onSaveAssignment: (a: ToolAssignment) => void;
  onUpdateAssignment: (a: ToolAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  vehicleDb: VehicleDbRef;
}

type AsignacionFormState = {
  make: string;
  model: string;
  yearStart: string;
  yearEnd: string;
  alarmaProfileIds: string[];
};

function emptyAsignacionForm(): AsignacionFormState {
  return { make: "", model: "", yearStart: "", yearEnd: "", alarmaProfileIds: [] };
}

function AlarmaAsignacionTab({
  alarmaProfiles,
  assignments,
  onSaveAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  vehicleDb,
}: AsignacionTabProps) {
  const [searchQ, setSearchQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AsignacionFormState>(emptyAsignacionForm());

  // Assignments that reference alarmaProfileIds
  const alarmaAssignments = useMemo(
    () => assignments.filter((a) => (a.alarmaProfileIds?.length ?? 0) > 0),
    [assignments]
  );

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return alarmaAssignments;
    const q = searchQ.toLowerCase();
    return alarmaAssignments.filter(
      (a) =>
        a.make.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        String(a.yearStart).includes(q)
    );
  }, [alarmaAssignments, searchQ]);

  const availableModels = useMemo(
    () => (form.make ? vehicleDb.getModelsByMake(form.make) : []),
    [form.make, vehicleDb]
  );

  const availableYears = useMemo(
    () => (form.make && form.model ? vehicleDb.getYearsByMakeModel(form.make, form.model) : []),
    [form.make, form.model, vehicleDb]
  );

  const setField = <K extends keyof AsignacionFormState>(k: K, v: AsignacionFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleProfile = (id: string) =>
    setField(
      "alarmaProfileIds",
      form.alarmaProfileIds.includes(id)
        ? form.alarmaProfileIds.filter((x) => x !== id)
        : [...form.alarmaProfileIds, id]
    );

  const startCreate = () => {
    setForm(emptyAsignacionForm());
    setEditingId(null);
    setCreating(true);
  };

  const startEdit = (a: ToolAssignment) => {
    setForm({
      make: a.make,
      model: a.model,
      yearStart: String(a.yearStart),
      yearEnd: String(a.yearEnd),
      alarmaProfileIds: a.alarmaProfileIds ?? [],
    });
    setEditingId(a.id);
    setCreating(false);
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.make || !form.model || !form.yearStart || !form.yearEnd) {
      toast.error("Completa marca, modelo y rango de años");
      return;
    }
    if (form.alarmaProfileIds.length === 0) {
      toast.error("Selecciona al menos un perfil de alarma");
      return;
    }

    const yearStart = Number(form.yearStart);
    const yearEnd = Number(form.yearEnd);
    if (yearStart > yearEnd) {
      toast.error("El año inicial no puede ser mayor que el final");
      return;
    }

    if (creating) {
      onSaveAssignment({
        id: uid(),
        make: form.make,
        model: form.model,
        yearStart,
        yearEnd,
        tools: ["alarmas"],
        workshops: [],
        keycodeProfileIds: [],
        alarmaProfileIds: form.alarmaProfileIds,
        dateAdded: new Date().toISOString(),
      });
      toast.success("Asignación creada");
    } else if (editingId) {
      const existing = assignments.find((a) => a.id === editingId);
      if (!existing) return;
      onUpdateAssignment({
        ...existing,
        make: form.make,
        model: form.model,
        yearStart,
        yearEnd,
        alarmaProfileIds: form.alarmaProfileIds,
      });
      toast.success("Asignación actualizada");
    }

    cancelForm();
  };

  const handleDelete = (a: ToolAssignment) => {
    if (!confirm(`¿Eliminar asignación ${a.make} ${a.model} ${a.yearStart}-${a.yearEnd}?`)) return;
    onDeleteAssignment(a.id);
    toast.success("Asignación eliminada");
  };

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" /> Asignación a Vehículos
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vincula perfiles de alarma a un rango de marca / modelo / año
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
          <Button size="sm" onClick={startCreate} disabled={creating || !!editingId}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nueva asignación
          </Button>
        </div>
      </div>

      {/* Create / Edit form */}
      <AnimatePresence>
        {(creating || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-primary/50 rounded-xl p-4 bg-primary/5 space-y-4 shrink-0"
          >
            <p className="text-sm font-semibold">
              {creating ? "Nueva asignación de alarma" : "Editar asignación"}
            </p>

            {/* Vehicle selectors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                <select
                  value={form.make}
                  onChange={(e) => { setField("make", e.target.value); setField("model", ""); setField("yearStart", ""); setField("yearEnd", ""); }}
                  className={selectClass}
                >
                  <option value="">-- Marca --</option>
                  {vehicleDb.makes.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                <select
                  value={form.model}
                  onChange={(e) => { setField("model", e.target.value); setField("yearStart", ""); setField("yearEnd", ""); }}
                  disabled={!form.make}
                  className={selectClass}
                >
                  <option value="">-- Modelo --</option>
                  {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Año inicio</label>
                <select
                  value={form.yearStart}
                  onChange={(e) => setField("yearStart", e.target.value)}
                  disabled={!form.model}
                  className={selectClass}
                >
                  <option value="">-- Año --</option>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Año fin</label>
                <select
                  value={form.yearEnd}
                  onChange={(e) => setField("yearEnd", e.target.value)}
                  disabled={!form.yearStart}
                  className={selectClass}
                >
                  <option value="">-- Año --</option>
                  {availableYears
                    .filter((y) => !form.yearStart || y >= Number(form.yearStart))
                    .map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Profile picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Perfiles de alarma aplicables
              </label>
              {alarmaProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aún no hay perfiles de alarma. Créalos primero en la pestaña "Perfiles de Alarma".
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {alarmaProfiles.map((p) => {
                    const selected = form.alarmaProfileIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected ? "border-primary bg-primary" : "border-muted-foreground"
                          }`}
                        >
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() => toggleProfile(p.id)}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{p.nombre}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {[p.marca, p.modelo, p.yearRange].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={cancelForm}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Guardar asignación</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment list */}
      <div className="flex-1 overflow-auto custom-scrollbar min-h-0 space-y-2">
        {alarmaProfiles.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Crea perfiles de alarma primero para poder asignarlos a vehículos.
          </div>
        )}

        {filtered.length === 0 && alarmaAssignments.length > 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Sin resultados para "{searchQ}"
          </div>
        )}

        {alarmaAssignments.length === 0 && alarmaProfiles.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-xl text-center">
            <Car className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Sin asignaciones aún</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Crea una asignación para vincular perfiles a vehículos
            </p>
          </div>
        )}

        {filtered.map((a) => {
          const names = (a.alarmaProfileIds ?? [])
            .map((id) => alarmaProfiles.find((p) => p.id === id)?.nombre)
            .filter(Boolean);
          const isEditing = editingId === a.id;

          return (
            <Card key={a.id} className={`transition-all ${isEditing ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/30"}`}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {a.make} {a.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.yearStart === a.yearEnd ? a.yearStart : `${a.yearStart} – ${a.yearEnd}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {names.map((n, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startEdit(a)}>
                    <Edit3 className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(a)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── AlarmasManager (main) ─────────────────────────────────────────────────────

export interface AlarmasManagerProps {
  profiles: AlarmaProfile[];
  onSave: (p: AlarmaProfile) => void;
  onUpdate: (p: AlarmaProfile) => void;
  onDelete: (id: string) => void;
  assignments: ToolAssignment[];
  onSaveAssignment: (a: ToolAssignment) => void;
  onUpdateAssignment: (a: ToolAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  vehicleDb: VehicleDbRef;
}

export function AlarmasManager({
  profiles,
  onSave,
  onUpdate,
  onDelete,
  assignments,
  onSaveAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  vehicleDb,
}: AlarmasManagerProps) {
  const [searchQ, setSearchQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importedDraft, setImportedDraft] = useState<ProfileDraft | undefined>(undefined);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const { folderName, imageCount, isSupported } = useImageFolder();

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const draft = parseImportedJson(parsed);
        setImportedDraft(draft);
        setSelectedId(null);
        setCreating(true);
        toast.success(
          `JSON cargado: ${draft.dataValues.length} punto${draft.dataValues.length !== 1 ? "s" : ""} de datos`
        );
      } catch (err) {
        toast.error("No se pudo leer el archivo. Verifica que sea un JSON válido.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return profiles;
    const q = searchQ.toLowerCase();
    return profiles.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.marca ?? "").toLowerCase().includes(q) ||
        (p.modelo ?? "").toLowerCase().includes(q)
    );
  }, [profiles, searchQ]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  const showEditor = creating || !!selectedId;

  const handleSave = (p: AlarmaProfile) => {
    if (creating) {
      onSave(p);
      setSelectedId(p.id);
    } else {
      onUpdate(p);
    }
    setCreating(false);
    setImportedDraft(undefined);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setSelectedId(null);
  };

  const startCreate = () => {
    setSelectedId(null);
    setImportedDraft(undefined);
    setCreating(true);
  };

  const cancelEditor = () => {
    setCreating(false);
    setSelectedId(null);
    setImportedDraft(undefined);
  };

  return (
    <Tabs defaultValue="perfiles" className="flex flex-col h-full min-h-0">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 shrink-0 pb-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" /> Auto Alarmas
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestión de perfiles de cableado y asignación a vehículos
          </p>
        </div>
        <TabsList className="inline-flex w-full xl:w-auto h-auto p-1 bg-muted/50 border">
          <TabsTrigger value="perfiles" className="flex-1 xl:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShieldCheck className="w-4 h-4" /> Perfiles de Alarma
          </TabsTrigger>
          <TabsTrigger value="asignacion" className="flex-1 xl:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Car className="w-4 h-4" /> Asignación a Vehículos
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── Tab Perfiles ── */}
      <TabsContent value="perfiles" className="flex-1 m-0 min-h-0 data-[state=inactive]:hidden">
        <div className="flex h-full min-h-0 gap-4">
          {/* Profile list panel */}
          <div className="w-72 xl:w-80 flex flex-col min-h-0 shrink-0 border rounded-xl bg-card shadow-sm">
            <div className="p-3 border-b border-border space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar perfil…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="flex gap-1.5">
                <Button className="flex-1 h-8 text-xs" onClick={startCreate}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  onClick={() => jsonInputRef.current?.click()}
                  title="Importar desde archivo JSON"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1" /> Importar JSON
                </Button>
              </div>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleJsonFile}
              />

              {/* Folder image selector */}
              {isSupported && (
                <button
                  onClick={() => openImageFolder()}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                    folderName
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40"
                      : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  <Images className="w-3.5 h-3.5 shrink-0" />
                  {folderName ? (
                    <span className="truncate flex-1 text-left">
                      <span className="font-medium">{folderName}</span>
                      <span className="opacity-70 ml-1">({imageCount} imgs)</span>
                    </span>
                  ) : (
                    <span>Seleccionar carpeta de imágenes…</span>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar min-h-0 p-2 space-y-1">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  {profiles.length === 0 ? "Sin perfiles aún" : `Sin resultados para "${searchQ}"`}
                </div>
              )}
              {filtered.map((p) => {
                const active = selectedId === p.id && !creating;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedId(p.id); setCreating(false); }}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors group ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${active ? "text-primary-foreground" : ""}`}>
                          {p.nombre}
                        </p>
                        <p className={`text-[10px] truncate mt-0.5 ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {[p.marca, p.modelo, p.yearRange].filter(Boolean).join(" · ") || "Sin detalles"}
                        </p>
                      </div>
                      <Badge
                        variant={active ? "outline" : "secondary"}
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${active ? "border-primary-foreground/40 text-primary-foreground/80" : ""}`}
                      >
                        {p.dataValues.length}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor panel */}
          <div className="flex-1 min-h-0 border rounded-xl bg-card shadow-sm p-4">
            {showEditor ? (
              <AlarmaProfileEditor
                key={creating ? `new-${importedDraft ? "import" : "blank"}` : selectedId ?? "none"}
                initial={creating ? null : selectedProfile}
                defaultValues={creating ? importedDraft : undefined}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEditor}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <Radio className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Selecciona un perfil</p>
                  <p className="text-sm text-muted-foreground/70 mt-0.5">
                    Elige un perfil de la lista o crea uno nuevo
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={startCreate}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo perfil
                </Button>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ── Tab Asignación ── */}
      <TabsContent value="asignacion" className="flex-1 m-0 min-h-0 data-[state=inactive]:hidden border rounded-xl bg-card shadow-sm p-4">
        <AlarmaAsignacionTab
          alarmaProfiles={profiles}
          assignments={assignments}
          onSaveAssignment={onSaveAssignment}
          onUpdateAssignment={onUpdateAssignment}
          onDeleteAssignment={onDeleteAssignment}
          vehicleDb={vehicleDb}
        />
      </TabsContent>
    </Tabs>
  );
}
