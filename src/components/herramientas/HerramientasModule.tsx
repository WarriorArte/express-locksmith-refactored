import { useState, useMemo } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { Wrench, Key, FileText, Cpu, Car, Truck, Bike } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useWorkshop } from "@/hooks/useWorkshop";
import { useKeycodeProfiles } from "@/hooks/useKeycodeProfiles";
import { useToolAssignments } from "@/hooks/useToolAssignments";
import { useVehicleDatabase } from "@/hooks/useVehicleDatabase";
import { useAlarmaProfiles } from "@/hooks/useAlarmaProfiles";
import { useImmoProfiles } from "@/hooks/useImmoProfiles";
import { useImmoCatalog } from "@/hooks/useImmoCatalog";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { type VehicleCategory, VEHICLE_CATEGORIES } from "@/data/carDatabase";
import type { ToolAssignment } from "@/types";

import { KeycodeManager } from "./KeycodeManager";
import { AssignmentManager } from "./AssignmentManager";
import { VehicleDatabaseManager } from "./VehicleDatabaseManager";

import { WorkshopToolView } from "./WorkshopToolView";
import { AlarmasManager } from "./AlarmasManager";
import { ImmoManager, ImmoAssignmentManager } from "./ImmoManager";
import { ImmoSuppliesManager } from "./ImmoSuppliesManager";

const HERO_CHIP_ICONS: Record<VehicleCategory, React.ReactNode> = {
  Vehiculo: <Car className="w-3.5 h-3.5" />,
  Camion: <Truck className="w-3.5 h-3.5" />,
  Motocicleta: <Bike className="w-3.5 h-3.5" />,
};

const HERO_CHIP_LABELS: Record<VehicleCategory, string> = {
  Vehiculo: "Auto",
  Camion: "Camión",
  Motocicleta: "Motocicleta",
};

export type SuperAdminHerramientasView = "keycode" | "immo" | "alarmas" | "vehiculos";

interface HerramientasModuleProps {
  superAdminView?: SuperAdminHerramientasView;
}

