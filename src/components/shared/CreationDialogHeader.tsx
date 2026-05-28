import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";

interface CreationDialogHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "warning" | "destructive";
  meta?: string;
}

export function CreationDialogHeader({
  icon: Icon,
  title,
  description,
  tone = "primary",
  meta,
}: CreationDialogHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "warning" && "bg-warning/15 text-warning",
          tone === "destructive" && "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </div>
      <div className="min-w-0">
        {meta && (
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {meta}
          </div>
        )}
        <DialogTitle className="text-xl font-extrabold tracking-tight">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-1">
          {description}
        </DialogDescription>
      </div>
    </div>
  );
}
