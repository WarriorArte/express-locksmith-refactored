// StatCard.jsx — Cerrajería Express UI Kit

const statCardVariants = {
  primary:   { bg: "hsl(220 70% 95%)", color: "hsl(220 70% 45%)", iconBg: "hsl(220 70% 45%)", iconColor: "#fff" },
  secondary: { bg: "hsl(40 80% 94%)",  color: "hsl(40 90% 15%)",  iconBg: "hsl(40 80% 50%)",  iconColor: "hsl(40 90% 15%)" },
  success:   { bg: "hsl(145 65% 94%)", color: "hsl(145 65% 42%)", iconBg: "hsl(145 65% 42%)", iconColor: "#fff" },
  info:      { bg: "hsl(200 80% 94%)", color: "hsl(200 80% 38%)", iconBg: "hsl(200 80% 50%)",  iconColor: "#fff" },
  warning:   { bg: "hsl(35 95% 94%)",  color: "hsl(35 95% 30%)",  iconBg: "hsl(35 95% 50%)",  iconColor: "hsl(35 95% 15%)" },
};

function StatCard({ title, value, subtitle, icon, variant = "primary" }) {
  const v = statCardVariants[variant] || statCardVariants.primary;
  React.useEffect(() => { lucide.createIcons(); });
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      borderRadius: 20, padding: "18px 18px 14px",
      background: v.bg, color: v.color,
      boxShadow: "0 4px 6px -1px hsl(220 30% 15% / 0.08), 0 2px 4px -2px hsl(220 30% 15% / 0.05)",
      border: "1px solid transparent",
    }}>
      {/* bg deco circle */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 72, height: 72, borderRadius: "50%", background: "currentColor", opacity: 0.07 }}></div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, opacity: 0.75 }}>{title}</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1 }}>{value}</p>
          {subtitle && <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.55 }}>{subtitle}</p>}
        </div>
        <div style={{ padding: 10, borderRadius: 12, background: v.iconBg, color: v.iconColor, flexShrink: 0 }}>
          <i data-lucide={icon} style={{ width: 18, height: 18, display: "block" }}></i>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StatCard, statCardVariants });
