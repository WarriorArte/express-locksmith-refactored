/* eslint-disable react-refresh/only-export-components */
import "./classic.css";
import type { LayoutData, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "../types";
import { fmtDate, fmtMoney } from "../shared";

function ClassicTemplate(props: LayoutData) {
  const { company, client, items, payment, notes, currency, subtotal, discount, total } = props;
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
        <div className="c-prep-title">Para:</div>
        <div className="c-form">
          <div className="row r1">
            <span className="lbl">Cliente:</span>
            <span className="val">{client.name}</span>
          </div>
          <div className="row r3">
            <span className="lbl">Validez:</span>
            <span className="val">{client.validUntil}</span>
          </div>
        </div>
      </section>
    
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
              <div className="c-notes-title">Notas y terminos:</div>
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
            {discount > 0 && (
              <tr className="discount">
                <td className="k">DESCUENTO</td>
                <td className="v">-{fmtMoney(discount, currency)}</td>
              </tr>
            )}
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
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto" aria-hidden="true">
      <rect width="40" height="52" rx="3" fill="#ffffff" stroke="#d7dce2" strokeWidth="0.6" />
      <circle cx="7" cy="7" r="3.8" fill={accent} />
      <rect x="12" y="4.5" width="8" height="1.2" rx="0.5" fill={ink} opacity="0.55" />
      <rect x="12" y="7" width="10" height="1" rx="0.5" fill={ink} opacity="0.32" />
      <rect x="25" y="4" width="11" height="3.5" rx="0.4" fill="#f2f5f7" stroke={ink} strokeWidth="0.45" />
      <rect x="26.4" y="5.2" width="3.4" height="0.8" rx="0.3" fill={ink} opacity="0.45" />
      <rect x="25" y="8.2" width="11" height="3.5" rx="0.4" fill="#ffffff" stroke={ink} strokeWidth="0.45" />
      <rect x="26.4" y="9.4" width="5" height="0.8" rx="0.3" fill={ink} opacity="0.45" />

      <rect x="4" y="16" width="32" height="8.6" rx="0.4" fill="#ffffff" stroke={ink} strokeWidth="0.5" />
      <line x1="4" y1="19" x2="36" y2="19" stroke={ink} strokeWidth="0.45" />
      <line x1="4" y1="22" x2="36" y2="22" stroke={ink} strokeWidth="0.45" />
      <rect x="6" y="17.1" width="5" height="0.9" rx="0.3" fill={ink} opacity="0.42" />
      <rect x="13" y="17.1" width="9" height="0.9" rx="0.3" fill={ink} opacity="0.25" />
      <rect x="6" y="20.1" width="6" height="0.9" rx="0.3" fill={ink} opacity="0.42" />
      <rect x="14" y="20.1" width="7" height="0.9" rx="0.3" fill={ink} opacity="0.25" />

      <rect x="4" y="28" width="32" height="13" rx="0.4" fill="#ffffff" stroke={ink} strokeWidth="0.55" />
      <rect x="4" y="28" width="32" height="3" fill="#f2f5f7" />
      <line x1="9" y1="28" x2="9" y2="41" stroke={ink} strokeWidth="0.45" />
      <line x1="24" y1="28" x2="24" y2="41" stroke={ink} strokeWidth="0.45" />
      <line x1="31" y1="28" x2="31" y2="41" stroke={ink} strokeWidth="0.45" />
      <line x1="4" y1="34" x2="36" y2="34" stroke={ink} strokeWidth="0.45" />
      <line x1="4" y1="37.5" x2="36" y2="37.5" stroke={ink} strokeWidth="0.45" />
      <rect x="11" y="32" width="9" height="0.9" rx="0.3" fill={ink} opacity="0.35" />
      <rect x="11" y="35.3" width="8" height="0.9" rx="0.3" fill={ink} opacity="0.28" />

      <rect x="23" y="44" width="13" height="4" rx="0.4" fill={accent} />
      <rect x="5" y="45" width="12" height="1" rx="0.4" fill={ink} opacity="0.32" />
      <rect x="25" y="45.5" width="7" height="1" rx="0.4" fill="#ffffff" opacity="0.9" />
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
