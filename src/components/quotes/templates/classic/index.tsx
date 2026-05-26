import type { LayoutData, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "../types";
import { fmtDate, fmtMoney } from "../shared";

function ClassicTemplate(props: LayoutData) {
  const { company, client, items, payment, notes, currency, subtotal, total, description } = props;
  const addressLines = (company.address || "").split("\n");
  return (
    <div className="layout-classic">
      <header className="c-head">
        <div className="c-brand">
          {company.logoUrl ? (
            <img className="c-brand-logo" src={company.logoUrl} alt={company.name} />
          ) : (
            <div className="c-logo">{company.initial}</div>
          )}
          <div className="c-brand-info">
            {client.contact && <div className="name">{client.contact}</div>}
            <div className="company">{company.name}</div>
            {addressLines[0] && <div className="addr">{addressLines[0]}</div>}
            {addressLines[1] && <div className="addr">{addressLines[1]}</div>}
            {company.phone && <div className="contact">Tel: {company.phone}</div>}
            {company.email && <div className="contact">{company.email}</div>}
            {company.website && <div className="contact">{company.website}</div>}
          </div>
        </div>
        <div className="c-title">
          <div className="c-title-eyebrow">Documento</div>
          <h2>Cotizacion</h2>
          <table className="c-meta">
            <thead>
              <tr><th>FECHA</th><th>NUMERO</th></tr>
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
            <span className="lbl">Emision:</span>
            <span className="val">{fmtDate(client.date)}</span>
          </div>
        </div>
      </section>

      {description && (
        <section className="c-project">
          <div className="c-project-label">Descripcion del proyecto:</div>
          <div className="c-project-box">{description}</div>
        </section>
      )}

      <section className="c-items">
        <table className="c-items-table">
          <thead>
            <tr>
              <th className="qty">CANT.</th>
              <th className="desc">DESCRIPCION</th>
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
              <div className="c-notes-title">Esta cotizacion esta sujeta a los siguientes terminos:</div>
              <div className="c-notes-body">{notes}</div>
            </>
          )}
          {(payment.account || payment.name || payment.bank) && (
            <div className="c-notes-pay">
              <strong>Informacion de pago.</strong>{" "}
              {payment.account && <>Cuenta {payment.account}</>}
              {payment.name && <> a nombre de {payment.name}</>}
              {payment.bank && <> - {payment.bank}</>}.
            </div>
          )}
        </div>
        <table className="c-totals">
          <tbody>
            <tr>
              <td className="k">SUB TOTAL</td>
              <td className="v">{fmtMoney(subtotal, currency)}</td>
            </tr>
            <tr className="total">
              <td className="k">TOTAL</td>
              <td className="v">{fmtMoney(total, currency)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ClassicThumb({ accent, ink }: QuoteTemplateThumbProps) {
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto">
      <rect width="40" height="52" rx="2" fill="hsl(var(--muted))" />
      <circle cx="8" cy="8" r="3" fill={accent} />
      <rect x="24" y="4" width="12" height="4" rx="1" fill={ink} />
      <rect x="26" y="10" width="10" height="3" rx=".5" fill="none" stroke={ink} strokeWidth=".5" />
      <line x1="4" y1="18" x2="18" y2="18" stroke={ink} strokeWidth=".8" />
      <line x1="22" y1="18" x2="36" y2="18" stroke={ink} strokeWidth=".8" />
      <line x1="4" y1="22" x2="36" y2="22" stroke={ink} strokeWidth=".8" />
      <rect x="4" y="26" width="32" height="14" rx=".5" fill="none" stroke={ink} strokeWidth=".5" />
      <line x1="4" y1="48" x2="16" y2="48" stroke={ink} strokeWidth=".8" />
      <circle cx="32" cy="47" r="4" fill="none" stroke={accent} strokeWidth=".8" />
    </svg>
  );
}

const template: QuoteTemplateDefinition = {
  id: "classic",
  name: "Clasica",
  order: 30,
  Component: ClassicTemplate,
  Thumb: ClassicThumb,
};

export default template;
