import { useState, useMemo } from "react";
import { m as motion } from "framer-motion";
import { Car, Key, Radio, Cpu, Truck, Bike } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AVAILABLE_TOOLS } from "@/data/tools";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { KeycodeWorkspace } from "./KeycodeWorkspace";
import { AlarmasWorkspace } from "./AlarmasWorkspace";
import { ImmoWorkspace } from "./ImmoWorkspace";
import type { ToolAssignment, KeycodeProfile, AlarmaProfile, ImmoProfile, ImmoCatalogItem, ImmoAssignmentDetail } from "@/types";
import { type VehicleCategory, VEHICLE_CATEGORIES, VEHICLE_CATEGORY_LABELS } from "@/data/carDatabase";

const CATEGORY_ICONS_WS: Record<VehicleCategory, React.ReactNode> = {
  Vehiculo: <Car className="w-3.5 h-3.5" />,
  Camion: <Truck className="w-3.5 h-3.5" />,
  Motocicleta: <Bike className="w-3.5 h-3.5" />,
};

interface WorkshopToolViewProps {
  assignments: ToolAssignment[];
  keycodeProfiles: KeycodeProfile[];
  onFetchKeycodes: (id: string) => Promise<KeycodeProfile | null>;
  alarmaProfiles: AlarmaProfile[];
  immoProfiles: ImmoProfile[];
  immoCatalog: ImmoCatalogItem[];
  getMakeCategory: (make: string) => VehicleCategory;
  onToolActive?: (active: boolean) => void;
}

