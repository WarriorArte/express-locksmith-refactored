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

export function QuotePrintDialog({ open, onOpenChange, quote }: Props) {
  const { data: biz } = useBusinessSettings();
  const { settings } = useQuoteDocSettings();
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

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
      const z = Math.min(1, avail / PAGE_W);
      setZoom(z > 0 ? z : 1);
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

  const handlePrint = async () => {
    const page = pageRef.current;
    if (!page) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const printDoc = iframe.contentDocument;
    const printWin = iframe.contentWindow;
    if (!printDoc || !printWin) {
      iframe.remove();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("\n");

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.href}" />
          ${styles}
          <style>
            @page { size: letter; margin: 0; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: visible !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #quote-print-area {
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #fff !important;
            }
            #quote-print-area .page {
              width: 8.5in !important;
              min-height: 11in !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: hidden !important;
              zoom: 1 !important;
              transform: none !important;
            }
          </style>
        </head>
        <body>
          <div id="quote-print-area" class="qd">${page.outerHTML}</div>
        </body>
      </html>`;

    printDoc.open();
    printDoc.write(html);
    printDoc.close();

    const waitForImages = async () => {
      const images = Array.from(printDoc.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        }),
      );
    };

    const cleanup = () => {
      printWin.removeEventListener("afterprint", cleanup);
      window.setTimeout(() => iframe.remove(), 300);
    };

    printWin.addEventListener("afterprint", cleanup);

    await waitForImages();
    if ("fonts" in printDoc) {
      await printDoc.fonts.ready.catch(() => undefined);
    }

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
    printWin.focus();
    printWin.print();
    window.setTimeout(cleanup, 1500);
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
          ref={pageRef}
          className="page qd-page-screen"
          style={{
            ...pageStyle,
            // CSS `zoom` scales both layout box and content — keeps scrolling sane
            // and is automatically ignored in @media print where we reset it.
            zoom: zoom,
          } as React.CSSProperties}
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
    </div>,
    document.body,
  );
}
