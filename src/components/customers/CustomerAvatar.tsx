import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { cn } from "@/lib/utils";

type CustomerType = "person" | "company" | "business";

interface CustomerAvatarProps {
  name?: string | null;
  customerType?: CustomerType;
  noWorkAgain?: boolean;
  className?: string;
}

function getCustomerInitials(name?: string | null): string {
  const normalizedName = name?.trim().replace(/\s+/g, " ") || "";

  if (!normalizedName) {
    return "?";
  }

  const words = normalizedName.split(" ").filter(Boolean);

  if (words.length >= 2) {
    const initials = words
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("");

    if (initials) {
      return initials.toUpperCase();
    }
  }

  const compactName = normalizedName.replace(/[^\p{L}\p{N}]/gu, "");

  if (compactName.length >= 2) {
    return compactName.slice(0, 2).toUpperCase();
  }

  return normalizedName.charAt(0).toUpperCase();
}

/**
 * Avatar del cliente: iniciales sobre la forma orgánica "cookie" de M3 Expressive
 * (criterio: docs/CRITERIO-DISENO-M3E.md). El color de la forma indica el tipo
 * de cliente; rojo claro si está marcado como "no volver a trabajar".
 * El tamaño se controla con `className` (h-/w-); el texto escala con `text-*`.
 */
export function CustomerAvatar({ name, customerType = "person", noWorkAgain = false, className }: CustomerAvatarProps) {
  const initials = getCustomerInitials(name);
  const shapeColor = noWorkAgain
    ? "text-destructive-light"
    : customerType === "company"
      ? "text-primary-light"
      : customerType === "business"
        ? "text-warning-light"
        : "text-info-light";

  return (
    <MaterialShape
      name="cookie6"
      className={cn("h-11 w-11 text-sm", shapeColor, className)}
    >
      <span aria-hidden="true" className="font-bold leading-none text-foreground">{initials}</span>
    </MaterialShape>
  );
}
