import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, Printer, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useQuoteDocSettings } from "@/hooks/useQuoteDocSettings";
import { useToast } from "@/hooks/use-toast";
import type { Quote } from "@/hooks/useQuotes";
import { QuotePreviewFrame } from "./QuotePreviewFrame";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
}

export function QuotePrintDialog({ open, onOpenChange, quote }: Props) {
  const { data: biz } = useBusinessSettings();
  const { settings } = useQuoteDocSettings();
  const { toast } = useToast();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open || !quote) return null;

  const pdfFileName = `cotizacion-${sanitizeFileName(quote.quote_number)}.pdf`;

  const createQuotePdf = async () => {
    if (!pageRef.current) throw new Error("Vista previa no lista");
    const { createQuotePdfBlob } = await import("./quotePdf");
    const blob = await createQuotePdfBlob(pageRef.current);
    return new File([blob], pdfFileName, { type: "application/pdf" });
  };

  const handleDownload = async () => {
    try {
      const file = await createQuotePdf();
      downloadFile(file);
    } catch (error) {
      toast({
        title: "No se pudo descargar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      const file = await createQuotePdf();
      const shareData = {
        title: "Cotización",
        text: `Cotización ${quote.quote_number}`,
        files: [file],
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      downloadFile(file);
      toast({
        title: "PDF descargado",
        description: "Este navegador no permite compartir archivos directamente.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({
        title: "No se pudo compartir",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = async () => {
    const page = pageRef.current;
    if (!page) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "8.5in";
    iframe.style.height = "11in";
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
            body * { visibility: visible !important; }
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

    await Promise.all(
      Array.from(printDoc.images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );

    const cleanup = () => {
      printWin.removeEventListener("afterprint", cleanup);
      window.setTimeout(() => iframe.remove(), 300);
    };

    printWin.addEventListener("afterprint", cleanup);

    if ("fonts" in printDoc) {
      await printDoc.fonts.ready.catch(() => undefined);
    }

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
    printWin.focus();
    printWin.print();
    window.setTimeout(cleanup, 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/40 p-1 sm:p-4 overflow-auto">
      <div className="mx-auto min-h-full max-w-[460px] sm:max-w-[560px] bg-background text-foreground rounded-sm shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 shrink-0">
          <h2 className="text-lg font-bold tracking-normal">Preview</h2>
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-4 pb-4 flex-1 min-h-0">
          <QuotePreviewFrame
            ref={pageRef}
            quote={quote}
            biz={biz ?? null}
            settings={settings}
            zoom={0.44}
            fillHeight
            className="min-h-[calc(100vh-10.5rem)]"
          />
        </div>

        <div className="grid grid-cols-3 px-4 pb-4 pt-1 shrink-0 gap-2 [&>button]:min-w-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-sm px-2 text-[11px] sm:text-sm gap-1.5"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">Descargar</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-sm px-2 text-[11px] sm:text-sm gap-1.5"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Compartir</span>
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="h-11 rounded-sm bg-primary text-primary-foreground px-2 text-[11px] sm:text-sm gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span className="truncate">Imprimir</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "cotizacion";
}
