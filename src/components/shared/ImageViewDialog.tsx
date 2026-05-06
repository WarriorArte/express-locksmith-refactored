import { Dialog, DialogContent } from "@/components/ui/responsive-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

interface ImageViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: Array<{ url: string; description?: string }>;
  initialIndex?: number;
}

export function ImageViewDialog({ 
  open, 
  onOpenChange, 
  images,
  initialIndex = 0
}: ImageViewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const pinchStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsetRef = useRef({ x: 0, y: 0 });
  const panLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const clampScale = (value: number) => Math.max(1, Math.min(4, value));

  const resetView = () => {
    pointersRef.current.clear();
    pinchStartDistanceRef.current = null;
    pinchStartScaleRef.current = 1;
    pinchStartCenterRef.current = null;
    panStartOffsetRef.current = { x: 0, y: 0 };
    panLastPointRef.current = null;
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(initialIndex);
    resetView();
  }, [open, initialIndex]);

  useEffect(() => {
    resetView();
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentIndex];

  const getDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const onPointerDownImage = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      panLastPointRef.current = { x: e.clientX, y: e.clientY };
      panStartOffsetRef.current = offset;
    }
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      pinchStartDistanceRef.current = getDistance(points[0], points[1]);
      pinchStartScaleRef.current = scale;
      pinchStartCenterRef.current = getCenter(points[0], points[1]);
      panStartOffsetRef.current = offset;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMoveImage = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    e.stopPropagation();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values());
      const distance = getDistance(points[0], points[1]);
      const center = getCenter(points[0], points[1]);
      if (pinchStartDistanceRef.current == null) {
        pinchStartDistanceRef.current = distance;
        pinchStartScaleRef.current = scale;
        pinchStartCenterRef.current = center;
        return;
      }
      const nextScale = clampScale((distance / pinchStartDistanceRef.current) * pinchStartScaleRef.current);
      setScale(nextScale);
      if (pinchStartCenterRef.current) {
        setOffset({
          x: panStartOffsetRef.current.x + (center.x - pinchStartCenterRef.current.x),
          y: panStartOffsetRef.current.y + (center.y - pinchStartCenterRef.current.y),
        });
      }
      return;
    }

    if (pointersRef.current.size === 1 && scale > 1 && panLastPointRef.current) {
      const deltaX = e.clientX - panLastPointRef.current.x;
      const deltaY = e.clientY - panLastPointRef.current.y;
      panLastPointRef.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    }
  };

  const onPointerUpImage = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartDistanceRef.current = null;
      pinchStartCenterRef.current = null;
    }
    if (pointersRef.current.size === 1) {
      const [point] = Array.from(pointersRef.current.values());
      panLastPointRef.current = point;
      panStartOffsetRef.current = offset;
    }
    if (pointersRef.current.size === 0) {
      panLastPointRef.current = null;
      if (scale <= 1) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
  };

  const onDoubleClickImage = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    setScale(2);
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableSwipeToClose className="max-w-4xl p-0 bg-white border border-border">
        <div className="relative flex items-center justify-center min-h-[60vh] bg-white">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Navigation - Previous */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 z-10 text-foreground hover:bg-muted"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {/* Image */}
          <div
            className="max-w-full max-h-[80vh] overflow-hidden touch-none select-none"
            onPointerDown={onPointerDownImage}
            onPointerMove={onPointerMoveImage}
            onPointerUp={onPointerUpImage}
            onPointerCancel={onPointerUpImage}
            onDoubleClick={onDoubleClickImage}
          >
            <img
              src={currentImage.url}
              alt={currentImage.description || "Imagen"}
              className="max-w-full max-h-[80vh] object-contain"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: pointersRef.current.size > 0 ? "none" : "transform 160ms ease-out",
              }}
            />
          </div>

          {/* Navigation - Next */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 z-10 text-foreground hover:bg-muted"
              onClick={handleNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}

          {/* Image info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/95 to-white/0">
            {currentImage.description && (
              <p className="text-foreground text-center mb-2">{currentImage.description}</p>
            )}
            {images.length > 1 && (
              <p className="text-muted-foreground text-center text-sm">
                {currentIndex + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