export function WorkshopToolView({
  assignments,
  keycodeProfiles,
  onFetchKeycodes,
  alarmaProfiles,
  immoProfiles,
  immoCatalog,
  getMakeCategory,
  onToolActive,
}: WorkshopToolViewProps) {
  const { isFeatureEnabled } = useWorkshopFeatures();

  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | "">("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [activeKeycodeProfileId, setActiveKeycodeProfileId] = useState<string | null>(null);
  const [activeAlarmaProfileId, setActiveAlarmaProfileId] = useState<string | null>(null);
  const [activeImmoProfileId, setActiveImmoProfileId] = useState<string | null>(null);

  // ── Authorization ──────────────────────────────────────────────────────────

  const isKeycodeAuthorized = isFeatureEnabled("tool_keycode");
  const isAlarmasAuthorized = isFeatureEnabled("tool_alarmas");
  const isImmoAuthorized = isFeatureEnabled("tool_immo");

  // ── Valid assignments per tool ─────────────────────────────────────────────
  // Each tool's assignment records are INDEPENDENT. The vehicle selector shows
  // the UNION of all authorized-tool ranges; the tool cards for a given vehicle
  // only appear when that specific tool has data for the selected year.

  const keycodeValidAssignments = useMemo(
    () => isKeycodeAuthorized ? assignments.filter((a) => (a.keycodeProfileIds?.length ?? 0) > 0) : [],
    [assignments, isKeycodeAuthorized]
  );

  const alarmaValidAssignments = useMemo(
    () => isAlarmasAuthorized ? assignments.filter((a) => (a.alarmaProfileIds?.length ?? 0) > 0) : [],
    [assignments, isAlarmasAuthorized]
  );

  const immoValidAssignments = useMemo(
    () => isImmoAuthorized ? assignments.filter((a) => (a.immoDetails?.length ?? 0) > 0) : [],
    [assignments, isImmoAuthorized]
  );

  // Unified set (no duplicates) for building the vehicle selector
  const allValidAssignments = useMemo(() => {
    const map = new Map<string, ToolAssignment>();
    [...keycodeValidAssignments, ...alarmaValidAssignments, ...immoValidAssignments]
      .forEach((a) => map.set(a.id, a));
    const all = Array.from(map.values());
    if (!selectedCategory) return all;
    return all.filter((a) => getMakeCategory(a.make) === selectedCategory);
  }, [keycodeValidAssignments, alarmaValidAssignments, immoValidAssignments, selectedCategory, getMakeCategory]);

  // ── Vehicle selector options ───────────────────────────────────────────────

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allValidAssignments.forEach((a) => {
      for (let y = a.yearStart; y <= a.yearEnd; y++) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allValidAssignments]);

  const availableMakes = useMemo(() => {
    if (!selectedYear) return [];
    const makes = new Set<string>();
    allValidAssignments.forEach((a) => {
      if (Number(selectedYear) >= a.yearStart && Number(selectedYear) <= a.yearEnd)
        makes.add(a.make);
    });
    return Array.from(makes).sort();
  }, [allValidAssignments, selectedYear]);

  const availableModels = useMemo(() => {
    if (!selectedYear || !selectedMake) return [];
    const models = new Set<string>();
    allValidAssignments.forEach((a) => {
      if (
        Number(selectedYear) >= a.yearStart &&
        Number(selectedYear) <= a.yearEnd &&
        a.make === selectedMake
      )
        models.add(a.model);
    });
    return Array.from(models).sort();
  }, [allValidAssignments, selectedYear, selectedMake]);

  // ── Matching assignments for selected vehicle ──────────────────────────────

  const matchingKeycodeAssignments = useMemo(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return [];
    const yr = Number(selectedYear);
    return keycodeValidAssignments.filter(
      (a) =>
        yr >= a.yearStart && yr <= a.yearEnd &&
        a.make === selectedMake && a.model === selectedModel
    );
  }, [keycodeValidAssignments, selectedYear, selectedMake, selectedModel]);

  const matchingAlarmaAssignments = useMemo(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return [];
    const yr = Number(selectedYear);
    return alarmaValidAssignments.filter(
      (a) =>
        yr >= a.yearStart && yr <= a.yearEnd &&
        a.make === selectedMake && a.model === selectedModel
    );
  }, [alarmaValidAssignments, selectedYear, selectedMake, selectedModel]);

  // ── Available profile IDs for selected vehicle ─────────────────────────────

  const availableKeycodeProfileIds = useMemo(() => {
    const ids = new Set<string>();
    matchingKeycodeAssignments.forEach((a) =>
      a.keycodeProfileIds.forEach((id) => ids.add(id))
    );
    return Array.from(ids);
  }, [matchingKeycodeAssignments]);

  const availableAlarmaProfileIds = useMemo(() => {
    const ids = new Set<string>();
    matchingAlarmaAssignments.forEach((a) =>
      (a.alarmaProfileIds ?? []).forEach((id) => ids.add(id))
    );
    return Array.from(ids);
  }, [matchingAlarmaAssignments]);

  const matchingImmoAssignments = useMemo(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return [];
    const yr = Number(selectedYear);
    return immoValidAssignments.filter(
      (a) =>
        yr >= a.yearStart && yr <= a.yearEnd &&
        a.make === selectedMake && a.model === selectedModel
    );
  }, [immoValidAssignments, selectedYear, selectedMake, selectedModel]);

  const availableImmoProfileIds = useMemo(() => {
    const ids = new Set<string>();
    matchingImmoAssignments.forEach((a) =>
      (a.immoDetails ?? []).forEach((d) => ids.add(d.profileId))
    );
    return Array.from(ids);
  }, [matchingImmoAssignments]);

  const activeImmoDetail = useMemo((): ImmoAssignmentDetail | null => {
    if (!activeImmoProfileId) return null;
    for (const a of matchingImmoAssignments) {
      const d = (a.immoDetails ?? []).find((x) => x.profileId === activeImmoProfileId);
      if (d) return d;
    }
    return null;
  }, [activeImmoProfileId, matchingImmoAssignments]);

  const immoDetailByProfileId = useMemo(() => {
    const map = new Map<string, ImmoAssignmentDetail>();
    matchingImmoAssignments.forEach((assignment) => {
      (assignment.immoDetails ?? []).forEach((detail) => {
        if (!map.has(detail.profileId)) map.set(detail.profileId, detail);
      });
    });
    return map;
  }, [matchingImmoAssignments]);

  // Pseudo-assignment for KeycodeWorkspace (existing pattern)
  const activeKeycodeAssignment = useMemo(() => {
    if (!activeKeycodeProfileId || matchingKeycodeAssignments.length === 0) return null;
    return {
      ...matchingKeycodeAssignments[0],
      keycodeProfileIds: [activeKeycodeProfileId],
    } as ToolAssignment;
  }, [activeKeycodeProfileId, matchingKeycodeAssignments]);

  // ── Workspace renders ──────────────────────────────────────────────────────

  if (activeToolId === "keycode" && activeKeycodeAssignment && activeKeycodeProfileId) {
    return (
      <KeycodeWorkspace
        assignment={activeKeycodeAssignment}
        keycodeProfiles={keycodeProfiles}
        onFetchCodes={onFetchKeycodes}
        onBack={() => {
          setActiveToolId(null);
          setActiveKeycodeProfileId(null);
          onToolActive?.(false);
        }}
      />
    );
  }

  if (activeToolId === "alarmas" && availableAlarmaProfileIds.length > 0) {
    return (
      <AlarmasWorkspace
        year={Number(selectedYear)}
        make={selectedMake}
        model={selectedModel}
        profileIds={availableAlarmaProfileIds}
        allProfiles={alarmaProfiles}
        onBack={() => {
          setActiveToolId(null);
          setActiveAlarmaProfileId(null);
          onToolActive?.(false);
        }}
      />
    );
  }

  if (activeToolId === "immo" && activeImmoProfileId) {
    const immoProfile = immoProfiles.find((p) => p.id === activeImmoProfileId);
    if (immoProfile) {
      return (
        <ImmoWorkspace
          profile={immoProfile}
          detail={activeImmoDetail}
          catalog={immoCatalog}
          vehicle={{ year: Number(selectedYear), make: selectedMake, model: selectedModel }}
          onBack={() => {
            setActiveToolId(null);
            setActiveImmoProfileId(null);
            onToolActive?.(false);
          }}
        />
      );
    }
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  const selectClass =
    "flex h-11 w-full rounded-xl border border-primary/20/60 bg-white/70 px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all disabled:cursor-not-allowed disabled:opacity-50/50 dark:border-foreground";

  const hasAnyTool = isKeycodeAuthorized || isAlarmasAuthorized || isImmoAuthorized;
  const vehicleSelected = selectedYear && selectedMake && selectedModel;
  const hasKeycodeData = availableKeycodeProfileIds.length > 0;
  const hasAlarmaData = availableAlarmaProfileIds.length > 0;
  const hasImmoData = availableImmoProfileIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Vehicle selector */}
      <Card className="bg-primary/5 border-none shadow-sm rounded-[24px] overflow-hidden">
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shrink-0">
              <Car className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-muted-foreground">Buscador</p>
              <CardTitle className="text-xl font-bold text-foreground">
                Selección de Vehículo
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {!hasAnyTool ? (
            <div className="text-center py-8 bg-muted rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground font-medium">
                No tienes herramientas asignadas por el SuperAdmin para este taller.
              </p>
            </div>
          ) : availableYears.length === 0 && !selectedCategory ? (
            <div className="text-center py-8 bg-muted rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground font-medium">
                Aún no hay vehículos configurados para las herramientas de este taller.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Category filter chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedCategory(""); setSelectedYear(""); setSelectedMake(""); setSelectedModel(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Todos
                </button>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setSelectedYear(""); setSelectedMake(""); setSelectedModel(""); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {CATEGORY_ICONS_WS[cat]} {VEHICLE_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1">
                  1. Año
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value) || "");
                    setSelectedMake("");
                    setSelectedModel("");
                  }}
                  className={selectClass}
                >
                  <option value="">-- Año --</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1">
                  2. Marca
                </label>
                <select
                  value={selectedMake}
                  onChange={(e) => {
                    setSelectedMake(e.target.value);
                    setSelectedModel("");
                  }}
                  disabled={!selectedYear}
                  className={selectClass}
                >
                  <option value="">-- Marca --</option>
                  {availableMakes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1">
                  3. Modelo
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedMake}
                  className={selectClass}
                >
                  <option value="">-- Modelo --</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tool cards — only shown when vehicle selected */}
      {vehicleSelected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {!hasKeycodeData && !hasAlarmaData && !hasImmoData ? (
            <div className="text-center py-8 bg-muted rounded-lg border border-border">
              <p className="text-muted-foreground">
                No hay herramientas configuradas para este vehículo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* ── Keycode card ── */}
              {isKeycodeAuthorized && hasKeycodeData && (() => {
                const profiles = availableKeycodeProfileIds
                  .map((id) => keycodeProfiles.find((p) => p.id === id))
                  .filter(Boolean);
                return (
                  <Card key="keycode" className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                          <Key className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">Keycode</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {profiles.map((p) => (
                          <button
                            key={p!.id}
                            onClick={() => {
                              setActiveToolId("keycode");
                              setActiveKeycodeProfileId(p!.id);
                              onToolActive?.(true);
                            }}
                            className="group flex flex-col gap-2 text-left"
                          >
                            <div className="aspect-square w-full rounded-xl overflow-hidden border border-border bg-muted/50 group-hover:border-amber-400/70 group-hover:shadow-sm transition-all">
                              {p!.profileImage ? (
                                <img
                                  src={p!.profileImage}
                                  alt={`Serie ${p!.series}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Key className="w-8 h-8 text-amber-500/40" />
                                </div>
                              )}
                            </div>
                            <div className="px-0.5">
                              <p className="text-sm font-semibold text-foreground text-center leading-tight truncate">
                                {p!.series || `IC ${p!.icCard}`}
                              </p>
                              {p!.icCard && p!.series && (
                                <p className="text-xs text-muted-foreground text-center truncate mt-0.5">
                                  IC: {p!.icCard}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* ── Immo card ── */}
              {isImmoAuthorized && hasImmoData && (() => {
                const profiles = availableImmoProfileIds
                  .map((id) => immoProfiles.find((p) => p.id === id))
                  .filter(Boolean);
                return (
                  <Card key="immo" className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-violet-500/10 rounded-lg shrink-0">
                          <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">Immo Info</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {profiles.map((p) => (
                          <button
                            key={p!.id}
                            onClick={() => {
                              setActiveToolId("immo");
                              setActiveImmoProfileId(p!.id);
                              onToolActive?.(true);
                            }}
                            className="group flex flex-col gap-2 text-left"
                          >
                            <div className="aspect-square w-full rounded-xl overflow-hidden border border-border bg-muted/50 group-hover:border-violet-400/70 group-hover:shadow-sm transition-all">
                              {p!.mainImage ? (
                                <img
                                  src={p!.mainImage}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Cpu className="w-8 h-8 text-violet-500/40" />
                                </div>
                              )}
                            </div>
                            <div className="px-0.5">
                              <p className="text-sm font-semibold text-foreground text-center leading-tight truncate">
                                {[p!.marca, p!.fccId].filter(Boolean).join(" ") || "Sin título"}
                              </p>
                              {immoDetailByProfileId.get(p!.id)?.transponder && (
                                <p className="text-xs text-muted-foreground text-center truncate mt-0.5">
                                  {immoDetailByProfileId.get(p!.id)!.transponder}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* ── Alarmas card ── */}
              {isAlarmasAuthorized && hasAlarmaData && (() => {
                const profiles = availableAlarmaProfileIds
                  .map((id) => alarmaProfiles.find((p) => p.id === id))
                  .filter(Boolean);
                return (
                  <Card key="alarmas" className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <Radio className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">Auto Alarmas</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {profiles.map((p) => {
                          const thumb =
                            p!.vehicleImages?.find((v) => v.kind === "logo")?.file ??
                            p!.vehicleImages?.find((v) => v.kind === "vehicle")?.file;
                          return (
                            <button
                              key={p!.id}
                              onClick={() => {
                                setActiveToolId("alarmas");
                                setActiveAlarmaProfileId(p!.id);
                                onToolActive?.(true);
                              }}
                              className="group flex flex-col gap-2 text-left"
                            >
                              <div className="aspect-square w-full rounded-xl overflow-hidden border border-border bg-muted/50 group-hover:border-primary/40 group-hover:shadow-sm transition-all">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Radio className="w-8 h-8 text-primary/40" />
                                  </div>
                                )}
                              </div>
                              <div className="px-0.5">
                                <p className="text-sm font-semibold text-foreground text-center leading-tight truncate">
                                  {p!.nombre}
                                </p>
                                {(p!.marca || p!.modelo) && (
                                  <p className="text-xs text-muted-foreground text-center truncate mt-0.5">
                                    {[p!.marca, p!.modelo].filter(Boolean).join(" ")}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
