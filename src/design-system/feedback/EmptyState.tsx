/**
 * Estado vacío compartido de los módulos (Inventario, Servicios, Ventas,
 * Cotizaciones, Clientes, Garantías). Criterio M3E (docs/CRITERIO-DISENO-M3E.md):
 * ícono sobre forma cookie, título, una línea de ayuda y acción opcional.
 */
import { Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Acción principal (p. ej. "Nueva venta"). Se omite cuando hay filtros activos. */
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-[28px] bg-card px-6 py-10 text-center shadow-sm">
      <MaterialShape name="cookie9" className="mb-4 h-20 w-20 text-primary-light">
        <Icon className="h-8 w-8 text-primary" />
      </MaterialShape>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mx-auto max-w-xs text-[15px] text-muted-foreground">{description}</p>}
      {action && (
        <Button className="mt-5" onClick={action.onClick}>
          <Plus className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
