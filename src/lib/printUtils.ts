/**
 * Detect if running on a mobile device
 */
function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}

/**
 * Direct print utility - triggers print dialog immediately
 * Uses iframe on mobile (window.open is unreliable) and window.open on desktop
 */
export function printDirect({
  html,
  css,
  title,
  paperWidthMM,
  isTicket = true,
}: {
  html: string;
  css: string;
  title: string;
  paperWidthMM: number;
  isTicket?: boolean;
}) {
  const bodyStyle = isTicket
    ? `font-family: 'Courier New', monospace; padding: 5mm; color: #000; font-size: 12px; width: ${paperWidthMM}mm;`
    : `font-family: Arial, sans-serif; padding: 20mm; color: #333; line-height: 1.5;`;

  const pageSize = isTicket
    ? `size: ${paperWidthMM}mm auto; margin: 0;`
    : `size: letter; margin: 15mm;`;

  const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { ${bodyStyle} }
      @page { ${pageSize} }
      @media print { body { padding: 0; } }
      ${css}
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>`;

  if (isMobile()) {
    printViaMobileWindow(fullHtml, title);
  } else {
    printViaDesktopWindow(fullHtml, isTicket);
  }
}

/**
 * Mobile: open a new page, write content, let user trigger print manually
 * or auto-trigger after load. We avoid window.close() on mobile since the
 * print dialog needs time.
 */
function printViaMobileWindow(fullHtml: string, title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback: try without features (some mobile browsers block sized windows)
    const fallback = window.open("");
    if (!fallback) {
      // Last resort: use a blob URL
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }
    writeToPrintWindow(fallback, fullHtml);
    return;
  }
  writeToPrintWindow(printWindow, fullHtml);
}

function writeToPrintWindow(win: Window, fullHtml: string) {
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  // On mobile, use onload + longer delay to ensure content is rendered
  if (win.document.readyState === "complete") {
    setTimeout(() => { try { win.print(); } catch(e) { /* user can print manually */ } }, 500);
  } else {
    win.onload = () => {
      setTimeout(() => { try { win.print(); } catch(e) { /* user can print manually */ } }, 500);
    };
  }
  // Do NOT auto-close on mobile - let user close after printing
}

/**
 * Desktop: original approach with window.open + auto-close
 */
function printViaDesktopWindow(fullHtml: string, isTicket: boolean) {
  const windowFeatures = isTicket ? "width=400,height=600" : "width=800,height=600";
  const printWindow = window.open("", "_blank", windowFeatures);
  if (!printWindow) return;

  printWindow.document.write(fullHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/**
 * Apply paper size to CSS variables
 */
export function applyPaperSizeToCSS(css: string, paperWidthMM: number) {
  return css
    .replace(/--paper-width:\s*\d+mm/g, `--paper-width: ${paperWidthMM}mm`)
    .replace(/width:\s*\d+mm/g, `width: ${paperWidthMM}mm`);
}

/**
 * Get paper width in mm from printer model setting
 */
export function getPaperWidthMM(printerModel: string | null | undefined): number {
  if (printerModel === "58mm") return 58;
  if (printerModel === "110mm") return 110;
  return 80;
}
