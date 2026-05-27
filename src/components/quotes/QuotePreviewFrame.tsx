import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BusinessSettings } from "@/hooks/useBusinessSettings";
import type { QuoteDocSettings } from "@/hooks/useQuoteDocSettings";
import type { Quote } from "@/hooks/useQuotes";
import { cn } from "@/lib/utils";
import { MobileZoomStage } from "./MobileZoomStage";
import { QuoteDocumentPage } from "./QuoteDocumentPage";

interface QuotePreviewFrameProps {
  quote: Quote;
  biz: BusinessSettings | null;
  settings: QuoteDocSettings;
  zoom?: number;
  className?: string;
  fillHeight?: boolean;
}

export const QuotePreviewFrame = forwardRef<HTMLDivElement, QuotePreviewFrameProps>(
  ({ quote, biz, settings, zoom = 0.44, className, fillHeight = false }, ref) => {
    const isMobile = useIsMobile();
    const frameRef = useRef<HTMLDivElement>(null);
    const [fitZoom, setFitZoom] = useState<number | null>(null);
    const pageWidth = 8.5 * 96;
    const pageHeight = 11 * 96;

    useLayoutEffect(() => {
      if (isMobile || !fillHeight || !frameRef.current) {
        setFitZoom(null);
        return;
      }

      const padding = 24;

      const updateFit = () => {
        const rect = frameRef.current?.getBoundingClientRect();
        if (!rect) return;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const availableScreenHeight = Math.max(120, viewportHeight - rect.top - 16);
        const availableHeight = Math.min(rect.height, availableScreenHeight);
        const byWidth = Math.max(0.1, (rect.width - padding) / pageWidth);
        const byHeight = Math.max(0.1, (availableHeight - padding) / pageHeight);
        setFitZoom(Math.min(byWidth, byHeight));
      };

      updateFit();

      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", updateFit);
        return () => window.removeEventListener("resize", updateFit);
      }

      const observer = new ResizeObserver(updateFit);
      observer.observe(frameRef.current);
      return () => observer.disconnect();
    }, [fillHeight, isMobile, pageHeight, pageWidth]);

    const effectiveZoom = isMobile ? Math.min(zoom, 0.36) : fitZoom ?? zoom;
    const previewWidth = isMobile ? 300 : Math.ceil(8.5 * 96 * effectiveZoom);
    const previewHeight = Math.ceil(pageHeight * effectiveZoom);

    return (
      <div
        ref={frameRef}
        className={cn(
          "rounded-xl border border-border bg-[hsl(var(--surface-2))] p-3 overflow-hidden",
          fillHeight && "h-full flex items-center justify-center",
          className,
        )}
      >
        <MobileZoomStage
          enabled={isMobile}
          className={cn("w-full flex justify-center", fillHeight && "h-full items-center")}
          contentClassName="flex justify-center"
        >
          <div className="qd mx-auto origin-top" style={{ width: previewWidth, height: previewHeight }}>
            <QuoteDocumentPage
              ref={ref}
              quote={quote}
              biz={biz}
              settings={settings}
              zoom={effectiveZoom}
            />
          </div>
        </MobileZoomStage>
      </div>
    );
  },
);

QuotePreviewFrame.displayName = "QuotePreviewFrame";
