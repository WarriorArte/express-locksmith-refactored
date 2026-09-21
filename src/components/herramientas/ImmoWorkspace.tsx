import { useState } from "react";
import { m as motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, Cpu, Radio, Wrench, ShieldCheck, Check, StickyNote } from "lucide-react";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { FormattedText } from "@/components/herramientas/RichTextField";
import { resolveStorageUrl } from "@/lib/phpApi";
import type { ImmoProfile, ImmoAssignmentDetail, ImmoCatalogItem } from "@/types";

function profileTitle(p: ImmoProfile) {
  const parts = [p.marca, p.fccId].filter(Boolean);
  return parts.length ? parts.join(" ") : "Immo Info";
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className="text-primary/60">{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{text}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function SelectedChips({ ids, catalog, narrow = false }: { ids: string[]; catalog: ImmoCatalogItem[]; narrow?: boolean }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const items = ids.map((id) => catalog.find((c) => c.id === id)).filter(Boolean) as ImmoCatalogItem[];
  if (items.length === 0) return <span className="text-xs text-muted-foreground italic">—</span>;

  // Solo los elementos con imagen entran a la galería del lightbox (los que no
  // tienen imagen no son "ampliables").
  const imageItems = items.filter((item) => !!item.image);
  const viewerImages = imageItems.map((item) => ({ url: item.image!, description: item.label }));
  const openViewerFor = (item: ImmoCatalogItem) => {
    const idx = imageItems.findIndex((i) => i.id === item.id);
    if (idx !== -1) setViewerIndex(idx);
  };

  const viewer = (
    <ImageViewDialog
      open={viewerIndex !== null}
      onOpenChange={(open) => !open && setViewerIndex(null)}
      images={viewerImages}
      initialIndex={viewerIndex ?? 0}
    />
  );

  if (narrow) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.image && openViewerFor(item)}
              disabled={!item.image}
              aria-label={item.image ? `Ver ${item.label} ampliado` : item.label}
              className="flex flex-col items-center gap-0.5 disabled:cursor-default"
            >
              <div className="aspect-square w-full rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
                {item.image ? (
                  <img src={resolveStorageUrl(item.image) ?? undefined} alt={item.label} className="w-full h-full object-cover" />
                ) : (
                  <Check className="w-3 h-3 text-primary/40" />
                )}
              </div>
              <p className="text-[9px] font-medium text-foreground text-center leading-tight w-full truncate">{item.label}</p>
            </button>
          ))}
        </div>
        {viewer}
      </>
    );
  }

  return (
    <>
      <div
        className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain touch-pan-x snap-x snap-mandatory no-scrollbar pb-1"
        role="list"
        aria-label="Elementos disponibles"
      >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => item.image && openViewerFor(item)}
          disabled={!item.image}
          aria-label={item.image ? `Ver ${item.label} ampliado` : item.label}
          className="group flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1 rounded-lg p-1 text-center outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
        >
          <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
            {item.image ? (
              <img
                src={resolveStorageUrl(item.image) ?? undefined}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
              />
            ) : (
              <Check className="h-4 w-4 text-primary/50" />
            )}
          </span>
          <span className="w-full truncate text-[10px] font-semibold leading-tight text-foreground">
            {item.label}
          </span>
        </button>
      ))}
      </div>
      {viewer}
    </>
  );
}

function CompactRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none">{label}</p>
      <p className="text-xs text-foreground font-mono break-all leading-snug">
        {value ? value : <span className="text-muted-foreground/50 italic">—</span>}
      </p>
    </div>
  );
}

// ── ImmoWorkspace ─────────────────────────────────────────────────────────────

interface ImmoWorkspaceProps {
  profile: ImmoProfile;
  detail: ImmoAssignmentDetail | null;
  catalog: ImmoCatalogItem[];
  vehicle?: { year: number; make: string; model: string };
  onBack: () => void;
}

// Distancia de scroll (px) sobre la que ocurre la fusión imagen + detalles.
const OVERVIEW_MERGE_RANGE = 96;

