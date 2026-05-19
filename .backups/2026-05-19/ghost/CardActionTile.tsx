import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CardActionTileProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

export function CardActionTile({ icon: Icon, label, onClick, className }: CardActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-14 rounded-2xl bg-[hsl(var(--surface-2))] hover:bg-muted text-foreground flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform",
        className,
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
