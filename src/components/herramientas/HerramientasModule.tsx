import { useState } from "react";
import { m as motion } from "framer-motion";
import { Wrench, Key, FileText, Cpu } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useWorkshop } from "@/hooks/useWorkshop";
import { useKeycodeProfiles } from "@/hooks/useKeycodeProfiles";
import { useToolAssignments } from "@/hooks/useToolAssignments";
import { useVehicleDatabase } from "@/hooks/useVehicleDatabase";
import { useAlarmaProfiles } from "@/hooks/useAlarmaProfiles";
import { useImmoProfiles } from "@/hooks/useImmoProfiles";
import { useImmoCatalog } from "@/hooks/useImmoCatalog";

import { KeycodeManager } from "./KeycodeManager";
import { AssignmentManager } from "./AssignmentManager";
import { VehicleDatabaseManager } from "./VehicleDatabaseManager";
import { WorkshopAssignmentManager } from "./WorkshopAssignmentManager";
import { WorkshopToolView } from "./WorkshopToolView";
import { AlarmasManager } from "./AlarmasManager";
import { ImmoManager, ImmoAssignmentManager } from "./ImmoManager";
import { ImmoSuppliesManager } from "./ImmoSuppliesManager";

export type SuperAdminHerramientasView = "asignacion" | "keycode" | "immo" | "alarmas" | "vehiculos";

interface HerramientasModuleProps {
  superAdminView?: SuperAdminHerramientasView;
}

export function HerramientasModule({ superAdminView }: HerramientasModuleProps) {
  const { isSuperAdmin } = useWorkshop();
  const { profiles, addProfile, updateProfile, deleteProfile } = useKeycodeProfiles();
  const { assignments, addAssignment, updateAssignment, deleteAssignment } = useToolAssignments();
  const vehicleDb = useVehicleDatabase();
  const { profiles: alarmaProfiles, addProfile: addAlarmaProfile, updateProfile: updateAlarmaProfile, deleteProfile: deleteAlarmaProfile } = useAlarmaProfiles();
  const { profiles: immoProfiles, addProfile: addImmoProfile, updateProfile: updateImmoProfile, deleteProfile: deleteImmoProfile } = useImmoProfiles();
  const { catalog, addItem, updateItem, deleteItem, reorderItems } = useImmoCatalog();
  const [toolActive, setToolActive] = useState(false);
  const [localSuperAdminView, setLocalSuperAdminView] = useState<SuperAdminHerramientasView>("asignacion");
  const activeSuperAdminView = superAdminView ?? localSuperAdminView;
  const showInternalSuperAdminTabs = superAdminView === undefined;

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
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                    <Wrench className="w-7 h-7" /> Herramientas Administrativas
                  </h1>
                  <p className="text-muted-foreground">Gestión centralizada de perfiles y vehículos exclusivas del SuperAdmin</p>
                </motion.div>

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
                    <KeycodeManager profiles={profiles} onSave={addProfile} onUpdate={updateProfile} onDelete={deleteProfile} />
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
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                  <Wrench className="w-7 h-7" /> Herramientas Administrativas
                </h1>
                <p className="text-muted-foreground">Gestión centralizada de perfiles y vehículos exclusivas del SuperAdmin</p>
              </motion.div>


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

  // Vista de taller: siempre el mismo WorkshopToolView montado, solo se oculta el header
  return (
    <>
      {!toolActive && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-7 h-7" /> Herramientas
          </h1>
          <p className="text-muted-foreground">Herramientas técnicas disponibles para tu taller</p>
        </motion.div>
      )}
      <WorkshopToolView
        assignments={assignments}
        keycodeProfiles={profiles}
        alarmaProfiles={alarmaProfiles}
        immoProfiles={immoProfiles}
        immoCatalog={catalog}
        getMakeCategory={vehicleDb.getMakeCategory}
        onToolActive={setToolActive}
      />
    </>
  );
}
