import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function CustomerAvatar({ name, customerType = "person", noWorkAgain = false, className }: CustomerAvatarProps) {
  const initials = getCustomerInitials(name);
  const fallbackClassName =
    noWorkAgain
      ? "bg-destructive-light text-destructive"
      : customerType === "company"
      ? "bg-primary-light text-foreground dark:text-primary"
      : customerType === "business"
        ? "bg-warning-light text-warning"
        : "bg-info-light text-info";

  return (
    <Avatar className={cn("h-11 w-11 rounded-xl", className)}>
      <AvatarFallback
        className={cn(
          "rounded-xl text-sm font-bold",
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
