import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Renders a ticket DOM node to a PDF blob using html2canvas + jsPDF.
 * The page size matches the ticket aspect ratio (80mm wide receipt format).
 */
export async function createTicketPdfBlob(node: HTMLElement): Promise<Blob> {
  // Wait for any <img> inside the ticket to load
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  // 80mm receipt width, height adjusted by content ratio
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
