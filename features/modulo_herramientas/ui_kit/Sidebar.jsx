// Sidebar.jsx — Cerrajería Express UI Kit
// Collapsible desktop sidebar + mobile drawer

const sidebarNavItems = [
  { icon: "layout-dashboard", label: "Dashboard",     path: "dashboard" },
  { icon: "package",          label: "Inventario",    path: "inventario" },
  { icon: "file-text",        label: "Cotizaciones",  path: "cotizaciones" },
  { icon: "users",            label: "Clientes",      path: "clientes" },
  { icon: "wrench",           label: "Servicios",     path: "servicios" },
  { icon: "shopping-cart",    label: "Ventas",        path: "ventas" },
  { icon: "shield",           label: "Garantías",     path: "garantias" },
  { icon: "construction",     label: "Herramientas",  path: "herramientas" },
];

const sidebarBottomItems = [
  { icon: "settings", label: "Configuración", path: "configuracion" },
];

function SidebarNavItem({ icon, label, active, onClick, collapsed }) {
  const [hovered, setHovered] = React.useState(false);
  const isHighlighted = active || hovered;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", borderRadius: 12, border: "none",
        background: active
          ? "hsl(40 80% 55%)"
          : hovered ? "hsl(220 25% 25%)" : "transparent",
        color: active ? "hsl(40 90% 15%)" : "hsl(220 15% 90% / 0.8)",
        fontWeight: active ? 600 : 400,
        fontSize: 13, cursor: "pointer", width: "100%",
        textAlign: "left", transition: "background 0.15s, color 0.15s",
        fontFamily: "var(--font-sans)",
        whiteSpace: "nowrap", overflow: "hidden",
      }}
    >
      <i data-lucide={icon} style={{ width: 18, height: 18, flexShrink: 0,
        color: active ? "hsl(40 90% 15%)" : hovered ? "hsl(220 15% 95%)" : "hsl(220 15% 90% / 0.7)"
      }}></i>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  React.useEffect(() => { lucide.createIcons(); });

  const sidebarStyle = {
    background: "hsl(220 30% 18%)",
    display: "flex", flexDirection: "column",
    height: "100%",
    width: collapsed ? 64 : 240,
    transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
    flexShrink: 0,
    overflow: "hidden",
  };

  const content = (
    <div style={sidebarStyle}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 14px 16px", borderBottom: "1px solid hsl(220 25% 25%)", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "hsl(40 80% 55%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i data-lucide="key" style={{ width: 18, height: 18, color: "hsl(40 90% 15%)" }}></i>
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(220 15% 90%)", whiteSpace: "nowrap" }}>Cerrajería IMG</div>
            <div style={{ fontSize: 10, color: "hsl(220 15% 90% / 0.45)", whiteSpace: "nowrap" }}>Sistema de Gestión</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {sidebarNavItems.map(item => (
          <SidebarNavItem key={item.path} {...item} active={currentPage === item.path}
            onClick={() => { onNavigate(item.path); onCloseMobile && onCloseMobile(); }}
            collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "8px 8px 4px", borderTop: "1px solid hsl(220 25% 25%)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {sidebarBottomItems.map(item => (
          <SidebarNavItem key={item.path} {...item} active={currentPage === item.path}
            onClick={() => { onNavigate(item.path); onCloseMobile && onCloseMobile(); }}
            collapsed={collapsed} />
        ))}
        <SidebarNavItem icon="log-out" label="Cerrar sesión" active={false}
          onClick={() => onNavigate("auth")} collapsed={collapsed} />
        <button onClick={onToggleCollapse} style={{
          width: "100%", padding: "8px", borderRadius: 10, border: "none",
          background: "transparent", color: "hsl(220 15% 90% / 0.4)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 4,
        }}>
          <i data-lucide={collapsed ? "chevron-right" : "chevron-left"} style={{ width: 16, height: 16 }}></i>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="desktop-only" style={{ height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
        {content}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} className="mobile-only">
          <div style={{ position: "absolute", inset: 0, background: "hsl(220 30% 15% / 0.5)", backdropFilter: "blur(2px)" }}
            onClick={onCloseMobile} />
          <div style={{ position: "relative", zIndex: 1, ...sidebarStyle, width: 240 }}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { Sidebar });
