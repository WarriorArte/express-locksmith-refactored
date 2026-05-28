// Inventario — hero header + filter row + 2-up grid of product cards.

const fmt2 = (n) => '$ ' + (n || 0).toLocaleString('es-CO');

function InventoryCard({ p, onSell }) {
  const isService = !!p.isService;
  const totalStock = (p.stock_store || 0) + (p.stock_warehouse || 0);
  return (
    <div className="inv-card">
      <div className="inv-thumb">
        <div className="glyph"><Icon name={p.glyph} size={40} /></div>
        <span className="cat" style={{ background: p.color, color: p.color === '#FFB830' ? '#0D0D12' : '#fff' }}>{p.category}</span>
        {!isService && (
          <span className="stock" style={{
            background: p.status === 'low' ? 'hsl(36 100% 94%)' : 'hsl(159 100% 45% / .15)',
            color:      p.status === 'low' ? 'hsl(28 80% 35%)' : '#0D0D12',
          }}>{p.status === 'low' ? 'Stock bajo' : 'En stock'}</span>
        )}
      </div>
      <div className="inv-body">
        <div className="inv-name">{p.name}</div>
        {isService ? (
          <div className="inv-stock-row">
            <span><Icon name="wrench" /> mano de obra</span>
          </div>
        ) : (
          <div className="inv-stock-row">
            <span><Icon name="store" /> T:{p.stock_store}</span>
            <span><Icon name="warehouse" /> B:{p.stock_warehouse}</span>
          </div>
        )}
        <div className="inv-price">{fmt2(p.price)}</div>
        <button className="inv-btn" onClick={(e) => { e.stopPropagation(); onSell(p); }}>
          <Icon name="shopping-cart" /> {isService ? 'Usar' : 'Vender'}
        </button>
      </div>
    </div>
  );
}

function InventarioScreen({ user, onSell, onAvatarClick }) {
  const m = window.mockData;
  const products = m.products;
  const lowCount = products.filter(p => p.status === 'low').length;
  const serviceCount = products.filter(p => p.isService).length;
  const productsCount = products.length - serviceCount;
  // total inventory value
  const totalValue = products
    .filter(p => !p.isService)
    .reduce((s, p) => s + (p.price || 0) * ((p.stock_store || 0) + (p.stock_warehouse || 0)), 0);

  return (
    <div className="scroll">
      <div className="hero">
        <div className="hero-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hero-eyebrow">Inventario</div>
            <h1>Productos y <span className="accent">servicios.</span></h1>
            <div className="hero-meta">
              {productsCount} productos · {serviceCount} servicios ·{' '}
              <b style={{ color: '#FFB830' }}>{lowCount} alertas de stock</b>
            </div>
          </div>
          <button type="button" className="hero-avatar notify" aria-label="Cuenta" onClick={onAvatarClick} style={{ border: 'none' }}>{user.initial}</button>
        </div>

        <div className="hero-kpi">
          <div style={{ minWidth: 0 }}>
            <div className="hero-kpi-label">valor del inventario</div>
            <div className="hero-kpi-value">{fmt2(totalValue)}</div>
            <span className="hero-kpi-trend" style={{ background: 'hsl(36 100% 59% / 0.2)', color: '#FFB830', borderColor: 'hsl(36 100% 59% / 0.4)' }}>
              <Icon name="alert-triangle" size={12} /> {lowCount} requieren reposición
            </span>
          </div>
          <HeroCategoryStrip products={products} />
        </div>
      </div>

      <div className="search-row">
        <div className="search">
          <Icon name="search" />
          <input placeholder="Buscar producto…" />
        </div>
        <button className="icon-btn" aria-label="Filtrar"><Icon name="filter" /></button>
        <button className="icon-btn primary" aria-label="Nuevo"><Icon name="plus" /></button>
      </div>

      <div className="sec-head">
        <h2>Resultados</h2>
        <span className="muted" style={{ fontWeight: 600, fontSize: 12 }}>{products.length} items</span>
      </div>

      <div className="inv-grid">
        {products.map(p => <InventoryCard key={p.id} p={p} onSell={onSell} />)}
      </div>
    </div>
  );
}

// Small "category distribution" lockup used inside the Inventario hero.
function HeroCategoryStrip({ products }) {
  const groups = {};
  products.forEach(p => {
    groups[p.category] = groups[p.category] || { count: 0, color: p.color };
    groups[p.category].count += 1;
  });
  const total = products.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 124 }}>
      {Object.entries(groups).slice(0, 4).map(([cat, g]) => (
        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: g.color, flexShrink: 0 }} />
          <span style={{ font: '600 11px/1 var(--font-sans)', color: 'hsl(240 22% 95% / 0.85)', whiteSpace: 'nowrap', flex: 1 }}>{cat}</span>
          <span style={{ font: '700 11px/1 var(--font-sans)', color: 'var(--moonlight)', fontVariantNumeric: 'tabular-nums' }}>{g.count}</span>
        </div>
      ))}
    </div>
  );
}

window.InventarioScreen = InventarioScreen;
