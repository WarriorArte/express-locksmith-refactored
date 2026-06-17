// Inventario.jsx — Cerrajería Express UI Kit

const inventarioData = [
  { id: 1, name: "Cilindro Mul-T-Lock MT5+", sku: "CIL-001", category: "Cilindros", stockStore: 5, stockWH: 12, price: "$1,850", status: "ok" },
  { id: 2, name: "Llave Yale Y100 maestra", sku: "LLV-042", category: "Llaves", stockStore: 2, stockWH: 1, price: "$320", status: "low" },
  { id: 3, name: "Chapa de seguridad CISA", sku: "CHP-008", category: "Chapas", stockStore: 8, stockWH: 20, price: "$2,100", status: "ok" },
  { id: 4, name: "Duplicador láser RW9", sku: "EQP-003", category: "Equipos", stockStore: 1, stockWH: 0, price: "$18,500", status: "low" },
  { id: 5, name: "Llave transponder Toyota", sku: "LLV-118", category: "Llaves", stockStore: 12, stockWH: 30, price: "$480", status: "ok" },
  { id: 6, name: "Cerradura sobreponer maestra", sku: "CRP-022", category: "Cerraduras", stockStore: 0, stockWH: 0, price: "$750", status: "out" },
];

function Inventario({ onNavigate }) {
  const [search, setSearch] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: "", sku: "", category: "Llaves", price: "", stock: "" });
  const [items, setItems] = React.useState(inventarioData);

  React.useEffect(() => { lucide.createIcons(); });

  const filtered = items.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e) => {
    e.preventDefault();
    const item = { id: items.length + 1, ...newItem, stockStore: parseInt(newItem.stock) || 0, stockWH: 0, status: parseInt(newItem.stock) > 2 ? "ok" : parseInt(newItem.stock) > 0 ? "low" : "out" };
    setItems([item, ...items]);
    setShowForm(false);
    setNewItem({ name: "", sku: "", category: "Llaves", price: "", stock: "" });
  };

  const stockStatus = (item) => {
    if (item.status === "out") return { label: "Sin stock", bg: "hsl(0 75% 95%)", color: "hsl(0 75% 45%)", dot: "hsl(0 75% 55%)" };
    if (item.status === "low") return { label: "Stock bajo", bg: "hsl(35 95% 94%)", color: "hsl(35 95% 30%)", dot: "hsl(35 95% 50%)" };
    return { label: "En stock", bg: "hsl(145 65% 94%)", color: "hsl(145 65% 35%)", dot: "hsl(145 65% 42%)" };
  };

  const inputStyle = { padding: "8px 12px", borderRadius: 10, border: "1.5px solid hsl(220 20% 88%)", background: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, color: "hsl(220 30% 15%)", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Inventario"
        subtitle="Productos y refacciones"
        action={
          <button onClick={() => setShowForm(!showForm)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: "none",
            background: showForm ? "hsl(220 20% 88%)" : "linear-gradient(135deg, hsl(40 80% 55%) 0%, hsl(40 80% 45%) 100%)",
            color: showForm ? "hsl(220 30% 15%)" : "hsl(40 90% 15%)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <i data-lucide={showForm ? "x" : "plus"} style={{ width: 15, height: 15 }}></i>
            {showForm ? "Cancelar" : "Agregar Producto"}
          </button>
        }
      />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <StatCard title="Total Productos" value={items.length.toString()} subtitle="En catálogo" icon="package" variant="primary" />
        <StatCard title="Stock Bajo" value={items.filter(i => i.status === "low").length.toString()} subtitle="Requieren reposición" icon="alert-triangle" variant="warning" />
        <StatCard title="Sin Stock" value={items.filter(i => i.status === "out").length.toString()} subtitle="Agotados" icon="x-circle" variant="info" />
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid hsl(220 70% 45% / 0.2)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08), 0 0 0 3px hsl(220 70% 45% / 0.06)", padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Nuevo Producto</h3>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "hsl(220 15% 45%)" }}>Nombre del Producto</label>
              <input style={inputStyle} placeholder="Ej. Cilindro Kwikset..." value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "hsl(220 15% 45%)" }}>SKU</label>
              <input style={inputStyle} placeholder="CIL-001" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "hsl(220 15% 45%)" }}>Categoría</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                {["Cilindros", "Llaves", "Chapas", "Cerraduras", "Equipos", "Accesorios"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "hsl(220 15% 45%)" }}>Precio</label>
              <input style={inputStyle} placeholder="$0.00" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid hsl(220 20% 88%)", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button type="submit" style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, hsl(220 70% 45%) 0%, hsl(220 70% 35%) 100%)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Guardar Producto</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative" }}>
        <i data-lucide="search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "hsl(220 15% 55%)" }}></i>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto, SKU..." style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px", borderRadius: 12, border: "1.5px solid hsl(220 20% 88%)", background: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, color: "hsl(220 30% 15%)", outline: "none" }} />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid hsl(220 20% 88% / 0.5)", boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px 80px 80px 100px", gap: 12, padding: "10px 18px", background: "hsl(220 20% 97%)", borderBottom: "1px solid hsl(220 20% 88%)" }}>
          {["SKU","Producto","Categoría","Tienda","Almacén","Estado"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "hsl(220 15% 45%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
          ))}
        </div>
        {filtered.map((p, i) => {
          const st = stockStatus(p);
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px 80px 80px 100px", gap: 12, padding: "12px 18px", borderBottom: i < filtered.length - 1 ? "1px solid hsl(220 20% 88%)" : "none", transition: "background 0.15s", cursor: "default" }}
              onMouseEnter={e => e.currentTarget.style.background = "hsl(220 20% 98%)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "hsl(220 15% 55%)", alignSelf: "center", fontFamily: "monospace" }}>{p.sku}</span>
              <div style={{ alignSelf: "center", minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "hsl(220 70% 45%)", fontWeight: 600 }}>{p.price}</div>
              </div>
              <span style={{ fontSize: 12, alignSelf: "center", color: "hsl(220 15% 45%)" }}>{p.category}</span>
              <span style={{ fontSize: 14, fontWeight: 600, alignSelf: "center", color: p.stockStore === 0 ? "hsl(0 75% 55%)" : p.stockStore <= 2 ? "hsl(35 95% 40%)" : "hsl(145 65% 35%)" }}>{p.stockStore}</span>
              <span style={{ fontSize: 14, fontWeight: 600, alignSelf: "center", color: "hsl(220 15% 45%)" }}>{p.stockWH}</span>
              <div style={{ alignSelf: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 9999, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, flexShrink: 0 }}></span>
                  {st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Inventario });
