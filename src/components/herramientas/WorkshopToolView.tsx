import { useState, useMemo } from "react";
import { Car, Key, Radio, Cpu } from "lucide-react";

import { DetailSection } from "@/design-system/detail/DetailScreen";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { useImageFolder, getImageByFile } from "@/hooks/useImageFolder";
import { spawnRipple } from "@/lib/ripple";
import { cn } from "@/lib/utils";

import { resolveStorageUrl } from "@/lib/phpApi";
import { useWorkshopFeatures } from "@/hooks/useWorkshopFeatures";
import { KeycodeWorkspace, type KeycodeSearchFn } from "./KeycodeWorkspace";
import { AlarmasWorkspace } from "./AlarmasWorkspace";
import { ImmoWorkspace } from "./ImmoWorkspace";
import type { ToolAssignment, KeycodeProfile, AlarmaProfile, ImmoProfile, ImmoCatalogItem, ImmoAssignmentDetail } from "@/types";

interface WorkshopToolViewProps {
  assignments: ToolAssignment[];
  keycodeProfiles: KeycodeProfile[];
  onFetchKeycodes: (id: string) => Promise<KeycodeProfile | null>;
  onSearchKeycodes?: KeycodeSearchFn;
  alarmaProfiles: AlarmaProfile[];
  immoProfiles: ImmoProfile[];
  immoCatalog: ImmoCatalogItem[];
  onToolActive?: (active: boolean) => void;
  selectedYear: number | "";
  selectedMake: string;
  selectedModel: string;
}

