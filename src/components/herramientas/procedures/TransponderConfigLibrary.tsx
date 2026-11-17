/**
 * Biblioteca de configuraciones de transponder (Immo Info).
 *
 * Guarda, por marca + título, los datos de transponder, pincode, «se genera con» y equipos
 * (transponder y remoto). El método del remoto va con los procedimientos. Vive en el catálogo Immo
 * (categoría «configTransponder»), así no requiere cambios en el servidor.
 *
 * - Una asignación la usa VINCULADA (`configTransponderId`) y guarda una copia de los datos:
 *   todo lo que lee la asignación (técnico, listas, validación) sigue funcionando igual.
 * - Editar la configuración actualiza la copia en todos los vehículos que la usan.
 * - «Desvincular» deja los datos en la asignación para editarlos solo ahí.
 * - Al borrarla, cada vehículo se queda con su copia (ya está al día).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, Link2, Link2Off, Loader2, Pencil, Plus, Save, Search, ShieldCheck, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { immoDetailMissing, pickTransponderConfig, sameTransponderConfig } from "@/lib/immo";
import {
  IMMO_TRANSPONDER_CONFIG_KEYS,
  type ImmoAssignmentDetail, type ImmoCatalogItem, type ImmoTransponderConfig, type ToolAssignment,
} from "@/types";
import { ImmoDetailFields, emptyDetail } from "../ImmoManager";
import {
  TransponderConfigLibraryContext, useTransponderConfigLibrary, type TransponderConfigLibraryValue,
} from "./transponderConfigContext";

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const plural = (n: number) => `${n} vehículo${n === 1 ? "" : "s"}`;
const brandKey = (c: ImmoCatalogItem) => c.marca?.trim() || "Sin marca";

/** Campos de la configuración que faltan (los pasos del remoto no son parte de ella). */
const configIssues = (config: ImmoTransponderConfig) =>
  immoDetailMissing({ ...config, procedimientoProgramacion: "x", programacionManual: true }).map((m) => m.label);

function UsageByMake({ used, className }: { used: ToolAssignment[]; className?: string }) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    used.forEach((a) => map.set(a.make, (map.get(a.make) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
  }, [used]);
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground", className)}>
      {rows.map(([make, n]) => (
        <li key={make} className="tabular-nums"><span className="font-semibold text-foreground">{make}</span> · {plural(n)}</li>
      ))}
    </ul>
  );
}

// ── Contexto ───────────────────────────────────────────────────────────────────

