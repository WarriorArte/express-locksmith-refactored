import * as React from "react";
import { cn } from "@/lib/utils";
import { ModuleHeader } from "./ModuleHeader";

interface HeroHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  mobileAction?: React.ReactNode;
  accountTrigger?: React.ReactNode;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export function HeroHeader({
  title,
  subtitle,
  eyebrow,
  action,
  mobileAction,
  accountTrigger,
  compact = false,
  className,
  children,
  onBack,
  backLabel,
}: HeroHeaderProps) {
  return (
    <div
      className={cn(
        "bg-background py-1",
        compact && "min-w-0",
        className,
      )}
    >
      <ModuleHeader
        className="-mx-2"
        title={title}
        subtitle={subtitle ?? eyebrow}
        onBack={onBack}
        backLabel={backLabel}
        actions={<>{action && <div className="hidden lg:block">{action}</div>}{mobileAction && <div className="lg:hidden">{mobileAction}</div>}</>}
        accountTrigger={accountTrigger}
      />

      {children && (
        <div className="relative z-[1] mt-3">
          {children}
        </div>
      )}
    </div>
  );
}
