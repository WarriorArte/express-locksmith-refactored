/**
 * NativeSelect — <select> nativo con el mismo aspecto que <Input>.
 *
 * Preferencia del usuario (2026-11-06): las listas desplegables abren el selector
 * NATIVO del sistema, no componentes propios. Úsalo en formularios en lugar de
 * Select de shadcn/Radix. Funciona dentro de <FormControl> (recibe id/aria-*).
 *
 *   <NativeSelect value={v} onChange={(e) => set(e.target.value)}>
 *     <option value="person">Persona</option>
 *   </NativeSelect>
 */
import * as React from "react";
import { cn } from "@/lib/utils";

// Flecha como fondo SVG para que el componente sea un solo <select>
// (así FormControl le pasa id y aria-* directamente).
const chevron =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px_16px] bg-[position:right_14px_center] bg-no-repeat";

const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-12 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-input bg-card py-3 pl-4 pr-10 text-base font-medium text-foreground transition-colors hover:border-foreground/60 focus-visible:border-2 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        chevron,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
