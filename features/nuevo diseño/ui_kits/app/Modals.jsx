// Modals — centered dialog + multi-step form-sheets for the FAB actions
// (Nuevo producto / servicio / cliente / cotización / venta).
//
// The heavy ones (Producto, Servicio) mirror the real ProductFormDialog and
// ServiceFormDialog from src/components/{products,services}: an AlertDialog
// type-picker (product vs service) → multi-step IconTabs → "Siguiente / Crear".
//
// The lighter ones (Cliente, Cotización, Venta) use a single-page layout with
// `.form-section` dividers — same visual rhythm without the step gating.

const { useState: useModalState, useEffect: useModalEffect, useRef: useModalRef } = React;

const fmtMoney = (n) => '$ ' + (Number(n) || 0).toLocaleString('es-CO');

// ─────────────────────────────────────────────────────────
// Modal — centered dialog (or bottom-sheet on small mobile)
// ─────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  useModalEffect(() => {
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
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" />
        </button>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({
  open, onClose, onConfirm,
  variant = 'danger',
  icon = 'alert-triangle',
  title, description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  const btnClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';
  return (
    <Modal open={open} onClose={onClose}>
      <div className={`modal-icon ${variant}`}><Icon name={icon} /></div>
      <h3 className="modal-title">{title}</h3>
      <p className="modal-desc">{description}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{cancelLabel}</button>
        <button className={`btn ${btnClass}`} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// FormShell — shared header + sticky footer.
// Used by both single-page forms and multi-step forms.
// ─────────────────────────────────────────────────────────
function FormShell({ open, onClose, icon, title, subtitle, footer, children }) {
  return (
    <Sheet open={open} onClose={onClose} showClose={true}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingRight: 36 }}>
        <div className="modal-icon primary" style={{ margin: 0, width: 40, height: 40, borderRadius: 12 }}>
          <Icon name={icon} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 className="modal-title" style={{ fontSize: 17, marginBottom: 2 }}>{title}</h3>
          {subtitle && <div className="muted" style={{ font: '500 12px/1.4 var(--font-sans)' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
      <div style={{
        display: 'flex', gap: 8, marginTop: 18, paddingTop: 14,
        borderTop: '1px solid var(--border)',
        position: 'sticky', bottom: 0, background: 'var(--card)',
      }}>
        {footer}
      </div>
    </Sheet>
  );
}

// Simple single-page form footer (Cancelar / Guardar)
function SingleFormFooter({ onClose, onSubmit, submitLabel = 'Guardar' }) {
  return (
    <>
      <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
      <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={onSubmit}>
        <Icon name="check" /> {submitLabel}
      </button>
    </>
  );
}

// Multi-step footer (Cancelar / Atrás / Siguiente OR Crear)
function StepFooter({ onClose, onPrev, onNext, onSubmit, isLast, isFirst, submitLabel = 'Crear' }) {
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={isFirst ? onClose : onPrev}>
        {isFirst ? 'Cancelar' : 'Atrás'}
      </button>
      {!isLast ? (
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onNext}>
          Siguiente <Icon name="arrow-right" />
        </button>
      ) : (
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onSubmit}>
          <Icon name="check" /> {submitLabel}
        </button>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════
// ProductFormSheet — type picker (Producto / Servicio) then
// 4-tab multi-step:
//   Producto: General · Precios · Inventario · Notas
//   Servicio: General · Productos · Precios · Notas
// ═════════════════════════════════════════════════════════
const CATEGORIES = [
  { value: 'Automotriz',  label: 'Automotriz',  color: '#9898D0' },
  { value: 'Residencial', label: 'Residencial', color: '#FF6B9D' },
  { value: 'Comercial',   label: 'Comercial',   color: '#22D3EE' },
  { value: 'Industrial',  label: 'Industrial',  color: '#FFB830' },
];

function ProductTypePicker({ onPick, onClose }) {
  return (
    <Modal open={true} onClose={onClose}>
      <div className="modal-icon primary"><Icon name="plus" /></div>
      <h3 className="modal-title">¿Qué deseas crear?</h3>
      <p className="modal-desc">Elige el tipo de ítem que vas a agregar al inventario.</p>
      <div className="type-picker" style={{ marginTop: 4 }}>
        <button type="button" className="type-card" onClick={() => onPick('product')}>
          <div className="ico"><Icon name="package" /></div>
          <div className="name">Producto</div>
          <div className="desc">Con stock en tienda y bodega · 4 pasos</div>
        </button>
        <button type="button" className="type-card" onClick={() => onPick('service')}>
          <div className="ico" style={{ background: 'hsl(159 100% 45% / 0.12)' }}><Icon name="wrench" /></div>
          <div className="name">Servicio</div>
          <div className="desc">Mano de obra + productos consumidos · 4 pasos</div>
        </button>
      </div>
    </Modal>
  );
}

function ProductFormSheet({ open, onClose, onCreated }) {
  const [itemType, setItemType] = useModalState(null); // 'product' | 'service' | null
  const [form, setForm] = useModalState({
    name: '', category: 'Automotriz', serviceType: 'residential', description: '', imageUrl: '',
    purchaseLocal: '', purchaseImported: '', salePrice: '', minPrice: '',
    stockStore: '', stockWarehouse: '', minStock: '',
    laborCost: '', discount: '',
    instructions: '', notes: '',
  });
  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  useModalEffect(() => {
    if (!open) {
      // reset on close
      setItemType(null);
      setForm({
        name: '', category: 'Automotriz', serviceType: 'residential', description: '', imageUrl: '',
        purchaseLocal: '', purchaseImported: '', salePrice: '', minPrice: '',
        stockStore: '', stockWarehouse: '', minStock: '',
        laborCost: '', discount: '',
        instructions: '', notes: '',
      });
    }
  }, [open]);

  if (!open) return null;
  if (!itemType) return <ProductTypePicker onPick={setItemType} onClose={onClose} />;

  const isService = itemType === 'service';
  const tabs = isService
    ? [
        { id: 'general',    icon: 'package',     label: 'General' },
        { id: 'productos',  icon: 'shopping-bag', label: 'Productos' },
        { id: 'precios',    icon: 'dollar-sign', label: 'Precios' },
        { id: 'notas',      icon: 'file-text',   label: 'Notas' },
      ]
    : [
        { id: 'general',    icon: 'package',     label: 'General' },
        { id: 'precios',    icon: 'dollar-sign', label: 'Precios' },
        { id: 'inventario', icon: 'warehouse',   label: 'Inventario' },
        { id: 'notas',      icon: 'file-text',   label: 'Notas' },
      ];

  const valid = {
    general: form.name.trim().length > 0,
    productos: true, // optional in our simplified version
    precios: isService
      ? Number(form.laborCost) > 0
      : Number(form.purchaseLocal) > 0 && Number(form.salePrice) > 0,
    inventario: isService || (form.stockStore !== '' && form.stockWarehouse !== '' && form.minStock !== ''),
    notas: true,
  };

  const submit = () => {
    onCreated && onCreated({ itemType, ...form });
    onClose();
  };

  return (
    <Sheet open={true} onClose={onClose} showClose={true}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingRight: 36 }}>
        <div className="modal-icon primary" style={{ margin: 0, width: 40, height: 40, borderRadius: 12 }}>
          <Icon name={isService ? 'wrench' : 'package'} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 className="modal-title" style={{ fontSize: 17, marginBottom: 2 }}>
            {isService ? 'Nuevo servicio' : 'Nuevo producto'}
          </h3>
          <div className="muted" style={{ font: '500 12px/1.4 var(--font-sans)' }}>
            {isService ? 'Mano de obra + productos consumidos del taller' : 'Inventario con stock por tienda y bodega'}
          </div>
        </div>
      </div>

      <MultiStep tabs={tabs} isValid={(id) => valid[id]} onSubmit={submit}>
        {({ active, next, prev, isLast, submit: doSubmit, invalidSet }) => (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {active === 'general' && (
                <>
                  <TextInput
                    label={isService ? 'Nombre del servicio' : 'Nombre del producto'}
                    leadIcon="tag"
                    value={form.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder={isService ? 'Apertura puerta automotriz' : 'Cerradura Yale 3 Golpes'}
                    error={invalidSet.has('general') && !form.name ? 'Campo obligatorio' : null}
                  />
                  {isService ? (
                    <Select
                      label="Tipo de servicio"
                      leadIcon="layers"
                      value={form.serviceType}
                      onChange={(e) => update({ serviceType: e.target.value })}
                      options={[
                        { value: 'residential', label: 'Residencial' },
                        { value: 'commercial',  label: 'Comercial' },
                        { value: 'automotive',  label: 'Automotriz' },
                        { value: 'industrial',  label: 'Industrial' },
                      ]}
                    />
                  ) : (
                    <SwatchPicker
                      label="Categoría"
                      value={form.category}
                      onChange={(v) => update({ category: v })}
                      options={CATEGORIES}
                    />
                  )}
                  <Field label="Imagen">
                    <div className="image-uploader">
                      <div className="ico"><Icon name="image" /></div>
                      <div className="ttl">Arrastra una imagen aquí o sube un archivo</div>
                      <div className="sub">JPG, PNG · hasta 4 MB</div>
                    </div>
                  </Field>
                  <TextArea
                    label="Descripción"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder={isService ? 'Descripción del servicio…' : 'Descripción del producto…'}
                  />
                </>
              )}

              {active === 'productos' && isService && (
                <>
                  <div className="form-section">Productos consumidos</div>
                  <p className="muted" style={{ font: '500 12px/1.4 var(--font-sans)', margin: 0 }}>
                    Selecciona los productos del inventario que este servicio consume cada vez que se realiza.
                  </p>
                  <div className="items-editor">
                    <div className="items-row">
                      <div className="name">Cilindro europeo 70mm</div>
                      <input className="qty" defaultValue="1" />
                      <div className="price">{fmtMoney(32000)}</div>
                      <button type="button" className="rm"><Icon name="trash-2" /></button>
                    </div>
                    <button type="button" className="items-add">
                      <Icon name="plus" /> Agregar producto del inventario
                    </button>
                  </div>
                  <Checkbox
                    checked={false}
                    onChange={() => {}}
                    title="Este servicio no consume productos"
                    sub="Marcar si solo cobra mano de obra"
                  />
                </>
              )}

              {active === 'precios' && (
                <>
                  {isService ? (
                    <>
                      <MoneyInput
                        label="Mano de obra"
                        value={form.laborCost}
                        onChange={(v) => update({ laborCost: v })}
                        error={invalidSet.has('precios') && !form.laborCost ? 'Debe ser mayor a 0' : null}
                      />
                      <div className="totals">
                        <div className="r"><span className="k">Productos</span><span className="v">{fmtMoney(32000)}</span></div>
                        <div className="r"><span className="k">Mano de obra</span><span className="v">{fmtMoney(form.laborCost)}</span></div>
                        <div className="r total"><span className="k">Precio del servicio</span><span className="v">{fmtMoney(Number(form.laborCost || 0) + 32000)}</span></div>
                      </div>
                      <MoneyInput
                        label="Precio con descuento (opcional)"
                        hint="Referencia comercial — no modifica el precio del servicio."
                        value={form.discount}
                        onChange={(v) => update({ discount: v })}
                      />
                    </>
                  ) : (
                    <>
                      <div className="form-section">Costos</div>
                      <div className="field-row">
                        <MoneyInput
                          label="Precio distribuidor local"
                          value={form.purchaseLocal}
                          onChange={(v) => update({ purchaseLocal: v })}
                          error={invalidSet.has('precios') && !form.purchaseLocal ? 'Debe ser mayor a 0' : null}
                        />
                        <MoneyInput
                          label="Precio importado (opcional)"
                          value={form.purchaseImported}
                          onChange={(v) => update({ purchaseImported: v })}
                        />
                      </div>
                      <div className="form-section">Precio al cliente</div>
                      <div className="field-row">
                        <MoneyInput
                          label="Precio sugerido"
                          value={form.salePrice}
                          onChange={(v) => update({ salePrice: v })}
                          error={invalidSet.has('precios') && !form.salePrice ? 'Debe ser mayor a 0' : null}
                        />
                        <MoneyInput
                          label="Precio con descuento"
                          value={form.minPrice}
                          onChange={(v) => update({ minPrice: v })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {active === 'inventario' && !isService && (
                <>
                  <div className="form-section">Existencias actuales</div>
                  <div className="field-row">
                    <TextInput label="Stock tienda" leadIcon="store" type="number" value={form.stockStore} onChange={(e) => update({ stockStore: e.target.value })} placeholder="0" />
                    <TextInput label="Stock bodega" leadIcon="warehouse" type="number" value={form.stockWarehouse} onChange={(e) => update({ stockWarehouse: e.target.value })} placeholder="0" />
                  </div>
                  <TextInput label="Stock mínimo" leadIcon="alert-triangle" type="number" value={form.minStock} onChange={(e) => update({ minStock: e.target.value })} placeholder="0" hint="Te alertaremos cuando el stock total caiga por debajo de este número." />
                </>
              )}

              {active === 'notas' && (
                <>
                  <TextArea
                    label={isService ? 'Requisitos previos' : 'Instrucciones de uso'}
                    value={form.instructions}
                    onChange={(e) => update({ instructions: e.target.value })}
                    placeholder={isService ? 'Requisitos del servicio antes de iniciar…' : 'Instalación, mantenimiento, compatibilidad…'}
                  />
                  <TextArea
                    label="Notas internas"
                    value={form.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    placeholder="Solo visible para el equipo del taller."
                  />
                </>
              )}
            </div>

            <div style={{
              display: 'flex', gap: 8, marginTop: 18, paddingTop: 14,
              borderTop: '1px solid var(--border)',
              position: 'sticky', bottom: 0, background: 'var(--card)',
            }}>
              <StepFooter
                onClose={onClose}
                onPrev={prev}
                onNext={next}
                onSubmit={doSubmit}
                isLast={isLast}
                isFirst={active === tabs[0].id}
                submitLabel={isService ? 'Crear servicio' : 'Crear producto'}
              />
            </div>
          </>
        )}
      </MultiStep>
    </Sheet>
  );
}

// ═════════════════════════════════════════════════════════
// ServiceFormSheet — 5-tab multi-step
//   Servicio · Productos · Imágenes · Cliente · Resumen
// ═════════════════════════════════════════════════════════
function ServiceFormSheet({ open, onClose, onCreated }) {
  const [form, setForm] = useModalState({
    folio: 'SRV-319',
    serviceType: 'residential',
    description: '',
    problem: '',
    internalNotes: '',
    template: 'manual',
    customer: '',
    address: '',
    location: '',
    laborCost: '',
    discount: '',
    deposit: '',
    scheduled: false,
    scheduledDate: '',
    scheduledTime: '09:00',
    hasWarranty: false,
    warrantyValue: 30,
    warrantyUnit: 'days',
  });
  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  useModalEffect(() => {
    if (!open) {
      setForm(f => ({ ...f, description: '', problem: '', customer: '', address: '', laborCost: '', discount: '', deposit: '', scheduled: false, hasWarranty: false }));
    }
  }, [open]);

  if (!open) return null;

  const tabs = [
    { id: 'servicio',  icon: 'wrench',    label: 'Servicio' },
    { id: 'productos', icon: 'package',   label: 'Productos' },
    { id: 'imagenes',  icon: 'image',     label: 'Imágenes' },
    { id: 'cliente',   icon: 'user',      label: 'Cliente' },
    { id: 'resumen',   icon: 'file-text', label: 'Resumen' },
  ];

  const valid = {
    servicio:  form.description.trim().length > 0 && form.serviceType,
    productos: true,
    imagenes:  true,
    cliente:   form.customer.trim().length > 0 && form.address.trim().length > 0,
    resumen:   Number(form.laborCost) > 0,
  };

  const productsTotal = 32000;
  const labor = Number(form.laborCost || 0);
  const disc  = Number(form.discount || 0);
  const dep   = Number(form.deposit || 0);
  const total = Math.max(0, productsTotal + labor - disc);
  const pending = Math.max(0, total - dep);

  const submit = () => {
    onCreated && onCreated(form);
    onClose();
  };

  return (
    <Sheet open={true} onClose={onClose} showClose={true}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingRight: 36 }}>
        <div className="modal-icon primary" style={{ margin: 0, width: 40, height: 40, borderRadius: 12 }}>
          <Icon name="wrench" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="modal-title" style={{ fontSize: 17, marginBottom: 2 }}>Nuevo servicio</h3>
          <div className="muted" style={{ font: '500 12px/1.4 var(--font-sans)' }}>
            Folio <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{form.folio}</span> · taller
          </div>
        </div>
      </div>

      <MultiStep tabs={tabs} isValid={(id) => valid[id]} onSubmit={submit}>
        {({ active, next, prev, isLast, submit: doSubmit, invalidSet }) => (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {active === 'servicio' && (
                <>
                  <Select
                    label="Plantilla de inventario (opcional)"
                    leadIcon="layers"
                    value={form.template}
                    onChange={(e) => update({ template: e.target.value })}
                    options={[
                      { value: 'manual', label: 'Crear desde cero' },
                      { value: 't1', label: 'Apertura puerta residencial — $45.000' },
                      { value: 't2', label: 'Copiado llave automotriz — $32.000' },
                    ]}
                    hint="Importa la descripción, productos y mano de obra de un servicio preconfigurado."
                  />
                  <TextInput
                    label="Nombre del servicio"
                    leadIcon="wrench"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Reparación switch Honda 2001-2011"
                    error={invalidSet.has('servicio') && !form.description ? 'Campo obligatorio' : null}
                  />
                  <Select
                    label="Tipo de servicio"
                    leadIcon="tag"
                    value={form.serviceType}
                    onChange={(e) => update({ serviceType: e.target.value })}
                    options={[
                      { value: 'residential', label: 'Residencial' },
                      { value: 'commercial',  label: 'Comercial' },
                      { value: 'automotive',  label: 'Automotriz' },
                      { value: 'industrial',  label: 'Industrial' },
                    ]}
                  />
                  <TextArea
                    label="Problema reportado"
                    value={form.problem}
                    onChange={(e) => update({ problem: e.target.value })}
                    placeholder="Describe lo que reporta el cliente…"
                  />
                  <TextArea
                    label="Notas internas"
                    value={form.internalNotes}
                    onChange={(e) => update({ internalNotes: e.target.value })}
                    placeholder="Visible solo para el equipo."
                  />
                </>
              )}

              {active === 'productos' && (
                <>
                  <div className="form-section">Productos consumidos</div>
                  <div className="items-editor">
                    <div className="items-row">
                      <div className="name">Cilindro europeo 70mm</div>
                      <input className="qty" defaultValue="1" />
                      <div className="price">{fmtMoney(32000)}</div>
                      <button type="button" className="rm"><Icon name="trash-2" /></button>
                    </div>
                    <button type="button" className="items-add">
                      <Icon name="plus" /> Agregar producto del inventario
                    </button>
                  </div>
                  <Checkbox
                    checked={false}
                    onChange={() => {}}
                    title="Este servicio no consume productos"
                    sub="Marcar si solo cobra mano de obra"
                  />
                </>
              )}

              {active === 'imagenes' && (
                <>
                  <Field label="Agregar imagen (0/5)">
                    <div className="image-uploader">
                      <div className="ico"><Icon name="image" /></div>
                      <div className="ttl">Sube fotos del trabajo</div>
                      <div className="sub">Antes / durante / después · hasta 5 imágenes</div>
                    </div>
                  </Field>
                  <div className="image-grid">
                    <div className="image-tile"><Icon name="image" /></div>
                    <div className="image-tile"><Icon name="image" /></div>
                    <div className="image-tile"><Icon name="image" /></div>
                  </div>
                </>
              )}

              {active === 'cliente' && (
                <>
                  <TextInput
                    label="Cliente"
                    leadIcon="user"
                    value={form.customer}
                    onChange={(e) => update({ customer: e.target.value })}
                    placeholder="Buscar o crear cliente…"
                    error={invalidSet.has('cliente') && !form.customer ? 'Campo obligatorio' : null}
                  />
                  <TextInput
                    label="Dirección"
                    leadIcon="map-pin"
                    value={form.address}
                    onChange={(e) => update({ address: e.target.value })}
                    placeholder="Cra 8 # 12-34, Bogotá"
                    error={invalidSet.has('cliente') && !form.address ? 'Campo obligatorio' : null}
                  />
                  <TextInput
                    label="Ubicación / Zona"
                    leadIcon="map"
                    value={form.location}
                    onChange={(e) => update({ location: e.target.value })}
                    placeholder="Col. Centro · piso 2"
                    hint="Puedes pegar coordenadas o el barrio."
                  />
                </>
              )}

              {active === 'resumen' && (
                <>
                  <div className="form-section">Costos</div>
                  <div className="field-row">
                    <MoneyInput label="Mano de obra" value={form.laborCost} onChange={(v) => update({ laborCost: v })}
                      error={invalidSet.has('resumen') && !form.laborCost ? 'Obligatorio' : null} />
                    <MoneyInput label="Descuento" value={form.discount} onChange={(v) => update({ discount: v })} />
                  </div>
                  <MoneyInput label="Anticipo recibido" value={form.deposit} onChange={(v) => update({ deposit: v })} />

                  <div className="totals">
                    <div className="r"><span className="k">Productos</span><span className="v">{fmtMoney(productsTotal)}</span></div>
                    <div className="r"><span className="k">Mano de obra</span><span className="v">{fmtMoney(labor)}</span></div>
                    {disc > 0 && <div className="r neg"><span className="k">Descuento</span><span className="v">- {fmtMoney(disc)}</span></div>}
                    <div className="r total"><span className="k">Total estimado</span><span className="v">{fmtMoney(total)}</span></div>
                    {dep > 0 && (
                      <>
                        <div className="r success"><span className="k">Anticipo recibido</span><span className="v">- {fmtMoney(dep)}</span></div>
                        <div className="r" style={{ fontWeight: 700 }}><span className="k">Saldo pendiente</span><span className="v">{fmtMoney(pending)}</span></div>
                      </>
                    )}
                  </div>

                  <div className="check-panel">
                    <Checkbox
                      checked={form.scheduled}
                      onChange={(v) => update({ scheduled: v })}
                      icon="calendar"
                      title="Programar servicio"
                      sub="Define fecha y hora para iniciar este servicio."
                    />
                    {form.scheduled && (
                      <div className="field-row">
                        <TextInput label="Fecha" leadIcon="calendar" type="date" value={form.scheduledDate} onChange={(e) => update({ scheduledDate: e.target.value })} />
                        <TextInput label="Hora"  leadIcon="clock"    type="time" value={form.scheduledTime} onChange={(e) => update({ scheduledTime: e.target.value })} />
                      </div>
                    )}
                  </div>

                  <div className="check-panel">
                    <Checkbox
                      checked={form.hasWarranty}
                      onChange={(v) => update({ hasWarranty: v })}
                      icon="shield"
                      title="Aplicar garantía"
                      sub="Se activará al marcar el servicio como entregado."
                    />
                    {form.hasWarranty && (
                      <div className="field-row">
                        <TextInput label="Duración" type="number" value={form.warrantyValue} onChange={(e) => update({ warrantyValue: e.target.value })} />
                        <Select
                          label="Unidad"
                          value={form.warrantyUnit}
                          onChange={(e) => update({ warrantyUnit: e.target.value })}
                          options={[
                            { value: 'days',   label: 'días' },
                            { value: 'weeks',  label: 'semanas' },
                            { value: 'months', label: 'meses' },
                            { value: 'years',  label: 'años' },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{
              display: 'flex', gap: 8, marginTop: 18, paddingTop: 14,
              borderTop: '1px solid var(--border)',
              position: 'sticky', bottom: 0, background: 'var(--card)',
            }}>
              <StepFooter
                onClose={onClose}
                onPrev={prev}
                onNext={next}
                onSubmit={doSubmit}
                isLast={isLast}
                isFirst={active === tabs[0].id}
                submitLabel="Crear servicio"
              />
            </div>
          </>
        )}
      </MultiStep>
    </Sheet>
  );
}

// ═════════════════════════════════════════════════════════
// Lightweight single-page forms (Customer / Quote / Sale)
// ═════════════════════════════════════════════════════════
function CustomerFormSheet({ open, onClose, onCreated }) {
  const [type, setType] = useModalState('persona');
  const [form, setForm] = useModalState({ name: '', phone: '', email: '', address: '', city: '', tax_id: '', note: '' });
  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const submit = () => {
    onCreated && onCreated({ type, ...form });
    setForm({ name: '', phone: '', email: '', address: '', city: '', tax_id: '', note: '' });
    onClose();
  };

  return (
    <FormShell
      open={open}
      onClose={onClose}
      icon="users"
      title="Nuevo cliente"
      subtitle="Ficha completa con historial de servicios y ventas"
      footer={<SingleFormFooter onClose={onClose} onSubmit={submit} submitLabel="Crear cliente" />}
    >
      <Segmented
        label="Tipo"
        value={type}
        onChange={setType}
        options={[
          { value: 'persona',  label: 'Persona', icon: 'user' },
          { value: 'empresa',  label: 'Empresa', icon: 'building-2' },
        ]}
      />

      <div className="form-section">Datos</div>
      <TextInput
        label={type === 'empresa' ? 'Razón social' : 'Nombre completo'}
        leadIcon={type === 'empresa' ? 'building-2' : 'user'}
        value={form.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder={type === 'empresa' ? 'Café del Centro S.A.S.' : 'María Restrepo'}
      />
      {type === 'empresa' && (
        <TextInput
          label="NIT / Identificación fiscal"
          leadIcon="hash"
          value={form.tax_id}
          onChange={(e) => update({ tax_id: e.target.value })}
          placeholder="900.123.456-7"
        />
      )}

      <div className="form-section">Contacto</div>
      <div className="field-row">
        <TextInput label="Teléfono" leadIcon="phone" value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="300 000 0000" />
        <TextInput label="Correo (opcional)" leadIcon="mail" type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="contacto@…" />
      </div>
      <div className="field-row">
        <TextInput label="Dirección" leadIcon="map-pin" value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Cra 8 # 12-34" />
        <TextInput label="Ciudad" leadIcon="map" value={form.city} onChange={(e) => update({ city: e.target.value })} placeholder="Bogotá" />
      </div>

      <div className="form-section">Notas</div>
      <TextArea label="Notas internas" value={form.note} onChange={(e) => update({ note: e.target.value })} placeholder="Cómo llegó, referencias, preferencias…" />
    </FormShell>
  );
}

function QuoteFormSheet({ open, onClose, onCreated }) {
  const [form, setForm] = useModalState({ customer: '', desc: '', total: '', validity: '15', template: 'classic', sendWhats: true });
  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const submit = () => {
    onCreated && onCreated(form);
    setForm({ customer: '', desc: '', total: '', validity: '15', template: 'classic', sendWhats: true });
    onClose();
  };

  return (
    <FormShell
      open={open}
      onClose={onClose}
      icon="file-text"
      title="Nueva cotización"
      subtitle="Genera una propuesta enviable por WhatsApp"
      footer={<SingleFormFooter onClose={onClose} onSubmit={submit} submitLabel="Crear cotización" />}
    >
      <div className="form-section">Cliente</div>
      <TextInput label="Cliente" leadIcon="user" value={form.customer} onChange={(e) => update({ customer: e.target.value })} placeholder="Buscar cliente…" />

      <div className="form-section">Detalle</div>
      <TextArea label="Descripción de la propuesta" value={form.desc} onChange={(e) => update({ desc: e.target.value })} placeholder="Cambio cerradura puerta principal + instalación" />
      <div className="field-row">
        <MoneyInput label="Total estimado" value={form.total} onChange={(v) => update({ total: v })} />
        <Select
          label="Validez"
          leadIcon="calendar"
          value={form.validity}
          onChange={(e) => update({ validity: e.target.value })}
          options={[{ value: '7', label: '7 días' }, { value: '15', label: '15 días' }, { value: '30', label: '30 días' }]}
        />
      </div>

      <div className="form-section">Plantilla y envío</div>
      <Segmented
        label="Plantilla"
        value={form.template}
        onChange={(v) => update({ template: v })}
        options={[
          { value: 'classic', label: 'Clásica' },
          { value: 'banner',  label: 'Banner' },
          { value: 'hero',    label: 'Hero' },
        ]}
      />
      <div className="check-panel">
        <Checkbox
          checked={form.sendWhats}
          onChange={(v) => update({ sendWhats: v })}
          icon="send"
          title="Enviar por WhatsApp al crear"
          sub="Se abrirá WhatsApp con el PDF y el mensaje listo."
        />
      </div>
    </FormShell>
  );
}

function SaleFormSheet({ open, onClose, onCreated }) {
  const [form, setForm] = useModalState({ customer: 'Mostrador', item: '', amount: '', method: 'efectivo', invoice: false });
  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const submit = () => {
    onCreated && onCreated(form);
    setForm({ customer: 'Mostrador', item: '', amount: '', method: 'efectivo', invoice: false });
    onClose();
  };

  return (
    <FormShell
      open={open}
      onClose={onClose}
      icon="shopping-cart"
      title="Nueva venta"
      subtitle="Mostrador o factura · cierra el ticket en segundos"
      footer={<SingleFormFooter onClose={onClose} onSubmit={submit} submitLabel="Cobrar venta" />}
    >
      <div className="form-section">Cliente</div>
      <TextInput label="Cliente" leadIcon="user" value={form.customer} onChange={(e) => update({ customer: e.target.value })} placeholder="Mostrador o nombre del cliente" />

      <div className="form-section">Concepto</div>
      <TextInput label="Concepto" leadIcon="tag" value={form.item} onChange={(e) => update({ item: e.target.value })} placeholder="Duplicado llave · cerradura Yale…" />
      <MoneyInput label="Monto total" value={form.amount} onChange={(v) => update({ amount: v })} />

      <div className="form-section">Pago</div>
      <Segmented
        label="Método"
        value={form.method}
        onChange={(v) => update({ method: v })}
        options={[
          { value: 'efectivo', label: 'Efectivo',      icon: 'banknote' },
          { value: 'tarjeta',  label: 'Tarjeta',       icon: 'credit-card' },
          { value: 'transfer', label: 'Transferencia', icon: 'arrow-right-left' },
        ]}
      />
      <div className="check-panel">
        <Checkbox
          checked={form.invoice}
          onChange={(v) => update({ invoice: v })}
          icon="file-text"
          title="Generar factura electrónica"
          sub="Requiere datos fiscales del cliente."
        />
      </div>
    </FormShell>
  );
}

// Dispatcher
function FabFormSheet({ kind, onClose, onCreated }) {
  const open = !!kind;
  switch (kind) {
    case 'product':  return <ProductFormSheet  open={open} onClose={onClose} onCreated={onCreated} />;
    case 'service':  return <ServiceFormSheet  open={open} onClose={onClose} onCreated={onCreated} />;
    case 'customer': return <CustomerFormSheet open={open} onClose={onClose} onCreated={onCreated} />;
    case 'quote':    return <QuoteFormSheet    open={open} onClose={onClose} onCreated={onCreated} />;
    case 'sale':     return <SaleFormSheet     open={open} onClose={onClose} onCreated={onCreated} />;
    default: return null;
  }
}

Object.assign(window, {
  Modal, ConfirmModal, FormShell,
  ProductFormSheet, ServiceFormSheet, CustomerFormSheet, QuoteFormSheet, SaleFormSheet,
  FabFormSheet,
});
