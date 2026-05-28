// Dashboard — the headline redesign work.
// Layout: Hero header (greeting + live chip) → Stat rail (primary stat hero + 2 satellite stats)
// → Service status bar → Low stock + Upcoming quotes (mobile-stacked, lg side-by-side) → Activity.

const fmt = (n) => '$ ' + (n || 0).toLocaleString('es-CO');

function StatCard({ primary, icon, label, value, foot, trend, neutral }) {
  return (
    <div className={`stat ${primary ? 'primary' : ''}`}>
      <div className="stat-row">
        <div className={`stat-ico ${neutral ? 'neutral' : ''}`}>
          <Icon name={icon} size={18} />
        </div>
        {trend != null && (
          <span className="stat-trend">↑ {trend}%</span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

function ServiceStatusBar({ stats }) {
  const buckets = [
    { key: 'pending',     label: 'Pendientes',  count: stats.pending,     color: '#FFB830' },
    { key: 'in_progress', label: 'En Curso',    count: stats.in_progress, color: '#9898D0' },
    { key: 'completed',   label: 'Finalizados', count: stats.completed,   color: 'hsl(159 100% 45% / .55)' },
    { key: 'delivered',   label: 'Entregados',  count: stats.delivered,   color: '#00E5A0' },
    { key: 'cancelled',   label: 'Cancelados',  count: stats.cancelled,   color: '#FF4D6A' },
  ];
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
  return (
    <div className="card">
      <div className="row-spread" style={{ marginBottom: 4 }}>
        <h3 className="card-title">Estado de Servicios</h3>
        <span className="muted" style={{ fontWeight: 600, fontSize: 12 }}>{total} hoy</span>
      </div>
      <div className="svc-bar">
        {buckets.map(b => (
          <div key={b.key} style={{ width: `${(b.count / total) * 100}%`, background: b.color }} />
        ))}
      </div>
      <div className="svc-legend">
        {buckets.map(b => (
          <div key={b.key} className="svc-leg">
            <span className="dot" style={{ background: b.color }} />
            <div>
              <div className="lab">{b.label}</div>
              <div className="num">{b.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LowStockCard({ products, onNavigate }) {
  return (
    <div className="card">
      <div className="row-spread" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            background: 'hsl(36 100% 94%)', color: '#FFB830',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="alert-triangle" size={18} />
          </div>
          <div>
            <h3 className="card-title" style={{ marginBottom: 2 }}>Stock Bajo</h3>
            <div className="card-sub">Productos por reabastecer</div>
          </div>
        </div>
        <button className="ds-btn ds-btn--secondary" style={{ height: 32, fontSize: 11 }} onClick={() => onNavigate('inventario')}>
          Ver todos
        </button>
      </div>
      <div className="col-gap-12">
        {products.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'var(--surface-2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)'
            }}>
              <Icon name="package" size={18} color="var(--fg-muted)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 13px/1.2 var(--font-sans)' }}>{p.name}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Mínimo sugerido: {p.min}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ font: '800 16px/1 var(--font-sans)', color: 'var(--destructive)' }}>{p.stock}</div>
              <div className="muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>disponibles</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingQuotesCard({ quotes }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="calendar" size={18} color="var(--primary)" />
        <h3 className="card-title">Cotizaciones por Vencer</h3>
      </div>
      <div className="col-gap-12">
        {quotes.map(q => {
          const status = q.days <= 2 ? 'danger' : q.days <= 5 ? 'warning' : 'info';
          const bg = status === 'danger' ? 'hsl(350 100% 95% / 0.5)'
                    : status === 'warning' ? 'hsl(36 100% 94% / 0.5)'
                    : 'hsl(240 30% 94% / 0.5)';
          const dot = status === 'danger' ? '#FF4D6A' : status === 'warning' ? '#FFB830' : '#9898D0';
          return (
            <div key={q.id} style={{ background: bg, borderRadius: 'var(--radius)', padding: '12px 14px', position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 99, background: dot }} />
              <div style={{ paddingLeft: 8, minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Icon name="user" size={14} color="var(--fg-muted)" />
                  <span style={{ font: '600 13px/1.2 var(--font-sans)' }}>{q.customer}</span>
                </div>
                <div className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: '800 14px/1 var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>{fmt(q.total)}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <Icon name="clock" size={12} /> {q.days} días
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityCard({ items }) {
  const cfg = {
    venta:      { icon: 'shopping-cart', bg: 'hsl(240 30% 94%)', fg: 'hsl(240 40% 40%)' },
    servicio:   { icon: 'wrench',        bg: 'hsl(159 100% 94%)', fg: '#0D0D12' },
    cotizacion: { icon: 'file-text',     bg: 'hsl(240 30% 94%)', fg: 'hsl(240 40% 40%)' },
    cliente:    { icon: 'users',         bg: 'hsl(240 30% 94%)', fg: 'hsl(240 40% 40%)' },
    producto:   { icon: 'package',       bg: 'hsl(36 100% 94%)', fg: 'hsl(28 80% 35%)' },
  };
  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 12 }}>Actividad Reciente</h3>
      <div>
        {items.map(it => {
          const c = cfg[it.type];
          return (
            <div key={it.id} className="act-row">
              <div className="act-ico" style={{ background: c.bg, color: c.fg }}>
                <Icon name={c.icon} size={14} />
              </div>
              <div className="act-body">
                <div className="act-title">{it.title}</div>
                <div className="act-desc">{it.desc}</div>
              </div>
              <div className="act-time"><Icon name="clock" size={12} /> {it.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroSparkline({ data }) {
  // 7 days of sales — last bar highlighted
  return (
    <div className="hero-spark" aria-hidden="true">
      {data.map((h, i) => (
        <div
          key={i}
          className={`b ${i === data.length - 1 ? 'peak' : ''}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function DashboardScreen({ user, onNavigate, onAvatarClick }) {
  const m = window.mockData;
  // 7-day sales trend (synthetic, for the inline sparkline)
  const trend7d = [38, 52, 41, 64, 56, 78, 92];
  return (
    <div className="scroll">
      <div className="hero">
        <div className="hero-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hero-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Panel principal · {String(m.greeting.hour).padStart(2,'0')}:{String(m.greeting.minute).padStart(2,'0')}
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--primary)', font:'700 10px/1 var(--font-sans)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                <span className="live-dot" /> En vivo
              </span>
            </div>
            <h1>Hola, <span className="accent">{user.name}.</span></h1>
            <div className="hero-meta">
              <b>{m.stats.services.in_progress} servicios en curso</b> y <b>{m.stats.quotes.expiring_this_week} cotizaciones</b> a punto de vencer esta semana.
            </div>
          </div>
          <button
            className="hero-avatar notify"
            type="button"
            onClick={onAvatarClick}
            aria-label="Cuenta"
            style={{ border: 'none' }}
          >
            {user.initial}
          </button>
        </div>

        {/* KPI lockup inside the hero */}
        <div className="hero-kpi">
          <div style={{ minWidth: 0 }}>
            <div className="hero-kpi-label">ventas del mes</div>
            <div className="hero-kpi-value">{fmt(m.stats.sales.total)}</div>
            <span className="hero-kpi-trend">
              ↑ {m.stats.sales.trend}% &nbsp;<span style={{ color: 'hsl(240 22% 95% / 0.55)', fontWeight: 500 }}>vs {fmt(m.stats.sales.vs_prev)} mes anterior</span>
            </span>
          </div>
          <HeroSparkline data={trend7d} />
        </div>
      </div>

      {/* Two secondary stats overlap the hero's bottom edge on mobile */}
      <div className="hero-secondaries">
        <div className="hero-secondary">
          <div className="ic"><Icon name="wrench" size={16} /></div>
          <div className="lab">servicios hoy</div>
          <div className="val">{m.stats.services.today}</div>
          <div className="foot">{m.stats.services.pending} pendientes · {m.stats.services.in_progress} en curso</div>
        </div>
        <div className="hero-secondary">
          <div className="ic"><Icon name="file-text" size={16} /></div>
          <div className="lab">cotizaciones</div>
          <div className="val">{m.stats.quotes.total}</div>
          <div className="foot">{m.stats.quotes.expiring_this_week} vencen esta semana</div>
        </div>
      </div>

      <div className="sec-head">
        <h2>Operación de hoy</h2>
      </div>
      <ServiceStatusBar stats={m.stats.services} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 16 }} className="dashboard-grid">
        <LowStockCard products={m.lowStock} onNavigate={onNavigate} />
        <UpcomingQuotesCard quotes={m.expiringQuotes} />
        <ActivityCard items={m.activity} />
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1.5fr 1fr !important; }
          .dashboard-grid > :nth-child(3) { grid-column: 2; grid-row: 1 / span 2; }
        }
      `}</style>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
