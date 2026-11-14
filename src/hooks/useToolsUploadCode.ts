import { useWorkshop } from "@/hooks/useWorkshop";

/** Carpeta privada del SuperAdmin en el servidor (uploads/superadmin/…). */
export const SUPERADMIN_UPLOAD_BUCKET = "superadmin";

/**
 * Código de carpeta para las imágenes de Herramientas (Immo, Keycode, procedimientos).
 *
 * El SuperAdmin SIEMPRE sube a su carpeta privada, aunque esté en «modo taller»:
 * así ningún usuario de un taller puede listar, renombrar ni borrar esas imágenes
 * (los técnicos solo las ven dentro de la información que se les muestra).
 */
export function useToolsUploadCode(): string | undefined {
  const { isSuperAdmin, currentWorkshop } = useWorkshop();
  return isSuperAdmin ? SUPERADMIN_UPLOAD_BUCKET : currentWorkshop?.code;
}
