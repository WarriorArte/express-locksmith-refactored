import { useEffect, useRef, useState } from "react";
import { m as motion, useMotionTemplate, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { ArrowLeft, Cpu, Radio, Wrench, ShieldCheck, Check, StickyNote } from "lucide-react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { FormattedText } from "@/components/herramientas/RichTextField";
import { resolveStorageUrl } from "@/lib/phpApi";
import type { ImmoProfile, ImmoAssignmentDetail, ImmoCatalogItem } from "@/types";

function profileTitle(p: ImmoProfile) {
  const parts = [p.marca, p.fccId].filter(Boolean);
  return parts.length ? parts.join(" ") : "Immo Info";
}

function SectionLabel({ icon, text, tone = "primary" }: { icon: React.ReactNode; text: string; tone?: "primary" | "warning" }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className={tone === "warning" ? "text-warning/80" : "text-primary/60"}>{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{text}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function SelectedChips({ ids, catalog, narrow = false }: { ids: string[]; catalog: ImmoCatalogItem[]; narrow?: boolean }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // Se recorre el catálogo (no `ids`) para que el orden del carrusel siempre
  // coincida con el orden definido en Herramientas y Suministros, sin importar
  // en qué orden se hayan seleccionado los elementos al asignarlos.
  const idSet = new Set(ids);
  const items = catalog.filter((c) => idSet.has(c.id));
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
        className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar pb-1"
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

function CompactRow({
  label, value, inverse = false, labelFontSize, valueFontSize,
}: {
  label: string; value?: string; inverse?: boolean;
  labelFontSize?: MotionValue<string>; valueFontSize?: MotionValue<string>;
}) {
  return (
    <div className="space-y-0.5">
      <motion.p
        style={labelFontSize ? { fontSize: labelFontSize } : undefined}
        className={`text-[9px] font-bold uppercase tracking-wide leading-none ${inverse ? "text-[hsl(240_22%_95%_/_0.58)]" : "text-muted-foreground/70"}`}
      >
        {label}
      </motion.p>
      <motion.p
        style={valueFontSize ? { fontSize: valueFontSize } : undefined}
        className={`text-xs font-mono break-all leading-snug ${inverse ? "text-[hsl(240_22%_95%)]" : "text-foreground"}`}
      >
        {value ? value : <span className={inverse ? "text-[hsl(240_22%_95%_/_0.42)] italic" : "text-muted-foreground/50 italic"}>—</span>}
      </motion.p>
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
  // La imagen debe dar siempre el alto real de la tarjeta "Detalles del Remoto"
  // (que a su vez se encoge con el scroll por los textos más chicos). Un simple
  // `items-stretch` + `h-full` en la imagen no sirve aquí: dentro de un grid con
  // fila "auto", un <img> con alto en porcentaje puede inflar la fila entera al
  // tamaño natural de la foto en vez de respetar el stretch — por eso se mide el
  // alto real de los detalles con ResizeObserver y se aplica como alto explícito.
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setDetailsHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // El FCC ID siempre va en una sola línea: en vez de envolver el texto (break-all),
  // se mide su ancho natural contra el ancho disponible y se achica con un `scale`
  // justo lo necesario para que quepa completo sin desbordarse.
  const fccWrapRef = useRef<HTMLDivElement>(null);
  const fccTextRef = useRef<HTMLParagraphElement>(null);
  const [fccFitScale, setFccFitScale] = useState(1);
  useEffect(() => {
    const wrap = fccWrapRef.current;
    const text = fccTextRef.current;
    if (!wrap || !text) return;
    const measure = () => {
      const available = wrap.clientWidth;
      const natural = text.scrollWidth;
      setFccFitScale(available > 0 && natural > available ? available / natural : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [profile.fccId]);
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
  // El padding vertical y la altura de la imagen son lo que hace que el hero se
  // vea "más pequeño" al hacer scroll (el padding horizontal se queda fijo, igual
  // que en los demás heroes, para que el contenido no se desplace de lado).
  const heroVerticalPadding = useTransform(mergeProgress, [0, 1], [22, 12]);
  const heroVerticalPaddingStyle = useMotionTemplate`${heroVerticalPadding}px`;
  const overviewMarginTop = useTransform(mergeProgress, [0, 1], [16, 8]);
  const overviewMarginTopStyle = useMotionTemplate`${overviewMarginTop}px`;
  // Los textos de "Detalles del Remoto" (FCC ID, Marca, Frec., Bat.) también se
  // encogen junto con la imagen, para que el hero realmente baje de alto.
  const detailLabelFontSize = useTransform(mergeProgress, [0, 1], [9, 7.5]);
  const detailLabelFontSizeStyle = useMotionTemplate`${detailLabelFontSize}px`;
  const detailValueFontSize = useTransform(mergeProgress, [0, 1], [12, 10]);
  const detailValueFontSizeStyle = useMotionTemplate`${detailValueFontSize}px`;
  const fccValueFontSize = useTransform(mergeProgress, [0, 1], [14, 11]);
  const fccValueFontSizeStyle = useMotionTemplate`${fccValueFontSize}px`;
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    scrollTop.set(event.currentTarget.scrollTop);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden max-w-2xl md:max-w-4xl mx-auto w-full bg-background">
      {/* Body — scrollable overview and details */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          onScroll={handleScroll}
          className="h-full min-h-0 overflow-y-auto overscroll-y-contain pb-mobile-nav"
          style={{ overflowAnchor: "none" }}
        >
          <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-3">

          {/* Header + overview: un solo hero (mismo ce-hero-eyebrow/ce-hero-title/ícono que
              los demás heroes de la app), que se compacta de forma continua con el scroll
              en vez de quedarse fijo — todo comparte el mismo padding del hero, así que
              el título de arriba y la imagen/detalles de abajo quedan alineados entre sí. */}
          <motion.div
            style={{ paddingTop: heroVerticalPaddingStyle, paddingBottom: heroVerticalPaddingStyle }}
            className="ce-hero sticky top-0 z-30 max-lg:-mx-3 overflow-hidden px-4 max-lg:rounded-t-none max-lg:rounded-b-[24px] max-lg:border-t-0 max-lg:border-x-0 lg:px-[22px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Volver a herramientas"
                  className="ce-hero-eyebrow inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Immo Info
                </button>
                <h2 className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]">
                  {vehicle ? `${vehicle.make} ${vehicle.model}` : title}
                </h2>
              </div>
              <div className="shrink-0 mt-1">
                <AccountMenu />
              </div>
            </div>

            {/* Overview: imagen y detalles siempre en fila; la imagen toma el alto medido
                real de la tarjeta de detalles, así que se encoge junto con ella. */}
            <motion.div
              style={{ marginTop: overviewMarginTopStyle }}
              className={`grid items-start gap-3 md:gap-4 ${profile.mainImage ? "grid-cols-2" : "grid-cols-1"}`}
            >
            {profile.mainImage && (
              <button
                type="button"
                onClick={() => setMainImageViewerOpen(true)}
                aria-label={`Ver ${title} ampliado`}
                className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ height: detailsHeight ?? 168 }}
              >
              <img
                src={resolveStorageUrl(profile.mainImage) ?? undefined}
                alt={title}
                className="h-full w-full object-contain drop-shadow-sm"
              />
              </button>
            )}

            <section ref={detailsRef} className="min-w-0 md:pl-4">
              <div className="overflow-hidden rounded-xl">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Radio className="h-3.5 w-3.5 text-primary" />
                  <motion.span
                    style={{ fontSize: detailLabelFontSizeStyle }}
                    className="whitespace-nowrap font-bold uppercase tracking-[0.08em] text-[hsl(240_22%_95%)]"
                  >
                    Detalles del Remoto
                  </motion.span>
                </div>
                {profile.fccId && (
                  <div className="border-t border-white/10 px-3 py-2">
                    <motion.p
                      style={{ fontSize: detailLabelFontSizeStyle }}
                      className="mb-0.5 font-bold uppercase tracking-wide leading-none text-[hsl(240_22%_95%_/_0.58)]"
                    >
                      FCC ID
                    </motion.p>
                    <div ref={fccWrapRef} className="overflow-hidden">
                      <motion.p
                        ref={fccTextRef}
                        style={{ fontSize: fccValueFontSizeStyle, scale: fccFitScale, transformOrigin: "left" }}
                        className="inline-block whitespace-nowrap font-mono font-semibold leading-snug text-[hsl(240_22%_95%)]"
                      >
                        {profile.fccId}
                      </motion.p>
                    </div>
                  </div>
                )}
                <div className="border-t border-white/10 px-3 py-2">
                  <CompactRow label="Año" value={vehicle?.year?.toString()} inverse labelFontSize={detailLabelFontSizeStyle} valueFontSize={detailValueFontSizeStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-3 py-2">
                  <CompactRow label="Frec." value={profile.frecuencia} inverse labelFontSize={detailLabelFontSizeStyle} valueFontSize={detailValueFontSizeStyle} />
                  <CompactRow label="Bat." value={profile.bateria} inverse labelFontSize={detailLabelFontSizeStyle} valueFontSize={detailValueFontSizeStyle} />
                </div>
              </div>
            </section>
            </motion.div>
          </motion.div>

          {/* Generación de Remoto + Transponder — unified card */}

          {(hasGenFields || hasTransponderInfo || hasGeneradoCon) && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                    <div className="p-2.5 space-y-2.5 bg-accent/5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Cpu className="w-3 h-3 text-accent shrink-0" />
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
                <div className={`px-2.5 pb-2.5 pt-2.5 space-y-1.5 bg-muted/30 ${(hasGenFields || hasTransponderInfo) ? "border-t border-border" : ""}`}>
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
              <div className="rounded-xl border border-border bg-card p-3 space-y-3">
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
                    <div className="rounded-lg bg-muted/40 border border-border/70 p-3">
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
              <SectionLabel icon={<StickyNote className="w-3 h-3" />} text="Notas Generales" tone="warning" />
              <div className="rounded-xl bg-warning-light/40 border border-warning/25 p-3">
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
