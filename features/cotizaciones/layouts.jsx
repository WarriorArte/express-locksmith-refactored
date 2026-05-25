/* ========================================================================
   LAYOUTS — three structural variants for the cotización document
   Exported on window: LayoutBold, LayoutBanner, LayoutSidebar, Shared
   ======================================================================== */

const fmtMoney = (amt, sym) => {
  const fixed = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt);
  return `${sym} ${fixed}`;
};
const fmtNum = (amt) => new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt);
const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });

/* ---------- Shared subcomponents ---------- */
function ItemsTable({ items, currency }) {
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
            <td className="num">{String(i + 1).padStart(2, '0')}</td>
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

function TotalsBlock({ subtotal, tax, taxRate, total, currency }) {
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

function NotesBlock({ notes }) {
  return (
    <div className="notes">
      <h4>Notas y términos</h4>
      <p>{notes}</p>
    </div>
  );
}

function PaymentBlock({ payment }) {
  return (
    <div className="payment">
      <h4>Información de pago</h4>
      <div className="grid">
        <div className="k">Cuenta №</div>
        <div className="v">{payment.account}</div>
        <div className="k">A nombre</div>
        <div className="v">{payment.name}</div>
        <div className="k">Banco</div>
        <div className="v">{payment.bank}</div>
      </div>
    </div>
  );
}

/* ============================================================
   LAYOUT A — BOLD
   ============================================================ */
function LayoutBold({ company, client, items, payment, notes, currency, taxRate, subtotal, tax, total }) {
  return (
    <div className="layout-bold">
      <header className="hero">
        <div className="hero-grid">
          <div className="brand">
            <div className="logo-mark">{company.initial}</div>
            <div>
              <div className="brand-name">{company.name}</div>
              <div className="brand-slogan">{company.slogan}</div>
            </div>
          </div>
          <div className="doc-id">
            <div className="eyebrow">Cotización</div>
            <div className="num">№ {client.quoteNumber}</div>
            <div className="date">{fmtDate(client.date)} · vigencia {client.validUntil}</div>
          </div>
        </div>

        <div className="hero-meta">
          <div className="cell">
            <div className="k">Preparado para</div>
            <div className="v">{client.name}</div>
            <div className="v small">Atn. {client.contact}</div>
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
            <path d="M0,0 C200,60 600,60 800,0 L800,60 L0,60 Z" fill="var(--paper)"/>
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
            <path d="M0,50 C200,-10 600,-10 800,50 L800,0 L0,0 Z" fill="var(--paper)"/>
          </svg>
        </div>
        <div className="foot-grid">
          <div>
            <div className="thanks">Gracias por la oportunidad<span className="accent">.</span></div>
            <div className="contact">
              <div>{company.address.split('\n')[0]} · {company.address.split('\n')[1]}</div>
              <div>{company.phone} · {company.email}</div>
              <div>{company.website}</div>
            </div>
          </div>
          <div className="signature">
            <div className="line"></div>
            <div className="sig-label">Firma autorizada</div>
            <div className="sig-name">{company.name}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   LAYOUT B — BANNER
   ============================================================ */
function LayoutBanner({ company, client, items, payment, notes, currency, taxRate, subtotal, tax, total }) {
  return (
    <div className="layout-banner">
      <header className="b-head">
        <div className="brand">
          <div className="logo-mark">{company.initial}</div>
          <div>
            <div className="brand-name">{company.name}</div>
            <div className="brand-slogan">{company.slogan}</div>
          </div>
        </div>
        <div className="meta">
          <div><strong>Cot. №</strong> {client.quoteNumber}</div>
          <div><strong>Emisión</strong> {fmtDate(client.date)}</div>
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
          <div className="v small">Atn. {client.contact}</div>
          <div className="v small" style={{whiteSpace: 'pre-line', marginTop: 6}}>
            {company.address}
          </div>
        </div>
        <div className="cell">
          <div className="k">Detalle del documento</div>
          <div className="mono-grid">
            <div className="k">Número</div><div className="v">{client.quoteNumber}</div>
            <div className="k">Emisión</div><div className="v">{fmtDate(client.date)}</div>
            <div className="k">Validez</div><div className="v">{client.validUntil}</div>
            <div className="k">Moneda</div><div className="v">{currency} · GTQ</div>
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
              <div>{company.phone} · {company.email}</div>
              <div>{company.website}</div>
            </div>
          </div>
          <div className="signature">
            <div className="line"></div>
            <div className="sig-label">Firma autorizada</div>
            <div className="sig-name">{company.name}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   LAYOUT C — CLASSIC (office-template style: bordered form + signature)
   ============================================================ */
function LayoutClassic({ company, client, items, payment, notes, currency, taxRate, subtotal, tax, total }) {
  const projectDesc = 'Desarrollo integral de aplicación móvil: diseño UI, frontend en React Native, infraestructura en AWS, licencias de gestión, soporte técnico especializado y auditoría de seguridad informática.';
  return (
    <div className="layout-classic">
      <header className="c-head">
        <div className="c-brand">
          <div className="c-logo">{company.initial}</div>
          <div className="c-brand-info">
            <div className="name">{client.contact}</div>
            <div className="company">{company.name}</div>
            <div className="addr">{company.address.split('\n')[0]}</div>
            <div className="addr">{company.address.split('\n')[1]}</div>
            <div className="contact">Tel: {company.phone}</div>
            <div className="contact">{company.email}</div>
            <div className="contact">{company.website}</div>
          </div>
        </div>
        <div className="c-title">
          <div className="c-title-eyebrow">Documento</div>
          <h2>Cotización</h2>
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
            <span className="lbl">Email:</span>
            <span className="val">{company.email}</span>
          </div>
          <div className="row r2">
            <span className="lbl">Teléfono:</span>
            <span className="val">{company.phone}</span>
            <span className="lbl">Dirección:</span>
            <span className="val">{company.address.replace('\n', ', ')}</span>
          </div>
          <div className="row r3">
            <span className="lbl">Contacto:</span>
            <span className="val">{client.contact}</span>
            <span className="lbl">Validez:</span>
            <span className="val">{client.validUntil}</span>
            <span className="lbl">Emisión:</span>
            <span className="val">{fmtDate(client.date)}</span>
          </div>
        </div>
      </section>

      <section className="c-project">
        <div className="c-project-label">Descripción del proyecto:</div>
        <div className="c-project-box">{projectDesc}</div>
      </section>

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
            {items.map((it) => (
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
          <div className="c-notes-title">Esta cotización está sujeta a los siguientes términos:</div>
          <div className="c-notes-body">{notes}</div>
          <div className="c-notes-pay">
            <strong>Información de pago.</strong> Cuenta {payment.account} a nombre de {payment.name} · {payment.bank}.
          </div>
        </div>
        <table className="c-totals">
          <tbody>
            <tr>
              <td className="k">SUB TOTAL</td>
              <td className="v">{fmtMoney(subtotal, currency)}</td>
            </tr>
            <tr>
              <td className="k">IVA ({taxRate}%)</td>
              <td className="v">{fmtMoney(tax, currency)}</td>
            </tr>
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
          <div className="name">{client.contact} — {client.name}</div>
        </div>
        <div className="sig with-stamp">
          <div className="lbl">Aprobado:</div>
          <div className="line"></div>
          <div className="name">{company.name}</div>
          <div className="stamp" aria-hidden="true">
            <span>APROBADO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, {
  LayoutBold,
  LayoutBanner,
  LayoutClassic,
});
