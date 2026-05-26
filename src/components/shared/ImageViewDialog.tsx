import { m as motion } from "framer-motion";
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

// Distancia en píxeles que el dedo debe recorrer para cambiar de foto (swipe)
const SWIPE_DISTANCE_THRESHOLD = 50;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
  center: { x: 0, opacity: 1, zIndex: 1 },
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

  const imageIndex = ((page % images.length) + images.length) % images.length;

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
    const prevPointerEvents = document.body.style.pointerEvents;
    document.body.style.overflow = "hidden";
    document.body.style.pointerEvents = "auto";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.pointerEvents = prevPointerEvents;
    };
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

  const imageRef = useRef<HTMLImageElement>(null);
  const scaleRef = useRef(1);

  // Mantener scaleRef sincronizado con el estado scale para que los gestos funcionen
  // correctamente después de usar el doble toque o los botones de zoom.
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const clampPan = useCallback((x: number, y: number, s: number) => {
    if (!imageRef.current || s <= 1) return { x: 0, y: 0 };
    const maxX = Math.max(0, (imageRef.current.offsetWidth * s - window.innerWidth) / 2);
    const maxY = Math.max(0, (imageRef.current.offsetHeight * s - window.innerHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

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

      if (scaleRef.current > 1) {
        setPan(clampPan(
          touchState.current.lastPan.x + deltaX,
          touchState.current.lastPan.y + deltaY,
          scaleRef.current,
        ));
      } else {
        // Permitir movimiento horizontal durante el deslizamiento cuando no hay zoom
        let x = touchState.current.lastPan.x + deltaX;
        
        // Efecto de resistencia elástica si solo hay una imagen disponible
        if (images.length === 1) {
          x = x * 0.25;
        }
        
        setPan({ x, y: 0 });
      }
      
    } else if (e.touches.length === 2 && touchState.current.isPinching) {
      // 1. Manejar Zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const deltaScale = dist / touchState.current.initialDist;
      const newScale = Math.min(Math.max(1, touchState.current.initialScale * deltaScale), 5);
      scaleRef.current = newScale;
      setScale(newScale);

      // 2. Manejar Paneo Simultáneo
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaX = centerX - touchState.current.startCenterX;
      const deltaY = centerY - touchState.current.startCenterY;

      setPan(clampPan(
        touchState.current.lastPan.x + deltaX,
        touchState.current.lastPan.y + deltaY,
        newScale,
      ));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); 
    
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

  // --- CONTROL DE ARRASTRE CON MOUSE (DESKTOP) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return; // Solo permitir arrastrar si hay zoom
    if (e.button !== 0) return; // Solo clic izquierdo
    e.preventDefault(); // Evitar el drag por defecto del navegador para imágenes
    e.stopPropagation();
    
    touchState.current = {
      ...touchState.current,
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastPan: { ...pan }
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchState.current.isDragging || scale <= 1) return;
    e.stopPropagation();
    
    const deltaX = e.clientX - touchState.current.startX;
    const deltaY = e.clientY - touchState.current.startY;

    setPan(clampPan(
      touchState.current.lastPan.x + deltaX,
      touchState.current.lastPan.y + deltaY,
      scale,
    ));
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent) => {
    if (touchState.current.isDragging) {
      e.stopPropagation();
      touchState.current.isDragging = false;
    }
  };
  // -----------------------------------

  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const currentImage = images.length > 0 ? images[imageIndex] : null;

  if (!open || images.length === 0 || !currentImage) return null;

  return createPortal(
    <motion.div
      ref={lightboxRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-[200] bg-black/90 overflow-hidden select-none pointer-events-auto"
      style={{
        touchAction: "none",
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >

          {/* Contenedor principal de la imagen (perfectamente centrado) */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none z-10"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            <motion.div
                key={page}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute inset-0 flex items-center justify-center touch-none pointer-events-none"
              >
                <motion.img
                  ref={imageRef}
                  src={resolveStorageUrl(currentImage.url) ?? undefined}
                  alt={currentImage.description || "Imagen"}
                  draggable={false}
                  className="max-w-full max-h-[75vh] sm:max-h-[82vh] object-contain px-6 select-none touch-none pointer-events-auto shadow-2xl rounded-sm"
                  style={{ WebkitTouchCallout: "none" }} // Prevenir menú de iOS al mantener presionado
                  animate={{
                    scale: scale,
                    x: pan.x,
                    y: pan.y,
                  }}
                  transition={{ type: "spring", stiffness: 600, damping: 50, mass: 0.5 }}
                />
            </motion.div>
          </div>

          {/* Barra superior de controles (simétrica y con safe area, sin gradientes) */}
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-between p-4 pointer-events-none z-[300]"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
          >
            <div className="pointer-events-auto">
              {images.length > 1 && (
                <span className="text-white/90 text-xs font-semibold tracking-wider px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-sm">
                  {imageIndex + 1} / {images.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Botones de zoom: solo desktop */}
              <div className="hidden sm:flex items-center gap-2 mr-1">
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
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Acercar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScale((s) => Math.min(5, s + 0.5));
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              {/* Botón de cerrar */}
              <button
                type="button"
                aria-label="Cerrar"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 active:bg-red-500/35 text-white/80 hover:text-red-200 flex items-center justify-center backdrop-blur-md border border-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navegación lateral — solo desktop */}
          {images.length > 1 && (
            <div className="absolute inset-y-0 w-full flex items-center justify-between px-6 pointer-events-none z-[250]">
              <button
                type="button"
                aria-label="Anterior"
                onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                className="hidden sm:flex w-12 h-12 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 active:scale-95 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all pointer-events-auto shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={(e) => { e.stopPropagation(); paginate(1); }}
                className="hidden sm:flex w-12 h-12 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 active:scale-95 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all pointer-events-auto shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Barra inferior: descripción e indicadores (sin gradientes) */}
          {(images.length > 1 || currentImage.description) && (
            <div
              className="absolute bottom-0 inset-x-0 pointer-events-none z-[300] flex flex-col items-center justify-end"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)", paddingTop: "1.5rem" }}
            >
              {images.length > 1 && (
                <div className="flex justify-center gap-1.5 pb-3.5 pointer-events-auto">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Imagen ${i + 1}`}
                      onClick={(e) => { e.stopPropagation(); paginate(i - imageIndex); }}
                      className={cn(
                        "rounded-full transition-all duration-300 ease-out",
                        i === imageIndex ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/35 hover:bg-white/60",
                      )}
                    />
                  ))}
                </div>
              )}
              {currentImage.description && (
                <div className="px-6 max-w-2xl text-center pointer-events-auto">
                  <p className="text-white/95 text-sm md:text-base font-normal leading-relaxed tracking-wide drop-shadow-sm select-text">
                    {currentImage.description}
                  </p>
                </div>
              )}
            </div>
          )}
    </motion.div>,
    document.body
  );
}
