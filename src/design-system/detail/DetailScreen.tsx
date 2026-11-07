/**
 * Piezas de la "pantalla de detalle" M3 Expressive / Android.
 * Criterio completo: docs/CRITERIO-DISENO-M3E.md
 *
 *   <DetailScreen title="Toyota Corolla" meta="2018 · Toyota" onBack={…}>
 *     <DetailHero>…foto en MaterialShape + CopyableValue + SpecTile…</DetailHero>
 *     <DetailSection title="Programación">…</DetailSection>
 *   </DetailScreen>
 */
import { useEffect, useRef, useState } from "react";
import { m as motion, useMotionValue, useTransform } from "framer-motion";
import { toast } from "sonner";
import { Check, Copy, ImageIcon, Search, X } from "lucide-react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { resolveStorageUrl } from "@/lib/phpApi";
import { spawnRipple } from "@/lib/ripple";
import { cn } from "@/lib/utils";
import { ModuleHeader } from "@/design-system/layout/ModuleHeader";

// ── Pantalla ────────────────────────────────────────────────────────────────

interface DetailScreenProps {
  /** Título de una fila junto a la flecha. */
  title: string;
  /** Una línea bajo el título (año · marca, folio, etc.). */
  meta?: string;
  onBack: () => void;
  backLabel?: string;
  /** Acciones extra a la derecha de la barra (antes del avatar). */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Contenedor con scroll propio y encabezado compacto de dos filas que gana
 * fondo al desplazar.
 */
export function DetailScreen({
  title,
  meta,
  onBack,
  backLabel = "Volver",
  actions,
  className,
  children,
}: DetailScreenProps) {
  const scrollTop = useMotionValue(0);
  const barBackground = useTransform(scrollTop, [0, 40], [0, 1]);

  return (
    <div className={cn("mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-background md:max-w-4xl", className)}>
      <div
        onScroll={(e) => scrollTop.set(e.currentTarget.scrollTop)}
        className="h-full min-h-0 overflow-y-auto overscroll-y-contain pb-mobile-nav"
        style={{ overflowAnchor: "none" }}
      >
        <div className="sticky top-0 z-30 px-2 pb-2 pt-10 lg:pt-3">
          <motion.div aria-hidden="true" style={{ opacity: barBackground }} className="absolute inset-0 bg-background shadow-sm" />
          <ModuleHeader title={title} subtitle={meta} onBack={onBack} backLabel={backLabel} actions={actions} accountTrigger={<AccountMenu />} />
        </div>

        <div className="space-y-3 px-4 pb-4 pt-1">{children}</div>
      </div>
    </div>
  );
}

// ── Bloques ─────────────────────────────────────────────────────────────────

/** Bloque protagonista en `primary-light` (foto + dato principal + specs). */
export function DetailHero({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px] bg-primary-light p-5 md:grid md:grid-cols-[auto_1fr] md:items-center md:gap-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DetailSection({
  title,
  icon,
  tone = "default",
  action,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: "default" | "warning" | "destructive";
  /** Botón o texto a la derecha del título. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] p-5",
        tone === "warning" && "bg-warning-light",
        tone === "destructive" && "bg-destructive-light",
        tone === "default" && "bg-card shadow-sm",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-lg font-semibold leading-tight text-foreground">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SubHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mb-2.5 text-sm font-medium text-muted-foreground", className)}>{children}</p>;
}

/** Fila etiqueta / valor sin divisores. Envolver varias en `<div className="-my-1.5">`. */
export function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-[15px] font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/** Dato corto dentro de DetailHero (frecuencia, batería…). */
export function SpecTile({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-background/70 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-base font-semibold tabular-nums text-foreground">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

/** Chip M3 (8 px) con ícono propio. Para métodos, tipos, compatibilidades. */
export function TonalChip({
  icon,
  label,
  tone = "accent",
  className,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  tone?: "accent" | "warning" | "neutral" | "destructive";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "warning" && "bg-warning-light text-foreground",
        tone === "neutral" && "bg-muted text-foreground",
        tone === "destructive" && "bg-destructive-light text-foreground",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

/** Chip de filtro M3: seleccionado = tono accent + check. */
export function FilterChip({
  selected,
  onClick,
  count,
  onCard = false,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  count?: number;
  /** true cuando el chip va dentro de una superficie bg-card (sin chip "flotante"). */
  onCard?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={spawnRipple}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 overflow-hidden rounded-lg px-3 text-sm font-medium transition-colors",
        selected
          ? "bg-accent text-accent-foreground"
          : onCard
            ? "bg-muted text-foreground"
            : "bg-card text-foreground shadow-sm",
      )}
    >
      {selected && <Check className="h-4 w-4" />}
      {children}
      {count !== undefined && <span className="tabular-nums text-muted-foreground">{count}</span>}
    </button>
  );
}

/** Fila de chips con scroll horizontal que sangra hasta el borde de la pantalla. */
export function ChipRow({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 no-scrollbar">
      {children}
    </div>
  );
}

/** Barra de búsqueda M3 (píldora de 56 px). */
export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex h-14 items-center gap-3 rounded-full bg-card px-5 shadow-sm">
      <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar búsqueda"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </label>
  );
}

// ── Valores ─────────────────────────────────────────────────────────────────

/**
 * Código protagonista (FCC ID, código de llave, folio…) en 32 px, siempre en
 * una línea (se reduce con `scale` si no cabe) y copiable con un toque.
 */
export function CopyableValue({
  label,
  value,
  copiedMessage,
}: {
  label: string;
  value: string;
  /** Texto del aviso al copiar (por defecto "<label> copiado"). */
  copiedMessage?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;
    const measure = () => {
      const available = wrap.clientWidth;
      const natural = text.scrollWidth;
      setFitScale(available > 0 && natural > available ? available / natural : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [value]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      navigator.vibrate?.(10);
      toast.success(copiedMessage ?? `${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      onPointerDown={spawnRipple}
      aria-label={`Copiar ${label} ${value}`}
      className="relative -mx-2 flex w-[calc(100%+1rem)] items-end gap-2 overflow-hidden rounded-2xl px-2 py-1 text-left"
    >
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <div ref={wrapRef} className="overflow-hidden">
          <span
            ref={textRef}
            style={{ transform: `scale(${fitScale})`, transformOrigin: "left center" }}
            className="inline-block whitespace-nowrap text-[2rem] font-bold leading-tight tabular-nums text-foreground"
          >
            {value}
          </span>
        </div>
      </div>
      <Copy className="mb-2 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
    </button>
  );
}

// ── Carrusel de imágenes ────────────────────────────────────────────────────

export interface CarouselItem {
  id: string;
  label: string;
  image?: string | null;
}

/**
 * Carrusel horizontal (herramientas, equipos, fotos de referencia). Sangra
 * hasta el borde de la DetailSection (-mx-5). Las que tienen foto se amplían.
 */
export function ImageCarousel({
  items,
  fallbackIcon = <ImageIcon className="h-6 w-6" />,
  tileClassName = "w-[5.5rem]",
}: {
  items: CarouselItem[];
  fallbackIcon?: React.ReactNode;
  tileClassName?: string;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  const imageItems = items.filter((item) => !!item.image);
  const viewerImages = imageItems.map((item) => ({ url: item.image!, description: item.label }));
  const openViewerFor = (item: CarouselItem) => {
    const idx = imageItems.findIndex((i) => i.id === item.id);
    if (idx !== -1) setViewerIndex(idx);
  };

  return (
    <>
      <div className="-mx-5 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 no-scrollbar" role="list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            onClick={() => item.image && openViewerFor(item)}
            disabled={!item.image}
            aria-label={item.image ? `Ver ${item.label} ampliado` : item.label}
            className={cn("flex shrink-0 snap-start flex-col items-center gap-1.5 text-center outline-none disabled:cursor-default", tileClassName)}
          >
            <span
              onPointerDown={item.image ? spawnRipple : undefined}
              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[20px] bg-muted text-muted-foreground"
            >
              {item.image ? (
                <img src={resolveStorageUrl(item.image) ?? undefined} alt="" className="h-full w-full object-cover" />
              ) : (
                fallbackIcon
              )}
            </span>
            <span className="line-clamp-2 w-full text-xs font-medium leading-tight text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
      <ImageViewDialog
        open={viewerIndex !== null}
        onOpenChange={(open) => !open && setViewerIndex(null)}
        images={viewerImages}
        initialIndex={viewerIndex ?? 0}
      />
    </>
  );
}