export function TransponderConfigLibraryProvider({
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
  const configs = useMemo(
    () => catalog
      .filter((c) => c.category === "configTransponder")
      .sort((a, b) => collator.compare(a.marca ?? "", b.marca ?? "") || collator.compare(a.label, b.label)),
    [catalog],
  );
  const transponderCatalog = useMemo(() => catalog.filter((c) => c.category === "transponder"), [catalog]);
  const equipoCatalog = useMemo(() => catalog.filter((c) => c.category === "equipo"), [catalog]);
  const transponderOptions = useMemo(() => catalog.filter((c) => c.category === "transponderVehiculo"), [catalog]);
  const catalogName = useCallback((id: string) => catalog.find((c) => c.id === id)?.label, [catalog]);

  const getById = useCallback(
    (id: string | undefined) => (id ? configs.find((p) => p.id === id) : undefined),
    [configs],
  );

  const usages = useCallback(
    (id: string) => assignments.filter((a) => (a.immoDetails ?? []).some((d) => d.configTransponderId === id)),
    [assignments],
  );

  const knownMakes = useMemo(() => {
    const set = new Map<string, string>();
    [...assignments.map((a) => a.make), ...configs.map((p) => p.marca ?? "")]
      .map((m) => m.trim()).filter(Boolean)
      .forEach((m) => { if (!set.has(m.toLowerCase())) set.set(m.toLowerCase(), m); });
    return Array.from(set.values()).sort(collator.compare);
  }, [assignments, configs]);

  const create = useCallback(async ({ marca, titulo, config }: { marca: string; titulo: string; config: ImmoTransponderConfig }) => {
    const item: ImmoCatalogItem = {
      id: crypto.randomUUID(), label: titulo.trim(), marca: marca.trim(), config: pickTransponderConfig(config), category: "configTransponder",
    };
    const ok = await addItem(item);
    return ok === false ? null : item;
  }, [addItem]);

  const update = useCallback(async (item: ImmoCatalogItem) => {
    if ((await updateItem(item)) === false) return false;
    // Cada vehículo vinculado recibe los datos nuevos en su copia.
    const config = pickTransponderConfig(item.config ?? {});
    const results = await Promise.all(usages(item.id).map((a) => updateAssignment({
      ...a,
      immoDetails: (a.immoDetails ?? []).map((d) => d.configTransponderId === item.id ? { ...d, ...config } : d),
    })));
    return results.every(Boolean);
  }, [updateItem, usages, updateAssignment]);

  const remove = useCallback(async (id: string) => {
    // Los vehículos conservan su copia (ya está al día); solo se quita el vínculo.
    const results = await Promise.all(usages(id).map((a) => updateAssignment({
      ...a,
      immoDetails: (a.immoDetails ?? []).map((d) => d.configTransponderId === id ? { ...d, configTransponderId: "" } : d),
    })));
    if (results.some((ok) => !ok)) return false;
    return (await deleteItem(id)) !== false;
  }, [usages, updateAssignment, deleteItem]);

  const value = useMemo<TransponderConfigLibraryValue>(
    () => ({ configs, getById, usages, knownMakes, transponderCatalog, equipoCatalog, transponderOptions, catalogName, create, update, remove }),
    [configs, getById, usages, knownMakes, transponderCatalog, equipoCatalog, transponderOptions, catalogName, create, update, remove],
  );
  return <TransponderConfigLibraryContext.Provider value={value}>{children}</TransponderConfigLibraryContext.Provider>;
}

// ── Resumen de solo lectura ────────────────────────────────────────────────────

function ConfigSummary({ config }: { config: ImmoTransponderConfig }) {
  const lib = useTransponderConfigLibrary()!;
  const names = (ids?: string[]) => (ids ?? []).map((i) => lib.catalogName(i)).filter(Boolean).join(", ");
  const rows: [string, string][] = [];
  if (config.sinInmovilizador) {
    rows.push(["Transponder", "Este modelo no utiliza transponder"]);
  } else {
    rows.push(["Transponder", config.transponder || "—"]);
    rows.push(["Pincode", config.sinPincode ? "No lleva" : config.formaObtencionPincode ? `${config.pincodeRequerido ? "Requiere · " : ""}${config.formaObtencionPincode}` : config.pincodeRequerido ? "Requiere" : "—"]);
    rows.push(["Se genera con", config.transponderNoGenerable ? "No se puede generar" : names(config.generadoConIds) || "—"]);
    rows.push(["Equipos transponder", config.omitirEquiposTransponder ? "Omitido" : names(config.equiposTransponderIds) || "—"]);
  }
  rows.push(["Equipos remoto", config.omitirEquiposRemoto ? "Omitido" : names(config.equiposRemotoIds) || "—"]);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Barra en el formulario de la asignación ────────────────────────────────────

type DetailKey = keyof Omit<ImmoAssignmentDetail, "profileId">;

export function TransponderConfigBar({
  id, detail, onChange, vehicleMake,
}: {
  id: string;
  detail: Omit<ImmoAssignmentDetail, "profileId">;
  onChange: (key: DetailKey, value: unknown) => void;
  vehicleMake?: string;
}) {
  const lib = useTransponderConfigLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [editing, setEditing] = useState<ImmoCatalogItem | null>(null);
  const linked = lib?.getById(detail.configTransponderId);
  const linkedConfig = linked?.config;

  // Vinculada: la copia de la asignación siempre sigue a la configuración guardada.
  useEffect(() => {
    if (!linkedConfig || sameTransponderConfig(detail, linkedConfig)) return;
    const config = pickTransponderConfig(linkedConfig);
    IMMO_TRANSPONDER_CONFIG_KEYS.forEach((k) => onChange(k, config[k]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedConfig]);

  if (!lib) return null;
  const usedIn = linked ? lib.usages(linked.id).length : 0;

  const apply = (config: ImmoTransponderConfig) => {
    const c = pickTransponderConfig(config);
    IMMO_TRANSPONDER_CONFIG_KEYS.forEach((k) => onChange(k, c[k]));
  };

  const link = (item: ImmoCatalogItem) => {
    const prev = pickTransponderConfig(detail);
    const prevId = detail.configTransponderId ?? "";
    apply(item.config ?? {});
    onChange("configTransponderId", item.id);
    setPickerOpen(false);
    toast.success(`Usando «${item.label}»`, {
      action: { label: "Deshacer", onClick: () => { apply(prev); onChange("configTransponderId", prevId); } },
    });
  };

  const unlink = () => {
    onChange("configTransponderId", "");
    toast.success("Desvinculada: ahora puedes editar estos datos solo para este vehículo.");
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      {linked ? (
        <>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Link2 className="h-4 w-4 shrink-0 text-primary-text" />
              <span className="truncate">{linked.label}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {linked.marca} · configuración de transponder guardada{usedIn > 0 ? ` · usada en ${plural(usedIn)}` : ""}
            </p>
          </div>
          <div className="rounded-sm bg-card p-3"><ConfigSummary config={linked.config ?? {}} /></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="h-8" onClick={() => setEditing(linked)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar configuración
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={unlink}>
              <Link2Off className="mr-1.5 h-3.5 w-3.5" /> Desvincular y editar solo aquí
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setPickerOpen(true)}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Cambiar
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Configuración de transponder
          </p>
          <Button type="button" variant="secondary" size="sm" className="h-8" onClick={() => setPickerOpen(true)} disabled={!lib.configs.length}>
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            {lib.configs.length ? `Usar configuración guardada (${lib.configs.length})` : "Sin configuraciones guardadas"}
          </Button>
          <Button
            type="button" variant="outline" size="sm" className="h-8"
            onClick={() => {
              const issues = configIssues(detail);
              if (issues.length) { toast.error(`Completa antes de guardarla: ${issues.join(", ")}.`); return; }
              setSaveOpen(true);
            }}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" /> Guardar como configuración
          </Button>
        </div>
      )}

      <ConfigPicker open={pickerOpen} onOpenChange={setPickerOpen} vehicleMake={vehicleMake} currentId={linked?.id} onPick={link} />
      <SaveConfigDialog
        key={`save-${id}-${saveOpen}`}
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultMake={vehicleMake}
        config={pickTransponderConfig(detail)}
        onSaved={(item) => onChange("configTransponderId", item.id)}
      />
      {editing && <EditConfigDialog key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── Selector ───────────────────────────────────────────────────────────────────

function ConfigPicker({
  open, onOpenChange, vehicleMake, currentId, onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleMake?: string;
  currentId?: string;
  onPick: (item: ImmoCatalogItem) => void;
}) {
  const lib = useTransponderConfigLibrary()!;
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImmoCatalogItem | null>(null);

  const byVehicleFirst = useCallback((a: string, b: string) => {
    const am = vehicleMake && sameText(a, vehicleMake) ? 0 : 1;
    const bm = vehicleMake && sameText(b, vehicleMake) ? 0 : 1;
    return am - bm || collator.compare(a, b);
  }, [vehicleMake]);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    lib.configs.forEach((p) => counts.set(brandKey(p), (counts.get(brandKey(p)) ?? 0) + 1));
    return Array.from(counts.entries()).sort(([a], [b]) => byVehicleFirst(a, b));
  }, [lib.configs, byVehicleFirst]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, ImmoCatalogItem[]>();
    lib.configs
      .filter((p) => (!brand || sameText(brandKey(p), brand))
        && (!q || [p.label, p.marca ?? "", p.config?.transponder ?? ""].some((v) => v.toLowerCase().includes(q))))
      .forEach((p) => map.set(brandKey(p), [...(map.get(brandKey(p)) ?? []), p]));
    return Array.from(map.entries()).sort(([a], [b]) => byVehicleFirst(a, b));
  }, [lib.configs, query, brand, byVehicleFirst]);
  const shown = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fixedHeight className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Configuraciones de transponder</DialogTitle>
            <DialogDescription>Elige una: quedará vinculada y se actualizará si la editas.</DialogDescription>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título o transponder…" className="h-10 pl-9 text-sm" />
              </div>
              {brands.length > 1 && (
                <div className="relative sm:w-48">
                  <select
                    aria-label="Filtrar por marca"
                    value={brand ?? ""}
                    onChange={(e) => setBrand(e.target.value || null)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-input bg-card pl-3 pr-8 text-sm font-medium text-foreground transition-colors hover:border-foreground/60 focus-visible:border-2 focus-visible:border-primary focus-visible:outline-none"
                  >
                    <option value="">Todas las marcas ({lib.configs.length})</option>
                    {brands.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
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
                    const tp = p.config?.sinInmovilizador ? "Sin transponder" : p.config?.transponder;
                    return (
                      <div key={p.id} className={cn("flex items-center gap-2 bg-card", p.id === currentId && "bg-secondary")}>
                        <button type="button" onClick={() => onPick(p)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-muted/40">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">{p.label}</span>
                            {tp && <span className="block truncate text-xs text-muted-foreground">{tp}</span>}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {p.id === currentId ? "En uso aquí · " : ""}{count ? plural(count) : "Sin usar"}
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
              {shown === lib.configs.length ? `${shown} configuraciones` : `Mostrando ${shown} de ${lib.configs.length}`}
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfigDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </>
  );
}

// ── Marca + título ─────────────────────────────────────────────────────────────

function MakeTitleFields({
  marca, setMarca, titulo, setTitulo, listId,
}: { marca: string; setMarca: (v: string) => void; titulo: string; setTitulo: (v: string) => void; listId: string }) {
  const lib = useTransponderConfigLibrary()!;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor={`${listId}-marca`} className="text-xs font-bold">Marca</Label>
        <Input id={`${listId}-marca`} list={listId} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Chevrolet, Toyota…" className="h-10 text-sm" />
        <datalist id={listId}>{lib.knownMakes.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${listId}-titulo`} className="text-xs font-bold">Título</Label>
        <Input id={`${listId}-titulo`} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. ID46 con pincode por OBD" className="h-10 text-sm" />
      </div>
    </div>
  );
}

function validateName(lib: TransponderConfigLibraryValue, marca: string, titulo: string, exceptId?: string): string | null {
  if (!marca.trim()) return "Escribe la marca.";
  if (!titulo.trim()) return "Escribe un título para reconocerla.";
  const dup = lib.configs.some((p) => p.id !== exceptId && sameText(p.marca ?? "", marca) && sameText(p.label, titulo));
  return dup ? `Ya existe «${titulo.trim()}» en ${marca.trim()}.` : null;
}

function SaveConfigDialog({
  open, onOpenChange, defaultMake, config, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMake?: string;
  config: ImmoTransponderConfig;
  onSaved: (item: ImmoCatalogItem) => void;
}) {
  const lib = useTransponderConfigLibrary()!;
  const [marca, setMarca] = useState(defaultMake ?? "");
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const err = validateName(lib, marca, titulo);
    if (err) { toast.error(err); return; }
    setSaving(true);
    const item = await lib.create({ marca, titulo, config });
    setSaving(false);
    if (!item) { toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); return; }
    onSaved(item);
    onOpenChange(false);
    toast.success(`Guardada como «${item.label}» y vinculada a este vehículo.`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Guardar configuración de transponder</DialogTitle>
          <DialogDescription>Guarda transponder, pincode, «se genera con» y equipos para reutilizarlos en otros vehículos.</DialogDescription>
        </DialogHeader>
        <MakeTitleFields marca={marca} setMarca={setMarca} titulo={titulo} setTitulo={setTitulo} listId="cfg-save" />
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

function DeleteConfigDialog({ target, onClose }: { target: ImmoCatalogItem | null; onClose: () => void }) {
  const lib = useTransponderConfigLibrary()!;
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
              ? `La usan ${plural(used.length)}. Cada uno conserva sus datos, así el técnico no pierde nada.`
              : "Ningún vehículo la usa."}
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

/** Editar una existente (`item`) o crear una nueva (`item` = null). */
function EditConfigDialog({ item, onClose }: { item: ImmoCatalogItem | null; onClose: () => void }) {
  const lib = useTransponderConfigLibrary()!;
  const [marca, setMarca] = useState(item?.marca ?? "");
  const [titulo, setTitulo] = useState(item?.label ?? "");
  const [draft, setDraft] = useState<Omit<ImmoAssignmentDetail, "profileId">>(() => ({ ...emptyDetail(), ...pickTransponderConfig(item?.config ?? {}) }));
  const [showIssues, setShowIssues] = useState(false);
  const [saving, setSaving] = useState(false);
  const used = item ? lib.usages(item.id) : [];

  const save = async () => {
    const err = validateName(lib, marca, titulo, item?.id);
    if (err) { toast.error(err); return; }
    const issues = configIssues(draft);
    if (issues.length) { setShowIssues(true); toast.error(`Completa: ${issues.join(", ")}.`); return; }
    setSaving(true);
    const config = pickTransponderConfig(draft);
    const ok = item
      ? await lib.update({ ...item, marca: marca.trim(), label: titulo.trim(), config })
      : !!(await lib.create({ marca, titulo, config }));
    setSaving(false);
    if (!ok) { toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); return; }
    toast.success(!item ? "Configuración guardada." : used.length ? `Configuración actualizada en ${plural(used.length)}.` : "Configuración actualizada.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent fixedHeight className="m3e-form max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>{item ? "Editar configuración de transponder" : "Nueva configuración de transponder"}</DialogTitle>
          <DialogDescription>
            {item ? "Los cambios se aplican en todos los vehículos que la usan." : "Podrás elegirla al asignar cualquier vehículo."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          {used.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="mb-1 text-sm font-semibold text-foreground">Este cambio afectará a {plural(used.length)}</p>
              <UsageByMake used={used} />
            </div>
          )}
          <MakeTitleFields marca={marca} setMarca={setMarca} titulo={titulo} setTitulo={setTitulo} listId={item ? "cfg-edit" : "cfg-new"} />
          <ImmoDetailFields
            id={`cfg-${item?.id ?? "new"}`}
            part="config"
            detail={draft}
            onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            transponderCatalog={lib.transponderCatalog}
            equipoCatalog={lib.equipoCatalog}
            transponderOptions={lib.transponderOptions}
            showIssues={showIssues}
          />
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

export function TransponderConfigManager() {
  const lib = useTransponderConfigLibrary();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [editing, setEditing] = useState<ImmoCatalogItem | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ImmoCatalogItem | null>(null);

  const groups = useMemo(() => {
    if (!lib) return [];
    const q = query.trim().toLowerCase();
    const map = new Map<string, ImmoCatalogItem[]>();
    lib.configs
      .filter((p) => !brand || sameText(brandKey(p), brand))
      .filter((p) => !q || [p.label, p.marca ?? "", p.config?.transponder ?? ""].some((v) => v.toLowerCase().includes(q)))
      .forEach((p) => map.set(brandKey(p), [...(map.get(brandKey(p)) ?? []), p]));
    return Array.from(map.entries()).sort(([a], [b]) => collator.compare(a, b));
  }, [lib, query, brand]);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    (lib?.configs ?? []).forEach((p) => counts.set(brandKey(p), (counts.get(brandKey(p)) ?? 0) + 1));
    return Array.from(counts.entries()).sort(([a], [b]) => collator.compare(a, b));
  }, [lib]);

  if (!lib) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex shrink-0 flex-wrap items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-primary-light p-2 text-primary"><ShieldCheck className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-foreground">Configuraciones de transponder</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Transponder, pincode, «se genera con» y equipos guardados por marca. Editar una cambia todos los vehículos que la usan.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(null)}><Plus className="mr-1.5 h-4 w-4" /> Nueva configuración</Button>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por marca, título o transponder…" className="h-10 pl-9 text-sm" />
      </div>
      {brands.length > 1 && (
        <div className="relative sm:w-56">
          <select
            aria-label="Filtrar por marca"
            value={brand ?? ""}
            onChange={(e) => setBrand(e.target.value || null)}
            className="h-10 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-input bg-card pl-3 pr-8 text-sm font-medium text-foreground transition-colors hover:border-foreground/60 focus-visible:border-2 focus-visible:border-primary focus-visible:outline-none"
          >
            <option value="">Todas las marcas ({lib.configs.length})</option>
            {brands.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}
      </div>

      {lib.configs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Aún no hay configuraciones. Crea una aquí o usa «Guardar como configuración» al llenar una asignación.
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
                  const tp = p.config?.sinInmovilizador ? "Sin transponder" : p.config?.transponder;
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-muted/40">
                        <span className="block truncate text-sm font-semibold text-foreground">{p.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[tp, count ? `Usada en ${plural(count)}` : "Sin usar"].filter(Boolean).join(" · ")}
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
        <EditConfigDialog key={editing?.id ?? "new"} item={editing} onClose={() => setEditing(undefined)} />
      )}
      <DeleteConfigDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
