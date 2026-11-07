import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ImageIcon, Info, Minus, Plus, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import {
  ChipRow,
  DetailHero,
  DetailScreen,
  DetailSection,
  FilterChip,
  SearchBar,
  SpecRow,
  SpecTile,
  SubHeading,
  TonalChip,
} from "@/design-system/detail/DetailScreen";
import { WireSwatch, parseWireColors } from "@/components/herramientas/WireSwatch";
import { spawnRipple } from "@/lib/ripple";
import type { AlarmaProfile, AlarmaDataValue, AlarmaDetalle, AlarmaYearImage } from "@/types";
import { useImageFolder, getImageByFile } from "@/hooks/useImageFolder";

/*
 * Auto Alarmas — criterio M3E (docs/CRITERIO-DISENO-M3E.md):
 *  · Lista de puntos de conexión con buscador y chips de categoría
 *    (sustituye al desplegable + modo Buscar/Explorar).
 *  · Al tocar un punto se abre una hoja cuyo protagonista es el cable:
 *    muestra de color real + nombre del color + polaridad.
 */

// ── Categorías ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "alimentacion", label: "Alimentación", keywords: ["12 volt", "ground", "starter", "ignition", "accessory"] },
  { id: "smartkey",     label: "Smart Key",    keywords: ["pts", "slp"] },
  { id: "can",          label: "CAN / OBD",    keywords: ["can bus", "obd", "rx data", "tx data", "immo data"] },
  { id: "cerraduras",   label: "Cerraduras",   keywords: ["power lock", "power unlock", "lock motor", "driver unlock", "passenger unlock"] },
  { id: "puertas",      label: "Puertas",      keywords: ["door trigger", "trunk/hatch", "hood pin", "trunk release"] },
  { id: "alarma",       label: "Alarma",       keywords: ["factory alarm", "disarm no unlock", "security light"] },
  { id: "luces",        label: "Luces",        keywords: ["parking light", "headlight", "turn signal", "hazard", "reverse light", "autolights", "dome light"] },
  { id: "audio",        label: "Audio",        keywords: ["radio", "speaker", "tweeter", "amplifier"] },
  { id: "sensores",     label: "Sensores",     keywords: ["speed sense", "tachometer", "brake wire", "fuel pump", "parking brake"] },
  { id: "confort",      label: "Confort",      keywords: ["heated seat", "defroster", "wiper", "window", "sun roof"] },
  { id: "otros",        label: "Otros",        keywords: [] },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

function getDataPointCategory(title: string): CategoryId {
  const t = title.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.id === "otros") continue;
    if ((cat.keywords as readonly string[]).some((kw) => t.includes(kw))) return cat.id;
  }
  return "otros";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getValueForYear(det: AlarmaDetalle, year: number): { value: string; isYearSpecific: boolean } {
  if (!det.yearValues?.length) return { value: det.value, isYearSpecific: false };
  const match = det.yearValues.find((yv) => yv.years.includes(String(year)));
  if (match) return { value: match.value, isYearSpecific: true };
  return { value: det.value, isYearSpecific: false };
}

const findDetail = (dv: AlarmaDataValue, label: string) =>
  dv.details.find((d) => d.label.trim().toLowerCase() === label);

function yearSpan(years: string[]) {
  if (years.length === 0) return "";
  return years.length >= 2 ? `${years[0]}–${years[years.length - 1]}` : years[0];
}

function PolarityChip({ value }: { value: string }) {
  const v = value.trim().toLowerCase();
  if (/(^|\W)(\+|pos)/.test(v) || v.startsWith("+")) {
    return <TonalChip icon={<Plus className="h-4 w-4" />} label={`Positivo · ${value}`} />;
  }
  if (/(^|\W)(-|−|neg)/.test(v) || v.startsWith("-")) {
    return <TonalChip icon={<Minus className="h-4 w-4" />} label={`Negativo · ${value}`} tone="neutral" />;
  }
  return <TonalChip label={value} tone="neutral" />;
}

