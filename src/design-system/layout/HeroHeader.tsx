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
  eyebrow,
  action,
  mobileAction,
  accountTrigger,
  compact = false,
  className,
  children,
}: HeroHeaderProps) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = React.useState(false);

  // Barra superior M3: cuando el título grande sale de la pantalla aparece una barra compacta.
  React.useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
    <div
      aria-hidden={!collapsed}
      className={cn(
        "lg:hidden fixed inset-x-0 top-0 z-40 bg-background/95 backdrop-blur-sm shadow-sm",
        "pt-[env(safe-area-inset-top)] transition-[opacity,transform] duration-300 ease-emphasized",
        collapsed ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-full",
      )}
    >
      <div className="flex h-14 items-center px-4 text-[1.25rem] font-semibold font-display text-foreground truncate">
        {title}
      </div>
    </div>
    <div
      className={cn(
        "ce-hero p-[22px_16px] lg:p-[22px]",
        !compact && "ce-hero-mobile-bleed",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="ce-hero-eyebrow mb-1.5 lg:mb-2">{eyebrow}</div>}
          <h1 ref={titleRef} className="ce-hero-title text-[clamp(1.55rem,5.4vw,2.15rem)] lg:text-[clamp(1.75rem,3vw,2.5rem)]">
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
    </>
  );
}
