import type { LayoutData, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "../types";
import { fmtDate, ItemsTable, NotesBlock, PaymentBlock, TotalsBlock } from "../shared";

function HeroTemplate(props: LayoutData) {
  const { company, client, items, payment, notes, currency, subtotal, total } = props;
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
            <div>
              <div className="brand-name">{company.name}</div>
              {company.slogan && <div className="brand-slogan">{company.slogan}</div>}
              <div className="brand-contact">
                {company.address && <div>{company.address.split("\n").join(" - ")}</div>}
                {(company.phone || company.email) && <div>{[company.phone, company.email].filter(Boolean).join(" - ")}</div>}
                {company.website && <div>{company.website}</div>}
              </div>
            </div>
          </div>
          <div className="doc-id">
            <div className="eyebrow">Cotizacion</div>
            <div className="num">No. {client.quoteNumber}</div>
            <div className="date">{fmtDate(client.date)} - vigencia {client.validUntil}</div>
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
        <TotalsBlock subtotal={subtotal} total={total} currency={currency} />
      </section>
    </div>
  );
}

function HeroThumb({ accent, ink }: QuoteTemplateThumbProps) {
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto">
      <rect width="40" height="52" rx="2" fill="hsl(var(--muted))" />
      <rect width="40" height="18" fill={ink} />
      <rect x="22" y="14" width="14" height="6" rx="1" fill={accent} />
      <rect x="4" y="24" width="32" height="3" rx="1" fill={ink} opacity=".35" />
      <rect x="4" y="29" width="32" height="2" rx="1" fill={ink} opacity=".2" />
      <rect x="4" y="33" width="32" height="2" rx="1" fill={ink} opacity=".2" />
      <rect x="4" y="37" width="32" height="2" rx="1" fill={ink} opacity=".2" />
      <rect y="44" width="40" height="8" fill={ink} />
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
