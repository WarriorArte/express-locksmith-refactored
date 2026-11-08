/**
 * Selector de paleta de color (Configuración → Sistema).
 * Cada opción muestra el color de marca y, en un punto, el de selección. La elección se guarda en el teléfono (useTheme → localStorage).
 */
import { Check } from "lucide-react";
import { PALETTES, useTheme } from "@/hooks/useTheme";
import { spawnRipple } from "@/lib/ripple";
import { cn } from "@/lib/utils";

export function PalettePicker() {
  const { palette, setPalette } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colores de la app" className="grid grid-cols-2 gap-2">
      {PALETTES.map((p) => {
        const selected = palette === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPalette(p.id)}
            onPointerDown={spawnRipple}
            className={cn(
              "relative flex items-center gap-3 overflow-hidden rounded-[20px] bg-muted p-3 text-left transition-shadow",
              selected && "ring-2 ring-inset ring-foreground",
            )}
          >
            {/* Color de marca con un punto del color de selección */}
            <span className="relative h-11 w-11 shrink-0">
              <svg viewBox="0 0 44 44" aria-hidden="true" className="absolute inset-0 h-11 w-11">
                <circle cx="22" cy="22" r="18" fill={p.brand} />
                <circle cx="31" cy="31" r="9" fill={p.selection} stroke="white" strokeWidth="2.5" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-tight text-foreground">{p.name}</span>
            {selected && <Check className="h-4 w-4 shrink-0 text-foreground" />}
          </button>
        );
      })}
    </div>
  );
}
