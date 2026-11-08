/* eslint-disable react-refresh/only-export-components */
import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Snackbar M3 (único sistema de notificaciones de la app; use-toast redirige aquí):
 * abajo al centro, por encima de la barra inferior móvil, superficie inversa.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      offset={24}
      mobileOffset={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:min-h-12 group-[.toaster]:bg-foreground group-[.toaster]:text-background group-[.toaster]:border-0 group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:shadow-lg group-[.toaster]:text-[15px]",
          title: "group-[.toast]:font-medium",
          description: "group-[.toast]:text-background/80",
          actionButton: "group-[.toast]:bg-transparent group-[.toast]:text-primary-light group-[.toast]:font-semibold",
          icon: "group-[.toast]:text-background",
          error: "[&_[data-icon]]:!text-destructive",
          success: "[&_[data-icon]]:!text-success",
          cancelButton: "group-[.toast]:bg-transparent group-[.toast]:text-background/80",
        },
      }}
      {...props}
    />
  );
};

/** Pulso háptico corto (solo Android lo soporta; en otros no hace nada). */
export const haptic = (ms = 10) => {
  try { navigator.vibrate?.(ms); } catch { /* noop */ }
};

export { Toaster, toast };
