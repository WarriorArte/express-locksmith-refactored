/**
 * Campo de selección con el selector NATIVO del sistema (Android / iOS / navegador).
 * Criterio: docs/CRITERIO-DISENO-M3E.md
 *
 * Por fuera se ve como un campo M3 grande (etiqueta + valor + flecha); por dentro
 * hay un <select> real e invisible que cubre todo el campo, así que al tocarlo
 * se abre la lista nativa del teléfono. Preferencia del usuario: las listas
 * desplegables (años, marcas, modelos…) usan el selector nativo, no hojas ni
 * componentes propios.
 *
 *   <NativeSelectField label="Marca" value={make} placeholder="Elige la marca"
 *     options={makes.map((m) => ({ value: m }))} onChange={setMake} />
 */
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón compacto (filtro) con selector NATIVO encima. En móvil puede ser solo
 * ícono; con `showLabel` muestra el valor elegido (útil en escritorio).
 */
export function NativeSelectButton({
  icon,
  label,
  value,
  options,
  onChange,
  showLabel = false,
  className,
}: {
  icon: ReactNode;
  /** Nombre accesible del filtro ("Filtrar por categoría"). */
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Muestra el texto de la opción elegida junto al ícono. */
  showLabel?: boolean;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <div
      className={cn(
        "relative flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-background/70 text-foreground focus-within:ring-2 focus-within:ring-primary",
        showLabel ? "px-4" : "w-10",
        className,
      )}
    >
      <span className="pointer-events-none flex items-center gap-2">
        {icon}
        {showLabel && <span className="max-w-[12rem] truncate text-sm font-medium">{selected?.label ?? selected?.value}</span>}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none text-base opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface SelectOption {
  value: string;
  label?: string;
}

interface NativeSelectFieldProps {
  label: string;
  value?: string | null;
  placeholder: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Superficie del campo: sobre el hero (`onHero`) o sobre el fondo de la página. */
  surface?: "onHero" | "card";
  className?: string;
}

export function NativeSelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  surface = "card",
  className,
}: NativeSelectFieldProps) {
  const selected = options.find((o) => o.value === value);
  return (
    <div
      className={cn(
        "relative flex h-16 w-full items-center justify-between gap-3 overflow-hidden rounded-2xl px-4 transition-opacity focus-within:ring-2 focus-within:ring-primary",
        surface === "onHero" ? "bg-card text-card-foreground" : "bg-card text-card-foreground shadow-sm",
        disabled && "opacity-50",
        className,
      )}
    >
      <span className="pointer-events-none min-w-0">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "block truncate text-base",
            selected ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {selected ? (selected.label ?? selected.value) : placeholder}
        </span>
      </span>
      <ChevronDown className="pointer-events-none h-5 w-5 shrink-0 text-muted-foreground" />

      {/* Selector nativo: invisible pero ocupa todo el campo y recibe el toque.
          text-base (16 px) evita el zoom automático de iOS al enfocarlo. */}
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none text-base opacity-0 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
    </div>
  );
}
