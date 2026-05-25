import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useQuoteDocSettings, autoAccentInk, darken } from "@/hooks/useQuoteDocSettings";
import type { Quote } from "@/hooks/useQuotes";
import { LayoutBold, LayoutBanner, LayoutClassic, buildLayoutData } from "./QuoteLayouts";
import "@/styles/quote-doc.css";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
}

// 8.5in × 11in at 96dpi
const PAGE_W = 816;
const PAGE_H = 1056;

export function QuotePrintDialog({ open, onOpenChange, quote }: Props) {
  const { data: biz } = useBusinessSettings();
  const { settings } = useQuoteDocSettings();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const data = useMemo(
    () => (quote ? buildLayoutData(quote, biz ?? null, settings) : null),
    [quote, biz, settings],
  );

  const pageStyle = useMemo(() => ({
    "--ink": settings.ink,
    "--ink-2": darken(settings.ink, 0.35),
    "--accent": settings.accent,
    "--accent-ink": autoAccentInk(settings.accent),
    "--paper": settings.paper,
  } as React.CSSProperties), [settings.ink, settings.accent, settings.paper]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = stageRef.current;
      if (!el) return;
      const avail = el.clientWidth - 24; // padding budget
      const s = Math.min(1, avail / PAGE_W);
      setScale(s > 0 ? s : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  if (!open || !quote || !data) return null;

  const Layout =
    settings.layout === "banner" ? LayoutBanner :
    settings.layout === "classic" ? LayoutClassic :
    LayoutBold;

  const handlePrint = () => {
    document.body.classList.add("printing-quote");
    const cleanup = () => {
      document.body.classList.remove("printing-quote");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 50);
  };

  return createPortal(
    <div
      id="quote-print-area"
      className="fixed inset-0 z-[100] bg-[#2a2722] overflow-auto flex flex-col"
    >
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 px-4 py-3 bg-[#1c1a17] border-b border-white/10 flex items-center justify-between">
        <div className="text-[#e8e4dc] font-semibold text-sm truncate pr-2">
          Cotización · {quote.quote_number}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handlePrint}
            className="bg-[#f4c430] text-[#1a1f2e] hover:brightness-110 font-bold"
            size="sm"
          >
            <Printer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            size="icon"
            className="text-[#e8e4dc] hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div ref={stageRef} className="qd flex justify-center p-3 sm:p-9">
        <div
          className="qd-scale"
          style={{
            width: PAGE_W * scale,
            height: PAGE_H * scale,
          }}
        >
          <div
            className="page"
            style={{
              ...pageStyle,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {settings.bgUrl && (
              <div
                className="bg-image"
                style={{
                  backgroundImage: `url(${settings.bgUrl})`,
                  opacity: settings.bgOpacity,
                  mixBlendMode: settings.bgBlend as React.CSSProperties["mixBlendMode"],
                }}
              />
            )}
            <div className="page-inner">
              <Layout {...data} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
