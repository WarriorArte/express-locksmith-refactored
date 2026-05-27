import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { getPhpAuthToken, resolveUploadFileUrl } from "@/lib/phpApi";

/**
 * Renders a ticket DOM node to a PDF blob using html2canvas + jsPDF.
 * The logo is fetched through the authenticated /api/uploads.php?action=file
 * proxy (same auth flow the rest of the app uses) and inlined as a data URL,
 * so html2canvas can read it without CORS tainting the canvas.
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
      } else {
        // If we couldn't inline it, hide it so html2canvas doesn't taint the canvas
        img.style.visibility = "hidden";
      }
    }),
  );
}

/**
 * Converts an image URL to a base64 data URL.
 * Primary strategy: route /uploads/* through the authenticated API proxy
 * (/api/uploads.php?action=file) using the same Bearer token the rest of
 * the app uses. This is the only path that works reliably across browsers
 * because the static /uploads/ host doesn't expose CORS headers.
 */
async function imageToDataUrl(url: string): Promise<string | null> {
  // 1) Authenticated proxy fetch (works because /api has CORS + auth)
  const proxied = resolveUploadFileUrl(url);
  if (proxied && proxied !== url) {
    const token = getPhpAuthToken();
    const headers: Record<string, string> = { Accept: "image/*" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(proxied, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (dataUrl) return dataUrl;
      }
    } catch {
      // fall through
    }
  }

  // 2) Direct fetch as fallback (works for fully public CORS-enabled URLs)
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) return dataUrl;
    }
  } catch {
    // fall through
  }

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
