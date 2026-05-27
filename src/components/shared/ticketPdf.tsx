import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getPhpAuthToken, resolveUploadFileUrl } from "@/lib/phpApi";

export async function createTicketPdfBlob(node: HTMLElement, paperSize?: string): Promise<Blob> {
  // Pre-inline authenticated images as data URLs so html-to-image
  // doesn't try to fetch them (which fails due to auth/CORS).
  await inlineImages(node);

  const imgData = await toPng(node, {
    pixelRatio: 4,
    backgroundColor: "#ffffff",
    skipFonts: true,
    style: { margin: "0" },
  });

  const rect = node.getBoundingClientRect();
  const pageW = paperSize === "104mm" ? 104 : paperSize === "80mm" ? 80 : 58;
  const pageH = (rect.height * pageW) / rect.width;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageW, pageH],
    compress: true,
  });

  pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);

  return pdf.output("blob");
}

async function inlineImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      const dataUrl = await fetchAsDataUrl(src);
      if (dataUrl) {
        img.setAttribute("src", dataUrl);
        img.removeAttribute("crossorigin");
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      } else {
        img.style.visibility = "hidden";
      }
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
