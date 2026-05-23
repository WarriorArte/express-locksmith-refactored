import { AnimatePresence, m as motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";

interface ImageViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: Array<{ url: string; description?: string }>;
  initialIndex?: number;
}

// Distancia en píxeles que el dedo debe recorrer para cambiar de foto (swipe)
const SWIPE_DISTANCE_THRESHOLD = 50;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
  center: { x: 0, opacity: 1, zIndex: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 1000 : -1000, opacity: 0, zIndex: 0 }),
};

export function ImageViewDialog({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}: ImageViewDialogProps) {
  const [[page, direction], setPage] = useState<[number, number]>([initialIndex, 0]);
  
  // Estados simplificados para la manipulación directa
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); 

  const imageIndex = Math.abs(page % images.length);

  const paginate = useCallback((newDirection: number) => {
    setPage(([p]) => [p + newDirection, newDirection]);
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setScale((s) => {
        if (s > 1) {
          setPan({ x: 0, y: 0 });
          return 1;
        }
        return 2.5;
      });
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    setPage([initialIndex, 0]);
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "ArrowLeft", "ArrowRight", "+", "=", "-"].includes(e.key)) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (e.key === "Escape") onOpenChange(false);
      else if (e.key === "ArrowLeft") paginate(-1);
      else if (e.key === "ArrowRight") paginate(1);
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(5, s + 0.5));
      else if (e.key === "-") setScale((s) => {
        const n = Math.max(1, s - 0.5);
        if (n === 1) setPan({ x: 0, y: 0 });
        return n;
      });
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, paginate, onOpenChange]);

  // --- MOTOR DE GESTOS UNIFICADO ---
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startCenterX: 0,
    startCenterY: 0,
    isDragging: false,
    isPinching: false,
    initialDist: 0,
    initialScale: 1,
    lastPan: { x: 0, y: 0 }
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); 
    
    if (e.touches.length === 1) {
      touchState.current = {
        ...touchState.current,
        isDragging: true,
        isPinching: false,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        lastPan: { ...pan }
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      touchState.current = {
        ...touchState.current,
        isDragging: false,
        isPinching: true,
        initialDist: dist,
        initialScale: scale,
        startCenterX: centerX,
        startCenterY: centerY,
        lastPan: { ...pan }
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation(); 
    
    if (e.touches.length === 1 && touchState.current.isDragging) {
      const deltaX = e.touches[0].clientX - touchState.current.startX;
      const deltaY = e.touches[0].clientY - touchState.current.startY;

      setPan({
        x: touchState.current.lastPan.x + deltaX,
        y: scale > 1 ? touchState.current.lastPan.y + deltaY : 0 // Bloquear eje Y si no hay zoom
      });
      
    } else if (e.touches.length === 2 && touchState.current.isPinching) {
      // 1. Manejar Zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const deltaScale = dist / touchState.current.initialDist;
      setScale(Math.min(Math.max(1, touchState.current.initialScale * deltaScale), 5));

      // 2. Manejar Paneo Simultáneo (Mover con dos dedos)
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaX = centerX - touchState.current.startCenterX;
      const deltaY = centerY - touchState.current.startCenterY;

      setPan({
        x: touchState.current.lastPan.x + deltaX,
        y: touchState.current.lastPan.y + deltaY
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); 
    
    // Si soltamos todos los dedos y estábamos arrastrando
    if (touchState.current.isDragging && e.touches.length === 0) {
      touchState.current.isDragging = false;
      
      if (scale <= 1) {
        // Lógica de Swipe para cambiar foto
        if (pan.x > SWIPE_DISTANCE_THRESHOLD && images.length > 1) {
          paginate(-1);
        } else if (pan.x < -SWIPE_DISTANCE_THRESHOLD && images.length > 1) {
          paginate(1);
        } else {
          setPan({ x: 0, y: 0 }); // No alcanzó el umbral, vuelve al centro
        }
      }
    }
    
    // Si estábamos pellizcando y soltamos al menos un dedo
    if (touchState.current.isPinching && e.touches.length < 2) {
      touchState.current.isPinching = false;
      
      if (scale < 1.05) {
        setScale(1);
        setPan({ x: 0, y: 0 });
      } else if (e.touches.length === 1) {
        // Transición fluida: si dejas un dedo puesto, sigues moviendo la imagen
        touchState.current = {
          ...touchState.current,
          isDragging: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          lastPan: { ...pan }
        };
      }
    }
  };
  // -----------------------------------

  if (!open || images.length === 0) return null;
  const currentImage = images[imageIndex];
  if (!currentImage) return null;

  const lightbox = (
    <div
      className="fixed inset-0 z-[200] bg-black/95 overflow-hidden select-none"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0 flex items-center justify-center touch-none pointer-events-none"
          >
            <motion.img
              src={resolveStorageUrl(currentImage.url) ?? undefined}
              alt={currentImage.description || "Imagen"}
              draggable={false}
              className="max-w-full max-h-full object-contain px-4 select-none touch-none pointer-events-auto"
              style={{ WebkitTouchCallout: "none" }} // Prevenir menú de iOS al mantener presionado
              
              animate={{
                scale: scale,
                x: pan.x,
                y: pan.y,
              }}
              // Física muy ajustada: Responde instantáneamente al dedo, pero suaviza la detención
              transition={{ type: "spring", stiffness: 600, damping: 50, mass: 0.5 }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cerrar — siempre visible */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
        className="absolute right-3 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur z-10"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Chrome superior: contador + zoom */}
      <div
        className="absolute top-0 left-0 right-16 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <span className="text-white/90 text-sm font-medium px-2">
          {images.length > 1 ? `${imageIndex + 1} / ${images.length}` : ""}
        </span>
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            aria-label="Alejar"
            onClick={(e) => {
              e.stopPropagation();
              setScale((s) => {
                const n = Math.max(1, s - 0.5);
                if (n === 1) setPan({ x: 0, y: 0 });
                return n;
              });
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Acercar"
            onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(5, s + 0.5)); }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav lateral — solo desktop */}
      {images.length > 1 && (
        <div className="absolute inset-y-0 w-full flex items-center justify-between px-4 pointer-events-none">
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => { e.stopPropagation(); paginate(-1); }}
            className="hidden sm:flex p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all pointer-events-auto"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={(e) => { e.stopPropagation(); paginate(1); }}
            className="hidden sm:flex p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all pointer-events-auto"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Chrome inferior: dots + caption */}
      {(images.length > 1 || currentImage.description) && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          {images.length > 1 && (
            <div className="flex justify-center gap-2 pt-5 pb-2 pointer-events-auto">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Imagen ${i + 1}`}
                  onClick={(e) => { e.stopPropagation(); paginate(i - imageIndex); }}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    i === imageIndex ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          )}
          {currentImage.description && (
            <p className="px-6 pt-1 text-white/90 text-center text-sm leading-snug pointer-events-auto">
              {currentImage.description}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return lightbox;
}