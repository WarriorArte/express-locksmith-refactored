import type { Quote } from "@/hooks/useQuotes";
import type { QuoteDocSettings } from "@/hooks/useQuoteDocSettings";
import type { BusinessSettings } from "@/hooks/useBusinessSettings";

/* ---------- helpers ---------- */
const fmtMoney = (amt: number, sym: string) => {
  const fixed = new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt);
  return `${sym} ${fixed}`;
};
const fmtNum = (amt: number) =>
  new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt);
const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
};

export type LayoutData = {
  company: {
    name: string;
    initial: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    slogan: string;
  };
  client: {
    name: string;
    contact: string;
    quoteNumber: string;
    date: string;
    validUntil: string;
  };
  items: Array<{ id: string | number; title: string; sub: string; qty: number; price: number }>;
  payment: { account: string; name: string; bank: string };
  notes: string;
  currency: string;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  signatureName: string;
  description?: string | null;
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
  const taxRate = Number(settings.taxRate || 0);
  const tax = subtotal * (taxRate / 100);
  const total = Number(quote.total || subtotal + tax);
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
    },
    client: {
      name: quote.customer_name || quote.customer?.name || "Cliente",
      contact: quote.customer_name || quote.customer?.name || "",
      quoteNumber: quote.quote_number,
      date: (quote.created_at || "").split("T")[0] || new Date().toISOString().split("T")[0],
      validUntil: quote.valid_until
        ? fmtDate(quote.valid_until)
        : `${quote.validity_days || 15} Días`,
    },
    items,
    payment: settings.payment,
    notes: quote.notes || settings.notes || "",
    currency,
    taxRate,
    subtotal,
    tax,
    total,
    signatureName: settings.signatureName || companyName,
    description: quote.description,
  };
}

