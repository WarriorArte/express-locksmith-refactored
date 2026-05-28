// Servicios — hero header + status filter chips + service list.

function ServiciosScreen({ user, onAvatarClick }) {
  const [filter, setFilter] = React.useState('all');
  const m = window.mockData;
  const map = window.statusMap;
  const services = filter === 'all' ? m.services : m.services.filter(s => s.status === filter);

  const buckets = [
    { key: 'pending',     label: 'Pendientes',  count: m.stats.services.pending,     color: '#FFB830' },
    { key: 'in_progress', label: 'En Curso',    count: m.stats.services.in_progress, color: '#9898D0' },
    { key: 'completed',   label: 'Finalizados', count: m.stats.services.completed,   color: 'hsl(159 100% 45% / .55)' },
    { key: 'delivered',   label: 'Entregados',  count: m.stats.services.delivered,   color: '#00E5A0' },
    { key: 'cancelled',   label: 'Cancelados',  count: m.stats.services.cancelled,   color: '#FF4D6A' },
  ];
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;

  const chips = [
    { key: 'all',         label: 'Todos',     count: m.services.length },
    { key: 'pending',     label: 'Pendientes', count: m.services.filter(s => s.status === 'pending').length },
    { key: 'in_progress', label: 'En Curso',   count: m.services.filter(s => s.status === 'in_progress').length },
    { key: 'completed',   label: 'Finalizados',count: m.services.filter(s => s.status === 'completed').length },
    { key: 'delivered',   label: 'Entregados', count: m.services.filter(s => s.status === 'delivered').length },
  ];

  return (
    <div className="scroll">
      <div className="hero">
        <div className="hero-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hero-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Servicios
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--primary)', font:'700 10px/1 var(--font-sans)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                <span className="live-dot" /> En vivo
              </span>
            </div>
            <h1>En el <span className="accent">taller.</span></h1>
            <div className="hero-meta">
              <b>{m.stats.services.today} servicios</b> hoy · <b>{m.stats.services.in_progress} en curso</b> en este momento.
            </div>
          </div>
          <button type="button" className="hero-avatar notify" aria-label="Cuenta" onClick={onAvatarClick} style={{ border: 'none' }}>{user.initial}</button>
        </div>

        {/* Inline status-bar lockup */}
        <div className="hero-kpi" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
          <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: 'hsl(0 0% 100% / 0.08)' }}>
            {buckets.map(b => (
              <div key={b.key} style={{ width: `${(b.count / total) * 100}%`, background: b.color, transition: 'width 320ms var(--ease-out)' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {buckets.map(b => (
              <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                  <span style={{ font: '600 9px/1 var(--font-sans)', color: 'hsl(240 22% 95% / 0.6)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
                </div>
                <div style={{ font: '800 18px/1 var(--font-sans)', color: 'var(--moonlight)', fontVariantNumeric: 'tabular-nums' }}>{b.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter chips — horizontally scrollable */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 16, paddingBottom: 4 }} className="ds-no-scrollbar">
        {chips.map(c => {
          const active = filter === c.key;
          const s = window.statusMap[c.key];
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: active ? 'var(--primary)' : 'var(--card)',
                color: active ? 'var(--primary-fg)' : 'var(--fg)',
                font: '600 12px/1 var(--font-sans)',
                cursor: 'pointer',
                boxShadow: active ? '0 0 16px hsl(159 100% 45% / 0.30)' : 'none',
              }}
            >
              {s && c.key !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color, display: 'inline-block' }} />}
              {c.label}
              <span style={{ opacity: 0.7, fontWeight: 700 }}>{c.count}</span>
            </button>
          );
        })}
      </div>

      <div className="sec-head">
        <h2>Cola de trabajo</h2>
      </div>

      <div className="svc-list">
        {services.map(s => {
          const st = map[s.status];
          return (
            <div key={s.id} className="svc-row">
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: st.bg, color: st.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name="wrench" size={18} />
              </div>
              <div className="svc-row-body">
                <div className="svc-row-title">
                  {s.number} · <span className="muted" style={{ fontWeight: 500 }}>{s.customer}</span>
                </div>
                <div className="svc-row-sub">{s.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 8px', borderRadius: 4,
                    background: st.bg, color: st.fg,
                    font: '700 10px/1 var(--font-sans)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: st.color }} />
                    {st.label}
                  </span>
                  <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}><Icon name="clock" size={11} /> {s.time}</span>
                </div>
              </div>
              <div className="svc-row-amount">{fmt2(s.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.ServiciosScreen = ServiciosScreen;
