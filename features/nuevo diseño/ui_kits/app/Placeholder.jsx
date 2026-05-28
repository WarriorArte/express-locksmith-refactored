// Generic placeholder screen for modules we didn't fully recreate
// (Clientes, Cotizaciones, Ventas, Garantías, Herramientas, Configuración).
// The hero header + an empty-state card matches the design system so
// the user can see how the redesign treats these surfaces.

const PLACEHOLDER_META = {
  cotizaciones: { eyebrow: 'Cotizaciones', title: 'Propuestas',  accent: 'activas.',  icon: 'file-text', desc: 'Gestiona propuestas, envíos por WhatsApp y conversión a venta.', cta: 'Crear cotización' },
  clientes:     { eyebrow: 'Clientes',     title: 'Tu',         accent: 'cartera.',   icon: 'users',     desc: 'Historial completo de servicios, ventas y cotizaciones por cliente.', cta: 'Agregar cliente' },
  ventas:       { eyebrow: 'Ventas',       title: 'Mostrador y', accent: 'facturas.', icon: 'shopping-cart', desc: 'Caja del día, métodos de pago y ticket imprimible 80mm.', cta: 'Nueva venta' },
  garantias:    { eyebrow: 'Garantías',    title: 'Cobertura y', accent: 'reclamos.', icon: 'shield',    desc: 'Vinculadas a productos/servicios. Vencimiento automático.', cta: 'Registrar garantía' },
  herramientas: { eyebrow: 'Herramientas', title: 'Inventario',  accent: 'del taller.', icon: 'construction', desc: 'Estado, ubicación y mantenimiento de cada herramienta.', cta: 'Agregar herramienta' },
  configuracion:{ eyebrow: 'Configuración', title: 'Ajustes del', accent: 'taller.',   icon: 'settings',   desc: 'Datos del negocio, usuarios, moneda, plantillas de cotización.', cta: 'Editar configuración' },
};

function PlaceholderScreen({ route, user, onAvatarClick }) {
  const meta = PLACEHOLDER_META[route] || PLACEHOLDER_META.configuracion;
  return (
    <div className="scroll">
      <HeroHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        accent={meta.accent}
        user={user}
        meta={meta.desc}
        onAvatarClick={onAvatarClick}
      />

      <div className="card" style={{ marginTop: 24, padding: 36, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'hsl(159 100% 45% / 0.12)', color: 'var(--primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Icon name={meta.icon} size={26} />
        </div>
        <h3 style={{ margin: 0, font: '700 17px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>
          Módulo {meta.eyebrow}
        </h3>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 380, margin: '8px auto 18px' }}>
          {meta.desc}<br/>El equipo de diseño puede recrear esta pantalla cuando defina sus pormenores.
        </p>
        <button className="ds-btn ds-btn--primary">
          <Icon name="plus" size={14} /> {meta.cta}
        </button>
      </div>
    </div>
  );
}

window.PlaceholderScreen = PlaceholderScreen;
