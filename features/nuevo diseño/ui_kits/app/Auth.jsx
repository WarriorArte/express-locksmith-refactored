// Auth screen — login (workshop code · email · password)
const AuthScreen = ({ onSignIn }) => {
  const [code, setCode] = React.useState('ELE-2024');
  const [email, setEmail] = React.useState('joshua@cerrajeria.co');
  const [password, setPassword] = React.useState('••••••••');
  const [loading, setLoading] = React.useState(false);

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(); }, 450);
  };

  return (
    <div className="auth-stage">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-mark"><Icon name="key" size={28} strokeWidth={2.5} /></div>
        <h1 className="auth-title">Cerrajería<br/><span className="accent">Express</span></h1>
        <p className="auth-sub">Gestión inteligente de tu taller</p>
        <div className="auth-field">
          <Icon name="building-2" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código del taller"
            autoComplete="off"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <div className="auth-field">
          <Icon name="mail" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
          />
        </div>
        <div className="auth-field">
          <Icon name="lock" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
          />
        </div>
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Iniciando…' : 'Iniciar sesión'}
        </button>
        <p className="auth-foot">Contacta al administrador para obtener acceso</p>
      </form>
    </div>
  );
};

window.AuthScreen = AuthScreen;