export function HerramientasModule({ superAdminView }: HerramientasModuleProps) {
  const { isSuperAdmin } = useWorkshop();
  const { profiles, addProfile, updateProfile, deleteProfile, fetchProfileWithCodes } = useKeycodeProfiles();
  const { assignments, addAssignment, updateAssignment, deleteAssignment } = useToolAssignments();
  const vehicleDb = useVehicleDatabase({ readOnly: !isSuperAdmin });
  const { profiles: alarmaProfiles, addProfile: addAlarmaProfile, updateProfile: updateAlarmaProfile, deleteProfile: deleteAlarmaProfile } = useAlarmaProfiles();
  const { profiles: immoProfiles, addProfile: addImmoProfile, updateProfile: updateImmoProfile, deleteProfile: deleteImmoProfile } = useImmoProfiles();
  const { catalog, addItem, updateItem, deleteItem, reorderItems } = useImmoCatalog();
  const [toolActive, setToolActive] = useState(false);
  const [localSuperAdminView, setLocalSuperAdminView] = useState<SuperAdminHerramientasView>("keycode");
  const activeSuperAdminView = superAdminView ?? localSuperAdminView;
  const showInternalSuperAdminTabs = superAdminView === undefined;

  // ── Vehicle selection state (workshop view) ────────────────────────────────
  const { isFeatureEnabled } = useWorkshopFeatures();
  const isKeycodeAuth = isFeatureEnabled("tool_keycode");
  const isAlarmasAuth = isFeatureEnabled("tool_alarmas");
  const isImmoAuth    = isFeatureEnabled("tool_immo");

  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | "">("");
  const [selectedYear,     setSelectedYear]     = useState<number | "">("");
  const [selectedMake,     setSelectedMake]     = useState("");
  const [selectedModel,    setSelectedModel]    = useState("");

  const kcValidA = useMemo(
    () => isKeycodeAuth ? assignments.filter((a) => (a.keycodeProfileIds?.length ?? 0) > 0) : [],
    [assignments, isKeycodeAuth],
  );
  const alValidA = useMemo(
    () => isAlarmasAuth ? assignments.filter((a) => (a.alarmaProfileIds?.length ?? 0) > 0) : [],
    [assignments, isAlarmasAuth],
  );
  const imValidA = useMemo(
    () => isImmoAuth ? assignments.filter((a) => (a.immoDetails?.length ?? 0) > 0) : [],
    [assignments, isImmoAuth],
  );

  const allValidA = useMemo(() => {
    const map = new Map<string, ToolAssignment>();
    [...kcValidA, ...alValidA, ...imValidA].forEach((a) => map.set(a.id, a));
    const all = Array.from(map.values());
    if (!selectedCategory) return all;
    return all.filter((a) => vehicleDb.getMakeCategory(a.make) === selectedCategory);
  }, [kcValidA, alValidA, imValidA, selectedCategory, vehicleDb.getMakeCategory]);

  const availableYears = useMemo(() => {
    const s = new Set<number>();
    allValidA.forEach((a) => { for (let y = a.yearStart; y <= a.yearEnd; y++) s.add(y); });
    return Array.from(s).sort((a, b) => b - a);
  }, [allValidA]);

  const availableMakes = useMemo(() => {
    if (!selectedYear) return [];
    const s = new Set<string>();
    allValidA.forEach((a) => {
      if (Number(selectedYear) >= a.yearStart && Number(selectedYear) <= a.yearEnd) s.add(a.make);
    });
    return Array.from(s).sort();
  }, [allValidA, selectedYear]);

  const availableModels = useMemo(() => {
    if (!selectedYear || !selectedMake) return [];
    const s = new Set<string>();
    allValidA.forEach((a) => {
      if (Number(selectedYear) >= a.yearStart && Number(selectedYear) <= a.yearEnd && a.make === selectedMake)
        s.add(a.model);
    });
    return Array.from(s).sort();
  }, [allValidA, selectedYear, selectedMake]);

  const vehicleSelected = !!(selectedYear && selectedMake && selectedModel);
  const searchCollapsed = vehicleSelected;
  const hasAnyTool = isKeycodeAuth || isAlarmasAuth || isImmoAuth;

  if (isSuperAdmin) {
    return (
      <>
        {/* Fallback para Móvil */}
        <div className="flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-6rem)] lg:hidden">
          <Wrench className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Se requiere PC</h2>
          <p className="text-muted-foreground">
            Las herramientas de administración avanzada están diseñadas para ser utilizadas en una pantalla grande. Por favor, accede desde una PC para continuar.
          </p>
        </div>

        {/* Vista Escritorio */}
        <div className="hidden lg:flex flex-col h-[calc(100vh-5rem)] space-y-4">
          {showInternalSuperAdminTabs && (
            <Tabs
              value={activeSuperAdminView}
              onValueChange={(value) => setLocalSuperAdminView(value as SuperAdminHerramientasView)}
              className="shrink-0"
            >
              <TabsList className="inline-flex w-full h-auto p-1 bg-muted/50 border">
                <TabsTrigger value="keycode" className="flex-1 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Key className="w-4 h-4" /> Keycode
                </TabsTrigger>
                <TabsTrigger value="immo" className="flex-1 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Cpu className="w-4 h-4" /> Immo
                </TabsTrigger>
                <TabsTrigger value="alarmas" className="flex-1 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <FileText className="w-4 h-4" /> Alarmas
                </TabsTrigger>
                <TabsTrigger value="vehiculos" className="flex-1 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <FileText className="w-4 h-4" /> Vehiculos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeSuperAdminView === "keycode" ? (
            <Tabs defaultValue="perfiles" className="flex-1 flex flex-col min-h-0">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 shrink-0">
                <TabsList className="inline-flex w-full sm:w-auto h-auto p-1 bg-muted/50 border">
                  <TabsTrigger value="perfiles" className="flex-1 sm:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Key className="w-4 h-4" /> Perfiles y Keycodes
                  </TabsTrigger>
                  <TabsTrigger value="asignaciones" className="flex-1 sm:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <FileText className="w-4 h-4" /> Asignación de Series
                  </TabsTrigger>
                </TabsList>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col min-h-0 pt-2"
              >
                <TabsContent value="perfiles" className="flex-1 m-0 min-h-0 overflow-hidden outline-none data-[state=inactive]:hidden flex flex-col border rounded-xl bg-card shadow-sm">
                  <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    <KeycodeManager profiles={profiles} onSave={addProfile} onUpdate={updateProfile} onDelete={deleteProfile} onFetchCodes={fetchProfileWithCodes} />
                  </div>
                </TabsContent>

                <TabsContent value="asignaciones" className="flex-1 m-0 min-h-0 overflow-hidden outline-none data-[state=inactive]:hidden flex flex-col border rounded-xl bg-card shadow-sm">
                  <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    <AssignmentManager
                      assignments={assignments.filter(a => (a.keycodeProfileIds?.length ?? 0) > 0)}
                      onSave={addAssignment}
                      onUpdate={updateAssignment}
                      onDelete={deleteAssignment}
                      keycodeProfiles={profiles}
                      vehicleRecords={vehicleDb.records}
                    />
                  </div>
                </TabsContent>
              </motion.div>
            </Tabs>
          ) : (
            <>
              {activeSuperAdminView === "alarmas" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex-1 min-h-0 overflow-hidden"
                >
                  <AlarmasManager
                    profiles={alarmaProfiles}
                    onSave={addAlarmaProfile}
                    onUpdate={updateAlarmaProfile}
                    onDelete={deleteAlarmaProfile}
                    assignments={assignments}
                    onSaveAssignment={addAssignment}
                    onUpdateAssignment={updateAssignment}
                    onDeleteAssignment={deleteAssignment}
                    vehicleDb={vehicleDb}
                  />
                </motion.div>
              )}

              {activeSuperAdminView === "immo" && (
                <Tabs defaultValue="perfiles" className="flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 shrink-0">
                    <TabsList className="inline-flex w-full sm:w-auto h-auto p-1 bg-muted/50 border">
                      <TabsTrigger value="perfiles" className="flex-1 sm:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Cpu className="w-4 h-4" /> Perfiles Immo
                      </TabsTrigger>
                      <TabsTrigger value="asignaciones" className="flex-1 sm:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4" /> Asignación de Vehículos
                      </TabsTrigger>
                      <TabsTrigger value="suministros" className="flex-1 sm:flex-none py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Wrench className="w-4 h-4" /> Herramientas y Suministros
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 flex flex-col min-h-0 pt-2"
                  >
                    <TabsContent value="perfiles" className="flex-1 m-0 min-h-0 overflow-hidden outline-none data-[state=inactive]:hidden flex flex-col border rounded-xl bg-card shadow-sm">
                      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <ImmoManager
                          profiles={immoProfiles}
                          onSave={addImmoProfile}
                          onUpdate={updateImmoProfile}
                          onDelete={deleteImmoProfile}
                          catalog={catalog}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="asignaciones" className="flex-1 m-0 min-h-0 overflow-hidden outline-none data-[state=inactive]:hidden flex flex-col border rounded-xl bg-card shadow-sm">
                      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <ImmoAssignmentManager
                          immoProfiles={immoProfiles}
                          assignments={assignments}
                          onSave={addAssignment}
                          onUpdate={updateAssignment}
                          onDelete={deleteAssignment}
                          vehicleDb={vehicleDb}
                          catalog={catalog}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="suministros" className="flex-1 m-0 min-h-0 overflow-hidden outline-none data-[state=inactive]:hidden flex flex-col border rounded-xl bg-card shadow-sm">
                      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <ImmoSuppliesManager
                          catalog={catalog}
                          onAdd={addItem}
                          onUpdate={updateItem}
                          onDelete={deleteItem}
                          onReorderAll={reorderItems}
                        />
                      </div>
                    </TabsContent>
                  </motion.div>
                </Tabs>
              )}

              {activeSuperAdminView === "vehiculos" && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 }}
                  className="flex-1 min-h-0 overflow-hidden"
                >
                  <VehicleDatabaseManager
                    records={vehicleDb.records}
                    makes={vehicleDb.makes}
                    getModelsByMake={vehicleDb.getModelsByMake}
                    getYearsByMakeModel={vehicleDb.getYearsByMakeModel}
                    getMakeCategory={vehicleDb.getMakeCategory}
                    setCategoryForMake={vehicleDb.setCategoryForMake}
                    importVehicleRecords={vehicleDb.importVehicleRecords}
                    addMake={vehicleDb.addMake}
                    renameMake={vehicleDb.renameMake}
                    deleteMake={vehicleDb.deleteMake}
                    addModel={vehicleDb.addModel}
                    renameModel={vehicleDb.renameModel}
                    deleteModel={vehicleDb.deleteModel}
                    addYear={vehicleDb.addYear}
                    renameYear={vehicleDb.renameYear}
                    deleteYear={vehicleDb.deleteYear}
                    resetToSeed={vehicleDb.resetToSeed}
                  />
                </motion.div>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  // Vista de taller
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {!toolActive && (
        <div className="shrink-0 bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
          <section className="ce-hero ce-hero-mobile-bleed p-[22px_16px] lg:p-[22px]">
            {/* Fila título + avatar */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="ce-hero-eyebrow">Herramientas</div>
                <h1 className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]">
                  Selección de <span className="text-primary">vehículo.</span>
                </h1>
              </div>
              <AccountMenu />
            </div>

            {/* ── Selector en mobile ── */}
            <div className="lg:hidden mt-4">
              <AnimatePresence mode="wait">
                {searchCollapsed && vehicleSelected ? (
                  /* Estado colapsado: resumen del vehículo */
                  <motion.div
                    key="collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between"
                  >
                    <p className="ce-hero-meta font-semibold">
                      {selectedYear} · {selectedMake} {selectedModel}
                    </p>
                    <button
                      onClick={() => setSelectedModel("")}
                      className="ml-3 shrink-0 text-xs font-semibold text-primary hover:underline"
                    >
                      Cambiar
                    </button>
                  </motion.div>
                ) : (
                  /* Estado expandido: chips + selects */
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {/* Chips de categoría */}
                    <div className="flex gap-2 mb-4">
                      {VEHICLE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(selectedCategory === cat ? "" : cat);
                            setSelectedYear("");
                            setSelectedMake("");
                            setSelectedModel("");
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selectedCategory === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                          }`}
                        >
                          {HERO_CHIP_ICONS[cat]} {HERO_CHIP_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                    {/* Selects */}
                    <div className="flex flex-col gap-3 pb-2">
                      <Select
                        value={selectedYear ? String(selectedYear) : ""}
                        onValueChange={(v) => { setSelectedYear(Number(v)); setSelectedMake(""); setSelectedModel(""); }}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg]:opacity-60 text-sm">
                          <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedMake}
                        onValueChange={(v) => { setSelectedMake(v); setSelectedModel(""); }}
                        disabled={!selectedYear}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg]:opacity-60 text-sm">
                          <SelectValue placeholder="Marca" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMakes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedModel}
                        onValueChange={(v) => setSelectedModel(v)}
                        disabled={!selectedMake}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg]:opacity-60 text-sm">
                          <SelectValue placeholder="Modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Selector en desktop — grid 3 columnas ── */}
            <div className="hidden lg:block mt-5">
              <AnimatePresence mode="wait">
                {searchCollapsed ? (
                  <motion.div
                    key="collapsed-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between"
                  >
                    <p className="ce-hero-meta font-semibold text-base">
                      {selectedYear} · {selectedMake} {selectedModel}
                    </p>
                    <button
                      onClick={() => setSelectedModel("")}
                      className="ml-3 shrink-0 text-sm font-semibold text-primary hover:underline"
                    >
                      Cambiar
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {!hasAnyTool ? (
                      <p className="text-sm text-white/60 py-2">No tienes herramientas asignadas para este taller.</p>
                    ) : availableYears.length === 0 ? (
                      <p className="text-sm text-white/60 py-2">Aún no hay vehículos configurados para las herramientas de este taller.</p>
                    ) : (
                      <>
                        {/* Chips */}
                        <div className="flex gap-2 mb-4">
                          {VEHICLE_CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setSelectedCategory(selectedCategory === cat ? "" : cat);
                                setSelectedYear("");
                                setSelectedMake("");
                                setSelectedModel("");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                selectedCategory === cat
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                              }`}
                            >
                              {HERO_CHIP_ICONS[cat]} {HERO_CHIP_LABELS[cat]}
                            </button>
                          ))}
                        </div>
                        {/* Selects */}
                        <div className="grid grid-cols-3 gap-4 pb-1">
                          <Select
                            value={selectedYear ? String(selectedYear) : ""}
                            onValueChange={(v) => { setSelectedYear(Number(v)); setSelectedMake(""); setSelectedModel(""); }}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg]:opacity-60 text-sm">
                              <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select
                            value={selectedMake}
                            onValueChange={(v) => { setSelectedMake(v); setSelectedModel(""); }}
                            disabled={!selectedYear}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg]:opacity-60 text-sm">
                              <SelectValue placeholder="Marca" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMakes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select
                            value={selectedModel}
                            onValueChange={(v) => setSelectedModel(v)}
                            disabled={!selectedMake}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg]:opacity-60 text-sm">
                              <SelectValue placeholder="Modelo" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      )}
      <div className={
        toolActive
          ? "flex-1 min-h-0"
          : "flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar"
      }>
        <WorkshopToolView
          assignments={assignments}
          keycodeProfiles={profiles}
          onFetchKeycodes={fetchProfileWithCodes}
          alarmaProfiles={alarmaProfiles}
          immoProfiles={immoProfiles}
          immoCatalog={catalog}
          onToolActive={setToolActive}
          selectedYear={selectedYear}
          selectedMake={selectedMake}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
}
