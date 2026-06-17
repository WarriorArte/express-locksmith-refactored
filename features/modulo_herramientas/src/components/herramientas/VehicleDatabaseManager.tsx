import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  Database,
  Car,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Search,
  Tags,
  Calendar,
  CarFront,
  Layers3,
  Bike,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CarRecord, VehicleCategory } from "@/data/carDatabase";
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_LABELS } from "@/data/carDatabase";
import type { VehicleImportResult } from "@/hooks/useVehicleDatabase";

const TABLE_RENDER_LIMIT = 300;

interface VehicleDatabaseManagerProps {
  records: CarRecord[];
  makes: string[];
  getModelsByMake: (make: string) => string[];
  getYearsByMakeModel: (make: string, model: string) => number[];
  getMakeCategory: (make: string) => VehicleCategory;
  setCategoryForMake: (make: string, category: VehicleCategory) => void;
  importVehicleRecords: (records: CarRecord[], category: VehicleCategory) => VehicleImportResult;
  addMake: (make: string, category: VehicleCategory) => void;
  renameMake: (oldMake: string, newMake: string) => void;
  deleteMake: (make: string) => void;
  addModel: (make: string, model: string, yearStart: number, yearEnd: number) => void;
  renameModel: (make: string, oldModel: string, newModel: string) => void;
  deleteModel: (make: string, model: string) => void;
  addYear: (make: string, model: string, year: number) => void;
  renameYear: (make: string, model: string, oldYear: number, newYear: number) => void;
  deleteYear: (make: string, model: string, year: number) => void;
  resetToSeed: () => void;
}

const CATEGORY_ICONS: Record<VehicleCategory, React.ReactNode> = {
  Vehiculo: <Car className="w-3.5 h-3.5" />,
  Camion: <Truck className="w-3.5 h-3.5" />,
  Motocicleta: <Bike className="w-3.5 h-3.5" />,
};

