// Form-field primitives — used inside FormSheets and the auth flow.
// Each one is a controlled component with consistent label / hint / error styling.

const { useState: useFormState, useId } = React;

// Label + control + hint wrapper.
function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {(error || hint) && (
        <div className={`field-hint ${error ? 'error' : ''}`}>{error || hint}</div>
      )}
    </div>
  );
}

function TextInput({ label, leadIcon, hint, error, type = 'text', ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className={`field-control ${leadIcon ? 'has-lead' : ''}`}>
        {leadIcon && <span className="lead-icon"><Icon name={leadIcon} /></span>}
        <input id={id} type={type} className="field-input" {...rest} />
      </div>
    </Field>
  );
}

function TextArea({ label, hint, error, rows = 3, ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea id={id} className="field-textarea" rows={rows} {...rest} />
    </Field>
  );
}

function Select({ label, leadIcon, hint, error, options = [], ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className={`field-control select ${leadIcon ? 'has-lead' : ''}`}>
        {leadIcon && <span className="lead-icon"><Icon name={leadIcon} /></span>}
        <select id={id} className="field-select" {...rest}>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}

// Currency input with a small "$" prefix segment.
function MoneyInput({ label, hint, error, value, onChange, currency = '$', placeholder = '0' }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="field-money">
        <span className="prefix">{currency}</span>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
        />
      </div>
    </Field>
  );
}

// Segmented control (touch-friendly tab switcher).
function Segmented({ label, value, onChange, options = [] }) {
  return (
    <Field label={label}>
      <div className="field-segmented" role="tablist">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={value === o.value}
            className={value === o.value ? 'active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <Icon name={o.icon} />}
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

// Color/category swatch picker — used in product form.
function SwatchPicker({ label, value, onChange, options = [] }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(o => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                borderRadius: 99,
                border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: active ? 'hsl(159 100% 45% / 0.10)' : 'var(--card)',
                color: 'var(--fg)',
                font: '600 12px/1 var(--font-sans)',
                cursor: 'pointer',
                transition: 'border-color 150ms var(--ease-out), background 150ms var(--ease-out)',
              }}
            >
              <span style={{
                width: 12, height: 12, borderRadius: 3,
                background: o.color, flexShrink: 0,
                boxShadow: 'inset 0 0 0 1px hsl(0 0% 0% / 0.08)'
              }} />
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

// Used by the inventory form — captures store / warehouse stock side-by-side.
function StockSplit({ store, warehouse, onChange }) {
  return (
    <div className="field-row">
      <TextInput
        label="Stock tienda"
        leadIcon="store"
        type="number"
        value={store}
        onChange={(e) => onChange({ store: e.target.value, warehouse })}
        placeholder="0"
      />
      <TextInput
        label="Stock bodega"
        leadIcon="warehouse"
        type="number"
        value={warehouse}
        onChange={(e) => onChange({ store, warehouse: e.target.value })}
        placeholder="0"
      />
    </div>
  );
}

Object.assign(window, {
  Field, TextInput, TextArea, Select, MoneyInput, Segmented, SwatchPicker, StockSplit,
});

// ─────────────────────────────────────────────────────────
// IconTabs — multi-step tabs with locked / complete / invalid states.
// Mirrors src/components/ui/icon-tabs in the source codebase: small icon
// over a short label, with subtle progress indicators.
// ─────────────────────────────────────────────────────────
function IconTabs({ value, onChange, items, unlockedThrough = 0, invalidSet = new Set() }) {
  return (
    <div className="icon-tabs" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it, i) => {
        const isActive   = value === it.id;
        const isLocked   = i > unlockedThrough;
        const isComplete = i < unlockedThrough && !invalidSet.has(it.id);
        const isInvalid  = invalidSet.has(it.id);
        return (
          <button
            key={it.id}
            type="button"
            className={[
              'icon-tab',
              isActive ? 'active' : '',
              isComplete ? 'complete' : '',
              isInvalid ? 'invalid' : '',
            ].filter(Boolean).join(' ')}
            disabled={isLocked}
            onClick={() => !isLocked && onChange(it.id)}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="icon-tab-num">{String(i + 1).padStart(2, '0')}</span>
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MultiStep — manages activeTab + unlocked steps + attempted set.
// Renders IconTabs + step progress + a render-prop body.
// ─────────────────────────────────────────────────────────
function MultiStep({ tabs, isValid, onSubmit, children }) {
  const [active, setActive] = React.useState(tabs[0].id);
  const [unlocked, setUnlocked] = React.useState(0);
  const [attempted, setAttempted] = React.useState(new Set());

  const idx = tabs.findIndex(t => t.id === active);
  const isLast = idx === tabs.length - 1;
  const currentValid = isValid ? isValid(active) : true;

  const next = () => {
    if (!currentValid) {
      setAttempted(prev => new Set([...prev, active]));
      return;
    }
    if (idx < tabs.length - 1) {
      setUnlocked(u => Math.max(u, idx + 1));
      setActive(tabs[idx + 1].id);
    }
  };

  const prev = () => {
    if (idx > 0) setActive(tabs[idx - 1].id);
  };

  const submit = () => {
    if (isValid) {
      const firstInvalid = tabs.find(t => !isValid(t.id));
      if (firstInvalid) {
        setAttempted(prev => new Set([...prev, firstInvalid.id]));
        setActive(firstInvalid.id);
        return;
      }
    }
    onSubmit && onSubmit();
  };

  const invalidSet = new Set(
    [...attempted].filter(id => isValid && !isValid(id))
  );

  return (
    <>
      <IconTabs
        value={active}
        onChange={(id) => {
          const target = tabs.findIndex(t => t.id === id);
          if (target <= unlocked) setActive(id);
        }}
        items={tabs}
        unlockedThrough={unlocked}
        invalidSet={invalidSet}
      />
      <div className="step-progress" aria-hidden="true">
        <span>Paso {idx + 1} de {tabs.length}</span>
        <div className="bar"><div className="fill" style={{ width: `${((idx + 1) / tabs.length) * 100}%` }} /></div>
      </div>
      {children({ active, next, prev, isLast, submit, invalidSet, currentValid })}
    </>
  );
}

// Small reusable checkbox row used in service form (programar, garantía).
function Checkbox({ checked, onChange, title, sub, icon }) {
  return (
    <label className="check-row" style={{ position: 'relative' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box"><Icon name="check" /></span>
      <span className="check-row-body">
        <span className="check-row-title">{icon && <Icon name={icon} />} {title}</span>
        {sub && <span className="check-row-sub">{sub}</span>}
      </span>
    </label>
  );
}

Object.assign(window, { IconTabs, MultiStep, Checkbox });
