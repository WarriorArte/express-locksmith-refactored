import * as React from "react";
import { cn } from "@/lib/utils";

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
}

export function HeroHeader({
  title,
  subtitle,
  eyebrow = "Cerrajería Express",
  action,
  mobileAction,
  accountTrigger,
  compact = false,
  className,
  children,
}: HeroHeaderProps) {
  return (
    <div
      className={cn(
        "ce-hero p-[22px_16px] lg:p-[22px]",
        !compact && "ce-hero-mobile-bleed",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="ce-hero-eyebrow mb-1.5 lg:mb-2">{eyebrow}</div>
          <h1 className="ce-hero-title text-[clamp(1.55rem,5.4vw,2.15rem)] lg:text-[clamp(1.75rem,3vw,2.5rem)]">
            {title}
          </h1>
          {subtitle && (
            <p className="ce-hero-meta mt-2 max-w-[460px] lg:mt-3">{subtitle}</p>
          )}
          {mobileAction && (
            <div className="mt-3 flex flex-wrap items-center gap-2 lg:hidden">
              {mobileAction}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 flex-shrink-0">
          {action && <div className="hidden lg:block">{action}</div>}
          {accountTrigger}
        </div>
      </div>

      {children && (
        <div className="relative z-[1] mt-4 animate-hero-search-in lg:mt-5">
          {children}
        </div>
      )}
    </div>
  );
}
