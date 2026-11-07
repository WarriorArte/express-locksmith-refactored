/**
 * Piezas de las pantallas de acceso (taller y SuperAdmin).
 * Criterio M3E (docs/CRITERIO-DISENO-M3E.md): marca sobre forma orgánica que gira
 * lento, título de un solo color, campos tonales de 56 px sin borde y con
 * etiqueta accesible.
 */
import * as React from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { cn } from "@/lib/utils";

export function AuthBrand({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <MaterialShape name="cookie9" spin className="mb-6 h-28 w-28 text-primary-light">
        <Icon className="h-11 w-11 text-primary" strokeWidth={2.2} />
      </MaterialShape>
      <h1 className="text-[2rem] font-bold leading-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  /** Texto del campo: se usa como placeholder y como etiqueta accesible. */
  label: string;
  error?: string;
  /** Campo de contraseña con botón para mostrar/ocultar. */
  password?: boolean;
}

export function AuthField({ icon: Icon, label, error, password = false, className, ...props }: AuthFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const id = React.useId();
  return (
    <div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          aria-label={label}
          placeholder={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
          type={password ? (visible ? "text" : "password") : props.type}
          className={cn(
            "h-14 w-full rounded-2xl bg-card pl-12 text-base text-foreground shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary disabled:opacity-60",
            password ? "pr-14" : "pr-4",
            error && "ring-2 ring-destructive",
            className,
          )}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="ml-4 mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
