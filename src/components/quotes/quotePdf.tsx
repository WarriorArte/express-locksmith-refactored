import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getPhpAuthToken, resolveUploadFileUrl } from "@/lib/phpApi";

const LETTER_WIDTH_MM = 215.9;
const LETTER_HEIGHT_MM = 279.4;

interface TextRun {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontName: "courier" | "helvetica";
  fontStyle: "normal" | "bold" | "italic" | "bolditalic";
}

export async function createQuotePdfBlob(page: HTMLElement): Promise<Blob> {
  const { container, clone } = createPrintableClone(page);

  try {
    document.body.appendChild(container);
    await inlineImages(clone);
    if ("fonts" in document) {
      await document.fonts.ready.catch(() => undefined);
    }

    const rect = clone.getBoundingClientRect();
    const textLayer = collectTextLayer(clone, rect, LETTER_WIDTH_MM, LETTER_HEIGHT_MM);
    const imgData = await toPng(clone, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      skipFonts: true,
      style: {
        margin: "0",
        boxShadow: "none",
        borderRadius: "0",
        zoom: "1",
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
      compress: true,
    });

    pdf.addImage(imgData, "PNG", 0, 0, LETTER_WIDTH_MM, LETTER_HEIGHT_MM);
    addSelectableTextLayer(pdf, textLayer);

    return pdf.output("blob");
  } finally {
    container.remove();
  }
}

function createPrintableClone(page: HTMLElement) {
  const container = document.createElement("div");
  container.className = "qd";
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "8.5in";
  container.style.height = "11in";
  container.style.overflow = "hidden";
  container.style.background = "#ffffff";
  container.style.pointerEvents = "none";

  const clone = page.cloneNode(true) as HTMLElement;
  clone.style.setProperty("zoom", "1");
  clone.style.width = "8.5in";
  clone.style.height = "11in";
  clone.style.minHeight = "11in";
  clone.style.margin = "0";
  clone.style.boxShadow = "none";
  clone.style.borderRadius = "0";
  clone.style.overflow = "hidden";

  container.appendChild(clone);
  return { container, clone };
}

function collectTextLayer(root: HTMLElement, rootRect: DOMRect, pageW: number, pageH: number): TextRun[] {
  const scaleX = pageW / rootRect.width;
  const scaleY = pageH / rootRect.height;
  const runs: TextRun[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest("svg")) return NodeFilter.FILTER_REJECT;
      const style = window.getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    const text = normalizePdfText(current.textContent || "");
    const parent = current.parentElement;
    if (text && parent) {
      const style = window.getComputedStyle(parent);
      const range = document.createRange();
      range.selectNodeContents(current);
      const firstRect = Array.from(range.getClientRects()).find(
        (item) => item.width > 0 && item.height > 0,
      );
      range.detach();

      if (firstRect) {
        const cssFontSize = Number.parseFloat(style.fontSize) || 10;
        const fontSizeMm = cssFontSize * scaleY;
        const fontSizePt = Math.max(4, fontSizeMm * 72 / 25.4);
        const fontWeight = Number.parseInt(style.fontWeight, 10);
        const isBold = Number.isFinite(fontWeight) ? fontWeight >= 600 : /bold/i.test(style.fontWeight);
        const isItalic = /italic|oblique/i.test(style.fontStyle);

        runs.push({
          text,
          x: (firstRect.left - rootRect.left) * scaleX,
          y: (firstRect.top - rootRect.top + firstRect.height * 0.78) * scaleY,
          fontSize: fontSizePt,
          fontName: style.fontFamily.toLowerCase().includes("mono") ? "courier" : "helvetica",
          fontStyle: isBold && isItalic ? "bolditalic" : isBold ? "bold" : isItalic ? "italic" : "normal",
        });
      }
    }
    current = walker.nextNode();
  }

  return runs;
}

function addSelectableTextLayer(pdf: jsPDF, textLayer: TextRun[]) {
  for (const run of textLayer) {
    pdf.setFont(run.fontName, run.fontStyle);
    pdf.setFontSize(run.fontSize);
    pdf.text(run.text, run.x, run.y, {
      renderingMode: "invisible",
      baseline: "alphabetic",
    });
  }
}

function normalizePdfText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function inlineImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        const dataUrl = await fetchAsDataUrl(src);
        if (dataUrl) {
          img.setAttribute("src", dataUrl);
          img.removeAttribute("crossorigin");
        }
      }

      await new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  const proxied = resolveUploadFileUrl(url);
  if (proxied && proxied !== url) {
    const token = getPhpAuthToken();
    const headers: Record<string, string> = { Accept: "image/*" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(proxied, { headers });
      if (res.ok) return blobToDataUrl(await res.blob());
    } catch { /* fall through */ }
  }

  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) return blobToDataUrl(await res.blob());
  } catch { /* fall through */ }

  return null;
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
