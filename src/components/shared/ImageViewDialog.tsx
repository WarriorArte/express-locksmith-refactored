/**
 * ImageViewDialog — Fullscreen lightbox image viewer.
 *
 * Used everywhere in the app to preview images (products, services, etc).
 * Renders as a fullscreen overlay (NOT a modal Dialog) so it uses the entire
 * viewport on mobile, with pinch/double-tap zoom and pan.
 *
 * Public API kept compatible with previous version: { open, onOpenChange, images, initialIndex }.
 */
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";

interface ImageViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: Array<{ url: string; description?: string }>;
  initialIndex?: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function ImageViewDialog({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}: ImageViewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [chromeVisible, setChromeVisible] = useState(true);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const pinchStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsetRef = useRef({ x: 0, y: 0 });
  const panLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const gestureMovedRef = useRef(false);
  const didPinchRef = useRef(false);

  const clampScale = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));

  const resetView = useCallback(() => {
    pointersRef.current.clear();
    pinchStartDistanceRef.current = null;
    pinchStartScaleRef.current = 1;
    pinchStartCenterRef.current = null;
    panStartOffsetRef.current = { x: 0, y: 0 };
    panLastPointRef.current = null;
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Sync index + reset view when opened
  useEffect(() => {
    if (!open) return;
    setCurrentIndex(initialIndex);
    setChromeVisible(true);
    resetView();
  }, [open, initialIndex, resetView]);

  useEffect(() => {
    resetView();
  }, [currentIndex, resetView]);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === "+" || e.key === "=") setScale((s) => clampScale(s + 0.5));
      else if (e.key === "-") setScale((s) => clampScale(s - 0.5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((p) => (p === images.length - 1 ? 0 : p + 1));
  }, [images.length]);

  const currentImage = images[currentIndex];

  const getDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);
  const getCenter = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only track touch / pen / mouse-primary for gestures
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gestureMovedRef.current = false;

    if (pointersRef.current.size === 1) {
      panLastPointRef.current = { x: e.clientX, y: e.clientY };
      panStartOffsetRef.current = offset;
      swipeStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      didPinchRef.current = false;

      // Double-tap to zoom
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        if (scale > 1) {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        } else {
          setScale(2.5);
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchStartDistanceRef.current = getDistance(pts[0], pts[1]);
      pinchStartScaleRef.current = scale;
      pinchStartCenterRef.current = getCenter(pts[0], pts[1]);
      panStartOffsetRef.current = offset;
      swipeStartRef.current = null;
      didPinchRef.current = true;
    }
    // NOTE: intentionally do NOT call setPointerCapture — it breaks multi-touch
    // pinch on some mobile browsers (the second touch never reaches the element).
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gestureMovedRef.current = true;

    if (pointersRef.current.size >= 2) {
      didPinchRef.current = true;
      const pts = Array.from(pointersRef.current.values());
      const dist = getDistance(pts[0], pts[1]);
      const center = getCenter(pts[0], pts[1]);
      if (pinchStartDistanceRef.current == null) {
        pinchStartDistanceRef.current = dist;
        pinchStartScaleRef.current = scale;
        pinchStartCenterRef.current = center;
        return;
      }
      setScale(clampScale((dist / pinchStartDistanceRef.current) * pinchStartScaleRef.current));
      if (pinchStartCenterRef.current) {
        setOffset({
          x: panStartOffsetRef.current.x + (center.x - pinchStartCenterRef.current.x),
          y: panStartOffsetRef.current.y + (center.y - pinchStartCenterRef.current.y),
        });
      }
      return;
    }

    if (pointersRef.current.size === 1 && scale > 1 && panLastPointRef.current) {
      const dx = e.clientX - panLastPointRef.current.x;
      const dy = e.clientY - panLastPointRef.current.y;
      panLastPointRef.current = { x: e.clientX, y: e.clientY };
      setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);

    // Swipe nav (only when not zoomed and single touch finished)
    if (
      scale === 1 &&
      pointersRef.current.size === 0 &&
      !didPinchRef.current &&
      swipeStartRef.current &&
      images.length > 1
    ) {
      const dx = e.clientX - swipeStartRef.current.x;
      const dy = e.clientY - swipeStartRef.current.y;
      const dt = Date.now() - swipeStartRef.current.t;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
        if (dx < 0) handleNext();
        else handlePrev();
      }
    }

    // Tap (no movement, no pinch) toggles chrome
    if (
      pointersRef.current.size === 0 &&
      !gestureMovedRef.current &&
      !didPinchRef.current &&
      Date.now() - (swipeStartRef.current?.t ?? 0) < 300
    ) {
      setChromeVisible((v) => !v);
    }

    swipeStartRef.current = null;

    if (pointersRef.current.size < 2) {
      pinchStartDistanceRef.current = null;
      pinchStartCenterRef.current = null;
    }
    if (pointersRef.current.size === 1) {
      const [pt] = Array.from(pointersRef.current.values());
      panLastPointRef.current = pt;
      panStartOffsetRef.current = offset;
    }
    if (pointersRef.current.size === 0) {
      panLastPointRef.current = null;
      didPinchRef.current = false;
      gestureMovedRef.current = false;
      if (scale <= 1) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return;
    e.preventDefault();
    setScale((s) => clampScale(s - e.deltaY * 0.005));
  };

  if (!open || !currentImage) return null;

  const lightbox = (
    <div
      className="fixed inset-0 z-[200] bg-black overflow-hidden touch-none select-none"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={currentImage.description || "Vista de imagen"}
    >
      {/* Image surface — owns all gestures and chrome toggling */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <img
          src={resolveStorageUrl(currentImage.url) ?? undefined}
          alt={currentImage.description || "Imagen"}
          draggable={false}
          className="max-w-full max-h-full object-contain will-change-transform pointer-events-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition:
              pointersRef.current.size > 0 ? "none" : "transform 180ms ease-out",
          }}
        />
      </div>

      {/* Always-on close button (escape hatch even if chrome is hidden) */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
        className="absolute right-3 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur z-10"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Top chrome (counter + zoom buttons) */}
      <div
        className={cn(
          "absolute top-0 left-0 right-16 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-200",
          chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <div className="text-white/90 text-sm font-medium px-2">
          {images.length > 1 ? `${currentIndex + 1} / ${images.length}` : ""}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => setScale((s) => clampScale(s - 0.5))}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => setScale((s) => clampScale(s + 0.5))}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Side nav (desktop / tablet) */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className={cn(
              "hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center backdrop-blur transition-opacity",
              chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className={cn(
              "hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center backdrop-blur transition-opacity",
              chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Bottom caption */}
      {currentImage.description && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 px-4 pt-6 pb-3 bg-gradient-to-t from-black/70 to-transparent text-white text-center text-sm transition-opacity duration-200",
            chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {currentImage.description}
        </div>
      )}
    </div>
  );

  return createPortal(lightbox, document.body);
}
