// Layout primitives — Sidebar, Topbar, BottomNav, HeroHeader, Sheet
// Shared across all screens of the kit.

const { useEffect, useState } = React;

// ─────────────────────────────────────────────────────────
// Lucide icon helper — lightweight wrapper, draws inline SVG
// from window.lucide.icons[name] (UMD build). Avoids re-scanning
// the entire DOM via createIcons() on every render.
// ─────────────────────────────────────────────────────────
function toPascal(name) {
  return name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}
function kebabToCamel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function reactifyAttrs(attrs) {
  const out = {};
  for (const k in attrs) out[kebabToCamel(k)] = attrs[k];
  return out;
}
function Icon({ name, size = 18, className, color, strokeWidth = 2 }) {
  const data = window.lucide && (window.lucide.icons[toPascal(name)] || window.lucide.icons[name]);
  if (!data) {
    return <span className={className} style={{ display: 'inline-block', width: size, height: size }} />;
  }
  // lucide UMD: data is an array of [tag, attrs, children?]
  const [, attrs, children] = data;
  const baseAttrs = {
    ...reactifyAttrs(attrs),
    width: size,
    height: size,
    stroke: color || 'currentColor',
    strokeWidth: strokeWidth,
    className: className,
    style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
  };
  return (
    <svg {...baseAttrs} xmlns="http://www.w3.org/2000/svg">
      {(children || []).map(([tag, a], i) => React.createElement(tag, { key: i, ...reactifyAttrs(a) }))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Sidebar — desktop dark rail. Grouped nav, search, user footer.
// Mirrors the structure of src/components/layout/Sidebar.tsx in the
// source codebase (workshop header → grouped nav → pinned config →
// user identity card), with the One-Signal Rule preserved (green
// only on the active item + on the brand mark).
// ─────────────────────────────────────────────────────────
const SIDEBAR_NAV = [
  { key: 'dashboard',    label: 'Dashboard',    icon: 'layout-dashboard' },
  { key: 'inventario',   label: 'Inventario',   icon: 'package' },
  { key: 'cotizaciones', label: 'Cotizaciones', icon: 'file-text' },
  { key: 'clientes',     label: 'Clientes',     icon: 'users' },
  { key: 'servicios',    label: 'Servicios',    icon: 'wrench' },
  { key: 'ventas',       label: 'Ventas',       icon: 'shopping-cart' },
  { key: 'garantias',    label: 'Garantías',    icon: 'shield' },
  { key: 'herramientas', label: 'Herramientas', icon: 'construction' },
];

// Grouped layout used by the new sidebar. Badges are computed from mockData.
const SIDEBAR_GROUPS = [
  {
    label: 'General',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    ],
  },
  {
    label: 'Operación',
    items: [
      { key: 'servicios',    label: 'Servicios',    icon: 'wrench',        badgeKey: 'services_active' },
      { key: 'ventas',       label: 'Ventas',       icon: 'shopping-cart' },
      { key: 'cotizaciones', label: 'Cotizaciones', icon: 'file-text',     badgeKey: 'quotes_expiring' },
      { key: 'garantias',    label: 'Garantías',    icon: 'shield' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { key: 'inventario',   label: 'Inventario',   icon: 'package',      badgeKey: 'low_stock' },
      { key: 'clientes',     label: 'Clientes',     icon: 'users' },
      { key: 'herramientas', label: 'Herramientas', icon: 'construction' },
    ],
  },
];

function Sidebar({ route, onNavigate, onSignOut, onOpenProfile, user, notifCount = 0 }) {
  const m = window.mockData;
  const badges = {
    services_active: m.stats.services.in_progress,                           // green = active
    quotes_expiring: m.stats.quotes.expiring_this_week,                      // orange = urgent
    low_stock: m.lowStock.length,                                            // orange = warning
  };
  const badgeKind = {
    services_active: 'success',
    quotes_expiring: 'warn',
    low_stock: 'warn',
  };

  return (
    <aside className="sidebar">
      {/* Header — workshop mark + name + code chip */}
      <div className="sb-head">
        <div className="sb-mark"><Icon name="key" strokeWidth={2.5} /></div>
        <div className="meta">
          <div className="sb-title">{user?.workshop || 'Cerrajería Express'}</div>
          <div className="sb-sub">
            Sistema de gestión
            {user?.code && <span className="sb-code">{user.code}</span>}
          </div>
        </div>
      </div>

      {/* Search row (cosmetic — no actual search wiring) */}
      <div className="sb-search">
        <Icon name="search" />
        <input placeholder="Buscar módulo, cliente…" />
        <kbd>⌘K</kbd>
      </div>

      {/* Grouped navigation */}
      <nav className="sb-nav">
        {SIDEBAR_GROUPS.map(group => (
          <div key={group.label}>
            <div className="sb-section">{group.label}</div>
            {group.items.map(item => {
              const isActive = route === item.key;
              const count = item.badgeKey ? badges[item.badgeKey] : null;
              const badgeClass = item.badgeKey ? badgeKind[item.badgeKey] : '';
              return (
                <button
                  key={item.key}
                  className={`sb-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                >
                  <Icon name={item.icon} />
                  <span className="lab">{item.label}</span>
                  {count != null && count > 0 && (
                    <span className={`badge ${badgeClass}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user identity + config + sign out */}
      <div className="sb-footer">
        <button className="sb-user" onClick={onOpenProfile} aria-label="Mi perfil">
          <div className="av">{user?.initial}</div>
          <div className="id">
            <div className="name">{user?.name}</div>
            <div className="role">Administrador · {user?.code}</div>
          </div>
          <span className="ch"><Icon name="chevron-right" /></span>
        </button>
        <div className="sb-bottom-items">
          <button
            className={`sb-item ${route === 'configuracion' ? 'active' : ''}`}
            onClick={() => onNavigate('configuracion')}
          >
            <Icon name="settings" /> <span className="lab">Configuración</span>
          </button>
          <button className="sb-item danger" onClick={onSignOut}>
            <Icon name="log-out" /> <span className="lab">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────
// Topbar — desktop only
// ─────────────────────────────────────────────────────────
function Topbar({ user, onNotifications, onProfile, unread = 0 }) {
  return (
    <div className="topbar">
      <button className="iconbtn" aria-label="Buscar"><Icon name="search" /></button>
      <button
        className="iconbtn"
        aria-label="Notificaciones"
        onClick={onNotifications}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 99,
            background: 'var(--destructive)', color: '#fff',
            font: '800 9px/16px var(--font-sans)',
            textAlign: 'center',
            border: '2px solid var(--card)',
            boxSizing: 'content-box',
          }}>{unread}</span>
        )}
      </button>
      <button
        className="avatar"
        onClick={onProfile}
        aria-label="Cuenta"
        style={{ border: 'none', cursor: 'pointer' }}
      >
        {user.initial}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Hero header — used at the top of every page
// ─────────────────────────────────────────────────────────
function HeroHeader({ eyebrow, title, accent, meta, user, onAvatarClick, action }) {
  return (
    <div className="hero">
      <div className="hero-row">
        <div style={{ minWidth: 0, flex: 1 }}>
          {eyebrow && <div className="hero-eyebrow">{eyebrow}</div>}
          <h1>
            {title}
            {accent && <> <span className="accent">{accent}</span></>}
          </h1>
          {meta && <div className="hero-meta">{meta}</div>}
          {action}
        </div>
        {user && (
          <button
            className="hero-avatar notify"
            type="button"
            onClick={onAvatarClick}
            aria-label="Cuenta"
            style={{ border: 'none' }}
          >
            {user.initial}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Bottom nav — mobile only
// ─────────────────────────────────────────────────────────
function BottomNav({ route, onNavigate, onFab, onMore }) {
  return (
    <nav className="botnav">
      <div className="botnav-inner">
        <button
          className={`botnav-item ${route === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <Icon name="home" /><span>Inicio</span>
        </button>
        <button
          className={`botnav-item ${route === 'servicios' ? 'active' : ''}`}
          onClick={() => onNavigate('servicios')}
        >
          <Icon name="wrench" /><span>Servicios</span>
        </button>
        <button className="fab" onClick={onFab} aria-label="Crear">
          <Icon name="plus" />
        </button>
        <button
          className={`botnav-item ${route === 'inventario' ? 'active' : ''}`}
          onClick={() => onNavigate('inventario')}
        >
          <Icon name="package" /><span>Inventario</span>
        </button>
        <button className="botnav-item" onClick={onMore}>
          <Icon name="grid-3x3" /><span>Más</span>
        </button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────
// Sheet (bottom sheet for "Crear nuevo" + "Más opciones")
// ─────────────────────────────────────────────────────────
function Sheet({ open, onClose, children, showClose = true }) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {showClose && (
          <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

// Small shared header for any contextual sheet — workshop mark + name + code.
function SheetWorkshopHeader({ workshop, code, subtitle }) {
  return (
    <div className="sheet-header">
      <div className="ws-mark"><Icon name="key" strokeWidth={2.5} /></div>
      <div className="ws-body">
        <div className="ws-title">{workshop}</div>
        <div className="ws-sub">
          {subtitle || 'Sistema de gestión'}
          {code && <span className="ws-code">{code}</span>}
        </div>
      </div>
    </div>
  );
}

function QuickActionsSheet({ open, onClose, onAction }) {
  // Same five quick-create actions as the source codebase, now with copy that
  // explains what each action does instead of just naming the route.
  const actions = [
    { key: 'service',  label: 'Nuevo servicio',    sub: 'Abre un trabajo de taller',     icon: 'wrench',        kbd: 'S' },
    { key: 'sale',     label: 'Nueva venta',       sub: 'Mostrador o factura',           icon: 'shopping-cart', kbd: 'V' },
    { key: 'quote',    label: 'Nueva cotización',  sub: 'Propuesta enviable por WhatsApp', icon: 'file-text',   kbd: 'C' },
    { key: 'customer', label: 'Nuevo cliente',     sub: 'Ficha con historial',           icon: 'users',         kbd: 'L' },
    { key: 'product',  label: 'Nuevo producto',    sub: 'Inventario + servicios',        icon: 'package',       kbd: 'P' },
  ];
  return (
    <Sheet open={open} onClose={onClose}>
      <h3 style={{ marginBottom: 4 }}>Crear nuevo</h3>
      <p className="muted" style={{ font: '500 12px/1.4 var(--font-sans)', margin: '0 0 16px' }}>
        Atajos rápidos desde el FAB. Cada acción abre el formulario correspondiente.
      </p>
      <div className="qa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {actions.map(a => (
          <button
            key={a.key}
            className="sheet-tile"
            onClick={() => { onAction(a.key); onClose(); }}
          >
            <div className="sheet-tile-ico"><Icon name={a.icon} /></div>
            <div>
              <div className="sheet-tile-label">{a.label}</div>
              <div className="sheet-tile-sub">{a.sub}</div>
            </div>
            <span className="kbd">{a.kbd}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function MoreSheet({ open, onClose, onNavigate, onSignOut, onOpenProfile, onOpenNotifications, route, user, notifCount = 0 }) {
  // Grouped by what each module is FOR — matches DESIGN.md's mental model.
  const groups = [
    {
      label: 'Operación',
      items: [
        { key: 'cotizaciones', label: 'Cotizaciones', icon: 'file-text',    meta: 'Propuestas y conversión a venta' },
        { key: 'ventas',       label: 'Ventas',       icon: 'shopping-cart', meta: 'Caja del día y facturas' },
        { key: 'garantias',    label: 'Garantías',    icon: 'shield',        meta: 'Cobertura y reclamos' },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { key: 'clientes',     label: 'Clientes',     icon: 'users',        meta: 'Historial por cliente' },
        { key: 'herramientas', label: 'Herramientas', icon: 'construction', meta: 'Inventario del taller' },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { key: 'configuracion',label: 'Configuración',icon: 'settings',     meta: 'Negocio, usuarios, plantillas' },
      ],
    },
  ];

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetWorkshopHeader
        workshop={user?.workshop || 'Cerrajería Express'}
        code={user?.code}
        subtitle="Más opciones · navegación"
      />

      {/* Account / system row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <button className="sheet-tile" onClick={() => { onOpenProfile && onOpenProfile(); onClose(); }} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div className="sheet-tile-ico"><Icon name="user" /></div>
          <div>
            <div className="sheet-tile-label">Mi perfil</div>
            <div className="sheet-tile-sub">{user?.name || 'Usuario'}</div>
          </div>
        </button>
        <button className="sheet-tile" onClick={() => { onOpenNotifications && onOpenNotifications(); onClose(); }} style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
          <div className="sheet-tile-ico"><Icon name="bell" /></div>
          <div>
            <div className="sheet-tile-label">Notificaciones</div>
            <div className="sheet-tile-sub">{notifCount > 0 ? `${notifCount} sin leer` : 'Al día'}</div>
          </div>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              background: 'var(--destructive)', color: '#fff',
              font: '800 10px/1 var(--font-sans)',
              padding: '3px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center'
            }}>{notifCount}</span>
          )}
        </button>
      </div>

      {/* Grouped module list */}
      {groups.map(g => (
        <div key={g.label}>
          <div className="sheet-section-label">{g.label}</div>
          <div className="sheet-list">
            {g.items.map(it => (
              <button
                key={it.key}
                className={`row ${route === it.key ? 'active' : ''}`}
                onClick={() => { onNavigate(it.key); onClose(); }}
              >
                <div className="ico"><Icon name={it.icon} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="label">{it.label}</div>
                  <div className="meta">{it.meta}</div>
                </div>
                <span className="chevron"><Icon name="chevron-right" /></span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="sheet-list" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button
          className="row danger"
          onClick={() => { onSignOut(); onClose(); }}
        >
          <div className="ico"><Icon name="log-out" /></div>
          <div style={{ flex: 1 }}>
            <div className="label">Cerrar sesión</div>
            <div className="meta">Volver a la pantalla de acceso</div>
          </div>
        </button>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────
// Profile sheet — fired by hero-avatar tap.
// ─────────────────────────────────────────────────────────
function ProfileSheet({ open, onClose, user, onNavigate, onSignOut }) {
  const items = [
    { key: 'configuracion', label: 'Ajustes del taller',  icon: 'settings',  meta: 'Datos del negocio, plantillas' },
    { key: 'configuracion', label: 'Equipo y permisos',   icon: 'users',     meta: 'Usuarios y roles' },
    { key: 'configuracion', label: 'Moneda y formato',    icon: 'banknote',  meta: 'COP · separador miles' },
    { key: 'herramientas',  label: 'Datos y exportación', icon: 'download',  meta: 'Backup CSV / Excel' },
  ];
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="profile-card">
        <div className="pa">{user?.initial}</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pn">{user?.name}</div>
          <div className="pe">{user?.workshop} · {user?.code}</div>
          <span className="pchip"><span className="live-dot" /> Sesión activa</span>
        </div>
      </div>

      <div className="sheet-section-label">Cuenta</div>
      <div className="sheet-list">
        {items.map((it, i) => (
          <button
            key={i}
            className="row"
            onClick={() => { onNavigate(it.key); onClose(); }}
          >
            <div className="ico"><Icon name={it.icon} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">{it.label}</div>
              <div className="meta">{it.meta}</div>
            </div>
            <span className="chevron"><Icon name="chevron-right" /></span>
          </button>
        ))}
      </div>

      <div className="sheet-list" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button className="row danger" onClick={() => { onSignOut(); onClose(); }}>
          <div className="ico"><Icon name="log-out" /></div>
          <div style={{ flex: 1 }}>
            <div className="label">Cerrar sesión</div>
            <div className="meta">Cierra esta sesión en el dispositivo</div>
          </div>
        </button>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────
// Notifications sheet — read from mockData if present, else
// synthesise from operational state (low stock, expiring quotes…).
// ─────────────────────────────────────────────────────────
function buildNotifications(data) {
  const list = [];
  data.lowStock.forEach(p => {
    list.push({
      id: `ls-${p.id}`,
      kind: 'warning',
      icon: 'alert-triangle',
      title: `Stock crítico — ${p.name}`,
      desc: `Quedan ${p.stock} unidades (mínimo ${p.min}).`,
      time: 'hace 12 min',
      unread: true,
    });
  });
  data.expiringQuotes.forEach(q => {
    list.push({
      id: `q-${q.id}`,
      kind: q.days <= 2 ? 'danger' : 'info',
      icon: 'calendar',
      title: `Cotización ${q.number} vence en ${q.days} ${q.days === 1 ? 'día' : 'días'}`,
      desc: `${q.customer} · ${q.desc}`,
      time: `hace ${q.days}h`,
      unread: q.days <= 2,
    });
  });
  list.push({
    id: 'sv-318',
    kind: 'info',
    icon: 'wrench',
    title: 'Servicio SRV-318 actualizado',
    desc: 'Carlos Méndez · cambió a "En curso".',
    time: 'hace 18 min',
    unread: false,
  });
  return list;
}

function NotificationsSheet({ open, onClose, items, onMarkAll }) {
  const kinds = {
    danger:  { bg: 'hsl(350 100% 95%)', fg: 'var(--destructive)' },
    warning: { bg: 'hsl(36 100% 94%)',  fg: 'hsl(28 80% 35%)' },
    info:    { bg: 'hsl(240 30% 94%)',  fg: 'hsl(240 40% 40%)' },
    success: { bg: 'hsl(159 100% 94%)', fg: '#0D0D12' },
  };
  const unread = items.filter(i => i.unread).length;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="row-spread" style={{ marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0 }}>Notificaciones</h3>
          <div className="muted" style={{ font: '500 12px/1.3 var(--font-sans)', marginTop: 4 }}>
            {unread} sin leer · {items.length} en total
          </div>
        </div>
        {unread > 0 && (
          <button className="btn sm btn-ghost" onClick={onMarkAll}>
            <Icon name="check-check" /> Marcar leídas
          </button>
        )}
      </div>
      <div className="notif-list">
        {items.map(n => {
          const k = kinds[n.kind] || kinds.info;
          return (
            <button key={n.id} className={`notif-row ${n.unread ? 'unread' : ''}`}>
              <div className="ico" style={{ background: k.bg, color: k.fg }}>
                <Icon name={n.icon} />
              </div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-desc">{n.desc}</div>
              </div>
              <div className="notif-time">{n.time}</div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  Icon, Sidebar, Topbar, HeroHeader, BottomNav,
  Sheet, SheetWorkshopHeader, QuickActionsSheet, MoreSheet,
  ProfileSheet, NotificationsSheet, buildNotifications,
  SIDEBAR_NAV,
});
