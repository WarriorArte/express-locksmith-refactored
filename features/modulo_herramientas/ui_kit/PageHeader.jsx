// PageHeader.jsx — Cerrajería Express UI Kit
// Full-bleed dark gradient page header, continuous with topbar

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, hsl(220 30% 18%) 0%, hsl(220 35% 25%) 100%)",
      margin: "-16px -16px 20px",
      padding: "10px 20px 14px",
      boxShadow: "0 1px 0 0 hsl(220 20% 88% / 0.1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700,
            color: "hsl(220 15% 92%)", letterSpacing: "-0.02em",
            lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "hsl(220 15% 90% / 0.5)" }}>{subtitle}</p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { PageHeader });
