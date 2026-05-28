// Mock data for the UI kit — mirrors the shape of the source codebase's
// API responses (sales, services, quotes, products) so swapping in real data
// is mostly a rename.

window.mockData = {
  user: { name: "Joshua", initial: "J", workshop: "Cerrajería Express", code: "ELE-2024" },

  greeting: { hour: 18, minute: 42 }, // for hero eyebrow

  stats: {
    sales:  { total: 1250000, vs_prev: 1060000, trend: 18 },
    services: { today: 24, pending: 8, in_progress: 12, completed: 9, delivered: 11, cancelled: 2 },
    quotes: { total: 142, expiring_this_week: 3 },
  },

  lowStock: [
    { id: "p1", name: "Llave Chip 4D Toyota",       stock: 1, min: 4, category: "Automotriz", color: "#9898D0" },
    { id: "p2", name: "Cerradura Yale 5-pin",       stock: 2, min: 6, category: "Residencial", color: "#FF6B9D" },
    { id: "p3", name: "Cilindro europeo 70mm",      stock: 3, min: 8, category: "Residencial", color: "#FF6B9D" },
  ],

  expiringQuotes: [
    { id: "q1", number: "COT-1042", customer: "María Restrepo",   desc: "Cambio cerradura puerta principal",       total: 320000, days: 1 },
    { id: "q2", number: "COT-1039", customer: "Taller Carrera 8", desc: "Duplicado x4 llaves automotrices",        total: 145000, days: 3 },
    { id: "q3", number: "COT-1031", customer: "Café del Centro",  desc: "Instalación cerradura comercial reforzada", total: 980000, days: 5 },
  ],

  activity: [
    { id: "a1", type: "venta",     title: "Venta VEN-0421", desc: "Cliente mostrador · $ 28.500",      time: "hace 4 min" },
    { id: "a2", type: "servicio",  title: "Servicio SRV-318", desc: "Apertura puerta · En curso",       time: "hace 18 min" },
    { id: "a3", type: "cotizacion",title: "Cotización COT-1042", desc: "M. Restrepo · $ 320.000",      time: "hace 1 h" },
    { id: "a4", type: "cliente",   title: "Nuevo cliente",  desc: "Café del Centro · Empresa",        time: "hace 2 h" },
    { id: "a5", type: "producto",  title: "Producto agregado", desc: "Cilindro europeo 70mm · stock 8", time: "hace 5 h" },
  ],

  products: [
    { id: "p1", name: "Llave Chip 4D Toyota",       price: 145000, stock_store: 1,  stock_warehouse: 2,  category: "Automotriz",  color: "#9898D0", glyph: "key-round", status: "low" },
    { id: "p2", name: "Cerradura Yale 5-pin",       price: 68500,  stock_store: 2,  stock_warehouse: 0,  category: "Residencial", color: "#FF6B9D", glyph: "lock",      status: "low" },
    { id: "p3", name: "Cilindro europeo 70mm",      price: 32000,  stock_store: 3,  stock_warehouse: 5,  category: "Residencial", color: "#FF6B9D", glyph: "key",       status: "low" },
    { id: "p4", name: "Cerradura comercial reforzada", price: 240000, stock_store: 6, stock_warehouse: 12, category: "Comercial", color: "#22D3EE", glyph: "shield",    status: "ok" },
    { id: "p5", name: "Llave codificada Renault",   price: 95000,  stock_store: 4,  stock_warehouse: 8,  category: "Automotriz",  color: "#9898D0", glyph: "key-round", status: "ok" },
    { id: "p6", name: "Cerrojo industrial doble",   price: 410000, stock_store: 2,  stock_warehouse: 4,  category: "Industrial",  color: "#FFB830", glyph: "lock-keyhole",status: "ok" },
    { id: "s1", name: "Apertura puerta residencial",price: 45000,  isService: true, category: "Servicio",   color: "#00E5A0", glyph: "wrench" },
    { id: "s2", name: "Copiado llave automotriz",   price: 32000,  isService: true, category: "Servicio",   color: "#00E5A0", glyph: "wrench" },
  ],

  services: [
    { id: "sv1", number: "SRV-318", customer: "Carlos Méndez", desc: "Apertura puerta automotriz · Mazda 3",     amount: 85000, status: "in_progress", time: "10:42" },
    { id: "sv2", number: "SRV-317", customer: "Ana Patricia",  desc: "Cambio cilindro residencial",              amount: 145000, status: "pending",    time: "09:20" },
    { id: "sv3", number: "SRV-316", customer: "Café del Centro", desc: "Instalación cerradura comercial",         amount: 480000, status: "completed",  time: "08:15" },
    { id: "sv4", number: "SRV-315", customer: "Luisa Ramírez", desc: "Duplicado x3 llaves residencia",           amount: 36000, status: "delivered",  time: "ayer" },
    { id: "sv5", number: "SRV-314", customer: "Mostrador",     desc: "Reparación chapa motocicleta",             amount: 65000, status: "in_progress", time: "ayer" },
  ],
};

window.statusMap = {
  pending:     { label: "Pendiente",  color: "#FFB830", bg: "hsl(36 100% 94%)",  fg: "hsl(28 80% 35%)" },
  in_progress: { label: "En Curso",   color: "#9898D0", bg: "hsl(240 30% 94%)",  fg: "hsl(240 40% 40%)" },
  completed:   { label: "Finalizado", color: "hsl(159 100% 45% / .7)", bg: "hsl(159 100% 94%)", fg: "#0D0D12" },
  delivered:   { label: "Entregado",  color: "#00E5A0", bg: "#00E5A0", fg: "#0D0D12" },
  cancelled:   { label: "Cancelado",  color: "#FF4D6A", bg: "hsl(350 100% 95%)", fg: "#FF4D6A" },
};
