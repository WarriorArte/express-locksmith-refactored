import { useState, useRef } from "react";
import { Plus, Trash2, Edit, Check, Camera, X, GripVertical, Cpu, Wrench, BatteryMedium, KeyRound, RotateCcw, ShieldCheck, BookOpen, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

import type { ImmoCatalogItem } from "@/types";
import { cn } from "@/lib/utils";
import { ProcedureLibraryManager } from "./procedures/ProcedureLibrary";
import { TransponderConfigManager } from "./procedures/TransponderConfigLibrary";
import { DEFAULTS_BY_CATEGORY, sameLabel, sortCatalogItems, type ImmoTextCategory } from "@/lib/immoCatalogDefaults";

// ── helpers ───────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── CatalogSection ─────────────────────────────────────────────────────────────

interface CatalogSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: ImmoCatalogItem[];
  category: ImmoCatalogItem["category"];
  onAdd: (item: ImmoCatalogItem) => void;
  onUpdate: (item: ImmoCatalogItem) => void;
  onDelete: (id: string) => void;
  onReorderPreview: (all: ImmoCatalogItem[]) => void;
  onReorderCommit: () => void;
  allCatalog: ImmoCatalogItem[];
}

function CatalogSection({
  title, subtitle, icon, items, category,
  onAdd, onUpdate, onDelete, onReorderPreview, onReorderCommit, allCatalog,
}: CatalogSectionProps) {
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const imgRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (!deleteId) return;
    onDelete(deleteId);
    toast.success("Elemento eliminado.");
    setDeleteId(null);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const label = editingLabel.trim();
    if (label) onUpdate({ ...items.find((i) => i.id === editingId)!, label });
    setEditingId(null);
    setEditingLabel("");
  };

  const handleImage = async (id: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagen máx 2 MB"); return; }
    try {
      const b64 = await fileToBase64(file);
      const item = items.find((i) => i.id === id);
      if (item) onUpdate({ ...item, image: b64 });
    } catch { toast.error("Error al cargar imagen"); }
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    onAdd({ id: uid(), label, category });
    setNewLabel("");
  };

  // ── DnD ──
  const handleDragStart = (id: string) => setDragId(id);

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    // Reorder within this section, then merge back with other category
    const fromIdx = items.findIndex((i) => i.id === dragId);
    const toIdx = items.findIndex((i) => i.id === overId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const reordered = [...items];
    reordered.splice(toIdx, 0, reordered.splice(fromIdx, 1)[0]);
    const others = allCatalog.filter((i) => i.category !== category);
    // Preserve other-category items in their original positions
    onReorderPreview([...others, ...reordered]);
  };

  const handleDragEnd = () => {
    setDragId(null);
    onReorderCommit();
  };

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-light text-primary shrink-0 mt-0.5">{icon}</div>
          <div>
            <h3 className="font-bold text-base text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0">{items.length}</Badge>
        </div>

        <Separator />

        {/* Item list: se desplaza dentro de la tarjeta */}
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {items.length === 0 && (
            <div className="flex items-center justify-center py-8 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
              Sin elementos. Agrega el primero abajo.
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
              style={{ opacity: dragId === item.id ? 0.4 : 1 }}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group"
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />

              {/* Image */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={(el) => { if (el) imgRefs.current.set(item.id, el); else imgRefs.current.delete(item.id); }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(item.id, f); e.target.value = ""; }}
              />
              <button
                type="button"
                title={item.image ? "Cambiar imagen" : "Subir imagen"}
                onClick={() => imgRefs.current.get(item.id)?.click()}
                className="w-8 h-8 rounded-md border border-border overflow-hidden shrink-0 flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                {item.image
                  ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                  : <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </button>

              {/* Label (editable inline) */}
              {editingId === item.id ? (
                <input
                  autoFocus
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                  className="flex-1 px-2 py-1 rounded-md border border-primary text-sm font-semibold bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
                />
              ) : (
                <span className="flex-1 text-sm font-semibold text-foreground truncate min-w-0">{item.label}</span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {item.image && (
                  <button
                    type="button"
                    title="Quitar imagen"
                    onClick={() => onUpdate({ ...item, image: undefined })}
                    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-warning-light transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  title="Editar nombre"
                  onClick={() => {
                    if (editingId === item.id) { commitEdit(); return; }
                    setEditingId(item.id);
                    setEditingLabel(item.label);
                  }}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    editingId === item.id
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                >
                  {editingId === item.id ? <Check className="w-3 h-3" /> : <Edit className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => setDeleteId(item.id)}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="flex gap-2 pt-1 border-t border-border">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={`Nuevo ${category === "equipo" ? "equipo" : "transponder"}…`}
            className="h-8 text-sm flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 shrink-0"
            onClick={handleAdd}
            disabled={!newLabel.trim()}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── TextCatalogSection ─────────────────────────────────────────────────────────

/** Lista de solo texto, siempre en orden alfabético (Transponders y Baterías). */
function TextCatalogSection({
  title, subtitle, icon, items, category, noun, onAdd, onUpdate, onDelete,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: ImmoCatalogItem[];
  category: ImmoTextCategory;
  /** «transponder», «batería»… para los textos. */
  noun: string;
  onAdd: (item: ImmoCatalogItem) => void;
  onUpdate: (item: ImmoCatalogItem) => void;
  onDelete: (id: string) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const sorted = sortCatalogItems(items);
  const [query, setQuery] = useState("");
  const visible = query.trim() ? sorted.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())) : sorted;
  const missingDefaults = DEFAULTS_BY_CATEGORY[category].filter((d) => !items.some((i) => sameLabel(i.label, d)));

  const exists = (label: string, exceptId?: string) => items.some((i) => i.id !== exceptId && sameLabel(i.label, label));

  const handleAdd = () => {
    const label = newLabel.trim().replace(/\s+/g, " ");
    if (!label) return;
    if (exists(label)) { toast.error(`«${label}» ya está en la lista.`); return; }
    onAdd({ id: uid(), label, category });
    setNewLabel("");
  };

  const commitEdit = () => {
    if (!editingId) return;
    const label = editingLabel.trim().replace(/\s+/g, " ");
    const item = items.find((i) => i.id === editingId);
    if (!label || !item) { setEditingId(null); return; }
    if (exists(label, editingId)) { toast.error(`«${label}» ya está en la lista.`); return; }
    if (label !== item.label) onUpdate({ ...item, label });
    setEditingId(null);
  };

  const restoreDefaults = () => {
    missingDefaults.forEach((label) => onAdd({ id: uid(), label, category }));
    toast.success(`Se agregaron ${missingDefaults.length} de la lista inicial.`);
  };

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-light text-primary shrink-0 mt-0.5">{icon}</div>
          <div>
            <h3 className="font-bold text-base text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0">{items.length}</Badge>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="h-9 pl-9 text-sm" />
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {sorted.length > 0 && visible.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {sorted.length === 0 && (
            <div className="flex items-center justify-center py-8 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
              Sin elementos. Agrega el primero abajo.
            </div>
          )}
          {visible.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 hover:border-primary/30 transition-colors">
              {editingId === item.id ? (
                <Input
                  autoFocus
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                  className="h-7 flex-1 text-sm"
                />
              ) : (
                <span className="flex-1 truncate text-sm font-medium tabular-nums text-foreground">{item.label}</span>
              )}
              <button
                type="button"
                title={editingId === item.id ? "Guardar" : "Editar nombre"}
                onClick={() => {
                  if (editingId === item.id) { commitEdit(); return; }
                  setEditingId(item.id);
                  setEditingLabel(item.label);
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                {editingId === item.id ? <Check className="w-3 h-3" /> : <Edit className="w-3 h-3" />}
              </button>
              <button
                type="button"
                title="Eliminar"
                onClick={() => setDeleteId(item.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex gap-2 pt-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Nuevo ${noun}…`}
              className="h-8 text-sm flex-1"
            />
            <Button type="button" variant="secondary" size="sm" className="h-8 shrink-0" onClick={handleAdd} disabled={!newLabel.trim()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
            </Button>
          </div>
          {missingDefaults.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={restoreDefaults}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Agregar los {missingDefaults.length} de la lista inicial que faltan
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{items.find((i) => i.id === deleteId)?.label}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Deja de aparecer en la lista. Las asignaciones que ya lo usan lo conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── ImmoSuppliesManager ────────────────────────────────────────────────────────

interface ImmoSuppliesManagerProps {
  catalog: ImmoCatalogItem[];
  onAdd: (item: ImmoCatalogItem) => void;
  onUpdate: (item: ImmoCatalogItem) => void;
  onDelete: (id: string) => void;
  onReorderPreview: (items: ImmoCatalogItem[]) => void;
  onReorderCommit: () => void;
}

type SuppliesSection = "transponder" | "equipo" | "transponderVehiculo" | "bateria" | "configTransponder" | "procedimiento";
const SECTION_STORAGE_KEY = "herramientas.suministros.seccion";

export function ImmoSuppliesManager({
  catalog, onAdd, onUpdate, onDelete, onReorderPreview, onReorderCommit,
}: ImmoSuppliesManagerProps) {
  const transponders = catalog.filter((i) => i.category === "transponder");
  const equipos = catalog.filter((i) => i.category === "equipo");
  const transpondersVehiculo = catalog.filter((i) => i.category === "transponderVehiculo");
  const baterias = catalog.filter((i) => i.category === "bateria");
  const count = (c: SuppliesSection) => catalog.filter((i) => i.category === c).length;

  const sections: { key: SuppliesSection; label: string; icon: React.ReactNode; group: string }[] = [
    { key: "configTransponder", label: "Configuraciones de transponder", icon: <ShieldCheck className="h-4 w-4" />, group: "Bibliotecas" },
    { key: "procedimiento", label: "Procedimientos del remoto", icon: <BookOpen className="h-4 w-4" />, group: "Bibliotecas" },
    { key: "transponder", label: "Tipos de Transponder", icon: <Cpu className="h-4 w-4" />, group: "Catálogos" },
    { key: "equipo", label: "Equipos de Programación", icon: <Wrench className="h-4 w-4" />, group: "Catálogos" },
    { key: "transponderVehiculo", label: "Transponders del vehículo", icon: <KeyRound className="h-4 w-4" />, group: "Catálogos" },
    { key: "bateria", label: "Baterías", icon: <BatteryMedium className="h-4 w-4" />, group: "Catálogos" },
  ];

  // La sección elegida se recuerda en este navegador (si el almacenamiento está disponible).
  const [section, setSectionState] = useState<SuppliesSection>(() => {
    try {
      const saved = localStorage.getItem(SECTION_STORAGE_KEY) as SuppliesSection | null;
      if (saved && sections.some((x) => x.key === saved)) return saved;
    } catch { /* sin almacenamiento */ }
    return "configTransponder";
  });
  const setSection = (s: SuppliesSection) => {
    setSectionState(s);
    try { localStorage.setItem(SECTION_STORAGE_KEY, s); } catch { /* sin almacenamiento */ }
  };

  const groups = Array.from(new Set(sections.map((x) => x.group)));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-foreground">Herramientas y Suministros</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catálogos y bibliotecas que usan los perfiles y las asignaciones de Immo Info.
          </p>
        </div>
        {/* Pantallas angostas: la sección se elige con una lista desplegable nativa. */}
        <div className="relative w-full md:hidden">
          <select
            aria-label="Sección"
            value={section}
            onChange={(e) => setSection(e.target.value as SuppliesSection)}
            className="h-10 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-input bg-card pl-3 pr-8 text-sm font-medium text-foreground focus-visible:border-2 focus-visible:border-primary focus-visible:outline-none"
          >
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {sections.filter((x) => x.group === g).map((x) => (
                  <option key={x.key} value={x.key}>{x.label} ({count(x.key)})</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <nav aria-label="Secciones" className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto md:flex">
          {groups.map((g) => (
            <div key={g} className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{g}</p>
              {sections.filter((x) => x.group === g).map((x) => {
                const active = x.key === section;
                return (
                  <button
                    key={x.key}
                    type="button"
                    onClick={() => setSection(x.key)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-accent font-semibold text-accent-foreground" : "text-foreground hover:bg-secondary",
                    )}
                  >
                    {x.icon}
                    <span className="min-w-0 flex-1 truncate">{x.label}</span>
                    <span className={cn("shrink-0 text-xs tabular-nums", active ? "text-accent-foreground" : "text-muted-foreground")}>{count(x.key)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* La sección elegida ocupa todo el alto y se desplaza por dentro. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">
          {section === "transponder" && (
            <CatalogSection
              title="Tipos de Transponder"
              subtitle='Opciones disponibles en "Se genera con"'
              icon={<Cpu className="w-4 h-4" />}
              items={transponders}
              category="transponder"
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReorderPreview={onReorderPreview}
              onReorderCommit={onReorderCommit}
              allCatalog={catalog}
            />
          )}
          {section === "equipo" && (
            <CatalogSection
              title="Equipos de Programación"
              subtitle='Opciones para equipos del remoto y transponder'
              icon={<Wrench className="w-4 h-4" />}
              items={equipos}
              category="equipo"
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReorderPreview={onReorderPreview}
              onReorderCommit={onReorderCommit}
              allCatalog={catalog}
            />
          )}
          {section === "transponderVehiculo" && (
            <TextCatalogSection
              title="Transponders del vehículo"
              subtitle='Opciones del campo "Transponder" de cada asignación · orden alfabético'
              icon={<KeyRound className="w-4 h-4" />}
              items={transpondersVehiculo}
              category="transponderVehiculo"
              noun="transponder"
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          )}
          {section === "bateria" && (
            <TextCatalogSection
              title="Baterías"
              subtitle='Opciones del campo "Batería" del perfil · orden alfabético'
              icon={<BatteryMedium className="w-4 h-4" />}
              items={baterias}
              category="bateria"
              noun="batería"
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          )}
          {section === "configTransponder" && <TransponderConfigManager />}
          {section === "procedimiento" && <ProcedureLibraryManager />}
        </div>
      </div>
    </div>
  );
}
