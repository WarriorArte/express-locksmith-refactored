/**
 * Biblioteca de procedimientos de programación del remoto (Immo Info).
 *
 * - Cada procedimiento guardado tiene marca + título + pasos y vive en el catálogo Immo
 *   (categoría «procedimiento»), así no requiere cambios en el servidor.
 * - También guarda el método de programación (Manual / OBD2); los guardados antes no lo
 *   tienen y entonces el vehículo conserva el suyo.
 * - Una asignación lo usa VINCULADO (`procedimientoId`): editar el procedimiento cambia
 *   todos los vehículos que lo usan. `procedimientoProgramacion` guarda una copia del
 *   texto como respaldo (si el procedimiento se borra, el técnico nunca ve vacío).
 * - «Desvincular» copia el texto a la asignación para editarlo solo ahí.
 * - Al borrar uno en uso, antes se deja la copia actualizada en cada vehículo.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, Link2, Link2Off, Loader2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/herramientas/RichTextField";
import { ProcedureSteps } from "@/components/herramientas/ProcedureSteps";
import { cn } from "@/lib/utils";
import type { ImmoAssignmentDetail, ImmoCatalogItem, ToolAssignment } from "@/types";
import { ProcedureLibraryContext, useProcedureLibrary, type ProcedureLibraryValue } from "./procedureContext";

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
/** Vehículos agrupados por marca: [marca, cantidad], de mayor a menor. */
function usageByMake(list: ToolAssignment[]): [string, number][] {
  const map = new Map<string, number>();
  list.forEach((a) => map.set(a.make, (map.get(a.make) ?? 0) + 1));
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
}

const plural = (n: number) => `${n} vehículo${n === 1 ? "" : "s"}`;
/** ¿El procedimiento tiene método guardado? (los anteriores a esta opción no). */
const hasMetodo = (p: ImmoCatalogItem | undefined) => !!p && (p.programacionManual !== undefined || p.programacionOBD !== undefined);
const metodoLabel = (manual?: boolean, obd?: boolean) => [manual && "Manual", obd && "OBD2"].filter(Boolean).join(" y ");

