import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/responsive-dialog";

/**
 * Encabezado de los formularios de alta/edición — criterio M3E
 * (docs/CRITERIO-DISENO-M3E.md): solo el título en grande. Sin cuadrito de
 * ícono; la descripción queda para lectores de pantalla (menos texto a la vista).
 * `icon`, `tone` y `meta` se conservan por compatibilidad con los formularios.
 */
interface CreationDialogHeaderProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "warning" | "destructive";
  meta?: string;
}

export function CreationDialogHeader({ title, description }: CreationDialogHeaderProps) {
  return (
    <div className="text-left">
      <DialogTitle className="text-2xl font-bold leading-tight">{title}</DialogTitle>
      <DialogDescription className="sr-only">{description}</DialogDescription>
    </div>
  );
}
