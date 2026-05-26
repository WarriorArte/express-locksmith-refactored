import type { BusinessSettings } from "@/hooks/useBusinessSettings";
import type { QuoteDocSettings } from "@/hooks/useQuoteDocSettings";
import type { Quote } from "@/hooks/useQuotes";
import { resolveStorageUrl } from "@/lib/phpApi";
import type { LayoutData } from "./types";

export const fmtMoney = (amt: number, sym: string) => {
  const fixed = new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt);
  return `${sym} ${fixed}`;
};

export const fmtNum = (amt: number) =>
  new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt);

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
};

export function buildLayoutData(quote: Quote, biz: BusinessSettings | null, settings: QuoteDocSettings): LayoutData {
  const currency = biz?.currency_symbol || "$";
  const items = (quote.quote_items || []).map(it => ({
    id: it.id,
    title: it.description || "",
    sub: "",
    qty: Number(it.quantity || 0),
    price: Number(it.unit_price || 0),
  }));
  const subtotal = Number(quote.subtotal || 0);
  const discount = Number(quote.discount || 0);
  const total = Number(quote.total || subtotal);
  const companyName = biz?.name || "Mi Negocio";

  return {
    company: {
      name: companyName,
      initial: companyName.charAt(0).toUpperCase() || "N",
      address: biz?.address || "",
      phone: [biz?.phone_country_code, biz?.phone].filter(Boolean).join(" "),
      email: biz?.email || "",
      website: biz?.website || "",
      slogan: "",
      logoUrl: resolveStorageUrl(biz?.logo_url) || "",
    },
    client: {
      name: quote.customer_name || quote.customer?.name || "Cliente",
      contact: quote.customer_name || quote.customer?.name || "",
      quoteNumber: quote.quote_number,
      date: (quote.created_at || "").split("T")[0] || new Date().toISOString().split("T")[0],
      validUntil: quote.valid_until
        ? fmtDate(quote.valid_until)
        : `${quote.validity_days || 15} Dias`,
    },
    items,
    payment: settings.payment,
    notes: quote.notes || settings.notes || "",
    currency,
    subtotal,
    discount,
    total,
    description: quote.description,
  };
}

export function ItemsTable({ items, currency }: { items: LayoutData["items"]; currency: string }) {
  return (
    <table className="items-table">
      <thead>
        <tr>
          <th className="num">No.</th>
          <th>Descripcion</th>
          <th className="qty">Cant.</th>
          <th className="price">Precio Unit.</th>
          <th className="tot">Importe</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={it.id}>
            <td className="num">{String(i + 1).padStart(2, "0")}</td>
            <td>
              <div className="title">{it.title}</div>
              {it.sub && <div className="sub">{it.sub}</div>}
            </td>
            <td className="qty">{it.qty}</td>
            <td className="price">{fmtMoney(it.price, currency)}</td>
            <td className="tot">{fmtMoney(it.qty * it.price, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TotalsBlock({ subtotal, discount, total, currency }: Pick<LayoutData, "subtotal" | "discount" | "total" | "currency">) {
  return (
    <div className="totals">
      <div className="tot-row">
        <div className="k">Subtotal</div>
        <div className="v">{fmtMoney(subtotal, currency)}</div>
      </div>
      {discount > 0 && (
        <div className="tot-row discount-row">
          <div className="k">Descuento</div>
          <div className="v">-{fmtMoney(discount, currency)}</div>
        </div>
      )}
      <div className="grand-row">
        <div className="k">Total</div>
        <div className="v"><span className="cur">{currency}</span>{fmtNum(total)}</div>
      </div>
    </div>
  );
}

export function NotesBlock({ notes }: { notes: string }) {
  if (!notes) return null;
  return (
    <div className="notes">
      <h4>Notas y terminos</h4>
      <p>{notes}</p>
    </div>
  );
}

export function PaymentBlock({ payment }: { payment: LayoutData["payment"] }) {
  if (!payment.account && !payment.name && !payment.bank) return null;
  return (
    <div className="payment">
      <h4>Informacion de pago</h4>
      <div className="grid">
        {payment.account && (<><div className="k">Cuenta No.</div><div className="v">{payment.account}</div></>)}
        {payment.name && (<><div className="k">A nombre</div><div className="v">{payment.name}</div></>)}
        {payment.bank && (<><div className="k">Banco</div><div className="v">{payment.bank}</div></>)}
      </div>
    </div>
  );
}