export function ImmoWorkspace({ profile, detail, catalog, vehicle, onBack }: ImmoWorkspaceProps) {
  const title = profileTitle(profile);
  const [mainImageViewerOpen, setMainImageViewerOpen] = useState(false);
  const generacionRemoto = profile.generacionRemoto ?? [];
  const hasGenFields = generacionRemoto.some((f) => f.value.trim());

  const generadoConIds = detail?.generadoConIds ?? [];
  const equiposRemotoIds = detail?.equiposRemotoIds ?? [];
  const equiposTransponderIds = detail?.equiposTransponderIds ?? [];
  const hasGeneradoCon = generadoConIds.length > 0;
  const hasEquiposRemoto = equiposRemotoIds.length > 0;
  const hasEquiposTransponder = equiposTransponderIds.length > 0;
  const hasTransponder = !!(detail?.transponder?.trim());
  const hasTransponderNotes = !!(detail?.transponderNotes?.trim());
  const hasTransponderInfo = hasTransponder || hasTransponderNotes;
  const hasProgramacion = hasEquiposRemoto || hasEquiposTransponder ||
    detail?.programacionManual || detail?.programacionOBD ||
    !!(detail?.procedimientoProgramacion?.trim());
  const hasNotasGenerales = !!(detail?.notasGenerales?.trim());
  const bothCols = hasGenFields && (hasTransponderInfo || hasGeneradoCon);

  // Progreso continuo de scroll (0 → 1): nada de estado ni umbral, solo sigue el dedo.
  const scrollTop = useMotionValue(0);
  const mergeProgress = useTransform(scrollTop, [0, OVERVIEW_MERGE_RANGE], [0, 1], { clamp: true });
  const imageFr = useTransform(mergeProgress, [0, 1], [1, 0.78]);
  const detailFr = useTransform(mergeProgress, [0, 1], [1, 1.22]);
  const overviewGridTemplate = useMotionTemplate`minmax(0, ${imageFr}fr) minmax(0, ${detailFr}fr)`;
  const overviewPadding = useTransform(mergeProgress, [0, 1], [0, 8]);
  const overviewPaddingStyle = useMotionTemplate`${overviewPadding}px`;
  const overviewScale = useTransform(mergeProgress, [0, 1], [1, 0.985]);
  const imageMaxHeight = useTransform(mergeProgress, [0, 1], [208, 150]);
  const imageMaxHeightStyle = useMotionTemplate`${imageMaxHeight}px`;
  // Frec./Bat.: apiladas en reposo, se deslizan a 2 columnas con el scroll.
  // Un grid no puede interpolar "1 columna" → "2 columnas" sin saltar (cambia cuántas
  // filas hay), así que en vez de eso las dos filas quedan posicionadas de forma absoluta
  // y se mueve/encoge cada una con motion values: nada de remounts ni cross-fades, solo
  // tamaño y posición cambiando cuadro a cuadro en sincronía con el scroll real.
  const DETAIL_ROW_H = 48; // px, alto fijo de cada fila (contenido corto y constante)
  const DETAIL_COL_GAP = 12; // px, separación cuando terminan lado a lado
  const detailRowsHeight = useTransform(mergeProgress, [0, 1], [DETAIL_ROW_H * 2, DETAIL_ROW_H]);
  const detailRowsHeightStyle = useMotionTemplate`${detailRowsHeight}px`;
  const detailColWidthPct = useTransform(mergeProgress, [0, 1], [100, 50]);
  const detailGapHalf = useTransform(mergeProgress, [0, 1], [0, DETAIL_COL_GAP / 2]);
  const detailColWidthStyle = useMotionTemplate`calc(${detailColWidthPct}% - ${detailGapHalf}px)`;
  const batLeftPct = useTransform(mergeProgress, [0, 1], [0, 50]);
  const batLeftStyle = useMotionTemplate`calc(${batLeftPct}% + ${detailGapHalf}px)`;
  const batTop = useTransform(mergeProgress, [0, 1], [DETAIL_ROW_H, 0]);
  const batTopStyle = useMotionTemplate`${batTop}px`;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    scrollTop.set(event.currentTarget.scrollTop);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden max-w-2xl md:max-w-4xl mx-auto w-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border shrink-0">
        <button onClick={onBack} className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-none mb-0.5">Immo Info</p>
          <h2 className="text-sm font-bold text-foreground truncate leading-tight">
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : title}
          </h2>
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
          <Cpu className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Body — scrollable overview and details */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          onScroll={handleScroll}
          className="h-full min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y pb-mobile-nav"
        >
          <div className="mx-auto w-full max-w-4xl space-y-4 px-3 py-3">

          {/* Overview: imagen y detalles siempre en fila; se fusionan/compactan de forma continua con el scroll */}
          <motion.div
            style={{
              gridTemplateColumns: overviewGridTemplate,
              padding: overviewPaddingStyle,
              scale: overviewScale,
            }}
            className="sticky top-0 z-20 grid items-start gap-3"
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-x-3 inset-y-0 -z-10 border-b border-border/80 bg-background/95 shadow-md backdrop-blur-sm"
              style={{ opacity: mergeProgress }}
            />

            {profile.mainImage && (
              <button
                type="button"
                onClick={() => setMainImageViewerOpen(true)}
                aria-label={`Ver ${title} ampliado`}
                className="flex min-h-0 items-start justify-center overflow-hidden rounded-xl bg-muted/30 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <motion.img
                  src={resolveStorageUrl(profile.mainImage) ?? undefined}
                  alt={title}
                  className="w-full object-contain"
                  style={{ maxHeight: imageMaxHeightStyle }}
                />
              </button>
            )}

            <section className="min-w-0">
              <SectionLabel icon={<Radio className="w-3 h-3" />} text="Detalles del Remoto" />
              <div className="rounded-xl border border-border overflow-hidden">
                {profile.fccId && (
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none mb-0.5">FCC ID</p>
                    <p className="text-sm text-foreground font-mono break-all font-semibold leading-snug">{profile.fccId}</p>
                  </div>
                )}
                <div className="divide-y divide-border/50">
                  <div className="px-3 py-2">
                    <CompactRow label="Marca" value={profile.marca} />
                  </div>
                  <motion.div className="relative" style={{ height: detailRowsHeightStyle }}>
                    <motion.div className="absolute left-0 top-0 min-w-0" style={{ width: detailColWidthStyle }}>
                      <div className="px-3 py-2">
                        <CompactRow label="Frec." value={profile.frecuencia} />
                      </div>
                    </motion.div>
                    <motion.div className="absolute min-w-0" style={{ width: detailColWidthStyle, left: batLeftStyle, top: batTopStyle }}>
                      <div className="px-3 py-2">
                        <CompactRow label="Bat." value={profile.bateria} />
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </section>
          </motion.div>

          {/* Generación de Remoto + Transponder — unified card */}

          {(hasGenFields || hasTransponderInfo || hasGeneradoCon) && (
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Top 2-col row: Generación | Transponder */}
              {(hasGenFields || hasTransponderInfo) && (
                <div className={`grid items-start ${bothCols && hasTransponderInfo ? "grid-cols-2 divide-x divide-border" : "grid-cols-1"}`}>
                  {hasGenFields && (
                    <div className="p-2.5 space-y-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Wrench className="w-3 h-3 text-primary/60 shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground leading-none truncate">Generación de Remoto</span>
                      </div>
                      <div className="space-y-2">
                        {generacionRemoto.filter((f) => f.value.trim()).map((f) => (
                          <CompactRow key={f.id} label={f.label} value={f.value} />
                        ))}
                      </div>
                    </div>
                  )}
                  {hasTransponderInfo && (
                    <div className="p-2.5 space-y-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Cpu className="w-3 h-3 text-primary/60 shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground leading-none truncate">Transponder</span>
                      </div>
                      {hasTransponder && <CompactRow label="Tipo" value={detail!.transponder} />}
                      {hasTransponderNotes && (
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none">Notas</p>
                          <p className="text-xs text-foreground leading-snug whitespace-pre-wrap">{detail!.transponderNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Full-width "Se genera con" row — chips span the full card width */}
              {hasGeneradoCon && (
                <div className={`px-2.5 pb-2.5 space-y-1.5 ${(hasGenFields || hasTransponderInfo) ? "border-t border-border pt-2.5" : "pt-2.5"}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none">Se genera con</p>
                  <SelectedChips ids={generadoConIds} catalog={catalog} />
                </div>
              )}
            </div>
          )}

          {/* Detalles de Programación */}
          {hasProgramacion && (
            <section>
              <SectionLabel icon={<ShieldCheck className="w-3 h-3" />} text="Detalles de Programación" />
              <div className="space-y-3">
                {hasEquiposRemoto && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none">Equipos — Remoto</p>
                    <SelectedChips ids={equiposRemotoIds} catalog={catalog} />
                  </div>
                )}
                {hasEquiposTransponder && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none">Equipos — Transponder</p>
                    <SelectedChips ids={equiposTransponderIds} catalog={catalog} />
                  </div>
                )}
                {(detail?.programacionManual || detail?.programacionOBD) && (
                  <div className="flex flex-wrap gap-2">
                    {detail?.programacionManual && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                        <Check className="w-3 h-3" /> Programación Manual
                      </span>
                    )}
                    {detail?.programacionOBD && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary dark:text-primary border border-primary/20 text-xs font-semibold">
                        <Check className="w-3 h-3" /> Programación OBD
                      </span>
                    )}
                  </div>
                )}
                {detail?.procedimientoProgramacion?.trim() && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70 leading-none">Procedimiento</p>
                    <div className="rounded-xl bg-muted/30 border border-border p-3">
                      <FormattedText text={detail.procedimientoProgramacion} className="text-sm text-foreground leading-relaxed space-y-1" />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Notas Generales */}
          {hasNotasGenerales && (
            <section>
              <SectionLabel icon={<StickyNote className="w-3 h-3" />} text="Notas Generales" />
              <div className="rounded-xl bg-muted/30 border border-border p-3">
                <FormattedText text={detail!.notasGenerales!} className="text-sm text-foreground leading-relaxed space-y-1" />
              </div>
            </section>
          )}

        <div className="h-4" />
          </div>
        </div>
      </div>

      {profile.mainImage && (
        <ImageViewDialog
          open={mainImageViewerOpen}
          onOpenChange={setMainImageViewerOpen}
          images={[{ url: profile.mainImage, description: title }]}
        />
      )}
    </div>
  );
}
