/**
 * Tarjeta de acceso directo del estilo M3 Expressive (cuadrado redondeado +
 * nombre debajo). `create` marca las que abren un formulario para registrar
 * algo nuevo: muestran un "+" para distinguirlas de las que solo navegan.
 * Criterio M3E: docs/CRITERIO-DISENO-M3E.md
 */
import { Plus, type LucideIcon } from "lucide-react";
import { spawnRipple } from "@/lib/ripple";

type ShortcutTileProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** true cuando el acceso registra un elemento nuevo en lugar de navegar. */
  create?: boolean;
};

export function ShortcutTile({ icon: Icon, label, onClick, create = false }: ShortcutTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={create ? `Crear ${label.toLowerCase()}` : undefined}
      className="flex flex-col items-center gap-2 text-center"
    >
      <span
        onPointerDown={spawnRipple}
        className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] bg-accent text-accent-foreground"
      >
        <Icon className="h-6 w-6" />
        {create && (
          <Plus
            aria-hidden="true"
            className="absolute right-2 top-2 h-3.5 w-3.5 opacity-90"
            strokeWidth={2.8}
          />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
