// Cerrajero Pro Express — UI kit entry
// Routes between Auth and the main shell (sidebar/topbar/bottom-nav + screens).

const { useState, useEffect } = React;

// Map of create-keys → friendly Spanish labels for the toast confirmation.
const CREATED_LABELS = {
  product:  'Producto creado',
  service:  'Servicio creado',
  customer: 'Cliente creado',
  quote:    'Cotización creada',
  sale:     'Venta registrada',
};

function App() {
  // Read initial route from URL hash (used by the mobile preview)
  const hashRoute = (typeof window !== 'undefined' && window.location.hash.slice(1)) || '';
  const initialSignedIn = hashRoute !== 'auth';
  const KNOWN_ROUTES = ['dashboard','inventario','servicios','cotizaciones','clientes','ventas','garantias','herramientas','configuracion'];
  const initialRoute = KNOWN_ROUTES.includes(hashRoute) ? hashRoute : 'dashboard';

  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [route, setRoute] = useState(initialRoute);

  // Sheets / modals — initial state can be primed from the hash so the mobile
  // preview can deep-link straight to a sheet.
  const [quickOpen, setQuickOpen] = useState(false);
  const [moreOpen,  setMoreOpen]  = useState(hashRoute === 'more');
  const [profileOpen, setProfileOpen] = useState(hashRoute === 'profile');
  const [notifOpen, setNotifOpen] = useState(hashRoute === 'notif' || hashRoute === 'notifications');
  const [fabFormKind, setFabFormKind] = useState(
    hashRoute.startsWith('fab-') ? hashRoute.slice(4) : null
  );
  const [confirm, setConfirm] = useState(null);

  // Notification feed (synthesised from operational state on first mount)
  const [notifs, setNotifs] = useState(() => window.buildNotifications(window.mockData));
  const unreadCount = notifs.filter(n => n.unread).length;

  const [flash, setFlash] = useState(null); // {kind, msg}

  const user = window.mockData.user;

  // Keep route in sync with hash (so the mobile preview's nav buttons still work).
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1);
      if (h === 'auth')     { setSignedIn(false); return; }
      if (h === 'more')     { setMoreOpen(true);  return; }
      if (h === 'profile')  { setProfileOpen(true); return; }
      if (h === 'notif' || h === 'notifications') { setNotifOpen(true); return; }
      if (h.startsWith('fab-')) { setFabFormKind(h.slice(4)); return; }
      if (KNOWN_ROUTES.includes(h)) setRoute(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r) => { setRoute(r); window.scrollTo(0, 0); };

  const flashToast = (msg, kind = 'success') => {
    setFlash({ msg, kind });
    setTimeout(() => setFlash(null), 2200);
  };

  const handleFab = () => {
    // On dashboard, opens the quick-actions sheet.
    // On other pages, the FAB is a contextual "create" action.
    const directAction = {
      inventario: 'product',
      cotizaciones: 'quote',
      clientes: 'customer',
      servicios: 'service',
      ventas: 'sale',
    }[route];
    if (directAction) {
      setFabFormKind(directAction);
    } else {
      setQuickOpen(true);
    }
  };

  const handleQuickAction = (key) => {
    setFabFormKind(key);
  };

  const handleCreated = (kind) => (values) => {
    flashToast(CREATED_LABELS[kind] || 'Listo');
  };

  if (!signedIn) {
    return <AuthScreen onSignIn={() => { setSignedIn(true); setRoute('dashboard'); }} />;
  }

  // Wrap onSell so destructive-looking actions can be intercepted by a confirm modal.
  const onSell = (p) => flashToast(`Venta · ${p.name}`);

  const screenProps = { user, onNavigate: navigate, onSell, onAvatarClick: () => setProfileOpen(true) };

  let screen;
  if (route === 'dashboard')      screen = <DashboardScreen {...screenProps} />;
  else if (route === 'inventario') screen = <InventarioScreen {...screenProps} />;
  else if (route === 'servicios')  screen = <ServiciosScreen {...screenProps} />;
  else                            screen = <PlaceholderScreen route={route} user={user} onAvatarClick={() => setProfileOpen(true)} />;

  return (
    <div className="app">
      <Sidebar
        route={route}
        onNavigate={navigate}
        onSignOut={() => setSignedIn(false)}
        onOpenProfile={() => setProfileOpen(true)}
        user={user}
        notifCount={unreadCount}
      />
      <div className="main">
        <Topbar user={user} onNotifications={() => setNotifOpen(true)} unread={unreadCount} onProfile={() => setProfileOpen(true)} />
        {screen}
      </div>

      <BottomNav
        route={route}
        onNavigate={navigate}
        onFab={handleFab}
        onMore={() => setMoreOpen(true)}
      />

      {/* Quick-create (Dashboard FAB) */}
      <QuickActionsSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAction={handleQuickAction}
      />

      {/* Más opciones */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onNavigate={navigate}
        onSignOut={() => setSignedIn(false)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenNotifications={() => setNotifOpen(true)}
        route={route}
        user={user}
        notifCount={unreadCount}
      />

      {/* Profile sheet */}
      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onNavigate={navigate}
        onSignOut={() => {
          setConfirm({
            variant: 'danger',
            icon: 'log-out',
            title: '¿Cerrar sesión?',
            description: 'Tendrás que volver a ingresar el código del taller para entrar.',
            confirmLabel: 'Cerrar sesión',
            onConfirm: () => setSignedIn(false),
          });
        }}
      />

      {/* Notifications sheet */}
      <NotificationsSheet
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        items={notifs}
        onMarkAll={() => {
          setNotifs(notifs.map(n => ({ ...n, unread: false })));
          flashToast('Notificaciones marcadas como leídas');
        }}
      />

      {/* FAB form sheets — Nuevo producto / servicio / cliente / etc */}
      <FabFormSheet
        kind={fabFormKind}
        onClose={() => setFabFormKind(null)}
        onCreated={handleCreated(fabFormKind)}
      />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmModal
          open={true}
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          icon={confirm.icon}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
        />
      )}

      {/* Toast */}
      {flash && (
        <div className="toast">
          <div className="ico"><Icon name={flash.kind === 'error' ? 'alert-triangle' : 'check'} /></div>
          {flash.msg}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