/* ---------- Shared subcomponents ---------- */
function ItemsTable({ items, currency }: { items: LayoutData["items"]; currency: string }) {
  return (
    <table className="items-table">
      <thead>
        <tr>
          <th className="num">№</th>
          <th>Descripción</th>
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

function TotalsBlock({ subtotal, tax, taxRate, total, currency }: Pick<LayoutData, "subtotal" | "tax" | "taxRate" | "total" | "currency">) {
  return (
    <div className="totals">
      <div className="tot-row">
        <div className="k">Subtotal</div>
        <div className="v">{fmtMoney(subtotal, currency)}</div>
      </div>
      {taxRate > 0 && (
        <div className="tot-row">
          <div className="k">Impuestos · {taxRate}%</div>
          <div className="v">{fmtMoney(tax, currency)}</div>
        </div>
      )}
      <div className="grand-row">
        <div className="k">Total</div>
        <div className="v"><span className="cur">{currency}</span>{fmtNum(total)}</div>
      </div>
    </div>
  );
}

function NotesBlock({ notes }: { notes: string }) {
  if (!notes) return null;
  return (
    <div className="notes">
      <h4>Notas y términos</h4>
      <p>{notes}</p>
    </div>
  );
}

function PaymentBlock({ payment }: { payment: LayoutData["payment"] }) {
  if (!payment.account && !payment.name && !payment.bank) return null;
  return (
    <div className="payment">
      <h4>Información de pago</h4>
      <div className="grid">
        {payment.account && (<><div className="k">Cuenta №</div><div className="v">{payment.account}</div></>)}
        {payment.name && (<><div className="k">A nombre</div><div className="v">{payment.name}</div></>)}
        {payment.bank && (<><div className="k">Banco</div><div className="v">{payment.bank}</div></>)}
      </div>
    </div>
  );
}

/* ---------- LAYOUT A — BOLD ---------- */
export function LayoutBold(props: LayoutData) {
  const { company, client, items, payment, notes, currency, taxRate, subtotal, tax, total, signatureName } = props;
  return (
    <div className="layout-bold">
      <header className="hero">
        <div className="hero-grid">
          <div className="brand">
            <div className="logo-mark">{company.initial}</div>
            <div>
              <div className="brand-name">{company.name}</div>
              {company.slogan && <div className="brand-slogan">{company.slogan}</div>}
            </div>
          </div>
          <div className="doc-wordmark">
            <div className="label">Documento</div>
            <h2>COTIZACIÓN<span className="dot">.</span></h2>
            <div className="num">№ {client.quoteNumber}</div>
          </div>
        </div>
        <div className="hero-meta">
          <div className="cell">
            <div className="k">Preparado para</div>
            <div className="v">{client.name}</div>
            {client.contact && client.contact !== client.name && (
              <div className="v small">Atn. {client.contact}</div>
            )}
          </div>
          <div className="cell">
            <div className="k">Fecha de emisión</div>
            <div className="v mono">{fmtDate(client.date)}</div>
          </div>
          <div className="cell">
            <div className="k">Validez</div>
            <div className="v mono">{client.validUntil}</div>
          </div>
        </div>
        <div className="hero-curve">
          <svg viewBox="0 0 800 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 C200,60 600,60 800,0 L800,60 L0,60 Z" fill="var(--paper)" />
          </svg>
        </div>
      </header>

      <div className="total-due">
        <div>
          <div className="label">Total a pagar</div>
          <div className="tagline">Cotización válida {client.validUntil}</div>
        </div>
        <div className="amount">
          <span className="cur">{currency}</span>{fmtNum(total)}
        </div>
      </div>

      <section className="items-wrap">
        <ItemsTable items={items} currency={currency} />
      </section>

      <section className="bottom">
        <div>
          <NotesBlock notes={notes} />
          <PaymentBlock payment={payment} />
        </div>
        <TotalsBlock subtotal={subtotal} tax={tax} taxRate={taxRate} total={total} currency={currency} />
      </section>

      <footer className="foot">
        <div className="foot-curve">
          <svg viewBox="0 0 800 50" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,50 C200,-10 600,-10 800,50 L800,0 L0,0 Z" fill="var(--paper)" />
          </svg>
        </div>
        <div className="foot-grid">
          <div>
            <div className="thanks">Gracias por la oportunidad<span className="accent">.</span></div>
            <div className="contact">
              {company.address && <div>{company.address.split("\n").join(" · ")}</div>}
              {(company.phone || company.email) && <div>{[company.phone, company.email].filter(Boolean).join(" · ")}</div>}
              {company.website && <div>{company.website}</div>}
            </div>
          </div>
          <div className="signature">
            <div className="line"></div>
            <div className="sig-label">Firma autorizada</div>
            <div className="sig-name">{signatureName}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- LAYOUT B — BANNER ---------- */
export function LayoutBanner(props: LayoutData) {
  const { company, client, items, payment, notes, currency, taxRate, subtotal, tax, total, signatureName } = props;
  return (
    <div className="layout-banner">
      <header className="b-head">
        <div className="brand">
          <div className="logo-mark">{company.initial}</div>
          <div>
            <div className="brand-name">{company.name}</div>
            {company.slogan && <div className="brand-slogan">{company.slogan}</div>}
          </div>
        </div>
        <div className="meta">
          <div><strong>Cot. №</strong> {client.quoteNumber}</div>
          <div><strong>Emisión</strong> {fmtDate(client.date)}</div>
          <div><strong>Validez</strong> {client.validUntil}</div>
        </div>
      </header>

      <div className="banner">
        <div className="stripe left"></div>
        <h2>COTIZACIÓN</h2>
        <div className="stripe right"></div>
      </div>

      <section className="info-row">
        <div className="cell">
          <div className="k">Cotizado para</div>
          <div className="v">{client.name}</div>
          {client.contact && client.contact !== client.name && (
            <div className="v small">Atn. {client.contact}</div>
          )}
          {company.address && (
            <div className="v small" style={{ whiteSpace: "pre-line", marginTop: 6 }}>
              {company.address}
            </div>
          )}
        </div>
        <div className="cell">
          <div className="k">Detalle del documento</div>
          <div className="mono-grid">
            <div className="k">Número</div><div className="v">{client.quoteNumber}</div>
            <div className="k">Emisión</div><div className="v">{fmtDate(client.date)}</div>
            <div className="k">Validez</div><div className="v">{client.validUntil}</div>
            <div className="k">Moneda</div><div className="v">{currency}</div>
          </div>
        </div>
      </section>

      <section className="items-wrap">
        <ItemsTable items={items} currency={currency} />
      </section>

      <section className="bottom">
        <div>
          <NotesBlock notes={notes} />
          <PaymentBlock payment={payment} />
        </div>
        <TotalsBlock subtotal={subtotal} tax={tax} taxRate={taxRate} total={total} currency={currency} />
      </section>

      <footer className="foot">
        <div className="foot-grid">
          <div>
            <div className="thanks">Gracias por su confianza<span className="accent">.</span></div>
            <div className="contact">
              {(company.phone || company.email) && <div>{[company.phone, company.email].filter(Boolean).join(" · ")}</div>}
              {company.website && <div>{company.website}</div>}
            </div>
          </div>
          <div className="signature">
            <div className="line"></div>
            <div className="sig-label">Firma autorizada</div>
            <div className="sig-name">{signatureName}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- LAYOUT C — CLASSIC ---------- */
export function LayoutClassic(props: LayoutData) {
  const { company, client, items, payment, notes, currency, taxRate, subtotal, tax, total, description } = props;
  const addressLines = (company.address || "").split("\n");
  return (
    <div className="layout-classic">
      <header className="c-head">
        <div className="c-brand">
          <div className="c-logo">{company.initial}</div>
          <div className="c-brand-info">
            <div className="company">{company.name}</div>
            {addressLines[0] && <div className="addr">{addressLines[0]}</div>}
            {addressLines[1] && <div className="addr">{addressLines[1]}</div>}
            {company.phone && <div className="contact">Tel: {company.phone}</div>}
            {company.email && <div className="contact">{company.email}</div>}
            {company.website && <div className="contact">{company.website}</div>}
          </div>
        </div>
        <div className="c-title">
          <h2>COTIZACIÓN</h2>
          <table className="c-meta">
            <thead>
              <tr><th>FECHA</th><th>NÚMERO</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>{fmtDate(client.date)}</td>
                <td>{client.quoteNumber}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <section className="c-prep">
        <div className="c-prep-title">Preparado para:</div>
        <div className="c-form">
          <div className="row r1">
            <span className="lbl">Cliente:</span>
            <span className="val">{client.name}</span>
            <span className="lbl">Contacto:</span>
            <span className="val">{client.contact}</span>
          </div>
          <div className="row r3">
            <span className="lbl">Validez:</span>
            <span className="val">{client.validUntil}</span>
            <span className="lbl">Emisión:</span>
            <span className="val">{fmtDate(client.date)}</span>
            <span className="lbl">Moneda:</span>
            <span className="val">{currency}</span>
          </div>
        </div>
      </section>

      {description && (
        <section className="c-project">
          <div className="c-project-label">Descripción del proyecto:</div>
          <div className="c-project-box">{description}</div>
        </section>
      )}

      <section className="c-items">
        <table className="c-items-table">
          <thead>
            <tr>
              <th className="qty">CANT.</th>
              <th className="desc">DESCRIPCIÓN</th>
              <th className="price">PRECIO U.</th>
              <th className="tot">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td className="qty">{it.qty}</td>
                <td className="desc">
                  <div className="title">{it.title}</div>
                  {it.sub && <div className="sub">{it.sub}</div>}
                </td>
                <td className="price">{fmtMoney(it.price, currency)}</td>
                <td className="tot">{fmtMoney(it.qty * it.price, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="c-bottom">
        <div className="c-notes">
          {notes && (
            <>
              <div className="c-notes-title">Esta cotización está sujeta a los siguientes términos:</div>
              <div className="c-notes-body">{notes}</div>
            </>
          )}
          {(payment.account || payment.name || payment.bank) && (
            <div className="c-notes-pay">
              <strong>Información de pago.</strong>{" "}
              {payment.account && <>Cuenta {payment.account}</>}
              {payment.name && <> a nombre de {payment.name}</>}
              {payment.bank && <> · {payment.bank}</>}.
            </div>
          )}
        </div>
        <table className="c-totals">
          <tbody>
            <tr>
              <td className="k">SUB TOTAL</td>
              <td className="v">{fmtMoney(subtotal, currency)}</td>
            </tr>
            {taxRate > 0 && (
              <tr>
                <td className="k">IVA ({taxRate}%)</td>
                <td className="v">{fmtMoney(tax, currency)}</td>
              </tr>
            )}
            <tr className="total">
              <td className="k">TOTAL</td>
              <td className="v">{fmtMoney(total, currency)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="c-sigs">
        <div className="sig">
          <div className="lbl">Recibido:</div>
          <div className="line"></div>
          <div className="name">{client.name}</div>
        </div>
        <div className="sig with-stamp">
          <div className="lbl">Aprobado:</div>
          <div className="line"></div>
          <div className="name">{company.name}</div>
        </div>
      </footer>
    </div>
  );
}
