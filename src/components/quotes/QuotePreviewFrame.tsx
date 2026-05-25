import { forwardRef } from "react";
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
    const effectiveZoom = isMobile ? Math.min(zoom, 0.36) : zoom;
    const previewWidth = isMobile ? 300 : 360;

    return (
      <div
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
          <div className="qd mx-auto origin-top" style={{ width: previewWidth }}>
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
