/* eslint-disable react-refresh/only-export-components */
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Snackbar M3: abajo al centro, por encima de la barra inferior móvil. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

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
            "group toast group-[.toaster]:bg-foreground group-[.toaster]:text-background group-[.toaster]:border-0 group-[.toaster]:rounded-[12px] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-background/80",
          actionButton: "group-[.toast]:bg-transparent group-[.toast]:text-primary group-[.toast]:font-semibold",
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
