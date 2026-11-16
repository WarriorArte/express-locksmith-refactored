import { useState } from "react";
import { BatteryMedium, Car, Check, Hand, Images, KeyRound, Plug, Radio, ShieldOff, StickyNote, Wrench, X } from "lucide-react";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-dialog";
import { FormattedText } from "@/components/herramientas/RichTextField";
import { ProcedureSteps } from "@/components/herramientas/ProcedureSteps";
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
import { SIN_INMOVILIZADOR_TEXTO, formatFrecuencia, immoAssignmentImage, immoProfileImages, resolveProcedureText } from "@/lib/immo";
import { cn } from "@/lib/utils";
import type { ImmoProfile, ImmoAssignmentDetail, ImmoCatalogItem } from "@/types";

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
  /** Otros vehículos que comparten este perfil Immo o su FCC ID (texto plano). */
  compatibleVehicles?: string[];
  onBack: () => void;
}

export function ImmoWorkspace({ profile, detail, catalog, vehicle, compatibleVehicles = [], onBack }: ImmoWorkspaceProps) {
  const title = profileTitle(profile);
  const heading = vehicle ? `${vehicle.make} ${vehicle.model}` : title;
  const headingMeta = [vehicle?.year, vehicle ? profile.marca : null].filter(Boolean).join(" · ");
  const [mainImageViewerOpen, setMainImageViewerOpen] = useState(false);
  // Portada = la imagen elegida en la asignación; al tocarla se abre el carrusel con todas.
  const images = immoProfileImages(profile);
  const heroImage = immoAssignmentImage(profile, detail);
  const heroIndex = heroImage ? Math.max(0, images.indexOf(heroImage)) : 0;

  const generacionRemoto = (profile.generacionRemoto ?? []).filter((f) => (f.value ?? "").trim());
  const noGenerable = !!detail?.transponderNoGenerable;
  const notasNoGenerable = detail?.notasNoGenerable?.trim() ?? "";
  const generadoCon = noGenerable ? [] : catalogItems(detail?.generadoConIds ?? [], catalog);
  const equiposRemoto = detail?.omitirEquiposRemoto ? [] : catalogItems(detail?.equiposRemotoIds ?? [], catalog);
  const equiposTransponder = detail?.omitirEquiposTransponder ? [] : catalogItems(detail?.equiposTransponderIds ?? [], catalog);
  const transponder = detail?.transponder?.trim() ?? "";
  const transponderNotes = detail?.transponderNotes?.trim() ?? "";
  const pincodeRequerido = !!detail?.pincodeRequerido;
  const formaObtencionPincode = detail?.formaObtencionPincode?.trim() ?? "";
  const notasPincode = detail?.notasPincode?.trim() ?? "";
  const sinPincode = !!detail?.sinPincode;
  const notasSinPincode = detail?.notasSinPincode?.trim() ?? "";
  // Procedimiento guardado vinculado (se actualiza al editarlo) o la copia propia.
  const procedimiento = resolveProcedureText(detail, catalog);
  const notasGenerales = detail?.notasGenerales?.trim() ?? "";

  // Sin inmovilizador: se muestra el aviso y se ocultan transponder, pincode y su equipo
  // (los datos pueden seguir guardados por si el administrador desmarca la opción).
  const sinInmovilizador = !!detail?.sinInmovilizador;
  const notasSinInmovilizador = detail?.notasSinInmovilizador?.trim() ?? "";
  const hasGeneracion = generacionRemoto.length > 0;
  const hasTransponder = !sinInmovilizador && (!!(transponder || transponderNotes) || noGenerable || generadoCon.length > 0 || equiposTransponder.length > 0);
  const hasPincode = !sinInmovilizador && (sinPincode || pincodeRequerido || !!formaObtencionPincode || !!notasPincode);
  const showEquiposTransponder = !sinInmovilizador && equiposTransponder.length > 0;
  const hasMethods = !!(detail?.programacionManual || detail?.programacionOBD);
  // «Programación del remoto»: el equipo del transponder vive en la sección Transponder.
  const hasProgramacion = hasMethods || equiposRemoto.length > 0 || !!procedimiento;
  const toolIcon = <Wrench className="h-6 w-6" />;

  return (
    <>
      <DetailScreen title={heading} meta={headingMeta} onBack={onBack} backLabel="Volver a vehículos">
        {/* Llavero: foto completa + FCC ID + especificaciones */}
        <DetailHero>
          {heroImage && (
            <button
              type="button"
              onClick={() => setMainImageViewerOpen(true)}
              aria-label={images.length > 1 ? `Ver las ${images.length} fotos de ${title}` : `Ver ${title} ampliado`}
              className="mx-auto mb-4 block max-w-full outline-none md:mb-0"
            >
              <img
                src={resolveStorageUrl(heroImage) ?? undefined}
                alt={title}
                className="mx-auto block h-60 w-auto max-w-full object-contain drop-shadow-md md:h-72"
              />
              {images.length > 1 && (
                <span className="mt-2 flex items-center justify-center gap-1 text-xs font-medium tabular-nums text-muted-foreground">
                  <Images className="h-3.5 w-3.5" aria-hidden />
                  {images.length}
                </span>
              )}
            </button>
          )}
          <div className="min-w-0 space-y-3">
            {profile.fccId ? (
              <CopyableValue
                label="FCC ID"
                value={profile.fccId}
                action={
                  compatibleVehicles.length > 0 ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Compatible con ${compatibleVehicles.length} vehículo(s) más`}
                          className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Car className="h-5 w-5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader className="text-left">
                          <DialogTitle className="text-2xl font-bold leading-tight">Compatible con:</DialogTitle>
                          <DialogDescription className="tabular-nums">
                            FCC ID {profile.fccId} · {compatibleVehicles.length} vehículo(s)
                          </DialogDescription>
                        </DialogHeader>
                        <ul className="pb-4 text-[15px] text-foreground">
                          {compatibleVehicles.map((v) => (
                            <li key={v} className="border-b border-border/60 py-2 tabular-nums last:border-b-0">{v}</li>
                          ))}
                        </ul>
                      </DialogContent>
                    </Dialog>
                  ) : undefined
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sin FCC ID registrado</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <SpecTile icon={<Radio className="h-3.5 w-3.5" />} label="Frecuencia" value={formatFrecuencia(profile)} />
              <SpecTile icon={<BatteryMedium className="h-3.5 w-3.5" />} label="Batería" value={profile.bateria} />
            </div>
          </div>
        </DetailHero>

        {(hasGeneracion || hasTransponder || sinInmovilizador) && (
          <div className={cn("grid gap-3", hasGeneracion && (hasTransponder || sinInmovilizador) && "md:grid-cols-2")}>
            {hasGeneracion && (
              <DetailSection title="Generación del remoto" className="min-w-0">
                {generacionRemoto.length > 0 && (
                  <div className="-my-1.5">
                    {generacionRemoto.map((f) => (
                      <SpecRow key={f.id} label={f.label} value={f.value} copyable />
                    ))}
                  </div>
                )}
              </DetailSection>
            )}

            {sinInmovilizador && (
              <DetailSection
                title="Inmovilizador"
                tone="warning"
                icon={<ShieldOff className="h-5 w-5 text-warning" />}
                className="min-w-0"
              >
                <p className="text-[15px] font-semibold leading-relaxed text-foreground">{SIN_INMOVILIZADOR_TEXTO}.</p>
                {notasSinInmovilizador && (
                  <FormattedText
                    text={notasSinInmovilizador}
                    className="mt-2 space-y-1 text-[15px] leading-relaxed text-muted-foreground"
                  />
                )}
              </DetailSection>
            )}

            {hasTransponder && (
              <DetailSection title="Transponder" className="min-w-0">
                {transponder && (
                  <p className="text-2xl font-bold leading-tight tabular-nums text-foreground">{transponder}</p>
                )}
                {transponderNotes && (
                  <FormattedText
                    text={transponderNotes}
                    className={cn(
                      "space-y-1 text-[15px] leading-relaxed text-muted-foreground",
                      transponder && "mt-2",
                    )}
                  />
                )}
                {generadoCon.length > 0 && (
                  <div className={transponder || transponderNotes ? "mt-5" : undefined}>
                    <SubHeading>Se genera con</SubHeading>
                    <ImageCarousel items={generadoCon} fallbackIcon={toolIcon} />
                  </div>
                )}
                {noGenerable && (
                  <div className={cn("space-y-3", (transponder || transponderNotes) && "mt-5")}>
                    <SubHeading>Se genera con</SubHeading>
                    <div className="flex flex-wrap gap-2">
                      <TonalChip icon={<X className="h-4 w-4" />} label="Este transponder no se puede generar" tone="neutral" />
                    </div>
                    {notasNoGenerable && (
                      <FormattedText text={notasNoGenerable} className="space-y-1 text-[15px] leading-relaxed text-foreground" />
                    )}
                  </div>
                )}
                {showEquiposTransponder && (
                  <div className={transponder || transponderNotes || noGenerable || generadoCon.length > 0 ? "mt-5" : undefined}>
                    <SubHeading>Equipo para programar el transponder</SubHeading>
                    <ImageCarousel items={equiposTransponder} fallbackIcon={toolIcon} />
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
            {sinPincode ? (
              // El auto no lleva pincode: aviso claro + notas opcionales.
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <TonalChip icon={<X className="h-4 w-4" />} label="No se necesita pincode o el equipo se lo salta" tone="neutral" />
                </div>
                {notasSinPincode && (
                  <FormattedText text={notasSinPincode} className="space-y-1 text-[15px] leading-relaxed text-foreground" />
                )}
              </div>
            ) : (
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
                    <FormattedText
                      text={formaObtencionPincode}
                      className="space-y-1 text-[15px] leading-relaxed text-foreground"
                    />
                  </div>
                )}
                {notasPincode && (
                  <div>
                    <SubHeading className="font-bold">Notas del pincode:</SubHeading>
                    <FormattedText text={notasPincode} className="space-y-1 text-[15px] leading-relaxed text-foreground" />
                  </div>
                )}
              </div>
            )}
          </DetailSection>
        )}

        {hasProgramacion && (
          <DetailSection title="Programación del remoto">
            <div className="space-y-5">
              {equiposRemoto.length > 0 && (
                <div>
                  <SubHeading>Equipo para programar el remoto</SubHeading>
                  <ImageCarousel items={equiposRemoto} fallbackIcon={toolIcon} />
                </div>
              )}
              {(procedimiento || hasMethods) && (
                <div>
                  <SubHeading>{procedimiento ? "Pasos para programar el remoto" : "Método de programación"}</SubHeading>
                  {/* El método (OBD2 / manual) describe estos pasos, por eso va justo encima de ellos. */}
                  {hasMethods && (
                    <div className={cn("flex flex-wrap gap-2", procedimiento && "mb-4")}>
                      {detail?.programacionOBD && <TonalChip icon={<Plug className="h-4 w-4" />} label="Por OBD2" tone="warning" />}
                      {detail?.programacionManual && (
                        <TonalChip icon={<Hand className="h-4 w-4" />} label="Manual" tone="warning" />
                      )}
                    </div>
                  )}
                  {procedimiento && <ProcedureSteps text={procedimiento} />}
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

      {images.length > 0 && (
        <ImageViewDialog
          open={mainImageViewerOpen}
          onOpenChange={setMainImageViewerOpen}
          images={images.map((url) => ({ url, description: title }))}
          initialIndex={heroIndex}
        />
      )}
    </>
  );
}
