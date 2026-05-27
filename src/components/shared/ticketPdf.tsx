import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { BusinessSettings } from "@/hooks/useBusinessSettings";
import { getPhpAuthToken } from "@/lib/phpApi";
import { paymentMethodLabels, statusLabels } from "./detail-view/types";
import type { TicketData, TicketKind } from "./TicketDialog";

const kindTitle: Record<TicketKind, string> = {
  sale: "Ticket de Venta",
  service: "Orden de Servicio",
  warranty: "Comprobante de Garantia",
};

export async function createTicketPdfBlob({
  data,
  settings,
  logoUrl,
}: {
  data: TicketData;
  settings: BusinessSettings | null | undefined;
  logoUrl: string | null;
}) {
  polyfillBuffer();

  const [logoDataUrl, qrDataUrl] = await Promise.all([
    logoUrl ? fetchAsDataUrl(logoUrl) : Promise.resolve(null),
    QRCode.toDataURL(data.number, { margin: 1, width: 256 }),
  ]);

  return pdf(
    <TicketPdfDocument
      data={data}
      settings={settings}
      logoDataUrl={logoDataUrl}
      qrDataUrl={qrDataUrl}
    />,
  ).toBlob();
}

function TicketPdfDocument({
  data,
  settings,
  logoDataUrl,
  qrDataUrl,
}: {
  data: TicketData;
  settings: BusinessSettings | null | undefined;
  logoDataUrl: string | null;
  qrDataUrl: string;
}) {
  const currency = settings?.currency_symbol || "$";
  const statusConfig = data.status ? statusLabels[data.status] : null;
  const money = (v: number | null | undefined) => `${currency}${Number(v || 0).toFixed(2)}`;

  return (
    <Document>
      <Page size={{ width: 226.77 }} style={styles.page} wrap={false}>
        <View style={styles.header}>
          {logoDataUrl && <Image src={logoDataUrl} style={styles.logo} />}
          <Text style={styles.businessName}>{settings?.name || "Mi Negocio"}</Text>
          {settings?.address && <Text style={styles.smallText}>{settings.address}</Text>}
          {settings?.phone && <Text style={styles.smallText}>Tel: {settings.phone}</Text>}
          {settings?.email && <Text style={styles.smallText}>{settings.email}</Text>}
        </View>

        <View style={styles.centerBlock}>
          <Text style={styles.upper}>{kindTitle[data.kind]}</Text>
          <Text style={styles.ticketNumber}>{data.number}</Text>
          <Text style={styles.smallText}>
            {format(parseISO(data.date), "dd MMM yyyy · HH:mm", { locale: es })}
          </Text>
          {statusConfig && (
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{statusConfig.label}</Text>
            </View>
          )}
        </View>

        {(data.customer_name || data.customer_phone) && (
          <PdfSection title="Cliente">
            {data.customer_name && <Text style={styles.bodyText}>{data.customer_name}</Text>}
            {data.customer_phone && <Text style={styles.bodyText}>Tel: {data.customer_phone}</Text>}
            {data.customer_email && <Text style={styles.bodyText}>{data.customer_email}</Text>}
          </PdfSection>
        )}

        {data.kind === "service" && (data.description || data.problem) && (
          <PdfSection>
            {data.description && (
              <>
                <Text style={styles.sectionTitle}>Descripcion</Text>
                <Text style={styles.bodyText}>{data.description}</Text>
              </>
            )}
            {data.problem && (
              <>
                <Text style={[styles.sectionTitle, styles.spacedTitle]}>Solucion / Problema</Text>
                <Text style={styles.bodyText}>{data.problem}</Text>
              </>
            )}
          </PdfSection>
        )}

        {(data.kind === "sale" || data.kind === "service") && data.items && data.items.length > 0 && (
          <PdfSection>
            <View style={styles.itemHeader}>
              <Text style={styles.sectionTitle}>Detalle</Text>
              <Text style={styles.sectionTitle}>Importe</Text>
            </View>
            {data.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.item}>
                <View style={styles.itemText}>
                  <Text style={styles.bodyText}>{item.quantity}x {item.name}</Text>
                  <Text style={styles.mutedText}>{money(item.unit_price)} c/u</Text>
                </View>
                <Text style={styles.itemAmount}>{money(item.subtotal)}</Text>
              </View>
            ))}
          </PdfSection>
        )}

        {(data.kind === "sale" || data.kind === "service") && (
          <PdfSection>
            {data.kind === "service" && Number(data.labor_cost) > 0 && (
              <PdfRow label="Mano de obra" value={money(data.labor_cost)} />
            )}
            {data.subtotal !== undefined && <PdfRow label="Subtotal" value={money(data.subtotal)} />}
            {Number(data.discount) > 0 && (
              <PdfRow label="Descuento" value={`-${money(data.discount)}`} />
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>TOTAL</Text>
              <Text style={styles.totalText}>{money(data.total)}</Text>
            </View>
            {data.payment_method && (
              <Text style={styles.paymentText}>
                Pago: {paymentMethodLabels[data.payment_method] || data.payment_method}
              </Text>
            )}
          </PdfSection>
        )}

        {data.kind === "warranty" && (
          <PdfSection title={data.warranty_type === "sale" ? "Producto cubierto" : "Servicio cubierto"}>
            <Text style={[styles.bodyText, styles.mb6]}>
              {data.warranty_type === "sale" ? data.product_name : data.service_description}
            </Text>
            {data.reference_number && <PdfRow label="Referencia" value={data.reference_number} />}
            <PdfRow label="Duracion" value={`${data.warranty_days} dias`} />
            {data.start_date && (
              <PdfRow label="Inicio" value={format(parseISO(data.start_date), "dd/MM/yyyy", { locale: es })} />
            )}
            {data.end_date && (
              <PdfRow label="Vence" value={format(parseISO(data.end_date), "dd/MM/yyyy", { locale: es })} />
            )}
          </PdfSection>
        )}

        {data.notes && (
          <PdfSection title="Notas">
            <Text style={styles.bodyText}>{data.notes}</Text>
          </PdfSection>
        )}

        <View style={styles.qrBlock}>
          <Image src={qrDataUrl} style={styles.qr} />
          <Text style={styles.qrNumber}>{data.number}</Text>
          <Text style={styles.mutedCenter}>Conserve este comprobante</Text>
        </View>

        <Text style={styles.thanks}>Gracias por su preferencia!</Text>
      </Page>
    </Document>
  );
}

function PdfSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
}

function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.bodyText}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function polyfillBuffer() {
  if (typeof (globalThis as any).Buffer !== "undefined") return;
  const B = {
    from(value: string | ArrayBuffer | ArrayLike<number>, encoding?: string): Uint8Array {
      if (typeof value === "string") {
        if (encoding === "base64") {
          const bin = atob(value.replace(/\s/g, ""));
          const out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
          return out;
        }
        if (encoding === "hex") {
          const out = new Uint8Array(value.length >> 1);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
          return out;
        }
        return new TextEncoder().encode(value);
      }
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      return new Uint8Array(value as ArrayLike<number>);
    },
    isBuffer: (o: unknown) => o instanceof Uint8Array,
    alloc(size: number, fill = 0): Uint8Array {
      const b = new Uint8Array(size);
      if (fill) b.fill(typeof fill === "number" ? fill : (fill as string).charCodeAt(0));
      return b;
    },
    allocUnsafe: (size: number) => new Uint8Array(size),
    concat(list: Uint8Array[], totalLength?: number): Uint8Array {
      const total = totalLength ?? list.reduce((s, b) => s + b.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const b of list) { out.set(b, off); off += b.length; }
      return out;
    },
    byteLength(str: string, enc?: string): number {
      if (enc === "base64") return Math.ceil(str.replace(/\s/g, "").length * 3 / 4);
      return new TextEncoder().encode(str).length;
    },
  };
  (globalThis as any).Buffer = B;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const headers = new Headers();
    const token = getPhpAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const blob = await response.blob();
    // react-pdf only supports JPEG and PNG — convert via canvas
    return await blobToPngDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToPngDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
    img.src = objectUrl;
  });
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "Courier",
    fontSize: 9,
    padding: 12,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#999999",
    borderBottomStyle: "dashed",
    marginBottom: 8,
    paddingBottom: 8,
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: "contain",
    marginBottom: 4,
  },
  businessName: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  smallText: { fontSize: 8, lineHeight: 1.35 },
  centerBlock: { alignItems: "center", marginBottom: 8 },
  upper: { fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  ticketNumber: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  statusPill: {
    minWidth: 62,
    maxWidth: 98,
    borderWidth: 1,
    borderColor: "#999999",
    borderRadius: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  statusText: { fontSize: 8, lineHeight: 1, textAlign: "center" },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#999999",
    borderTopStyle: "dashed",
    paddingTop: 7,
    marginBottom: 7,
  },
  sectionTitle: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 },
  spacedTitle: { marginTop: 6 },
  bodyText: { fontSize: 9, lineHeight: 1.35 },
  mutedText: { fontSize: 8, color: "#666666", lineHeight: 1.3 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between" },
  item: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  itemText: { flexGrow: 1, flexShrink: 1 },
  itemAmount: { fontSize: 9, fontWeight: 700, flexShrink: 0 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  rowValue: { fontSize: 9, fontWeight: 700, flexShrink: 0 },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#999999",
    marginTop: 3,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalText: { fontSize: 12, fontWeight: 700 },
  paymentText: { fontSize: 8, marginTop: 5, textAlign: "center" },
  qrBlock: {
    borderTopWidth: 1,
    borderTopColor: "#999999",
    borderTopStyle: "dashed",
    paddingTop: 7,
    alignItems: "center",
  },
  qr: { width: 86, height: 86 },
  qrNumber: { fontSize: 9, fontWeight: 700, marginTop: 3 },
  mutedCenter: { fontSize: 7, color: "#666666", marginTop: 3, textAlign: "center" },
  thanks: {
    borderTopWidth: 1,
    borderTopColor: "#999999",
    borderTopStyle: "dashed",
    fontSize: 8,
    marginTop: 8,
    paddingTop: 8,
    textAlign: "center",
  },
  mb6: { marginBottom: 6 },
});
