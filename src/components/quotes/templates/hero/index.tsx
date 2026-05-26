import "./hero.css";
import type { LayoutData, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "../types";
import { fmtDate, ItemsTable, NotesBlock, PaymentBlock, TotalsBlock } from "../shared";

function HeroTemplate(props: LayoutData) {
  const { company, client, items, payment, notes, currency, subtotal, discount, total } = props;
  return (
    <div className="layout-bold">
      <header className="hero">
        <div className="hero-grid">
          <div className="brand">
            {company.logoUrl ? (
              <img className="brand-logo" src={company.logoUrl} alt={company.name} />
            ) : (
              <div className="logo-mark">{company.initial}</div>
            )}
            <div className="brand-contact">
              {company.address && <div>{company.address.split("\n").join(" - ")}</div>}
              {(company.phone || company.email) && <div>{[company.phone, company.email].filter(Boolean).join(" - ")}</div>}
              {company.website && <div>{company.website}</div>}
            </div>
          </div>
          <div className="doc-id">
            <div className="eyebrow">Cotizacion</div>
            <div className="num">No. {client.quoteNumber}</div>
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
            <div className="k">Fecha de emision</div>
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

      <section className="items-wrap">
        <ItemsTable items={items} currency={currency} />
      </section>

      <section className="bottom">
        <div>
          <NotesBlock notes={notes} />
          <PaymentBlock payment={payment} />
        </div>
        <TotalsBlock subtotal={subtotal} discount={discount} total={total} currency={currency} />
      </section>
    </div>
  );
}

function HeroThumb({ accent, ink }: QuoteTemplateThumbProps) {
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto" aria-hidden="true">
      <rect width="40" height="52" rx="3" fill="#ffffff" stroke="#d7dce2" strokeWidth="0.6" />
      <rect x="0" y="0" width="40" height="19" rx="3" fill="#ffffff" />
      <circle cx="32" cy="2" r="11" fill={accent} opacity="0.15" />
      <rect x="4" y="5" width="6" height="6" rx="1.2" fill={accent} />
      <rect x="12" y="5" width="11" height="1.4" rx="0.5" fill={ink} opacity="0.8" />
      <rect x="12" y="8" width="15" height="1" rx="0.5" fill={ink} opacity="0.32" />
      <rect x="27" y="5" width="9" height="2.2" rx="0.7" fill={ink} opacity="0.85" />
      <rect x="25" y="9" width="11" height="1.2" rx="0.5" fill={ink} opacity="0.3" />
      <rect x="4" y="14" width="14" height="1.2" rx="0.5" fill={accent} opacity="0.7" />
      <rect x="19" y="14" width="8" height="1.2" rx="0.5" fill={ink} opacity="0.28" />
      <rect x="29" y="14" width="7" height="1.2" rx="0.5" fill={ink} opacity="0.28" />
      <path d="M0 17c10 3.7 28 3.7 40 0v6H0z" fill="#ffffff" />
      <rect x="4" y="25" width="32" height="2.5" rx="0.8" fill={ink} />
      <rect x="5.5" y="31" width="15" height="1.2" rx="0.5" fill={ink} opacity="0.42" />
      <rect x="27" y="31" width="7" height="1.2" rx="0.5" fill={ink} opacity="0.32" />
      <line x1="4" y1="34" x2="36" y2="34" stroke="#d7dce2" strokeWidth="0.5" />
      <rect x="5.5" y="37" width="13" height="1.2" rx="0.5" fill={ink} opacity="0.36" />
      <rect x="27" y="37" width="7" height="1.2" rx="0.5" fill={ink} opacity="0.32" />
      <rect x="22" y="43" width="14" height="5" rx="1" fill={accent} />
      <rect x="24" y="45" width="8" height="1.2" rx="0.5" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

const template: QuoteTemplateDefinition = {
  id: "bold",
  name: "Hero",
  order: 10,
  Component: HeroTemplate,
  Thumb: HeroThumb,
};

export default template;
