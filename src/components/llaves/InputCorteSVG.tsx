interface InputCorteSVGProps {
  x: number;
  y: number;
  value: string;
  onChange: (value: string) => void;
  color?: 'gray' | 'indigo' | 'green' | 'blue';
  showUpArrow?: boolean;
  showDownArrow?: boolean;
  upActive?: boolean;
  downActive?: boolean;
  onUpToggle?: () => void;
  onDownToggle?: () => void;
  maxDepth?: number;
  /** Unique prefix for building the input ID: `${idPrefix}-${index}` */
  idPrefix?: string;
  index?: number;
  total?: number;
  /** If set, enables cyclic navigation using `bitting-input-${globalIndex}` IDs */
  globalIndex?: number;
  /** Total inputs across all axes for cyclic wrap */
  totalGlobalInputs?: number;
  /** Prefix of the next axis (legacy cross-axis jump) */
  nextPrefix?: string;
  /** Prefix of the previous axis (legacy cross-axis jump) */
  prevPrefix?: string;
  /** Total inputs in previous axis (legacy cross-axis jump) */
  prevTotal?: number;
  /** Whether this cell is currently the selected target for the virtual keypad */
  isSelected?: boolean;
  /** Notifies parent that this cell should become the selected target */
  onSelect?: () => void;
  /** Disables native keyboard, used when a virtual keypad drives input */
  virtualKeypadMode?: boolean;
}

const colorMap = {
  gray: { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
  indigo: { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
  green: { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
  blue: { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
};

export function InputCorteSVG({
  x, y, value, onChange, color = 'gray',
  showUpArrow, showDownArrow, upActive, downActive, onUpToggle, onDownToggle,
  maxDepth = 9,
  idPrefix = 'corte', index = 0, total = 1,
  globalIndex, totalGlobalInputs,
  nextPrefix, prevPrefix, prevTotal,
  isSelected, onSelect, virtualKeypadMode,
}: InputCorteSVGProps) {
  const c = colorMap[color];
  const numVal = parseInt(value, 10);
  const canUp = value !== '' && !isNaN(numVal) && numVal < maxDepth;
  const canDown = value !== '' && !isNaN(numVal) && numVal > 1;

  // Determine if we use global cyclic IDs or legacy prefix-based IDs
  const useCyclic = globalIndex !== undefined && totalGlobalInputs !== undefined;
  const inputId = useCyclic ? `bitting-input-${globalIndex}` : `${idPrefix}-${index}`;

  const focusById = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) { el.focus(); el.select(); }
  };

  const focusPrev = () => {
    if (useCyclic) {
      const prev = globalIndex! > 0 ? globalIndex! - 1 : totalGlobalInputs! - 1;
      focusById(`bitting-input-${prev}`);
    } else if (index > 0) {
      focusById(`${idPrefix}-${index - 1}`);
    } else {
      const pPre = prevPrefix || idPrefix;
      const pTot = prevTotal || total;
      focusById(`${pPre}-${pTot - 1}`);
    }
  };

  const focusNext = () => {
    if (useCyclic) {
      const next = globalIndex! < totalGlobalInputs! - 1 ? globalIndex! + 1 : 0;
      focusById(`bitting-input-${next}`);
    } else if (index < total - 1) {
      focusById(`${idPrefix}-${index + 1}`);
    } else {
      const nPre = nextPrefix || idPrefix;
      focusById(`${nPre}-0`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        onChange('');
        focusPrev();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusNext();
      }
      return;
    }

    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }

    e.preventDefault();
    const currentVal = e.currentTarget.value;
    let newValStr: string;
    if (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === currentVal.length) {
      newValStr = e.key;
    } else {
      newValStr = currentVal + e.key;
    }

    const num = parseInt(newValStr);
    if (isNaN(num) || num < 1 || num > maxDepth) return;

    onChange(newValStr);

    const maxDigits = maxDepth.toString().length;
    if (newValStr.length >= maxDigits) {
      setTimeout(() => focusNext(), 10);
    }
  };

  return (
    <>
      {showUpArrow && canUp && (
        <foreignObject x={x} y={y - 14} width="18" height="14">
          <button
            onClick={onUpToggle}
            style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 'bold',
              backgroundColor: upActive ? '#2563eb' : '#e5e7eb',
              color: upActive ? '#fff' : '#6b7280',
              borderRadius: '3px 3px 0 0', border: 'none',
              cursor: 'pointer', lineHeight: 1, padding: 0,
            }}
          >▲</button>
        </foreignObject>
      )}
      <foreignObject x={x} y={y} width="18" height="24">
        <div style={{ width: '18px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            id={inputId}
            type="text"
            maxLength={2}
            value={value}
            onFocus={(e) => { e.target.select(); onSelect?.(); }}
            onPointerDown={() => { onSelect?.(); }}
            onChange={() => {}}
            onKeyDown={virtualKeypadMode ? (e) => { e.preventDefault(); } : handleKeyDown}
            inputMode={virtualKeypadMode ? 'none' : undefined}
            readOnly={virtualKeypadMode}
            autoComplete="off"
            style={{
              width: '18px', height: '22px', fontSize: '11px',
              padding: 0, textAlign: 'center', fontWeight: 'bold',
              color: c.text,
              backgroundColor: isSelected ? '#dbeafe' : c.bg,
              border: isSelected ? '2px solid #2563eb' : `1px solid ${c.border}`,
              borderRadius: '3px',
              outline: 'none',
              boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
              lineHeight: '22px', display: 'block',
              caretColor: virtualKeypadMode ? 'transparent' : undefined,
              cursor: virtualKeypadMode ? 'pointer' : 'text',
            }}
          />
        </div>
      </foreignObject>
      {showDownArrow && canDown && (
        <foreignObject x={x} y={y + 24} width="18" height="14">
          <button
            onClick={onDownToggle}
            style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 'bold',
              backgroundColor: downActive ? '#2563eb' : '#e5e7eb',
              color: downActive ? '#fff' : '#6b7280',
              borderRadius: '0 0 3px 3px', border: 'none',
              cursor: 'pointer', lineHeight: 1, padding: 0,
            }}
          >▼</button>
        </foreignObject>
      )}
    </>
  );
}
