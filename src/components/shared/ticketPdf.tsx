import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { getPhpAuthToken } from "@/lib/phpApi";

/**
 * Renders a ticket DOM node to a PDF blob using html2canvas + jsPDF.
 * Inlines all <img> sources as data URLs first so cross-origin / auth-protected
 * logos render correctly without tainting the canvas.
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
      try {
        const dataUrl = await fetchAsDataUrl(src);
        if (dataUrl) {
          img.setAttribute("src", dataUrl);
          img.removeAttribute("crossorigin");
          if (!img.complete) {
            await new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            });
          }
        }
      } catch {
        // ignore, leave original src
      }
    }),
  );
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  const headers = new Headers();
  const token = getPhpAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { headers, credentials: "include" }).catch(() => null);
  if (!res || !res.ok) return null;
  const blob = await res.blob();
  return await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
