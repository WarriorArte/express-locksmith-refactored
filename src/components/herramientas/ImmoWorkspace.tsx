import { useState } from "react";
import { BatteryMedium, Check, Hand, KeyRound, Plug, Radio, StickyNote, Wrench, X } from "lucide-react";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { FormattedText } from "@/components/herramientas/RichTextField";
import { ProcedureSteps } from "@/components/herramientas/ProcedureSteps";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import {
  CopyableValue,
  DetailHero,
  DetailScreen,
  DetailSection,
  ImageCarousel,
  SpecRow,
  SpecTile,
  SubHeading,
  TonalChip,
} from "@/design-system/detail/DetailScreen";
import { resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";
import type { ImmoProfile, ImmoAssignmentDetail, ImmoCatalogItem } from "@/types";

/**
 * Desvanecido inferior de la foto del remoto: la foto se muestra casi completa
 * y solo lo último que sobresale por abajo se oculta con un degradado.
 */
const PHOTO_FADE = "linear-gradient(to bottom, #000 0%, #000 92%, transparent 100%)";

/*
 * Immo Info — pantalla de detalle de referencia del criterio M3E.
 * Ver docs/CRITERIO-DISENO-M3E.md.
 */

function profileTitle(p: ImmoProfile) {
  const parts = [p.marca, p.fccId].filter(Boolean);
  return parts.length ? parts.join(" ") : "Immo Info";
}

/** Elementos del catálogo en el orden definido en Herramientas y Suministros. */
function catalogItems(ids: string[], catalog: ImmoCatalogItem[]) {
  const idSet = new Set(ids);
  return catalog.filter((c) => idSet.has(c.id));
}

interface ImmoWorkspaceProps {
  profile: ImmoProfile;
  detail: ImmoAssignmentDetail | null;
  catalog: ImmoCatalogItem[];
  vehicle?: { year: number; make: string; model: string };
  onBack: () => void;
}

export function ImmoWorkspace({ profile, detail, catalog, vehicle, onBack }: ImmoWorkspaceProps) {
  const title = profileTitle(profile);
  const heading = vehicle ? `${vehicle.make} ${vehicle.model}` : title;
  const headingMeta = [vehicle?.year, vehicle ? profile.marca : null].filter(Boolean).join(" · ");
  const [mainImageViewerOpen, setMainImageViewerOpen] = useState(false);

  const generacionRemoto = (profile.generacionRemoto ?? []).filter((f) => f.value.trim());
  const generadoCon = catalogItems(detail?.generadoConIds ?? [], catalog);
  const equiposRemoto = catalogItems(detail?.equiposRemotoIds ?? [], catalog);
  const equiposTransponder = catalogItems(detail?.equiposTransponderIds ?? [], catalog);
  const transponder = detail?.transponder?.trim() ?? "";
  const transponderNotes = detail?.transponderNotes?.trim() ?? "";
  const pincodeRequerido = !!detail?.pincodeRequerido;
  const formaObtencionPincode = detail?.formaObtencionPincode?.trim() ?? "";
  const notasPincode = detail?.notasPincode?.trim() ?? "";
  const procedimiento = detail?.procedimientoProgramacion?.trim() ?? "";
  const notasGenerales = detail?.notasGenerales?.trim() ?? "";

  const hasGeneracion = generacionRemoto.length > 0;
  const hasTransponder = !!(transponder || transponderNotes) || generadoCon.length > 0;
  const hasPincode = pincodeRequerido || !!formaObtencionPincode || !!notasPincode;
  const hasMethods = !!(detail?.programacionManual || detail?.programacionOBD);
  const hasProgramacion = hasMethods || equiposRemoto.length > 0 || equiposTransponder.length > 0 || !!procedimiento;
  const toolIcon = <Wrench className="h-6 w-6" />;

  return (
    <>
      <DetailScreen title={heading} meta={headingMeta} onBack={onBack} backLabel="Volver a vehículos">
        {/* Llavero: foto sobre forma M3E + FCC ID + especificaciones */}
        <DetailHero>
          {profile.mainImage && (
            <button
              type="button"
              onClick={() => setMainImageViewerOpen(true)}
              aria-label={`Ver ${title} ampliado`}
              className="mx-auto mb-4 block outline-none md:mb-0"
            >
              <MaterialShape name="cookie9" spin className="h-52 w-52 text-background/60 md:h-56 md:w-56">
                {/* La foto crece más que la forma: se muestra casi completa y
                    solo lo último que sobresale abajo se desvanece. */}
                <span
                  className="relative -top-1 block h-[176px] w-[119px] overflow-hidden md:-top-2 md:h-[188px] md:w-[130px]"
                  style={{
                    WebkitMaskImage: PHOTO_FADE,
                    maskImage: PHOTO_FADE,
                  }}
                >
                  <img
                    src={resolveStorageUrl(profile.mainImage) ?? undefined}
                    alt={title}
                    className="block h-auto w-full drop-shadow-md"
                  />
                </span>
              </MaterialShape>
            </button>
          )}
          <div className="min-w-0 space-y-3">
            {profile.fccId ? (
              <CopyableValue label="FCC ID" value={profile.fccId} />
            ) : (
              <p className="text-sm text-muted-foreground">Sin FCC ID registrado</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <SpecTile icon={<Radio className="h-3.5 w-3.5" />} label="Frecuencia" value={profile.frecuencia} />
              <SpecTile icon={<BatteryMedium className="h-3.5 w-3.5" />} label="Batería" value={profile.bateria} />
            </div>
          </div>
        </DetailHero>

        {(hasGeneracion || hasTransponder) && (
          <div className={cn("grid gap-3", hasGeneracion && hasTransponder && "md:grid-cols-2")}>
            {hasGeneracion && (
              <DetailSection title="Generación del remoto" className="min-w-0">
                {generacionRemoto.length > 0 && (
                  <div className="-my-1.5">
                    {generacionRemoto.map((f) => (
                      <SpecRow key={f.id} label={f.label} value={f.value} />
                    ))}
                  </div>
                )}
              </DetailSection>
            )}

            {hasTransponder && (
              <DetailSection title="Transponder" className="min-w-0">
                {transponder && (
                  <p className="text-2xl font-bold leading-tight tabular-nums text-foreground">{transponder}</p>
                )}
                {transponderNotes && (
                  <p className={cn("whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground", transponder && "mt-2")}>
                    {transponderNotes}
                  </p>
                )}
                {generadoCon.length > 0 && (
                  <div className={transponder || transponderNotes ? "mt-5" : undefined}>
                    <SubHeading>Se genera con</SubHeading>
                    <ImageCarousel items={generadoCon} fallbackIcon={toolIcon} />
                  </div>
                )}
              </DetailSection>
            )}
          </div>
        )}

        {hasPincode && (
          <DetailSection
            title="Pincode"
            icon={<KeyRound className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <TonalChip
                  icon={pincodeRequerido ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  label={pincodeRequerido ? "Requerido para programar" : "No requerido"}
                  tone="neutral"
                />
              </div>
              {formaObtencionPincode && (
                <div>
                  <SubHeading className="font-bold">Cómo obtenerlo:</SubHeading>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{formaObtencionPincode}</p>
                </div>
              )}
              {notasPincode && (
                <div>
                  <SubHeading className="font-bold">Notas del pincode:</SubHeading>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{notasPincode}</p>
                </div>
              )}
            </div>
          </DetailSection>
        )}

        {hasProgramacion && (
          <DetailSection title="Programación">
            <div className="space-y-5">
              {hasMethods && (
                <div className="flex flex-wrap gap-2">
                  {detail?.programacionOBD && <TonalChip icon={<Plug className="h-4 w-4" />} label="Por OBD" />}
                  {detail?.programacionManual && (
                    <TonalChip icon={<Hand className="h-4 w-4" />} label="Manual" tone="warning" />
                  )}
                </div>
              )}
              {equiposTransponder.length > 0 && (
                <div>
                  <SubHeading>Equipo para el transponder</SubHeading>
                  <ImageCarousel items={equiposTransponder} fallbackIcon={toolIcon} />
                </div>
              )}
              {equiposRemoto.length > 0 && (
                <div>
                  <SubHeading>Equipo para el remoto</SubHeading>
                  <ImageCarousel items={equiposRemoto} fallbackIcon={toolIcon} />
                </div>
              )}
              {procedimiento && (
                <div>
                  <SubHeading>Pasos para programar el remoto</SubHeading>
                  <ProcedureSteps text={procedimiento} />
                </div>
              )}
            </div>
          </DetailSection>
        )}

        {notasGenerales && (
          <DetailSection title="Notas" tone="warning" icon={<StickyNote className="h-5 w-5 text-warning" />}>
            <FormattedText text={notasGenerales} className="space-y-1 text-[15px] leading-relaxed text-foreground" />
          </DetailSection>
        )}
      </DetailScreen>

      {profile.mainImage && (
        <ImageViewDialog
          open={mainImageViewerOpen}
          onOpenChange={setMainImageViewerOpen}
          images={[{ url: profile.mainImage, description: title }]}
        />
      )}
    </>
  );
}
