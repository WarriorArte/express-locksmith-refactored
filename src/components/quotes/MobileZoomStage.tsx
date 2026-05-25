import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { cn } from "@/lib/utils";

type Pan = { x: number; y: number };

interface MobileZoomStageProps {
  enabled: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function MobileZoomStage({ enabled, className, contentClassName, children }: MobileZoomStageProps) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const panRef = useRef<Pan>({ x: 0, y: 0 });
  const touchState = useRef({
    isDragging: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    startCenterX: 0,
    startCenterY: 0,
    initialDist: 0,
    initialScale: 1,
    lastPan: { x: 0, y: 0 },
  });

  useEffect(() => {
    scaleRef.current = scale;
    panRef.current = pan;
  }, [scale, pan]);

  useEffect(() => {
    if (!enabled) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [enabled]);

  const clampPan = useCallback((x: number, y: number, s: number) => {
    if (!enabled || s <= 1 || !contentRef.current) return { x: 0, y: 0 };
    const rect = contentRef.current.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * s - window.innerWidth) / 2 + 48);
    const maxY = Math.max(0, (rect.height * s - window.innerHeight) / 2 + 80);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [enabled]);

  const reset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    setScale((current) => {
      if (current > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2.4;
    });
  }, [enabled]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return;
    e.stopPropagation();

    if (e.touches.length === 1) {
      touchState.current = {
        ...touchState.current,
        isDragging: true,
        isPinching: false,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        lastPan: { ...panRef.current },
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      touchState.current = {
        ...touchState.current,
        isDragging: false,
        isPinching: true,
        initialDist: dist,
        initialScale: scaleRef.current,
        startCenterX: centerX,
        startCenterY: centerY,
        lastPan: { ...panRef.current },
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length === 1 && touchState.current.isDragging) {
      const deltaX = e.touches[0].clientX - touchState.current.startX;
      const deltaY = e.touches[0].clientY - touchState.current.startY;
      setPan(clampPan(
        touchState.current.lastPan.x + deltaX,
        touchState.current.lastPan.y + deltaY,
        scaleRef.current,
      ));
    } else if (e.touches.length === 2 && touchState.current.isPinching) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const newScale = Math.min(Math.max(1, touchState.current.initialScale * (dist / touchState.current.initialDist)), 5);
      scaleRef.current = newScale;
      setScale(newScale);

      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setPan(clampPan(
        touchState.current.lastPan.x + centerX - touchState.current.startCenterX,
        touchState.current.lastPan.y + centerY - touchState.current.startCenterY,
        newScale,
      ));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!enabled) return;
    e.stopPropagation();

    if (e.touches.length === 0) {
      touchState.current.isDragging = false;
      touchState.current.isPinching = false;
      if (scaleRef.current < 1.05) reset();
      return;
    }

    if (touchState.current.isPinching && e.touches.length === 1) {
      touchState.current = {
        ...touchState.current,
        isDragging: true,
        isPinching: false,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        lastPan: { ...panRef.current },
      };
    }
  };

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={enabled ? { touchAction: "none" } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        ref={contentRef}
        className={cn("origin-center will-change-transform", contentClassName)}
        style={enabled ? {
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          transition: touchState.current.isDragging || touchState.current.isPinching ? "none" : "transform 160ms ease-out",
        } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