function MetodoFields({ id, manual, obd, onManual, onObd }: {
  id: string; manual: boolean; obd: boolean; onManual: (v: boolean) => void; onObd: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold">Método de programación del remoto</Label>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-manual`} checked={manual} onCheckedChange={(v) => onManual(!!v)} />
          <Label htmlFor={`${id}-manual`} className="cursor-pointer text-sm">Manual</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-obd`} checked={obd} onCheckedChange={(v) => onObd(!!v)} />
          <Label htmlFor={`${id}-obd`} className="cursor-pointer text-sm">Por OBD2</Label>
        </div>
      </div>
    </div>
  );
}

function UsageByMake({ used, className }: { used: ToolAssignment[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground", className)}>
      {usageByMake(used).map(([make, n]) => (
        <li key={make} className="tabular-nums"><span className="font-semibold text-foreground">{make}</span> · {plural(n)}</li>
      ))}
    </ul>
  );
}

// ── Contexto ───────────────────────────────────────────────────────────────────

export function ProcedureLibraryProvider({
  catalog, assignments, addItem, updateItem, deleteItem, updateAssignment, children,
}: {
  catalog: ImmoCatalogItem[];
  assignments: ToolAssignment[];
  addItem: (item: ImmoCatalogItem) => Promise<boolean> | void;
  updateItem: (item: ImmoCatalogItem) => Promise<boolean> | void;
  deleteItem: (id: string) => Promise<boolean> | void;
  updateAssignment: (a: ToolAssignment) => Promise<boolean>;
  children: ReactNode;
}) {
  const procedures = useMemo(
    () => catalog
      .filter((c) => c.category === "procedimiento")
      .sort((a, b) => collator.compare(a.marca ?? "", b.marca ?? "") || collator.compare(a.label, b.label)),
    [catalog],
  );

  const getById = useCallback(
    (id: string | undefined) => (id ? procedures.find((p) => p.id === id) : undefined),
    [procedures],
  );

  const usages = useCallback(
    (id: string) => assignments.filter((a) => (a.immoDetails ?? []).some((d) => d.procedimientoId === id)),
    [assignments],
  );

  const knownMakes = useMemo(() => {
    const set = new Map<string, string>();
    [...assignments.map((a) => a.make), ...procedures.map((p) => p.marca ?? "")]
      .map((m) => m.trim()).filter(Boolean)
      .forEach((m) => { if (!set.has(m.toLowerCase())) set.set(m.toLowerCase(), m); });
    return Array.from(set.values()).sort(collator.compare);
  }, [assignments, procedures]);

  const create = useCallback(async ({ marca, titulo, texto, manual, obd }: { marca: string; titulo: string; texto: string; manual: boolean; obd: boolean }) => {
    const item: ImmoCatalogItem = {
      id: crypto.randomUUID(), label: titulo.trim(), marca: marca.trim(), texto,
      programacionManual: manual, programacionOBD: obd, category: "procedimiento",
    };
    const ok = await addItem(item);
    return ok === false ? null : item;
  }, [addItem]);

  const update = useCallback(async (item: ImmoCatalogItem) => {
    if ((await updateItem(item)) === false) return false;
    // El técnico lee el método de la asignación: cada vehículo vinculado recibe el nuevo.
    const results = await Promise.all(usages(item.id).map((a) => updateAssignment({
      ...a,
      immoDetails: (a.immoDetails ?? []).map((d) => d.procedimientoId === item.id
        ? {
          ...d,
          procedimientoProgramacion: item.texto ?? d.procedimientoProgramacion,
          ...(hasMetodo(item) ? { programacionManual: !!item.programacionManual, programacionOBD: !!item.programacionOBD } : {}),
        }
        : d),
    })));
    return results.every(Boolean);
  }, [updateItem, usages, updateAssignment]);

  const remove = useCallback(async (id: string) => {
    const proc = procedures.find((p) => p.id === id);
    if (!proc) return false;
    // Respaldo: cada vehículo que lo usa se queda con el texto actual como copia propia.
    const results = await Promise.all(usages(id).map((a) => updateAssignment({
      ...a,
      immoDetails: (a.immoDetails ?? []).map((d) => d.procedimientoId === id
        ? { ...d, procedimientoId: "", procedimientoProgramacion: proc.texto ?? d.procedimientoProgramacion }
        : d),
    })));
    if (results.some((ok) => !ok)) return false;
    return (await deleteItem(id)) !== false;
  }, [procedures, usages, updateAssignment, deleteItem]);

  const value = useMemo(
    () => ({ procedures, getById, usages, knownMakes, create, update, remove }),
    [procedures, getById, usages, knownMakes, create, update, remove],
  );
  return <ProcedureLibraryContext.Provider value={value}>{children}</ProcedureLibraryContext.Provider>;
}


// ── Campo «Pasos para programar el remoto» ─────────────────────────────────────

type DetailKey = keyof Omit<ImmoAssignmentDetail, "profileId">;

export function ProcedureStepsField({
  id, detail, onChange, vehicleMake,
}: {
  id: string;
  detail: Pick<ImmoAssignmentDetail, "procedimientoId" | "procedimientoProgramacion" | "programacionManual" | "programacionOBD">;
  onChange: (key: DetailKey, value: unknown) => void;
  /** Marca del vehículo que se asigna: se propone al guardar y se muestra primero. */
  vehicleMake?: string;
}) {
  const lib = useProcedureLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [editing, setEditing] = useState<ImmoCatalogItem | null>(null);

  const editor = (
    <RichTextEditor
      value={detail.procedimientoProgramacion ?? ""}
      onChange={(v) => onChange("procedimientoProgramacion", v)}
      placeholder="Describe el procedimiento paso a paso…"
      imageFolder="immo"
      rows={4}
      className="text-sm"
    />
  );
  // Vinculado con método guardado: el método de la asignación sigue al del procedimiento.
  const syncProc = lib?.getById(detail.procedimientoId);
  useEffect(() => {
    if (!syncProc || !hasMetodo(syncProc)) return;
    if (!!detail.programacionManual !== !!syncProc.programacionManual) onChange("programacionManual", !!syncProc.programacionManual);
    if (!!detail.programacionOBD !== !!syncProc.programacionOBD) onChange("programacionOBD", !!syncProc.programacionOBD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncProc?.id, syncProc?.programacionManual, syncProc?.programacionOBD]);

  // Sin biblioteca (fuera del módulo del SuperAdmin) el campo funciona como siempre.
  if (!lib) return editor;

  const linked = lib.getById(detail.procedimientoId);
  const usedIn = linked ? lib.usages(linked.id).length : 0;

  const link = (proc: ImmoCatalogItem) => {
    const prevText = detail.procedimientoProgramacion ?? "";
    const prevId = detail.procedimientoId;
    onChange("procedimientoId", proc.id);
    onChange("procedimientoProgramacion", proc.texto ?? "");
    if (hasMetodo(proc)) {
      onChange("programacionManual", !!proc.programacionManual);
      onChange("programacionOBD", !!proc.programacionOBD);
    }
    setPickerOpen(false);
    const replaced = !prevId && prevText.trim() && prevText.trim() !== (proc.texto ?? "").trim();
    toast.success(`Usando «${proc.label}»`, replaced ? {
      action: {
        label: "Deshacer",
        onClick: () => { onChange("procedimientoId", ""); onChange("procedimientoProgramacion", prevText); },
      },
    } : undefined);
  };

  const unlink = () => {
    if (!linked) return;
    onChange("procedimientoId", "");
    onChange("procedimientoProgramacion", linked.texto ?? "");
    toast.success("Desvinculado: ahora puedes editar los pasos solo para este vehículo.");
  };

  return (
    <div className="space-y-2">
      {linked ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Link2 className="h-4 w-4 shrink-0 text-primary-text" />
                <span className="truncate">{linked.label}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {linked.marca} · procedimiento guardado{usedIn > 0 ? ` · usado en ${usedIn} vehículo${usedIn === 1 ? "" : "s"}` : ""}
              </p>
              {hasMetodo(linked) && (
                <p className="mt-1 text-sm text-foreground">
                  <span className="text-xs font-semibold text-muted-foreground">Método: </span>
                  {metodoLabel(linked.programacionManual, linked.programacionOBD) || "—"}
                </p>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-sm bg-card p-3">
            {linked.texto?.trim()
              ? <ProcedureSteps text={linked.texto} className="text-sm" />
              : <p className="text-sm text-muted-foreground">Sin pasos.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="h-8" onClick={() => setEditing(linked)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar procedimiento
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={unlink}>
              <Link2Off className="mr-1.5 h-3.5 w-3.5" /> Desvincular y editar solo aquí
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setPickerOpen(true)}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Cambiar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="h-8" onClick={() => setPickerOpen(true)} disabled={!lib.procedures.length}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              {lib.procedures.length ? `Usar procedimiento guardado (${lib.procedures.length})` : "Sin procedimientos guardados"}
            </Button>
            {(detail.procedimientoProgramacion ?? "").trim() && (
              <Button
                type="button" variant="outline" size="sm" className="h-8"
                onClick={() => {
                  if (!detail.programacionManual && !detail.programacionOBD) { toast.error("Elige el método (Manual u OBD2) antes de guardarlo."); return; }
                  setSaveOpen(true);
                }}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" /> Guardar como procedimiento
              </Button>
            )}
          </div>
          {editor}
        </>
      )}

      <ProcedurePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        vehicleMake={vehicleMake}
        currentId={linked?.id}
        onPick={link}
      />
      <SaveProcedureDialog
        key={`save-${id}-${saveOpen}`}
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultMake={vehicleMake}
        texto={detail.procedimientoProgramacion}
        manual={!!detail.programacionManual}
        obd={!!detail.programacionOBD}
        onSaved={(proc) => {
          onChange("procedimientoId", proc.id);
          onChange("procedimientoProgramacion", proc.texto ?? "");
        }}
      />
      {editing && (
        <EditProcedureDialog key={editing.id} proc={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ── Selector ───────────────────────────────────────────────────────────────────

function ProcedurePicker({
  open, onOpenChange, vehicleMake, currentId, onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleMake?: string;
  currentId?: string;
  onPick: (proc: ImmoCatalogItem) => void;
}) {
  const lib = useProcedureLibrary()!;
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImmoCatalogItem | null>(null);

  // Marcas para filtrar rápido (la del vehículo primero).
  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    lib.procedures.forEach((p) => {
      const key = p.marca?.trim() || "Sin marca";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(([a], [b]) => {
      const am = vehicleMake && sameText(a, vehicleMake) ? 0 : 1;
      const bm = vehicleMake && sameText(b, vehicleMake) ? 0 : 1;
      return am - bm || collator.compare(a, b);
    });
  }, [lib.procedures, vehicleMake]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lib.procedures.filter((p) =>
      (!brand || sameText(p.marca?.trim() || "Sin marca", brand)) &&
      (!q || [p.label, p.marca ?? "", p.texto ?? ""].some((v) => v.toLowerCase().includes(q))));
    const map = new Map<string, ImmoCatalogItem[]>();
    list.forEach((p) => {
      const key = p.marca?.trim() || "Sin marca";
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    // La marca del vehículo que se asigna va primero.
    return Array.from(map.entries()).sort(([a], [b]) => {
      const am = vehicleMake && sameText(a, vehicleMake) ? 0 : 1;
      const bm = vehicleMake && sameText(b, vehicleMake) ? 0 : 1;
      return am - bm || collator.compare(a, b);
    });
  }, [lib.procedures, query, brand, vehicleMake]);
  const shown = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* fixedHeight: el encabezado (título, búsqueda y marca) queda fijo y solo la lista se desplaza. */}
        <DialogContent fixedHeight className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Procedimientos guardados</DialogTitle>
            <DialogDescription>Elige uno: quedará vinculado y se actualizará si lo editas.</DialogDescription>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título o texto…" className="h-10 pl-9 text-sm" />
              </div>
              {brands.length > 1 && (
                <div className="relative sm:w-48">
                  <select
                    aria-label="Filtrar por marca"
                    value={brand ?? ""}
                    onChange={(e) => setBrand(e.target.value || null)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-input bg-card pl-3 pr-8 text-sm font-medium text-foreground transition-colors hover:border-foreground/60 focus-visible:border-2 focus-visible:border-primary focus-visible:outline-none"
                  >
                    <option value="">Todas las marcas ({lib.procedures.length})</option>
                    {brands.map(([m, n]) => (
                      <option key={m} value={m}>{m} ({n})</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>}
            {groups.map(([marca, items]) => (
              <section key={marca} className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{marca}</p>
                <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                  {items.map((p) => {
                    const count = lib.usages(p.id).length;
                    return (
                      <div key={p.id} className={cn("flex items-center gap-2 bg-card", p.id === currentId && "bg-secondary")}>
                        <button type="button" onClick={() => onPick(p)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-muted/40">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{p.label}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {p.id === currentId ? "En uso aquí · " : ""}{count ? `${count} vehículo${count === 1 ? "" : "s"}` : "Sin usar"}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar ${p.label}`}
                          onClick={() => setDeleteTarget(p)}
                          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <DialogFooter>
            <p className="w-full text-center text-xs tabular-nums text-muted-foreground">
              {shown === lib.procedures.length ? `${shown} procedimientos` : `Mostrando ${shown} de ${lib.procedures.length}`}
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteProcedureDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </>
  );
}