const CATEGORY_COLORS: Record<VehicleCategory, string> = {
  Vehiculo: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  Camion: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  Motocicleta: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function normalizeText(value: string) {
  return value.trim();
}

export function VehicleDatabaseManager({
  records,
  makes,
  getModelsByMake,
  getYearsByMakeModel,
  getMakeCategory,
  setCategoryForMake,
  importVehicleRecords,
  addMake,
  renameMake,
  deleteMake,
  addModel,
  renameModel,
  deleteModel,
  addYear,
  renameYear,
  deleteYear,
  resetToSeed,
}: VehicleDatabaseManagerProps) {
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<VehicleCategory | "">("");

  const [newMake, setNewMake] = useState("");
  const [newMakeCategory, setNewMakeCategory] = useState<VehicleCategory>("Vehiculo");
  const [renameMakeTo, setRenameMakeTo] = useState("");

  const [newModel, setNewModel] = useState("");
  const [newModelYearStart, setNewModelYearStart] = useState("2000");
  const [newModelYearEnd, setNewModelYearEnd] = useState("2000");
  const [renameModelTo, setRenameModelTo] = useState("");

  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [renameYearTo, setRenameYearTo] = useState("");

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [importCategory, setImportCategory] = useState<VehicleCategory>("Vehiculo");
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<CarRecord[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const filteredMakes = useMemo(
    () => categoryFilter ? makes.filter((m) => getMakeCategory(m) === categoryFilter) : makes,
    [makes, categoryFilter, getMakeCategory]
  );

  const models = useMemo(() => (selectedMake ? getModelsByMake(selectedMake) : []), [getModelsByMake, selectedMake]);

  const years = useMemo(
    () => (selectedMake && selectedModel ? getYearsByMakeModel(selectedMake, selectedModel) : []),
    [getYearsByMakeModel, selectedMake, selectedModel]
  );

  const totalModels = useMemo(() => {
    const set = new Set(records.filter((r) => r.Model).map((r) => `${r.Make}|${r.Model}`));
    return set.size;
  }, [records]);

  const scopedRecords = useMemo(() => {
    let out = records.filter(r => r.Model && r.Year > 0);

    if (categoryFilter) out = out.filter((r) => (r.Category ?? "Vehiculo") === categoryFilter);
    if (selectedMake) out = out.filter((r) => r.Make === selectedMake);
    if (selectedModel) out = out.filter((r) => r.Model === selectedModel);
    if (selectedYear) out = out.filter((r) => r.Year === Number(selectedYear));

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      out = out.filter(
        (r) => r.Make.toLowerCase().includes(q) || r.Model.toLowerCase().includes(q) || String(r.Year).includes(q)
      );
    }

    return out;
  }, [records, categoryFilter, selectedMake, selectedModel, selectedYear, deferredSearch]);

  const displayedRecords = useMemo(
    () => scopedRecords.slice(0, TABLE_RENDER_LIMIT),
    [scopedRecords]
  );

  const importPreview = useMemo(() => {
    const existingKeys = new Set(
      records
        .filter((record) => record.Make && record.Model && record.Year > 0)
        .map((record) => `${record.Make.toLowerCase()}|${record.Model.toLowerCase()}|${record.Year}`)
    );
    const seenImportKeys = new Set<string>();
    const validRows: CarRecord[] = [];

    importRows.forEach((record) => {
      const make = String(record.Make ?? "").trim();
      const model = String(record.Model ?? "").trim();
      const year = Number(record.Year);
      if (!make || !model || !Number.isFinite(year) || year <= 0) return;

      const key = `${make.toLowerCase()}|${model.toLowerCase()}|${year}`;
      if (seenImportKeys.has(key)) return;
      seenImportKeys.add(key);
      validRows.push({ Make: make, Model: model, Year: year });
    });

    const existingRows = validRows.filter((record) =>
      existingKeys.has(`${record.Make.toLowerCase()}|${record.Model.toLowerCase()}|${record.Year}`)
    );
    const newRows = validRows.filter((record) =>
      !existingKeys.has(`${record.Make.toLowerCase()}|${record.Model.toLowerCase()}|${record.Year}`)
    );
    const importMakes = [...new Set(validRows.map((record) => String(record.Make).trim()))].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    const importModels = new Set(validRows.map((record) => `${record.Make}|${record.Model}`)).size;
    const existingMakes = importMakes.filter((make) =>
      makes.some((storedMake) => storedMake.toLowerCase() === make.toLowerCase())
    );

    return {
      validRows,
      existingRows,
      newRows,
      makes: importMakes,
      existingMakes,
      modelCount: importModels,
    };
  }, [importRows, makes, records]);

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { results?: unknown };

      if (!Array.isArray(parsed.results)) {
        toast.error('Formato inválido. El JSON debe incluir "results": [].');
        return;
      }

      setImportFileName(file.name);
      setImportRows(parsed.results as CarRecord[]);
      setImportCategory("Vehiculo");
      setImportDialogOpen(true);
    } catch {
      toast.error("No se pudo leer el JSON seleccionado.");
    }
  };

  const cancelImport = () => {
    setImportDialogOpen(false);
    setImportFileName("");
    setImportRows([]);
    setImportCategory("Vehiculo");
  };

  const handleConfirmImport = () => {
    const result = importVehicleRecords(importPreview.newRows, importCategory);

    if (result.imported === 0) {
      toast.warning("Todos los registros válidos ya existen en la base de datos.");
      return;
    }

    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setImportFileName("");
    setImportRows([]);
    setImportDialogOpen(false);
    const skipped = importPreview.existingRows.length + result.skippedExisting;
    toast.success(`${result.imported} registros nuevos importados. ${skipped} ya existían.`);
  };

  const handleAddMake = () => {
    const make = normalizeText(newMake);

    if (!make) {
      toast.error("Ingresa el nombre de la marca.");
      return;
    }

    if (makes.some((m) => m.toLowerCase() === make.toLowerCase())) {
      toast.error("Esa marca ya existe.");
      return;
    }

    addMake(make, newMakeCategory);
    setSelectedMake(make);
    setSelectedModel("");
    setSelectedYear("");
    setNewMake("");
    toast.success(`Marca agregada como ${VEHICLE_CATEGORY_LABELS[newMakeCategory]}.`);
  };

  const handleRenameMake = () => {
    const target = normalizeText(renameMakeTo);

    if (!selectedMake || !target) {
      toast.error("Selecciona marca y escribe el nuevo nombre.");
      return;
    }

    if (selectedMake !== target && makes.some((m) => m.toLowerCase() === target.toLowerCase())) {
      toast.error("La nueva marca ya existe.");
      return;
    }

    renameMake(selectedMake, target);
    setSelectedMake(target);
    setRenameMakeTo("");
    toast.success("Marca actualizada.");
  };

  const handleDeleteMake = () => {
    if (!selectedMake) {
      toast.error("Selecciona una marca para eliminar.");
      return;
    }

    deleteMake(selectedMake);
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setRenameMakeTo("");
    toast.success("Marca eliminada con sus modelos y años.");
  };

  const handleAddModel = () => {
    const model = normalizeText(newModel);
    const y1 = Number(newModelYearStart);
    const y2 = Number(newModelYearEnd);

    if (!selectedMake || !model || !Number.isFinite(y1) || !Number.isFinite(y2)) {
      toast.error("Selecciona marca y completa modelo + rango de años.");
      return;
    }

    addModel(selectedMake, model, y1, y2);
    setSelectedModel(model);
    setSelectedYear("");
    setNewModel("");
    toast.success("Modelo agregado.");
  };

  const handleRenameModel = () => {
    const target = normalizeText(renameModelTo);

    if (!selectedMake || !selectedModel || !target) {
      toast.error("Selecciona marca/modelo e ingresa el nuevo nombre.");
      return;
    }

    renameModel(selectedMake, selectedModel, target);
    setSelectedModel(target);
    setRenameModelTo("");
    toast.success("Modelo actualizado.");
  };

  const handleDeleteModel = () => {
    if (!selectedMake || !selectedModel) {
      toast.error("Selecciona marca y modelo.");
      return;
    }

    deleteModel(selectedMake, selectedModel);
    setSelectedModel("");
    setSelectedYear("");
    setRenameModelTo("");
    toast.success("Modelo eliminado con sus años.");
  };

  const handleAddYear = () => {
    const year = Number(newYear);

    if (!selectedMake || !selectedModel || !Number.isFinite(year)) {
      toast.error("Selecciona marca/modelo e ingresa un año válido.");
      return;
    }

    addYear(selectedMake, selectedModel, year);
    setSelectedYear(String(year));
    setNewYear(String(new Date().getFullYear()));
    toast.success("Año agregado.");
  };

  const handleRenameYear = () => {
    const source = Number(selectedYear);
    const target = Number(renameYearTo);

    if (!selectedMake || !selectedModel || !Number.isFinite(source) || !Number.isFinite(target)) {
      toast.error("Selecciona año origen e ingresa nuevo año.");
      return;
    }

    renameYear(selectedMake, selectedModel, source, target);
    setSelectedYear(String(target));
    setRenameYearTo("");
    toast.success("Año actualizado.");
  };

  const handleDeleteYear = () => {
    const source = Number(selectedYear);

    if (!selectedMake || !selectedModel || !Number.isFinite(source)) {
      toast.error("Selecciona marca/modelo/año.");
      return;
    }

    deleteYear(selectedMake, selectedModel, source);
    setSelectedYear("");
    setRenameYearTo("");
    toast.success("Año eliminado.");
  };

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <Card className="shrink-0">
        <CardContent className="pt-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Base de Vehículos
              </h2>
              <p className="text-sm text-muted-foreground">
                Gestión centralizada para asignación de vehículos en SuperAdmin
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Tags className="w-3.5 h-3.5" /> {makes.length} marcas
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Layers3 className="w-3.5 h-3.5" /> {totalModels} modelos
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Calendar className="w-3.5 h-3.5" /> {records.length} registros
              </Badge>
            </div>

            <div className="flex w-full xl:w-auto gap-2 flex-wrap">
              {/* Category filter chips */}
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => { setCategoryFilter(""); setSelectedMake(""); setSelectedModel(""); setSelectedYear(""); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    !categoryFilter ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900" : "text-muted-foreground border-border hover:border-slate-400"
                  }`}
                >
                  Todos
                </button>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategoryFilter(cat); setSelectedMake(""); setSelectedModel(""); setSelectedYear(""); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      categoryFilter === cat ? CATEGORY_COLORS[cat] + " font-semibold" : "text-muted-foreground border-border hover:border-slate-400"
                    }`}
                  >
                    {CATEGORY_ICONS[cat]} {VEHICLE_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 xl:w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-8"
                />
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  handleImportFile(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1.5" /> Importar
              </Button>
              {import.meta.env.DEV && (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetToSeed();
                    setSelectedMake("");
                    setSelectedModel("");
                    setSelectedYear("");
                    setCategoryFilter("");
                    toast.success("Base restaurada desde temp_db/auto-list.");
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Restaurar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-12 gap-3">
        <Card className="xl:col-span-3 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CarFront className="w-4 h-4 text-primary" /> Explorador
            </CardTitle>
            <CardDescription>Selecciona marca, modelo y año para operar más rápido</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 min-h-0 overflow-auto space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                {selectedMake && (() => {
                  const cat = getMakeCategory(selectedMake);
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${CATEGORY_COLORS[cat]}`}>
                      {CATEGORY_ICONS[cat]} {VEHICLE_CATEGORY_LABELS[cat]}
                    </span>
                  );
                })()}
              </div>
              <select
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel("");
                  setSelectedYear("");
                }}
                className={selectClass}
              >
                <option value="">Selecciona marca...</option>
                {filteredMakes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Modelo</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSelectedYear("");
                }}
                className={selectClass}
                disabled={!selectedMake}
              >
                <option value="">Selecciona modelo...</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={selectClass}
                disabled={!selectedMake || !selectedModel}
              >
                <option value="">Todos los años...</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium">Contexto actual</p>
              <p className="text-muted-foreground">Marca: {selectedMake || "-"}</p>
              <p className="text-muted-foreground">Modelo: {selectedModel || "-"}</p>
              <p className="text-muted-foreground">Año: {selectedYear || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 min-h-0 flex flex-col">
          <CardHeader className="pb-3 border-b mb-3 shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> Acciones de Gestión
            </CardTitle>
            <CardDescription className="text-xs">Registro y edición de datos segregada</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 min-h-0 overflow-y-auto space-y-6 custom-scrollbar pr-2">
            
            {/* SECCIÓN: AGREGAR */}
            <div className="space-y-4">
              <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) cancelImport(); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar importación</DialogTitle>
                    <DialogDescription>
                      Se agregarán solo los autos nuevos. Los registros que ya existen se omiten.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-foreground">{importFileName}</span>
                        <Badge variant="secondary">{importPreview.validRows.length} válidos</Badge>
                        <Badge variant={importPreview.newRows.length > 0 ? "default" : "outline"}>
                          {importPreview.newRows.length} nuevos
                        </Badge>
                        <Badge variant={importPreview.existingRows.length > 0 ? "outline" : "secondary"}>
                          {importPreview.existingRows.length} existentes
                        </Badge>
                        <Badge variant="outline">{importPreview.modelCount} modelos</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {importPreview.makes.length ? importPreview.makes.join(", ") : "Sin marcas válidas"}
                      </p>
                      {importPreview.existingMakes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Marcas ya creadas: {importPreview.existingMakes.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Categoría de esta importación</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {VEHICLE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setImportCategory(cat)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                              importCategory === cat
                                ? CATEGORY_COLORS[cat] + " border-current"
                                : "border-border text-muted-foreground hover:border-muted-foreground"
                            }`}
                          >
                            {CATEGORY_ICONS[cat]}
                            {VEHICLE_CATEGORY_LABELS[cat]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={cancelImport}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={importPreview.validRows.length === 0}
                    >
                      Importar nuevos
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Plus className="w-4 h-4" /> Registrar Nuevos Datos
              </h3>
              
              <Tabs defaultValue="make" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="make" className="text-xs">Nueva Marca</TabsTrigger>
                  <TabsTrigger value="model" className="text-xs">Nuevo Modelo</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs">Nuevo Año</TabsTrigger>
                </TabsList>

                <div className="mt-3 rounded-md border p-3 bg-muted/5 min-h-[14rem]">
                  {/* TAB: MARCA */}
                  <TabsContent value="make" className="m-0 space-y-3">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Tags className="w-3.5 h-3.5"/> Agregar una marca global
                    </Label>
                    <Input value={newMake} onChange={(e) => setNewMake(e.target.value)} placeholder="Nombre de la marca (ej. Toyota)" className="text-xs h-8" />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Categoría</Label>
                      <div className="flex gap-2">
                        {VEHICLE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewMakeCategory(cat)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                              newMakeCategory === cat
                                ? CATEGORY_COLORS[cat] + " border-current"
                                : "border-border text-muted-foreground hover:border-muted-foreground"
                            }`}
                          >
                            {CATEGORY_ICONS[cat]}
                            {VEHICLE_CATEGORY_LABELS[cat]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleAddMake} size="sm" className="w-full h-8 text-xs font-medium">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Marca
                    </Button>
                  </TabsContent>

                  {/* TAB: MODELO */}
                  <TabsContent value="model" className="m-0 space-y-3">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5"/> 1. Selecciona la Marca dueña
                    </Label>
                    <select
                      value={selectedMake}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel("");
                        setSelectedYear("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Seleccione marca...</option>
                      {makes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2 border-t">
                      2. Datos del nuevo Modelo
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Modelo (ej. Yaris)" disabled={!selectedMake} className="text-xs h-8" />
                      <div className="flex gap-2">
                        <Input type="number" value={newModelYearStart} onChange={(e) => setNewModelYearStart(e.target.value)} placeholder="Año inicio" disabled={!selectedMake} className="text-xs h-8 flex-1" />
                        <Input type="number" value={newModelYearEnd} onChange={(e) => setNewModelYearEnd(e.target.value)} placeholder="Año fin" disabled={!selectedMake} className="text-xs h-8 flex-1" />
                      </div>
                    </div>
                    <Button onClick={handleAddModel} size="sm" className="w-full h-8 text-xs font-medium" disabled={!selectedMake}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Modelo en {selectedMake || "..."}
                    </Button>
                  </TabsContent>

                  {/* TAB: AÑO */}
                  <TabsContent value="year" className="m-0 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5"/> 1. Ubicación
                      </Label>
                      <select
                        value={selectedMake}
                        onChange={(e) => {
                          setSelectedMake(e.target.value);
                          setSelectedModel("");
                          setSelectedYear("");
                        }}
                        className={selectClass}
                      >
                        <option value="">Seleccione marca...</option>
                        {makes.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          setSelectedYear("");
                        }}
                        className={selectClass}
                        disabled={!selectedMake}
                      >
                        <option value="">Seleccione modelo...</option>
                        {models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        2. Datos del nuevo Año
                      </Label>
                      <Input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="Ej. 2024" disabled={!selectedMake || !selectedModel} className="text-xs h-8" />
                    </div>
                    <Button onClick={handleAddYear} size="sm" className="w-full h-8 text-xs font-medium" disabled={!selectedMake || !selectedModel}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Año
                    </Button>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* SECCIÓN: EDITAR / ELIMINAR */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Pencil className="w-4 h-4" /> Editar o Eliminar
              </h3>
              
              <Tabs defaultValue="make" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="make" className="text-xs">Marca</TabsTrigger>
                  <TabsTrigger value="model" className="text-xs">Modelo</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs">Año</TabsTrigger>
                </TabsList>

                <div className="mt-3 rounded-md border p-3 bg-muted/5 min-h-[12rem]">
                  
                  {/* TAB EDIT: MARCA */}
                  <TabsContent value="make" className="m-0 space-y-3">
                    <Label className="text-xs text-muted-foreground">Paso 1: Seleccione la marca a gestionar</Label>
                    <select
                      value={selectedMake}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel("");
                        setSelectedYear("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Seleccione marca...</option>
                      {makes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground flex justify-between">
                        <span>Paso 2: Acciones</span>
                        <span className="font-semibold text-foreground">{selectedMake || "Ninguna"}</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input value={renameMakeTo} onChange={(e) => setRenameMakeTo(e.target.value)} placeholder="Nuevo nombre..." disabled={!selectedMake} className="text-xs h-8 flex-1" />
                        <Button variant="outline" onClick={handleRenameMake} size="sm" disabled={!selectedMake} className="h-8 w-8 p-0 shrink-0"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="destructive" onClick={handleDeleteMake} size="sm" disabled={!selectedMake} className="h-8 w-8 p-0 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>

                    {selectedMake && (
                      <div className="space-y-1.5 pt-2 border-t">
                        <Label className="text-xs text-muted-foreground">Cambiar categoría</Label>
                        <div className="flex gap-1.5">
                          {VEHICLE_CATEGORIES.map((cat) => {
                            const current = getMakeCategory(selectedMake);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => { setCategoryForMake(selectedMake, cat); toast.success(`Categoría actualizada a ${VEHICLE_CATEGORY_LABELS[cat]}.`); }}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium border-2 transition-all ${
                                  current === cat
                                    ? CATEGORY_COLORS[cat] + " border-current"
                                    : "border-border text-muted-foreground hover:border-muted-foreground"
                                }`}
                              >
                                {CATEGORY_ICONS[cat]} {VEHICLE_CATEGORY_LABELS[cat]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB EDIT: MODELO */}
                  <TabsContent value="model" className="m-0 space-y-3">
                    <Label className="text-xs text-muted-foreground">Paso 1: Ubique el modelo</Label>
                    <select
                      value={selectedMake}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel("");
                        setSelectedYear("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Seleccione marca...</option>
                      {makes.map((m) => (
                         <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedYear("");
                      }}
                      className={selectClass}
                      disabled={!selectedMake}
                    >
                      <option value="">Seleccione modelo...</option>
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground flex justify-between">
                        <span>Paso 2: Acciones</span>
                        <span className="font-semibold text-foreground">{selectedModel || "Ninguno"}</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input value={renameModelTo} onChange={(e) => setRenameModelTo(e.target.value)} placeholder="Nuevo nombre..." disabled={!selectedMake || !selectedModel} className="text-xs h-8 flex-1" />
                        <Button variant="outline" onClick={handleRenameModel} size="sm" disabled={!selectedMake || !selectedModel} className="h-8 w-8 p-0 shrink-0"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="destructive" onClick={handleDeleteModel} size="sm" disabled={!selectedMake || !selectedModel} className="h-8 w-8 p-0 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB EDIT: AÑO */}
                  <TabsContent value="year" className="m-0 space-y-3">
                     <Label className="text-xs text-muted-foreground">Paso 1: Ubique el año</Label>
                     <select
                      value={selectedMake}
                      onChange={(e) => {
                        setSelectedMake(e.target.value);
                        setSelectedModel("");
                        setSelectedYear("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Seleccione marca...</option>
                      {makes.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedYear("");
                      }}
                      className={selectClass}
                      disabled={!selectedMake}
                    >
                      <option value="">Seleccione modelo...</option>
                      {models.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={selectClass}
                      disabled={!selectedMake || !selectedModel}
                    >
                       <option value="">Seleccione año...</option>
                       {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                    </select>

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground flex justify-between">
                        <span>Paso 2: Acciones</span>
                        <span className="font-semibold text-foreground">{selectedYear || "Ninguno"}</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input type="number" value={renameYearTo} onChange={(e) => setRenameYearTo(e.target.value)} placeholder="Nuevo dígito..." disabled={!selectedMake || !selectedModel || !selectedYear} className="text-xs h-8 flex-1" />
                        <Button variant="outline" onClick={handleRenameYear} size="sm" disabled={!selectedMake || !selectedModel || !selectedYear} className="h-8 w-8 p-0 shrink-0"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="destructive" onClick={handleDeleteYear} size="sm" disabled={!selectedMake || !selectedModel || !selectedYear} className="h-8 w-8 p-0 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </TabsContent>

                </div>
              </Tabs>
            </div>

          </CardContent>
        </Card>

        <Card className="xl:col-span-5 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" /> Registros ({scopedRecords.length})
            </CardTitle>
            <CardDescription>
              {scopedRecords.length > TABLE_RENDER_LIMIT
                ? `Mostrando ${TABLE_RENDER_LIMIT} de ${scopedRecords.length}. Usa filtros o búsqueda para acotar.`
                : "Vista en tiempo real con filtros del explorador"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 font-semibold">Marca</th>
                    <th className="text-left p-2 font-semibold">Modelo</th>
                    <th className="text-left p-2 font-semibold">Año</th>
                    <th className="text-left p-2 font-semibold">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecords.map((r, idx) => {
                    const cat = (r.Category ?? "Vehiculo") as VehicleCategory;
                    return (
                      <tr key={`${r.Make}-${r.Model}-${r.Year}-${idx}`} className="border-t">
                        <td className="p-2">{r.Make}</td>
                        <td className="p-2">{r.Model}</td>
                        <td className="p-2">{r.Year}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${CATEGORY_COLORS[cat]}`}>
                            {CATEGORY_ICONS[cat]} {VEHICLE_CATEGORY_LABELS[cat]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
