import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Renders a ticket DOM node to a PDF blob using html2canvas + jsPDF.
 * Inlines all <img> sources as data URLs first so cross-origin logos render
 * without tainting the canvas.
 */
export async function createTicketPdfBlob(node: HTMLElement): Promise<Blob> {
  await inlineImages(node);

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: false,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  const pageWidthMm = 80;
  const pageHeightMm = (canvas.height / canvas.width) * pageWidthMm;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");
  return pdf.output("blob");
}

async function inlineImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      const dataUrl = await imageToDataUrl(src);
      if (dataUrl) {
        img.setAttribute("src", dataUrl);
        img.removeAttribute("crossorigin");
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      }
    }),
  );
}

/**
 * Converts a remote image URL to a base64 data URL.
 * Strategy:
 *  1. Try fetch() with CORS (works once the server sends Access-Control-Allow-Origin).
 *  2. Fall back to loading the image via <Image crossOrigin="anonymous"> and drawing it
 *     to a canvas — this also requires CORS headers but uses a different code path.
 */
async function imageToDataUrl(url: string): Promise<string | null> {
  // 1) Plain fetch (no Authorization → no preflight)
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) return dataUrl;
    }
  } catch {
    // continue to next strategy
  }

  // 2) Image element + canvas
  try {
    return await loadImageAsDataUrl(url);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    // Cache buster avoids reusing a cached response that was loaded without CORS headers
    img.src = url + (url.includes("?") ? "&" : "?") + "_cors=1";
  });
}
