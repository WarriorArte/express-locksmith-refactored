/**
 * Notificaciones: un único sistema (Sonner) mostrado como snackbar M3 abajo al
 * centro, por encima de la barra inferior (ver components/ui/sonner.tsx).
 *
 * Antes convivían el toast de shadcn (arriba) y Sonner (abajo), así que unas
 * notificaciones salían arriba y otras abajo. Este módulo conserva la API de
 * shadcn — `const { toast } = useToast(); toast({ title, description, variant })`
 * — y la redirige a Sonner, para no tocar los ~36 archivos que la usan.
 */
import type { ReactNode } from "react";
import { toast as sonner } from "sonner";

type ToastInput = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
};

function vibrate(variant: ToastInput["variant"]) {
  try {
    navigator.vibrate?.(variant === "destructive" ? [20, 40, 20] : 10);
  } catch {
    /* sin vibración */
  }
}

function toast({ title, description, variant = "default", duration }: ToastInput) {
  vibrate(variant);
  // Con título: título + descripción. Solo descripción: va como mensaje.
  const message = title ?? description ?? "";
  const options = { description: title ? description : undefined, duration };
  const id = variant === "destructive" ? sonner.error(message, options) : sonner(message, options);

  return {
    id: String(id),
    dismiss: () => sonner.dismiss(id),
    update: (next: ToastInput) => {
      sonner.dismiss(id);
      return toast(next);
    },
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => sonner.dismiss(toastId),
    /** Compatibilidad: el Toaster de shadcn ya no se monta; no hay cola propia. */
    toasts: [] as never[],
  };
}

export { useToast, toast };
