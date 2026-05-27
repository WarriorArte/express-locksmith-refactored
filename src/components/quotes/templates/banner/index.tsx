/* eslint-disable react-refresh/only-export-components */
import "./banner.css";
import type { LayoutData, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "../types";
import { fmtDate, ItemsTable, fmtMoney } from "../shared";

function BannerTemplate(props: LayoutData) {
  const { company, client, items, payment, notes, currency, subtotal, discount, total } = props;

  return (
    <div className="layout-banner">
      <header className="b-header">
        <div className="b-inner">
          <div className="brand">
            {company.logoUrl ? (
              <img className="brand-logo" src={company.logoUrl} alt={company.name} />
            ) : (
              <div className="logo-mark">{company.initial}</div>
            )}
          </div>

          <div className="b-summary">
            <div className="q-id">
              <div className="q-eyebrow">Cotizacion</div>
              <div className="q-num">#{client.quoteNumber}</div>
              <div className="q-date">{fmtDate(client.date)}</div>
            </div>
          </div>
        </div>

        <div className="b-contact-row">
          <div className="brand-contact">
            {[company.address?.split("\n").join(", "), company.phone, company.email]
              .filter(Boolean)
              .join("  /  ")}
          </div>
          {company.website && <div className="brand-site">{company.website}</div>}
        </div>

        <div className="banner-meta">
          <div className="bm-card primary">
            <div className="bm-k">Cotizado para</div>
            <div className="bm-v">{client.name}</div>
            {client.contact && client.contact !== client.name && (
              <div className="bm-small">Atn. {client.contact}</div>
            )}
          </div>
          <div className="bm-card">
            <div className="bm-k">Validez</div>
            <div className="bm-v mono">{client.validUntil}</div>
          </div>
        </div>
      </header>

      <section className="items-wrap">
        <ItemsTable items={items} currency={currency} />
      </section>

      <section className="bottom">
        <div className="bottom-left">
          {notes && (
            <div className="terms-block">
              <div className="terms-title">Notas y condiciones</div>
              <p className="terms-text">{notes}</p>
            </div>
          )}
        </div>

        <div className="bottom-right">
          <div className="totals-box">
            <div className="sub-row">
              <span>Subtotal</span>
              <span className="sub-v">{fmtMoney(subtotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="sub-row discount-row">
                <span>Descuento</span>
                <span className="sub-v">-{fmtMoney(discount, currency)}</span>
              </div>
            )}
            <div className="total-chip">
              <span className="tc-k">Total</span>
              <span className="tc-v">{fmtMoney(total, currency)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BannerThumb({ accent, ink }: QuoteTemplateThumbProps) {
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto" aria-hidden="true">
      <rect width="40" height="52" rx="3" fill="#ffffff" stroke="#d7dce2" strokeWidth="0.6" />
      <path d="M0 0h40v19H0z" fill={accent} />
      <path d="M0 17.5c11 2.6 25 2.4 40-1.5V19H0z" fill="#ffffff" opacity="0.96" />
      <rect x="4" y="4" width="7" height="7" rx="1.4" fill="#ffffff" opacity="0.2" />
      <rect x="27" y="4" width="9" height="6" rx="1.2" fill="#ffffff" opacity="0.16" />
      <rect x="29" y="5.5" width="5" height="1.1" rx="0.5" fill="#ffffff" opacity="0.82" />
      <rect x="28" y="8" width="7" height="0.9" rx="0.4" fill="#ffffff" opacity="0.55" />

      <rect x="4" y="21.5" width="15" height="6" rx="1.2" fill="#f2f5f7" />
      <rect x="6" y="23.2" width="5" height="0.9" rx="0.4" fill={accent} />
      <rect x="6" y="25" width="10" height="1.2" rx="0.4" fill={ink} opacity="0.75" />
      <rect x="21" y="21.5" width="7" height="6" rx="1.2" fill="#f2f5f7" />
      <rect x="23" y="24" width="3" height="1.2" rx="0.4" fill={ink} opacity="0.55" />
      <rect x="30" y="21.5" width="6" height="6" rx="1.2" fill="#f2f5f7" />
      <rect x="31.6" y="24" width="3" height="1.2" rx="0.4" fill={ink} opacity="0.55" />

      <rect x="4" y="31" width="32" height="2.2" rx="0.8" fill={ink} />
      <rect x="5.5" y="35" width="14" height="1.2" rx="0.5" fill={ink} opacity="0.45" />
      <rect x="27" y="35" width="7" height="1.2" rx="0.5" fill={ink} opacity="0.35" />
      <line x1="4" y1="38" x2="36" y2="38" stroke="#d7dce2" strokeWidth="0.5" />
      <rect x="5.5" y="40" width="12" height="1.2" rx="0.5" fill={ink} opacity="0.35" />
      <rect x="27" y="40" width="7" height="1.2" rx="0.5" fill={ink} opacity="0.35" />
      <rect x="22" y="45" width="14" height="4" rx="1" fill={accent} />
      <rect x="24" y="46.4" width="8" height="1.2" rx="0.5" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

const template: QuoteTemplateDefinition = {
  id: "banner",
  name: "Banda",
  order: 20,
  Component: BannerTemplate,
  Thumb: BannerThumb,
};

export default template;
