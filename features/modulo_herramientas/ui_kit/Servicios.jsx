// Servicios.jsx — Cerrajería Express UI Kit

const serviciosData = [
  { id: "SRV-0019", client: "Juan Pérez", desc: "Duplicado de llave Ford Focus 2019", status: "En progreso", date: "30 abr 2026", amount: "$450", assigned: "Carlos" },
  { id: "SRV-0018", client: "Ferretería López", desc: "Instalación de chapa de seguridad", status: "Completado", date: "29 abr 2026", amount: "$1,200", assigned: "María" },
  { id: "SRV-0017", client: "Ana Torres", desc: "Apertura de cerradura Mul-T-Lock", status: "Recibido", date: "29 abr 2026", amount: "$350", assigned: "Sin asignar" },
  { id: "SRV-0016", client: "Constructora ABC", desc: "Masterización de llaves (x8)", status: "En progreso", date: "28 abr 2026", amount: "$2,800", assigned: "Carlos" },
  { id: "SRV-0015", client: "Hotel Central", desc: "Cambio de cilindros habitaciones 201-210", status: "Entregado", date: "27 abr 2026", amount: "$6,500", assigned: "María" },
  { id: "SRV-0014", client: "Pedro Ramírez", desc: "Apertura de vehículo + copia llave", status: "Completado", date: "26 abr 2026", amount: "$600", assigned: "Carlos" },
];

const statusConfig = {
  "Recibido":    { bg: "hsl(200 80% 94%)", color: "hsl(200 80% 38%)", dot: "hsl(200 80% 50%)" },
  "En progreso": { bg: "hsl(35 95% 94%)",  color: "hsl(35 95% 30%)",  dot: "hsl(35 95% 50%)" },
  "Completado":  { bg: "hsl(145 65% 94%)", color: "hsl(145 65% 35%)", dot: "hsl(145 65% 42%)" },
  "Entregado":   { bg: "hsl(220 70% 95%)", color: "hsl(220 70% 40%)", dot: "hsl(220 70% 45%)" },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig["Recibido"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 9999, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }}></span>
      {status}
    </span>
  );
}

function Servicios({ onNavigate }) {
  const [selected, setSelected] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("Todos");

  React.useEffect(() => { lucide.createIcons(); });

  const filtered = serviciosData.filter(s => {
    const matchSearch = !search || s.client.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Todos" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const detail = selected ? serviciosData.find(s => s.id === selected) : null;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Servicios"
        subtitle="Órdenes de servicio activas e historial"
        action={
          <button style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 12, border: "none", background: "linear-gradient(135deg, hsl(40 80% 55%) 0%, hsl(40 80% 45%) 100%)",
            color: "hsl(40 90% 15%)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08), 0 0 20px hsl(40 80% 50% / 0.25)",
          }}>
            <i data-lucide="plus" style={{ width: 15, height: 15 }}></i>
            Nuevo Servicio
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <i data-lucide="search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "hsl(220 15% 55%)" }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio, cliente..." style={{
            width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px",
            borderRadius: 12, border: "1.5px solid hsl(220 20% 88%)",
            background: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, color: "hsl(220 30% 15%)", outline: "none",
          }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Todos", "Recibido", "En progreso", "Completado", "Entregado"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "6px 12px", borderRadius: 9999, border: "1.5px solid",
              borderColor: filterStatus === s ? "hsl(220 70% 45%)" : "hsl(220 20% 88%)",
              background: filterStatus === s ? "hsl(220 70% 95%)" : "#fff",
              color: filterStatus === s ? "hsl(220 70% 45%)" : "hsl(220 15% 45%)",
              fontSize: 11, fontWeight: filterStatus === s ? 600 : 400,
              cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid hsl(220 20% 88% / 0.5)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 140px 110px 90px", gap: 12, padding: "10px 18px", background: "hsl(220 20% 97%)", borderBottom: "1px solid hsl(220 20% 88%)" }}>
          {["# Orden","Descripción","Cliente","Estado","Monto"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "hsl(220 15% 45%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
          ))}
        </div>
        {/* Rows */}
        {filtered.map((svc, i) => (
          <div key={svc.id} onClick={() => setSelected(selected === svc.id ? null : svc.id)} style={{
            display: "grid", gridTemplateColumns: "100px 1fr 140px 110px 90px", gap: 12, padding: "12px 18px",
            borderBottom: i < filtered.length - 1 ? "1px solid hsl(220 20% 88%)" : "none",
            cursor: "pointer", background: selected === svc.id ? "hsl(220 70% 97%)" : "transparent",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => { if (selected !== svc.id) e.currentTarget.style.background = "hsl(220 20% 98%)"; }}
            onMouseLeave={e => { if (selected !== svc.id) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(220 70% 45%)", alignSelf: "center" }}>{svc.id}</span>
            <div style={{ alignSelf: "center", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.desc}</div>
              <div style={{ fontSize: 11, color: "hsl(220 15% 45%)" }}>{svc.date} · {svc.assigned}</div>
            </div>
            <span style={{ fontSize: 13, alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.client}</span>
            <div style={{ alignSelf: "center" }}><StatusBadge status={svc.status} /></div>
            <span style={{ fontSize: 13, fontWeight: 600, alignSelf: "center" }}>{svc.amount}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "hsl(220 15% 55%)", fontSize: 13 }}>No se encontraron servicios</div>
        )}
      </div>

      {/* Detail panel */}
      {detail && (
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid hsl(220 20% 88% / 0.5)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08)", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "hsl(220 15% 45%)", fontWeight: 600 }}>{detail.id}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{detail.desc}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "hsl(220 15% 92%)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(220 15% 45%)" }}>
              <i data-lucide="x" style={{ width: 14, height: 14 }}></i>
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { l: "Cliente", v: detail.client },
              { l: "Estado", v: <StatusBadge status={detail.status} /> },
              { l: "Asignado a", v: detail.assigned },
              { l: "Monto", v: <strong style={{ color: "hsl(220 70% 45%)" }}>{detail.amount}</strong> },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "hsl(220 15% 45%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button style={{ padding: "7px 14px", borderRadius: 10, border: "1.5px solid hsl(220 20% 88%)", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer" }}>Ver ticket</button>
            <button style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: "hsl(145 65% 42%)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Marcar completado</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Servicios });
