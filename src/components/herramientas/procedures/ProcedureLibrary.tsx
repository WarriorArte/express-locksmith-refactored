/**
 * Biblioteca de procedimientos de programación del remoto (Immo Info).
 *
 * - Cada procedimiento guardado tiene marca + título + pasos y vive en el catálogo Immo
 *   (categoría «procedimiento»), así no requiere cambios en el servidor.
 * - Una asignación lo usa VINCULADO (`procedimientoId`): editar el procedimiento cambia
 *   todos los vehículos que lo usan. `procedimientoProgramacion` guarda una copia del
 *   texto como respaldo (si el procedimiento se borra, el técnico nunca ve vacío).
 * - «Desvincular» copia el texto a la asignación para editarlo solo ahí.
 * - Al borrar uno en uso, antes se deja la copia actualizada en cada vehículo.
 */
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Link2, Link2Off, Loader2, Pencil, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
const vehicleLabel = (a: ToolAssignment) =>
  `${a.make} ${a.model} ${a.yearStart === a.yearEnd ? a.yearStart : `${a.yearStart}–${a.yearEnd}`}`;

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

  const create = useCallback(async ({ marca, titulo, texto }: { marca: string; titulo: string; texto: string }) => {
    const item: ImmoCatalogItem = { id: crypto.randomUUID(), label: titulo.trim(), marca: marca.trim(), texto, category: "procedimiento" };
    const ok = await addItem(item);
    return ok === false ? null : item;
  }, [addItem]);

  const update = useCallback(async (item: ImmoCatalogItem) => (await updateItem(item)) !== false, [updateItem]);

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
  detail: Pick<ImmoAssignmentDetail, "procedimientoId" | "procedimientoProgramacion">;
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
      value={detail.procedimientoProgramacion}
      onChange={(v) => onChange("procedimientoProgramacion", v)}
      placeholder="Describe el procedimiento paso a paso…"
      imageFolder="immo"
      rows={4}
      className="text-sm"
    />
  );
  // Sin biblioteca (fuera del módulo del SuperAdmin) el campo funciona como siempre.
  if (!lib) return editor;

  const linked = lib.getById(detail.procedimientoId);
  const usedIn = linked ? lib.usages(linked.id).length : 0;

  const link = (proc: ImmoCatalogItem) => {
    const prevText = detail.procedimientoProgramacion;
    const prevId = detail.procedimientoId;
    onChange("procedimientoId", proc.id);
    onChange("procedimientoProgramacion", proc.texto ?? "");
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
            {detail.procedimientoProgramacion.trim() && (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setSaveOpen(true)}>
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
  const [deleteTarget, setDeleteTarget] = useState<ImmoCatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lib.procedures.filter((p) => !q || [p.label, p.marca ?? "", p.texto ?? ""].some((v) => v.toLowerCase().includes(q)));
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
  }, [lib.procedures, query, vehicleMake]);

  const deleteUsages = deleteTarget ? lib.usages(deleteTarget.id) : [];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await lib.remove(deleteTarget.id);
    setDeleting(false);
    if (ok) toast.success(`Se eliminó «${deleteTarget.label}».`);
    else toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
    setDeleteTarget(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Procedimientos guardados</DialogTitle>
            <DialogDescription>Elige uno: quedará vinculado y se actualizará si lo editas.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por marca, título o texto…" className="h-10 pl-9 text-sm" />
          </div>
          <div className="space-y-4 pb-4">
            {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>}
            {groups.map(([marca, items]) => (
              <section key={marca} className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{marca}</p>
                <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                  {items.map((p) => {
                    const count = lib.usages(p.id).length;
                    return (
                      <div key={p.id} className={cn("flex items-center gap-2 bg-card", p.id === currentId && "bg-secondary")}>
                        <button type="button" onClick={() => onPick(p)} className="min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-muted/40">
                          <span className="block truncate text-sm font-semibold text-foreground">{p.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {p.id === currentId ? "En uso aquí · " : ""}{count ? `Usado en ${count} vehículo${count === 1 ? "" : "s"}` : "Sin usar"}
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
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{deleteTarget?.label}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsages.length
                ? `Lo usan ${deleteUsages.length} vehículo(s). Cada uno se quedará con una copia de los pasos, así el técnico no pierde nada.`
                : "Ningún vehículo lo usa."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteUsages.length > 0 && (
            <ul className="max-h-40 overflow-y-auto text-sm text-foreground">
              {deleteUsages.map((a) => <li key={a.id} className="py-0.5 tabular-nums">{vehicleLabel(a)}</li>)}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  open, onOpenChange, defaultMake, texto, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMake?: string;
  texto: string;
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
    const proc = await lib.create({ marca, titulo, texto });
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
          <DialogDescription>Podrás reutilizarlo en otros vehículos, de esta u otra marca.</DialogDescription>
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

function EditProcedureDialog({ proc, onClose }: { proc: ImmoCatalogItem; onClose: () => void }) {
  const lib = useProcedureLibrary()!;
  const [marca, setMarca] = useState(proc.marca ?? "");
  const [titulo, setTitulo] = useState(proc.label);
  const [texto, setTexto] = useState(proc.texto ?? "");
  const [saving, setSaving] = useState(false);
  const used = lib.usages(proc.id);

  const save = async () => {
    const err = validate(lib, marca, titulo, proc.id);
    if (err) { toast.error(err); return; }
    setSaving(true);
    const ok = await lib.update({ ...proc, marca: marca.trim(), label: titulo.trim(), texto });
    setSaving(false);
    if (!ok) { toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); return; }
    toast.success(used.length ? `Procedimiento actualizado en ${used.length} vehículo(s).` : "Procedimiento actualizado.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>Editar procedimiento</DialogTitle>
          <DialogDescription>Los cambios se aplican en todos los vehículos que lo usan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pb-2">
          {used.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="text-sm font-semibold text-foreground">Este cambio afectará a {used.length} vehículo{used.length === 1 ? "" : "s"}</p>
              <ul className="mt-1 max-h-28 overflow-y-auto text-xs text-muted-foreground">
                {used.map((a) => <li key={a.id} className="tabular-nums">{vehicleLabel(a)}</li>)}
              </ul>
            </div>
          )}
          <MakeTitleFields marca={marca} setMarca={setMarca} titulo={titulo} setTitulo={setTitulo} listId="proc-edit" />
          <div className="space-y-1">
            <Label className="text-xs font-bold">Pasos</Label>
            <RichTextEditor value={texto} onChange={setTexto} placeholder="Describe el procedimiento paso a paso…" imageFolder="immo" rows={8} className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {used.length ? `Guardar en ${used.length} vehículo${used.length === 1 ? "" : "s"}` : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
