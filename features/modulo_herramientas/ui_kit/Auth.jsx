// Auth.jsx — Cerrajería Express UI Kit
// Login screen with workshop code

function Auth({ onLogin }) {
  const [code, setCode] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => { lucide.createIcons(); });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code || !email || !password) { setError("Todos los campos son requeridos."); return; }
    setError(""); setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1200);
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px",
    borderRadius: 12, border: "1.5px solid hsl(220 20% 88%)",
    background: "hsl(0 0% 100%)", fontFamily: "var(--font-sans)",
    fontSize: 14, color: "hsl(220 30% 15%)", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(220 30% 18%)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 16, background: "hsl(40 80% 55%)", marginBottom: 12 }}>
            <i data-lucide="key" style={{ width: 28, height: 28, color: "hsl(40 90% 15%)" }}></i>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "hsl(220 15% 92%)" }}>Cerrajería</div>
          <div style={{ fontSize: 13, color: "hsl(220 15% 90% / 0.45)" }}>Sistema de Gestión</div>
        </div>
        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 20px 25px -5px hsl(220 30% 15% / 0.25)", padding: 28 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 600, textAlign: "center", color: "hsl(220 30% 15%)" }}>Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Workshop code */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "hsl(220 30% 15%)", display: "block", marginBottom: 4 }}>Código de Cerrajería</label>
              <div style={{ position: "relative" }}>
                <i data-lucide="building-2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "hsl(220 15% 55%)" }}></i>
                <input style={inputStyle} type="text" placeholder="CODIGODETALLER" value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())} autoComplete="off" />
              </div>
            </div>
            {/* Email */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "hsl(220 30% 15%)", display: "block", marginBottom: 4 }}>Correo Electrónico</label>
              <div style={{ position: "relative" }}>
                <i data-lucide="mail" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "hsl(220 15% 55%)" }}></i>
                <input style={inputStyle} type="email" placeholder="correo@ejemplo.com" value={email}
                  onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>
            {/* Password */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "hsl(220 30% 15%)", display: "block", marginBottom: 4 }}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <i data-lucide="lock" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "hsl(220 15% 55%)" }}></i>
                <input style={{ ...inputStyle, paddingRight: 36 }} type={showPw ? "text" : "password"} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)", padding: 0,
                }}>
                  <i data-lucide={showPw ? "eye-off" : "eye"} style={{ width: 15, height: 15 }}></i>
                </button>
              </div>
            </div>
            {error && <div style={{ fontSize: 12, color: "hsl(0 75% 55%)" }}>{error}</div>}
            <button type="submit" disabled={loading} style={{
              padding: "10px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, hsl(220 70% 45%) 0%, hsl(220 70% 35%) 100%)",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
              transition: "filter 0.2s",
            }}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>
          <p style={{ fontSize: 11, color: "hsl(220 15% 55%)", textAlign: "center", margin: "14px 0 0" }}>Contacta al administrador para obtener acceso</p>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "hsl(220 15% 90% / 0.35)", marginTop: 20 }}>© 2024 Sistema de Gestión de Cerrajería</p>
      </div>
    </div>
  );
}

Object.assign(window, { Auth });
