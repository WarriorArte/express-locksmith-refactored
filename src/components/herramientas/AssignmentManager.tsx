import { useState, useMemo, useCallback } from "react";
import { Car, Wrench, Users, Settings, Check, Trash2, Pencil, X, Plus, Search, ChevronLeft, ChevronRight, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { AVAILABLE_TOOLS } from "@/data/tools";
import type { CarRecord } from "@/data/carDatabase";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { ToolAssignment, KeycodeProfile, LockSelectionsMap, LockKey } from "@/types";
import { LOCK_LABELS, LOCK_ORDER } from "@/types";

const PAGE_SIZE = 20;

/** Longitud total del bitting de un perfil (suma de ejes si los hay). */
function getProfileBittingLength(p: KeycodeProfile): number {
  const cfg = p.bittingConfig;
  if (cfg.axes && cfg.axes.length >= 2) {
    return cfg.axes.reduce((s, a) => s + a.length, 0);
  }
  return cfg.length;
}

interface AssignmentManagerProps {
  assignments: ToolAssignment[];
  onSave: (assignment: ToolAssignment) => void;
  onUpdate: (assignment: ToolAssignment) => void;
  onDelete: (id: string) => void;
  keycodeProfiles: KeycodeProfile[];
  vehicleRecords: CarRecord[];
}

interface AssignmentManagerProps {
  assignments: ToolAssignment[];
  onSave: (assignment: ToolAssignment) => void;
  onUpdate: (assignment: ToolAssignment) => void;
  onDelete: (id: string) => void;
  keycodeProfiles: KeycodeProfile[];
  vehicleRecords: CarRecord[];
}

/* ═══════════════════════════════════════════
   Form reutilizable para crear / editar
   ═══════════════════════════════════════════ */
function AssignmentForm({
  initial,
  workshops,
  keycodeProfiles,
  vehicleRecords,
  onSubmit,
  onBulkSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: ToolAssignment;
  workshops: { id: string; name: string }[];
  keycodeProfiles: KeycodeProfile[];
  vehicleRecords: CarRecord[];
  onSubmit?: (a: ToolAssignment) => void;
  onBulkSubmit?: (items: ToolAssignment[]) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  // Temporary vehicle selection state
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [yearStart, setYearStart] = useState(initial?.yearStart?.toString() ?? "");
  const [yearEnd, setYearEnd] = useState(initial?.yearEnd?.toString() ?? "");
  
  // List of vehicles to assign
  interface VehicleItem { make: string; model: string; yearStart: number; yearEnd: number; }
  const [vehicles, setVehicles] = useState<VehicleItem[]>(
    initial ? [{ make: initial.make, model: initial.model, yearStart: initial.yearStart, yearEnd: initial.yearEnd }] : []
  );

  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(initial?.keycodeProfileIds ?? []);
  const [profileSearch, setProfileSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Cerraduras configuradas por perfil. Si un perfil deja de estar seleccionado, su entrada se conserva
  // por si el usuario lo vuelve a marcar (no se pierde la configuración hasta guardar).
  const [lockSelections, setLockSelections] = useState<LockSelectionsMap>(initial?.lockSelections ?? {});

  const toggleLock = (profileId: string, lockKey: LockKey, length: number) => {
    setLockSelections((prev) => {
      const profileLocks = { ...(prev[profileId] ?? {}) };
      if (profileLocks[lockKey]) {
        delete profileLocks[lockKey];
      } else {
        // Por defecto, todas las casillas marcadas (la cerradura usa todos los cortes)
        profileLocks[lockKey] = Array.from({ length }, () => true);
      }
      return { ...prev, [profileId]: profileLocks };
    });
  };

  const toggleLockCut = (profileId: string, lockKey: LockKey, cutIndex: number) => {
    setLockSelections((prev) => {
      const profileLocks = { ...(prev[profileId] ?? {}) };
      const arr = profileLocks[lockKey];
      if (!arr) return prev;
      const next = [...arr];
      next[cutIndex] = !next[cutIndex];
      profileLocks[lockKey] = next;
      return { ...prev, [profileId]: profileLocks };
    });
  };

  const makes = useMemo(() => [...new Set(vehicleRecords.map((c) => c.Make).filter(Boolean))].sort(), [vehicleRecords]);
  const models = useMemo(() => {
    if (!make) return [];
    return [...new Set(vehicleRecords.filter((c) => c.Make === make && c.Model).map((c) => c.Model))].sort();
  }, [make, vehicleRecords]);
  const availableYears = useMemo(() => {
    if (!make || !model) return [];
    return [...new Set(vehicleRecords.filter((c) => c.Make === make && c.Model === model && c.Year > 0).map((c) => c.Year))].sort((a, b) => a - b);
  }, [make, model, vehicleRecords]);

  const toggleProfile = (profileId: string) =>
    setSelectedProfileIds((prev) =>
      prev.includes(profileId) ? prev.filter((p) => p !== profileId) : [...prev, profileId]
    );

  const handleAddVehicle = () => {
    if (!make || !model || !yearStart || !yearEnd) {
      toast.error("Selecciona todos los campos del vehículo.");
      return;
    }
    const exists = vehicles.find(v => v.make === make && v.model === model && v.yearStart === parseInt(yearStart) && v.yearEnd === parseInt(yearEnd));
    if (exists) {
      toast.error("Este vehículo ya está en la lista.");
      return;
    }
    setVehicles([...vehicles, { make, model, yearStart: parseInt(yearStart), yearEnd: parseInt(yearEnd) }]);
    setMake("");
    setModel("");
    setYearStart("");
    setYearEnd("");
  };

  const handleRemoveVehicle = (idx: number) => {
    setVehicles(vehicles.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (vehicles.length === 0) {
      toast.error("Añade al menos un vehículo a la lista.");
      return;
    }
    if (selectedProfileIds.length === 0) {
      toast.error("Selecciona al menos una serie (perfil).");
      return;
    }
    
    // Conserva sólo las cerraduras de los perfiles que siguen seleccionados
    const cleanedLockSelections: LockSelectionsMap = {};
    selectedProfileIds.forEach((pid) => {
      if (lockSelections[pid] && Object.keys(lockSelections[pid]!).length > 0) {
        cleanedLockSelections[pid] = lockSelections[pid]!;
      }
    });

    // Generate assignments
    const newAssignments: ToolAssignment[] = vehicles.map((v, i) => ({
      id: initial && vehicles.length === 1 ? initial.id : Date.now().toString() + i, // Preserve ID if editing single
      make: v.make,
      model: v.model,
      yearStart: v.yearStart,
      yearEnd: v.yearEnd,
      tools: ["keycode"],
      workshops: [],
      dateAdded: initial?.dateAdded ?? new Date().toLocaleDateString(),
      keycodeProfileIds: selectedProfileIds,
      lockSelections: Object.keys(cleanedLockSelections).length > 0 ? cleanedLockSelections : undefined,
    }));

    if (onBulkSubmit) {
      onBulkSubmit(newAssignments);
    } else if (onSubmit && newAssignments[0]) {
      onSubmit(newAssignments[0]);
    }
  };

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-4">
      {/* Vehículo */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5" /> Selección de Vehículos
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <select value={make} onChange={(e) => { setMake(e.target.value); setModel(""); setYearStart(""); setYearEnd(""); }} className={selectClass}>
            <option value="">Marca...</option>
            {makes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={model} onChange={(e) => { setModel(e.target.value); setYearStart(""); setYearEnd(""); }} disabled={!make} className={selectClass}>
            <option value="">Modelo...</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={yearStart} onChange={(e) => setYearStart(e.target.value)} disabled={!model} className={selectClass}>
            <option value="">Año inicio...</option>
            {availableYears
              .filter((y) => !yearEnd || y <= parseInt(yearEnd))
              .map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} disabled={!model} className={selectClass}>
            <option value="">Año fin...</option>
            {availableYears
              .filter((y) => !yearStart || y >= parseInt(yearStart))
              .map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="secondary" onClick={handleAddVehicle} className="w-full sm:w-auto h-9 px-3shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Añadir
          </Button>
        </div>

        {/* Vehículos Seleccionados (Lista) */}
        {vehicles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/50 rounded-lg border">
            {vehicles.map((v, i) => (
              <Badge key={i} variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
                <Car className="w-3 h-3 text-muted-foreground" />
                {v.make} {v.model} ({v.yearStart}-{v.yearEnd})
                <button onClick={() => handleRemoveVehicle(i)} className="ml-1 text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Series */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5" /> Series (Perfiles)
        </p>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Selecciona a qué series corresponde este vehículo:</p>
          
          <div className="relative">
            <div 
              className="flex flex-wrap min-h-[36px] w-full items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedProfileIds.length === 0 ? (
                <span className="text-muted-foreground py-0.5">Seleccionar perfiles...</span>
              ) : (
                selectedProfileIds.map(pid => {
                  const p = keycodeProfiles.find(x => x.id === pid);
                  if (!p) return null;
                  return (
                    <span 
                      key={pid} 
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-medium"
                    >
                      IC: {p.icCard} · {p.series}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProfile(pid);
                        }}
                        className="text-primary hover:text-primary/70 focus:outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}
              <div className="ml-auto text-muted-foreground">
                <ChevronDown className="w-4 h-4 opacity-50" />
              </div>
            </div>

            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md animate-in fade-in-80 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                  <div className="p-2 border-b flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Buscar serie o IC Card..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar">
                    {keycodeProfiles
                      .filter(p => 
                        (p.series || "").toLowerCase().includes(profileSearch.toLowerCase()) || 
                        (p.icCard || "").toLowerCase().includes(profileSearch.toLowerCase())
                      )
                      .map(p => {
                        const isSelected = selectedProfileIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleProfile(p.id)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer text-sm"
                          >
                            <div className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-primary/50'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="font-medium text-xs">IC: {p.icCard}</span>
                            <span className="text-muted-foreground text-xs">· {p.series}</span>
                          </div>
                        );
                    })}
                    {keycodeProfiles.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">No hay series creadas aún.</div>
                    )}
                    {keycodeProfiles.length > 0 && keycodeProfiles.filter(p => 
                        (p.series || "").toLowerCase().includes(profileSearch.toLowerCase()) || 
                        (p.icCard || "").toLowerCase().includes(profileSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron resultados.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cerraduras por serie */}
      {selectedProfileIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Cerradura
          </p>
          <p className="text-xs text-muted-foreground">
            Marca qué cerraduras incluye cada serie y, dentro de cada una, qué cortes están presentes.
          </p>

          <div className="space-y-3">
            {selectedProfileIds.map((pid) => {
              const profile = keycodeProfiles.find((p) => p.id === pid);
              if (!profile) return null;
              const totalLen = getProfileBittingLength(profile);
              const axes = profile.bittingConfig.axes;
              const isDosEjes = !!(axes && axes.length >= 2);
              const profileLocks = lockSelections[pid] ?? {};

              return (
                <div key={pid} className="rounded-lg border bg-background p-3 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="font-mono">IC {profile.icCard}</Badge>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium">{profile.series}</span>
                    <span className="text-muted-foreground">· {totalLen} cortes{isDosEjes ? ` (${axes![0].label}:${axes![0].length} / ${axes![1].label}:${axes![1].length})` : ''}</span>
                  </div>

                  {/* Toggles de cerraduras */}
                  <div className="flex flex-wrap gap-2">
                    {LOCK_ORDER.map((lk) => {
                      const enabled = !!profileLocks[lk];
                      return (
                        <button
                          key={lk}
                          type="button"
                          onClick={() => toggleLock(pid, lk, totalLen)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${enabled ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-input hover:bg-muted'}`}
                        >
                          {LOCK_LABELS[lk]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Casillas por cerradura activa */}
                  {LOCK_ORDER.filter((lk) => profileLocks[lk]).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {LOCK_ORDER.filter((lk) => profileLocks[lk]).map((lk) => {
                        const arr = profileLocks[lk]!;
                        const renderRow = (start: number, end: number) =>
                          arr.slice(start, end).map((checked, i) => {
                            const idx = start + i;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleLockCut(pid, lk, idx)}
                                className={`w-6 h-6 rounded border flex items-center justify-center text-[10px] font-bold transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-input hover:bg-muted'}`}
                                title={`Corte ${idx + 1}`}
                              >
                                {checked ? '✓' : ''}
                              </button>
                            );
                          });

                        return (
                          <div key={lk} className="flex items-center gap-2 text-xs">
                            <span className="w-20 shrink-0 font-medium text-foreground">{LOCK_LABELS[lk]}:</span>
                            {isDosEjes ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-[10px] font-bold text-muted-foreground">{axes![0].label}</span>
                                <div className="flex gap-1">{renderRow(0, axes![0].length)}</div>
                                <span className="text-[10px] font-bold text-muted-foreground ml-1">{axes![1].label}</span>
                                <div className="flex gap-1">{renderRow(axes![0].length, axes![0].length + axes![1].length)}</div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">{renderRow(0, totalLen)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} className="flex-1">
          <Settings className="w-4 h-4 mr-1.5" /> {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════ */
export function AssignmentManager({ assignments, onSave, onUpdate, onDelete, keycodeProfiles, vehicleRecords }: AssignmentManagerProps) {
  const { workshops } = useWorkshop();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = assignments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.make.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q) ||
          `${a.yearStart}`.includes(q) ||
          `${a.yearEnd}`.includes(q)
      );
    }
    return list;
  }, [assignments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleBulkSave = useCallback((items: ToolAssignment[]) => {
    items.reverse().forEach(a => onSave(a));
    toast.success(`${items.length} asignacion(es) creada(s).`);
    setShowNewForm(false);
  }, [onSave]);

  const handleUpdate = useCallback((a: ToolAssignment) => {
    onUpdate(a);
    toast.success("Asignación actualizada.");
    setEditingId(null);
  }, [onUpdate]);

  const handleDelete = useCallback((id: string) => {
    onDelete(id);
    toast.success("Asignación eliminada.");
    setConfirmDeleteId(null);
  }, [onDelete]);

  const selectClass =
    "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const editingAssignment = editingId ? assignments.find((a) => a.id === editingId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Columna Izquierda: Formulario (Crear/Editar) */}
      <div className="lg:col-span-7 space-y-4 sticky top-6">
        <div className="flex flex-col justify-center h-auto sm:h-[60px] shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 leading-none">
            <Car className="w-5 h-5 text-primary" /> {editingAssignment ? "Editar Asignación" : "Nueva Asignación"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            {editingAssignment 
              ? "Actualiza los datos de la asignación seleccionada. (Deselecciona la miniatura para crear una nueva)" 
              : "Crea asignaciones para uno o más vehículos."}
          </p>
        </div>

        <motion.div
          key={editingAssignment ? editingAssignment.id : "new-assignment"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={`${editingAssignment ? "border-primary ring-1 ring-primary/20 shadow-sm" : "border-primary/20"} overflow-visible`}>
            <CardContent className="pt-4 pb-4 px-4 bg-primary/5 rounded-[inherit]">
              <AssignmentForm
                initial={editingAssignment || undefined}
                workshops={workshops}
                keycodeProfiles={keycodeProfiles}
                vehicleRecords={vehicleRecords}
                onSubmit={editingAssignment ? handleUpdate : undefined}
                onBulkSubmit={!editingAssignment ? handleBulkSave : undefined}
                onCancel={editingAssignment ? () => setEditingId(null) : undefined}
                submitLabel={editingAssignment ? "Guardar Cambios" : "Crear Asignación(es)"}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Columna Derecha: Lista de Miniaturas */}
      <div className="lg:col-span-5 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 px-3 py-2 rounded-lg border border-border h-auto sm:h-[60px] shrink-0">
          <p className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            Total: {filtered.length} asignacion{filtered.length !== 1 && "es"}
          </p>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar marca, modelo o año..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-8 w-full h-8 bg-background text-sm"
            />
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
            <Car className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">
              {assignments.length === 0 ? "No hay asignaciones creadas." : "Sin resultados para esta búsqueda."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
            {pageItems.map((item) => {
              const isEditing = editingId === item.id;
              const isDeleting = confirmDeleteId === item.id;

              return (
                <Card
                  key={item.id}
                  onClick={() => {
                    if (!isDeleting) {
                      setEditingId(isEditing ? null : item.id);
                    }
                  }}
                  className={`transition-all overflow-hidden cursor-pointer relative ${
                    isEditing
                      ? "ring-2 ring-primary border-primary shadow-sm"
                      : "hover:border-primary/50 hover:bg-muted/30"
                  } ${isDeleting ? "border-destructive/50 bg-destructive/5 cursor-default" : ""}`}
                >
                  {isEditing && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  )}
                  <CardContent className="p-3 pl-4">
                    <div className="flex flex-col h-full gap-2 pointer-events-none">
                      <div className="flex items-start justify-between gap-2 pointer-events-auto">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-sm truncate transition-colors ${isEditing ? "text-primary" : "text-foreground"}`} title={`${item.make} ${item.model}`}>
                            {item.make} {item.model}
                          </h3>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {item.yearStart}–{item.yearEnd}
                          </div>
                        </div>
                        
                        {/* Actions wrapper stops propagation so clicking buttons doesn't toggle selection */}
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isDeleting ? (
                            <div className="flex flex-col gap-1 items-end absolute right-2 top-2 bg-background p-1.5 rounded-md shadow-md border z-10 pointer-events-auto">
                              <span className="text-[10px] font-bold px-1 text-destructive">¿Borrar?</span>
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleDelete(item.id)}>Sí</Button>
                                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => setConfirmDeleteId(null)}>No</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-6 w-6 pointer-events-auto ${isEditing ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                                onClick={() => setEditingId(isEditing ? null : item.id)}
                                title={isEditing ? "Deseleccionar" : "Editar"}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive pointer-events-auto" 
                                onClick={() => setConfirmDeleteId(item.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Series asignadas (Miniaturas) */}
                      <div className="mt-auto pt-2 border-t border-border/50 pointer-events-auto">
                        {item.keycodeProfileIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.keycodeProfileIds.map((pid) => {
                              const p = keycodeProfiles.find((x) => x.id === pid);
                              return p ? (
                                <span key={pid} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title={`Serie: ${p.series}`}>
                                  IC:{p.icCard}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Sin series</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-md">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
