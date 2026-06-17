// Dashboard.jsx — Cerrajería Express UI Kit

function QuickActions({ onNavigate }) {
  React.useEffect(() => { lucide.createIcons(); });
  const actions = [
    { icon: "package",       label: "Agregar Producto",  path: "inventario", bg: "hsl(220 70% 45%)", color: "#fff" },
    { icon: "file-text",     label: "Crear Cotización",  path: "cotizaciones", bg: "hsl(200 80% 50%)", color: "#fff" },
    { icon: "wrench",        label: "Iniciar Servicio",  path: "servicios", bg: "hsl(145 65% 42%)", color: "#fff" },
    { icon: "shopping-cart", label: "Registrar Venta",   path: "ventas", bg: "hsl(40 80% 50%)", color: "hsl(40 90% 15%)" },
  ];
  return (
    <div style={{ background: "linear-gradient(180deg,#fff 0%,hsl(220 20% 98%) 100%)", borderRadius: 20, border: "1px solid hsl(220 20% 88% / 0.5)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08)", padding: 18 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Acciones Rápidas</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {actions.map(a => (
          <button key={a.path} onClick={() => onNavigate(a.path)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            padding: "12px 8px", borderRadius: 12, border: "none",
            background: a.bg, color: a.color, cursor: "pointer",
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
            transition: "filter 0.15s, transform 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.92)"}
            onMouseLeave={e => e.currentTarget.style.filter = ""}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = ""}
          >
            <i data-lucide={a.icon} style={{ width: 20, height: 20 }}></i>
            <span style={{ textAlign: "center", lineHeight: 1.2 }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  React.useEffect(() => { lucide.createIcons(); });
  const items = [
    { icon: "shopping-cart", bg: "hsl(40 80% 94%)",  color: "hsl(40 90% 15%)", title: "Venta #0042",      desc: "Cliente mostrador · $1,200",    time: "hace 5 min" },
    { icon: "wrench",        bg: "hsl(145 65% 94%)", color: "hsl(145 65% 42%)", title: "Servicio #0019",  desc: "Duplicado de llave Ford...",     time: "hace 22 min" },
    { icon: "file-text",     bg: "hsl(200 80% 94%)", color: "hsl(200 80% 38%)", title: "Cotización #0088",desc: "Empresa ABC · $8,500",           time: "hace 1 h" },
    { icon: "users",         bg: "hsl(180 60% 94%)", color: "hsl(180 60% 35%)", title: "Nuevo cliente",   desc: "Ferretería López · Empresa",     time: "hace 2 h" },
    { icon: "package",       bg: "hsl(35 95% 94%)",  color: "hsl(35 95% 30%)",  title: "Producto agregado",desc: "Cilindro Mul-T-Lock · Stock: 8", time: "hace 3 h" },
  ];
  return (
    <div style={{ background: "linear-gradient(180deg,#fff 0%,hsl(220 20% 98%) 100%)", borderRadius: 20, border: "1px solid hsl(220 20% 88% / 0.5)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08)", padding: 18 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Actividad Reciente</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < items.length-1 ? "1px solid hsl(220 20% 88%)" : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i data-lucide={item.icon} style={{ width: 14, height: 14 }}></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: "hsl(220 15% 45%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 10, color: "hsl(220 15% 45%)", flexShrink: 0, whiteSpace: "nowrap" }}>{item.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceStatusBar() {
  const statuses = [
    { label: "Recibido",    count: 4, color: "hsl(200 80% 50%)" },
    { label: "En progreso", count: 7, color: "hsl(35 95% 50%)" },
    { label: "Completado",  count: 12, color: "hsl(145 65% 42%)" },
    { label: "Entregado",   count: 9, color: "hsl(220 70% 45%)" },
  ];
  const total = statuses.reduce((s, x) => s + x.count, 0);
  return (
    <div style={{ background: "linear-gradient(180deg,#fff 0%,hsl(220 20% 98%) 100%)", borderRadius: 20, border: "1px solid hsl(220 20% 88% / 0.5)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08)", padding: 18 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Estado de Servicios</h3>
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 10, marginBottom: 12 }}>
        {statuses.map((s, i) => (
          <div key={i} style={{ flex: s.count, background: s.color, transition: "flex 0.3s" }}></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {statuses.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }}></div>
            <span style={{ fontSize: 11, color: "hsl(220 15% 45%)" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }) {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Panel Principal"
        subtitle="Bienvenido, Juan Álvarez"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "hsl(220 15% 90% / 0.7)", background: "hsl(220 30% 100% / 0.08)", borderRadius: 20, padding: "4px 10px" }}>
            <i data-lucide="trending-up" style={{ width: 12, height: 12, color: "hsl(145 65% 55%)" }}></i>
            En vivo
          </div>
        }
      />
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <StatCard title="Cotizaciones del Mes" value="24" subtitle="12 aceptadas" icon="file-text" variant="info" />
        <StatCard title="Cotizaciones Aceptadas" value="75%" subtitle="18 de 24" icon="check-circle" variant="success" />
        <StatCard title="Ventas del Mes" value="$42,500" subtitle="18 transacciones" icon="shopping-cart" variant="secondary" />
        <StatCard title="Servicios Hoy" value="7" subtitle="Registrados hoy" icon="wrench" variant="primary" />
      </div>
      <ServiceStatusBar />
      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <RecentActivity />
        <QuickActions onNavigate={onNavigate} />
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