// ── Marca + título (compartido por guardar y editar) ──────────────────────────

function MakeTitleFields({
  marca, setMarca, titulo, setTitulo, listId,
}: { marca: string; setMarca: (v: string) => void; titulo: string; setTitulo: (v: string) => void; listId: string }) {
  const lib = useProcedureLibrary()!;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor={`${listId}-marca`} className="text-xs font-bold">Marca</Label>
        <Input id={`${listId}-marca`} list={listId} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Chevrolet, Toyota…" className="h-10 text-sm" />
        <datalist id={listId}>{lib.knownMakes.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${listId}-titulo`} className="text-xs font-bold">Título</Label>
        <Input id={`${listId}-titulo`} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Programación por OBD2 con Autel" className="h-10 text-sm" />
      </div>
    </div>
  );
}

function validate(lib: ProcedureLibraryValue, marca: string, titulo: string, exceptId?: string): string | null {
  if (!marca.trim()) return "Escribe la marca.";
  if (!titulo.trim()) return "Escribe un título para reconocerlo.";
  const dup = lib.procedures.some((p) => p.id !== exceptId && sameText(p.marca ?? "", marca) && sameText(p.label, titulo));
  return dup ? `Ya existe «${titulo.trim()}» en ${marca.trim()}.` : null;
}

function SaveProcedureDialog({
  open, onOpenChange, defaultMake, texto, manual, obd, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMake?: string;
  texto: string;
  manual: boolean;
  obd: boolean;
  onSaved: (proc: ImmoCatalogItem) => void;
}) {
  const lib = useProcedureLibrary()!;
  const [marca, setMarca] = useState(defaultMake ?? "");
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const err = validate(lib, marca, titulo);
    if (err) { toast.error(err); return; }
    setSaving(true);
    const proc = await lib.create({ marca, titulo, texto, manual, obd });
    setSaving(false);
    if (!proc) { toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); return; }
    onSaved(proc);
    onOpenChange(false);
    toast.success(`Guardado como «${proc.label}» y vinculado a este vehículo.`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Guardar procedimiento</DialogTitle>
          <DialogDescription>Se guardan los pasos y el método ({metodoLabel(manual, obd)}). Podrás reutilizarlo en otros vehículos, de esta u otra marca.</DialogDescription>
        </DialogHeader>
        <MakeTitleFields marca={marca} setMarca={setMarca} titulo={titulo} setTitulo={setTitulo} listId="proc-save" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProcedureDialog({ target, onClose }: { target: ImmoCatalogItem | null; onClose: () => void }) {
  const lib = useProcedureLibrary()!;
  const [deleting, setDeleting] = useState(false);
  const used = target ? lib.usages(target.id) : [];

  const confirm = async () => {
    if (!target) return;
    setDeleting(true);
    const ok = await lib.remove(target.id);
    setDeleting(false);
    if (ok) toast.success(`Se eliminó «${target.label}».`);
    else toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
    onClose();
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar «{target?.label}»?</AlertDialogTitle>
          <AlertDialogDescription>
            {used.length
              ? `Lo usan ${plural(used.length)}. Cada uno se quedará con una copia de los pasos, así el técnico no pierde nada.`
              : "Ningún vehículo lo usa."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {used.length > 0 && <UsageByMake used={used} className="text-sm" />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); void confirm(); }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Editar uno existente (`proc`) o crear uno nuevo (`proc` = null). */
function EditProcedureDialog({ proc, onClose }: { proc: ImmoCatalogItem | null; onClose: () => void }) {
  const lib = useProcedureLibrary()!;
  const [marca, setMarca] = useState(proc?.marca ?? "");
  const [titulo, setTitulo] = useState(proc?.label ?? "");
  const [texto, setTexto] = useState(proc?.texto ?? "");
  const [manual, setManual] = useState(!!proc?.programacionManual);
  const [obd, setObd] = useState(!!proc?.programacionOBD);
  const [saving, setSaving] = useState(false);
  const used = proc ? lib.usages(proc.id) : [];

  const save = async () => {
    const err = validate(lib, marca, titulo, proc?.id);
    if (err) { toast.error(err); return; }
    if (!manual && !obd) { toast.error("Elige el método de programación (Manual u OBD2)."); return; }
    if (!texto.trim()) { toast.error("Escribe los pasos del procedimiento."); return; }
    setSaving(true);
    const ok = proc
      ? await lib.update({ ...proc, marca: marca.trim(), label: titulo.trim(), texto, programacionManual: manual, programacionOBD: obd })
      : !!(await lib.create({ marca, titulo, texto, manual, obd }));
    setSaving(false);
    if (!ok) { toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); return; }
    toast.success(!proc ? "Procedimiento guardado." : used.length ? `Procedimiento actualizado en ${plural(used.length)}.` : "Procedimiento actualizado.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>{proc ? "Editar procedimiento" : "Nuevo procedimiento"}</DialogTitle>
          <DialogDescription>
            {proc ? "Los cambios se aplican en todos los vehículos que lo usan." : "Podrás elegirlo al asignar cualquier vehículo."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pb-2">
          {used.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="mb-1 text-sm font-semibold text-foreground">Este cambio afectará a {plural(used.length)}</p>
              <UsageByMake used={used} />
            </div>
          )}
          <MakeTitleFields marca={marca} setMarca={setMarca} titulo={titulo} setTitulo={setTitulo} listId={proc ? "proc-edit" : "proc-new"} />
          <MetodoFields id={proc ? `proc-${proc.id}` : "proc-new"} manual={manual} obd={obd} onManual={setManual} onObd={setObd} />
          <div className="space-y-1">
            <Label className="text-xs font-bold">Pasos</Label>
            <RichTextEditor value={texto} onChange={setTexto} placeholder="Describe el procedimiento paso a paso…" imageFolder="immo" rows={8} className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {used.length ? `Guardar en ${plural(used.length)}` : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Biblioteca en Herramientas y Suministros ───────────────────────────────────

/** Lista completa por marca: crear, editar y eliminar sin abrir una asignación. */
export function ProcedureLibraryManager() {
  const lib = useProcedureLibrary();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [editing, setEditing] = useState<ImmoCatalogItem | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ImmoCatalogItem | null>(null);

  const groups = useMemo(() => {
    if (!lib) return [];
    const q = query.trim().toLowerCase();
    const map = new Map<string, ImmoCatalogItem[]>();
    lib.procedures
      .filter((p) => !brand || sameText(p.marca?.trim() || "Sin marca", brand))
      .filter((p) => !q || [p.label, p.marca ?? "", p.texto ?? ""].some((v) => v.toLowerCase().includes(q)))
      .forEach((p) => {
        const key = p.marca?.trim() || "Sin marca";
        map.set(key, [...(map.get(key) ?? []), p]);
      });
    return Array.from(map.entries()).sort(([a], [b]) => collator.compare(a, b));
  }, [lib, query, brand]);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    (lib?.procedures ?? []).forEach((p) => {
      const key = p.marca?.trim() || "Sin marca";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(([a], [b]) => collator.compare(a, b));
  }, [lib]);

  if (!lib) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex shrink-0 flex-wrap items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-primary-light p-2 text-primary"><BookOpen className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-foreground">Procedimientos del remoto</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pasos guardados por marca para reutilizar en «Pasos para programar el remoto». Editar uno cambia todos los vehículos que lo usan.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(null)}><Plus className="mr-1.5 h-4 w-4" /> Nuevo procedimiento</Button>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por marca, título o texto…" className="h-10 pl-9 text-sm" />
      </div>
      {brands.length > 1 && (
        <div className="relative sm:w-56">
          <select
            aria-label="Filtrar por marca"
            value={brand ?? ""}
            onChange={(e) => setBrand(e.target.value || null)}
            className="h-10 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-input bg-card pl-3 pr-8 text-sm font-medium text-foreground transition-colors hover:border-foreground/60 focus-visible:border-2 focus-visible:border-primary focus-visible:outline-none"
          >
            <option value="">Todas las marcas ({lib.procedures.length})</option>
            {brands.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}
      </div>

      {lib.procedures.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Aún no hay procedimientos. Crea uno aquí o usa «Guardar como procedimiento» al escribir los pasos de una asignación.
        </p>
      ) : groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {groups.map(([marca, items]) => (
            <section key={marca} className="space-y-1">
              {/* La marca queda fija arriba mientras se recorre su lista. */}
              <p className="sticky top-0 z-10 bg-card py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{marca} · {items.length}</p>
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {items.map((p) => {
                  const count = lib.usages(p.id).length;
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-muted/40">
                        <span className="block truncate text-sm font-semibold text-foreground">{p.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[metodoLabel(p.programacionManual, p.programacionOBD), count ? `Usado en ${plural(count)}` : "Sin usar"].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar ${p.label}`}
                        onClick={() => setEditing(p)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar ${p.label}`}
                        onClick={() => setDeleteTarget(p)}
                        className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <EditProcedureDialog key={editing?.id ?? "new"} proc={editing} onClose={() => setEditing(undefined)} />
      )}
      <DeleteProcedureDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