export function WorkshopToolView({
  assignments,
  keycodeProfiles,
  onFetchKeycodes,
  onSearchKeycodes,
  alarmaProfiles,
  immoProfiles,
  immoCatalog,
  onToolActive,
  selectedYear,
  selectedMake,
  selectedModel,
}: WorkshopToolViewProps) {
  const { isFeatureEnabled } = useWorkshopFeatures();
  // Suscribe a la carpeta de imágenes para que las miniaturas de alarmas aparezcan al cargarla.
  useImageFolder();

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
        onSearchCodes={onSearchKeycodes}
        year={Number(selectedYear)}
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

  // ── Vista principal: herramientas del vehículo elegido ──────────────────────

  const vehicleSelected = selectedYear && selectedMake && selectedModel;
  const hasKeycodeData = isKeycodeAuthorized && availableKeycodeProfileIds.length > 0;
  const hasAlarmaData = isAlarmasAuthorized && availableAlarmaProfileIds.length > 0;
  const hasImmoData = isImmoAuthorized && availableImmoProfileIds.length > 0;

  if (!isKeycodeAuthorized && !isAlarmasAuthorized && !isImmoAuthorized) return null;

  if (!vehicleSelected) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <MaterialShape name="cookie9" className="mb-4 h-24 w-24 text-primary-light">
          <Car className="h-10 w-10 text-primary" />
        </MaterialShape>
        <p className="max-w-xs text-[15px] text-muted-foreground">
          Elige año, marca y modelo para ver las herramientas disponibles.
        </p>
      </div>
    );
  }

  if (!hasKeycodeData && !hasAlarmaData && !hasImmoData) {
    return (
      <p className="rounded-[28px] bg-card px-5 py-10 text-center text-[15px] text-muted-foreground shadow-sm">
        No hay herramientas configuradas para este vehículo.
      </p>
    );
  }

  const openTool = (tool: "keycode" | "immo" | "alarmas", profileId: string) => {
    setActiveToolId(tool);
    if (tool === "keycode") setActiveKeycodeProfileId(profileId);
    if (tool === "immo") setActiveImmoProfileId(profileId);
    if (tool === "alarmas") setActiveAlarmaProfileId(profileId);
    onToolActive?.(true);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {hasKeycodeData && (
        <DetailSection title="Keycode" icon={<Key className="h-5 w-5 text-primary" />}>
          <div className="grid grid-cols-1 gap-2">
            {availableKeycodeProfileIds
              .map((id) => keycodeProfiles.find((p) => p.id === id))
              .filter((p): p is KeycodeProfile => !!p)
              .map((p) => {
                const primaryRef = p.references.find((r) => r.isPrimary) ?? p.references[0];
                return (
                  <ToolTile
                    key={p.id}
                    onClick={() => openTool("keycode", p.id)}
                    image={resolveStorageUrl(p.profileImage)}
                    imageClassName="object-contain mix-blend-multiply dark:mix-blend-screen dark:invert"
                    wide
                    fallbackIcon={<Key className="h-8 w-8" />}
                    title={primaryRef?.refCode || (p.series ? `Serie ${p.series}` : `IC ${p.icCard}`)}
                    subtitle={primaryRef?.refCode && p.series ? `Serie ${p.series}` : undefined}
                  />
                );
              })}
          </div>
        </DetailSection>
      )}

      {hasImmoData && (
        <DetailSection title="Immo Info" icon={<Cpu className="h-5 w-5 text-primary" />}>
          <div className="grid grid-cols-2 gap-2">
            {availableImmoProfileIds
              .map((id) => immoProfiles.find((p) => p.id === id))
              .filter((p): p is ImmoProfile => !!p)
              .map((p) => (
                <ToolTile
                  key={p.id}
                  onClick={() => openTool("immo", p.id)}
                  image={resolveStorageUrl(p.mainImage)}
                  imageClassName="object-cover"
                  fallbackIcon={<Cpu className="h-8 w-8" />}
                  title={[p.marca, p.fccId].filter(Boolean).join(" ") || "Sin título"}
                  subtitle={immoDetailByProfileId.get(p.id)?.transponder || undefined}
                />
              ))}
          </div>
        </DetailSection>
      )}

      {hasAlarmaData && (
        <DetailSection title="Alarmas" icon={<Radio className="h-5 w-5 text-primary" />}>
          <div className="grid grid-cols-2 gap-2">
            {availableAlarmaProfileIds
              .map((id) => alarmaProfiles.find((p) => p.id === id))
              .filter((p): p is AlarmaProfile => !!p)
              .map((p) => {
                // Las imágenes de alarmas viven en la carpeta local: se resuelven por nombre de archivo.
                const thumbFile =
                  p.vehicleImages?.find((v) => v.kind === "logo")?.file ??
                  p.vehicleImages?.find((v) => v.kind === "vehicle")?.file;
                return (
                  <ToolTile
                    key={p.id}
                    onClick={() => openTool("alarmas", p.id)}
                    image={thumbFile ? getImageByFile(thumbFile) : null}
                    imageClassName="object-contain p-2"
                    fallbackIcon={<Radio className="h-8 w-8" />}
                    title={p.nombre}
                    subtitle={[p.marca, p.modelo].filter(Boolean).join(" ") || undefined}
                  />
                );
              })}
          </div>
        </DetailSection>
      )}
    </div>
  );
}

/** Acceso a un perfil de herramienta: imagen sobre superficie tonal + título y subtítulo. */
function ToolTile({
  onClick,
  image,
  imageClassName,
  fallbackIcon,
  title,
  subtitle,
  wide = false,
}: {
  onClick: () => void;
  image: string | null | undefined;
  imageClassName?: string;
  fallbackIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Imagen apaisada (siluetas de llave) en lugar de cuadrada. */
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={spawnRipple}
      className="relative flex flex-col overflow-hidden rounded-[20px] bg-muted text-left"
    >
      <span
        className={cn(
          "flex w-full items-center justify-center overflow-hidden text-muted-foreground",
          wide ? "h-24 px-4 py-3" : "aspect-square",
        )}
      >
        {image ? <img src={image} alt="" className={cn("h-full w-full", imageClassName)} /> : fallbackIcon}
      </span>
      <span className="block px-3 pb-3 pt-2">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
    </button>
  );
}
