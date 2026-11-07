import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  backIcon?: ReactNode;
  actions?: ReactNode;
  accountTrigger?: ReactNode;
  className?: string;
}

/** Shared two-row app bar for module pages and full-screen tools. */
export function ModuleHeader({ title, subtitle, onBack, backLabel = "Volver al inicio", backIcon, actions, accountTrigger, className }: ModuleHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className={cn("relative flex min-h-11 min-w-0 items-center gap-1", className)}>
      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onBack ?? (() => navigate("/"))} aria-label={backLabel}>
        {backIcon ?? <ArrowLeft className="!h-6 !w-6" />}
      </Button>
      <div className="min-w-0 flex-1 pl-1">
        <h1 className="truncate text-lg font-semibold leading-tight text-foreground" title={typeof title === "string" ? title : undefined}>{title}</h1>
        <p className="min-h-[15px] truncate text-xs leading-tight text-muted-foreground" title={typeof subtitle === "string" ? subtitle : undefined}>{subtitle ?? "\u00a0"}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {accountTrigger && <div className="shrink-0 pr-2">{accountTrigger}</div>}
    </div>
  );
}