// ── Hoja de detalle de un punto ───────────────────────────────────────────────

function DataPointSheet({
  dv,
  year,
  onClose,
}: {
  dv: AlarmaDataValue | null;
  year: number;
  onClose: () => void;
}) {
  // Se conserva el último punto para que el contenido no desaparezca durante
  // la animación de cierre de la hoja.
  const lastDv = useRef<AlarmaDataValue | null>(null);
  if (dv) lastDv.current = dv;
  const point = dv ?? lastDv.current;

  const { folderName } = useImageFolder();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const imageVariants = useMemo(() => {
    if (!point) return [];
    if (point.imageUrl) return [{ url: point.imageUrl, years: [] as string[], sku: "", file: "" }];
    if (!point.yearImages?.length) return [];
    return point.yearImages
      .map((yi) => ({ ...yi, url: getImageByFile(yi.file) }))
      .filter((yi) => yi.url !== null) as (AlarmaYearImage & { url: string })[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.imageUrl, point?.yearImages, folderName]);

  if (!point) return null;

  const cable = findDetail(point, "cable");
  const polaridad = findDetail(point, "polaridad");
  // Protagonista: el cable; si no hay campo "cable", el primer dato.
  const lead = cable ?? point.details[0];
  const leadValue = lead ? getValueForYear(lead, year) : null;
  const polarValue = polaridad ? getValueForYear(polaridad, year).value : "";
  const rest = point.details.filter((d) => d !== lead && d !== polaridad);
  const hasYearSpecific = point.details.some((d) => d.yearValues?.length);
  const category = CATEGORIES.find((c) => c.id === getDataPointCategory(point.title));
  const warnings = (point.notes ?? []).filter((n) => n.type === "image_variation");
  const infos = (point.notes ?? []).filter((n) => n.type !== "image_variation");
  const missingFolderImages = imageVariants.length === 0 && (point.yearImages?.length ?? 0) > 0;

  return (
    <>
      <Dialog open={!!dv} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold leading-tight">{point.title}</DialogTitle>
            <DialogDescription>
              {[category && category.id !== "otros" ? category.label : null, hasYearSpecific ? `Valores para ${year}` : null]
                .filter(Boolean)
                .join(" · ") || "Punto de conexión"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pb-4">
            {/* Protagonista: el cable */}
            {lead && leadValue && (
              <section className="rounded-[28px] bg-primary-light p-5">
                <p className="text-xs font-medium text-muted-foreground">{lead.label || "Cable"}</p>
                {cable && <WireSwatch value={leadValue.value} variant="cable" className="my-3" />}
                <p className="text-[1.75rem] font-bold leading-tight text-foreground">
                  {leadValue.value || "—"}
                </p>
                {(polarValue || leadValue.isYearSpecific) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {polarValue && <PolarityChip value={polarValue} />}
                    {leadValue.isYearSpecific && <TonalChip label={`Para ${year}`} tone="neutral" />}
                  </div>
                )}
              </section>
            )}

            {rest.length > 0 && (
              <DetailSection title="Datos" className="bg-muted shadow-none">
                <div className="-my-1.5">
                  {rest.map((det) => {
                    const { value, isYearSpecific } = getValueForYear(det, year);
                    return (
                      <SpecRow
                        key={det.id}
                        label={det.label || "—"}
                        value={
                          <>
                            {value || "—"}
                            {isYearSpecific && <span className="ml-1.5 text-xs text-primary">· {year}</span>}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              </DetailSection>
            )}

            {warnings.map((note) => (
              <DetailSection
                key={note.id}
                title={note.title}
                tone="warning"
                icon={<AlertTriangle className="h-5 w-5 shrink-0 text-warning" />}
              >
                {note.text && <p className="text-[15px] leading-relaxed text-foreground">{note.text}</p>}
              </DetailSection>
            ))}

            {(imageVariants.length > 0 || missingFolderImages) && (
              <DetailSection title="Diagrama" className="bg-muted shadow-none">
                {missingFolderImages ? (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    Hay imagen, pero falta seleccionar la carpeta de imágenes en el administrador.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {imageVariants.map((yi, i) => {
                      const label = yearSpan(yi.years);
                      return (
                        <div key={i}>
                          {label && <SubHeading>{label}</SubHeading>}
                          <button
                            type="button"
                            onClick={() => setViewerIndex(i)}
                            aria-label={`Ampliar diagrama${label ? ` ${label}` : ""}`}
                            className="block w-full overflow-hidden rounded-2xl bg-white"
                          >
                            <img
                              src={yi.url}
                              alt={`${point.title}${label ? ` · ${label}` : ""}`}
                              className="max-h-72 w-full object-contain"
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailSection>
            )}

            {infos.map((note) => (
              <DetailSection
                key={note.id}
                title={note.title}
                className="bg-muted shadow-none"
                icon={<Info className="h-5 w-5 shrink-0 text-primary" />}
              >
                <div className="-my-1.5">
                  {note.documented && note.documented.length > 0 && (
                    <SpecRow label="Aplica a" value={yearSpan(note.documented)} />
                  )}
                  {note.probable && note.probable.length > 0 && (
                    <SpecRow label="Puede funcionar en" value={yearSpan(note.probable)} />
                  )}
                </div>
              </DetailSection>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ImageViewDialog
        open={viewerIndex !== null}
        onOpenChange={(open) => !open && setViewerIndex(null)}
        images={imageVariants.map((yi) => ({ url: yi.url, description: yearSpan(yi.years) || point.title }))}
        initialIndex={viewerIndex ?? 0}
      />
    </>
  );
}

// ── Fila de la lista ──────────────────────────────────────────────────────────

function DataPointRow({ dv, year, onClick }: { dv: AlarmaDataValue; year: number; onClick: () => void }) {
  const cable = findDetail(dv, "cable");
  const polar = findDetail(dv, "polaridad");
  const cableVal = cable ? getValueForYear(cable, year).value : "";
  const polarVal = polar ? getValueForYear(polar, year).value : "";
  const hasImage = !!(dv.imageUrl || (dv.yearImages?.length ?? 0) > 0);
  const hasWarning = (dv.notes ?? []).some((n) => n.type === "image_variation");
  const supporting = [cableVal, polarVal].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={spawnRipple}
      className="m3-list-item flex min-h-[72px] w-full items-center gap-4 px-4 py-3 text-left"
    >
      {parseWireColors(cableVal) ? (
        <WireSwatch value={cableVal} />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Radio className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-foreground">{dv.title || "Sin título"}</span>
        {supporting && <span className="block truncate text-sm text-muted-foreground">{supporting}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {hasWarning && <AlertTriangle className="h-4 w-4 text-warning" aria-label="Tiene advertencias" />}
        {hasImage && <ImageIcon className="h-4 w-4" aria-label="Tiene diagrama" />}
      </span>
    </button>
  );
}

// ── AlarmasWorkspace ──────────────────────────────────────────────────────────

interface AlarmasWorkspaceProps {
  year: number;
  make: string;
  model: string;
  profileIds: string[];
  allProfiles: AlarmaProfile[];
  onBack: () => void;
}

export function AlarmasWorkspace({ year, make, model, profileIds, allProfiles, onBack }: AlarmasWorkspaceProps) {
  const profiles = useMemo(
    () => profileIds.map((id) => allProfiles.find((p) => p.id === id)).filter((p): p is AlarmaProfile => !!p),
    [profileIds, allProfiles],
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedDvId, setSelectedDvId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [query, setQuery] = useState("");
  const activeProfile = profiles[activeIdx] ?? null;
  const { folderName } = useImageFolder();

  const handleProfileChange = (idx: number) => {
    setActiveIdx(idx);
    setSelectedDvId(null);
    setActiveCategory(null);
  };

  const selectedDv = useMemo(
    () => activeProfile?.dataValues.find((dv) => dv.id === selectedDvId) ?? null,
    [activeProfile, selectedDvId],
  );

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<CategoryId, number>;
    for (const dv of activeProfile?.dataValues ?? []) {
      const cat = getDataPointCategory(dv.title);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [activeProfile]);

  const availableCategories = useMemo(
    () => CATEGORIES.filter((c) => (categoryCounts[c.id] ?? 0) > 0),
    [categoryCounts],
  );

  const visibleDataValues = useMemo(() => {
    let list = activeProfile?.dataValues ?? [];
    if (activeCategory) list = list.filter((dv) => getDataPointCategory(dv.title) === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (dv) =>
          dv.title.toLowerCase().includes(q) ||
          dv.details.some((d) => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [activeProfile, activeCategory, query]);

  const vehicleImg = useMemo(() => {
    if (!activeProfile?.vehicleImages?.length) return null;
    const match =
      activeProfile.vehicleImages.find((vi) => vi.kind === "vehicle" && vi.years.includes(String(year))) ??
      activeProfile.vehicleImages.find((vi) => vi.kind === "vehicle");
    return match ? getImageByFile(match.file) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, year, folderName]);

  const logoImg = useMemo(() => {
    const logoEntry = activeProfile?.vehicleImages?.find((vi) => vi.kind === "logo");
    return logoEntry ? getImageByFile(logoEntry.file) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, folderName]);

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <Radio className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Sin perfil de alarma disponible</p>
        <Button variant="secondary" className="mt-4" onClick={onBack}>
          <ArrowLeft /> Volver
        </Button>
      </div>
    );
  }

  return (
    <>
      <DetailScreen
        title={`${make} ${model}`}
        meta={`${year} · Alarmas`}
        onBack={onBack}
        backLabel="Volver a vehículos"
      >
        <DetailHero>
          {vehicleImg && (
            <img
              src={vehicleImg}
              alt={`${make} ${model}`}
              className="mx-auto mb-4 h-36 w-full max-w-xs object-contain drop-shadow-md md:mb-0 md:w-64"
            />
          )}
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2.5">
              {logoImg && <img src={logoImg} alt="" className="h-7 w-auto shrink-0 object-contain" />}
              <p className="min-w-0 truncate text-xl font-semibold text-foreground">{activeProfile.nombre}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SpecTile label="Puntos de conexión" value={String(activeProfile.dataValues.length)} />
              <SpecTile label="Años" value={activeProfile.yearRange || String(year)} />
            </div>
          </div>
        </DetailHero>

        {profiles.length > 1 && (
          <ChipRow label="Perfil de alarma">
            {profiles.map((p, i) => (
              <FilterChip key={p.id} selected={i === activeIdx} onClick={() => handleProfileChange(i)}>
                {p.nombre}
              </FilterChip>
            ))}
          </ChipRow>
        )}

        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={`Buscar entre ${activeProfile.dataValues.length} puntos`}
        />

        {availableCategories.length > 1 && (
          <ChipRow label="Categorías">
            <FilterChip selected={!activeCategory} onClick={() => setActiveCategory(null)}>
              Todos
            </FilterChip>
            {availableCategories.map((cat) => (
              <FilterChip
                key={cat.id}
                selected={activeCategory === cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                count={categoryCounts[cat.id]}
              >
                {cat.label}
              </FilterChip>
            ))}
          </ChipRow>
        )}

        {visibleDataValues.length > 0 ? (
          <div className="m3-list">
            {visibleDataValues.map((dv) => (
              <DataPointRow key={dv.id} dv={dv} year={year} onClick={() => setSelectedDvId(dv.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-[28px] bg-card px-5 py-10 text-center text-[15px] text-muted-foreground shadow-sm">
            {query.trim() ? <>Sin resultados para “{query.trim()}”</> : "No hay puntos en esta categoría"}
          </p>
        )}
      </DetailScreen>

      <DataPointSheet dv={selectedDv} year={year} onClose={() => setSelectedDvId(null)} />
    </>
  );
}
