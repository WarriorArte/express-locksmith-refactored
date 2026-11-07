import { useState, useMemo } from "react";
import { m as motion } from "framer-motion";
import { Wrench, Key, FileText, Cpu, Car, Truck, Bike } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ChipRow, FilterChip } from "@/design-system/detail/DetailScreen";
import { NativeSelectField } from "@/design-system/pickers";

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
  /** Contenido bajo el selector mientras no hay vehículo elegido (inicio de la app). */
  homeContent?: React.ReactNode;
}

export function HerramientasModule({ superAdminView, homeContent }: HerramientasModuleProps) {
  const { isSuperAdmin } = useWorkshop();
  const { profiles, addProfile, updateProfile, deleteProfile, fetchProfileWithCodes, searchCodes, uploadCodesInChunks } = useKeycodeProfiles();
  const { assignments, addAssignment, updateAssignment, deleteAssignment } = useToolAssignments();
  const vehicleDb = useVehicleDatabase({ readOnly: !isSuperAdmin });
  const { profiles: alarmaProfiles, addProfile: addAlarmaProfile, updateProfile: updateAlarmaProfile, deleteProfile: deleteAlarmaProfile } = useAlarmaProfiles();
  const { profiles: immoProfiles, addProfile: addImmoProfile, updateProfile: updateImmoProfile, deleteProfile: deleteImmoProfile } = useImmoProfiles();
  const { catalog, addItem, updateItem, deleteItem, previewReorder, commitReorder } = useImmoCatalog();
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
  const hasAnyTool = isKeycodeAuth || isAlarmasAuth || isImmoAuth;

  if (isSuperAdmin) {
    return (
      <>
        {/* Fallback para Móvil */}
        <div className="flex flex-col items-center justify-center p-8 text-center flex-1 min-h-0 lg:hidden">
          <Wrench className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Se requiere PC</h2>
          <p className="text-muted-foreground">
            Las herramientas de administración avanzada están diseñadas para ser utilizadas en una pantalla grande. Por favor, accede desde una PC para continuar.
          </p>
        </div>

        {/* Vista Escritorio */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0 space-y-4">
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
                  <div className="flex-1 overflow-auto p-4 pb-mobile-nav custom-scrollbar">
                    <KeycodeManager profiles={profiles} onSave={addProfile} onUpdate={updateProfile} onDelete={deleteProfile} onFetchCodes={fetchProfileWithCodes} onUploadValetCodes={uploadCodesInChunks} />
                  </div>
                </TabsContent>

                <TabsContent value="asignaciones" className="flex-1 m-0 min-h-0 overflow-hidden outline-none data-[state=inactive]:hidden flex flex-col border rounded-xl bg-card shadow-sm">
                  <div className="flex-1 overflow-auto p-4 pb-mobile-nav custom-scrollbar">
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
                      <div className="flex-1 overflow-auto p-4 pb-mobile-nav custom-scrollbar">
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
                      <div className="flex-1 overflow-auto p-4 pb-mobile-nav custom-scrollbar">
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
                      <div className="flex-1 overflow-auto p-4 pb-mobile-nav custom-scrollbar">
                        <ImmoSuppliesManager
                          catalog={catalog}
                          onAdd={addItem}
                          onUpdate={updateItem}
                          onDelete={deleteItem}
                          onReorderPreview={previewReorder}
                          onReorderCommit={commitReorder}
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

  // Vista de taller — selector estilo Android (criterio M3E, docs/CRITERIO-DISENO-M3E.md):
  // campos grandes con el selector NATIVO del sistema (preferencia del usuario).
  const clearVehicle = () => {
    setSelectedYear("");
    setSelectedMake("");
    setSelectedModel("");
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {!toolActive && (
        <div className="shrink-0 bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
          <PageHeader
            className={homeContent ? "rounded-[28px] !bg-primary-light p-4 lg:p-5" : undefined}
            title={vehicleSelected ? `${selectedMake} ${selectedModel}` : "Vehículos"}
            subtitle={vehicleSelected ? String(selectedYear) : selectedCategory || "Año · Marca · Modelo"}
            onBack={vehicleSelected ? clearVehicle : undefined}
            backLabel={vehicleSelected ? "Volver a elegir vehículo" : "Volver al inicio"}
          >
            {vehicleSelected ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedModel("")}>
                  Cambiar modelo
                </Button>
                <Button variant="ghost" size="sm" onClick={clearVehicle}>
                  Otro vehículo
                </Button>
              </div>
            ) : !hasAnyTool ? (
              <p className="mt-3 text-[15px] text-muted-foreground">No tienes herramientas asignadas en este taller.</p>
            ) : availableYears.length === 0 && !selectedCategory ? (
              <p className="mt-3 text-[15px] text-muted-foreground">
                Aún no hay vehículos configurados para tus herramientas.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <ChipRow label="Tipo de vehículo">
                  {VEHICLE_CATEGORIES.map((cat) => (
                    <FilterChip
                      key={cat}
                      selected={selectedCategory === cat}
                      onClick={() => {
                        setSelectedCategory(selectedCategory === cat ? "" : cat);
                        clearVehicle();
                      }}
                    >
                      {HERO_CHIP_ICONS[cat]}
                      {HERO_CHIP_LABELS[cat]}
                    </FilterChip>
                  ))}
                </ChipRow>
                <div className="grid gap-2 lg:grid-cols-3">
                  <NativeSelectField
                    surface="onHero"
                    label="Año"
                    value={selectedYear ? String(selectedYear) : null}
                    placeholder={availableYears.length ? "Elige el año" : "Sin vehículos de este tipo"}
                    options={availableYears.map((y) => ({ value: String(y) }))}
                    onChange={(v) => { setSelectedYear(Number(v)); setSelectedMake(""); setSelectedModel(""); }}
                    disabled={availableYears.length === 0}
                  />
                  <NativeSelectField
                    surface="onHero"
                    label="Marca"
                    value={selectedMake || null}
                    placeholder="Elige la marca"
                    options={availableMakes.map((m) => ({ value: m }))}
                    onChange={(v) => { setSelectedMake(v); setSelectedModel(""); }}
                    disabled={!selectedYear}
                  />
                  <NativeSelectField
                    surface="onHero"
                    label="Modelo"
                    value={selectedModel || null}
                    placeholder="Elige el modelo"
                    options={availableModels.map((m) => ({ value: m }))}
                    onChange={setSelectedModel}
                    disabled={!selectedMake}
                  />
                </div>
              </div>
            )}
          </PageHeader>
        </div>
      )}
      <div className={
        toolActive
          ? "flex-1 min-h-0 overflow-hidden"
          : "flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-mobile-nav no-scrollbar"
      }>
        {!vehicleSelected && homeContent ? homeContent : (
        <WorkshopToolView
          assignments={assignments}
          keycodeProfiles={profiles}
          onFetchKeycodes={fetchProfileWithCodes}
          onSearchKeycodes={searchCodes}
          alarmaProfiles={alarmaProfiles}
          immoProfiles={immoProfiles}
          immoCatalog={catalog}
          onToolActive={setToolActive}
          selectedYear={selectedYear}
          selectedMake={selectedMake}
          selectedModel={selectedModel}
        />
        )}
      </div>

    </div>
  );
}
