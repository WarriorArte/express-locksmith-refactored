import type { LayoutData, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "../types";
import { fmtDate, ItemsTable, NotesBlock, PaymentBlock, TotalsBlock } from "../shared";

function BannerTemplate(props: LayoutData) {
  const { company, client, items, payment, notes, currency, subtotal, total } = props;
  return (
    <div className="layout-banner">
      <header className="b-head">
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
        <div className="meta">
          <div><strong>Cot. No.</strong> {client.quoteNumber}</div>
          <div><strong>Emision</strong> {fmtDate(client.date)}</div>
          <div><strong>Validez</strong> {client.validUntil}</div>
        </div>
      </header>

      <div className="banner" aria-hidden="true">
        <div className="stripe"></div>
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
            <div className="k">Numero</div><div className="v">{client.quoteNumber}</div>
            <div className="k">Emision</div><div className="v">{fmtDate(client.date)}</div>
            <div className="k">Validez</div><div className="v">{client.validUntil}</div>
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
        <TotalsBlock subtotal={subtotal} total={total} currency={currency} />
      </section>
    </div>
  );
}

function BannerThumb({ accent, ink }: QuoteTemplateThumbProps) {
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" className="mx-auto">
      <rect width="40" height="52" rx="2" fill="hsl(var(--muted))" />
      <rect x="4" y="4" width="14" height="3" rx="1" fill={ink} />
      <rect x="22" y="4" width="14" height="2" rx="1" fill={ink} opacity=".4" />
      <rect y="14" width="40" height="9" fill={accent} />
      <rect x="4" y="27" width="32" height="3" rx="1" fill={ink} opacity=".35" />
      <rect x="4" y="32" width="32" height="2" rx="1" fill={ink} opacity=".2" />
      <rect x="4" y="36" width="32" height="2" rx="1" fill={ink} opacity=".2" />
      <rect x="22" y="44" width="14" height="4" rx="1" fill={accent} />
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
