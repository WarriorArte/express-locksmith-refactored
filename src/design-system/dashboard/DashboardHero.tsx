import * as React from "react";

import { cn } from "@/lib/utils";
import { ModuleHeader } from "@/design-system/layout/ModuleHeader";

interface DashboardHeroProps {
  firstName: string;
  inProgressServices: number;
  expiringQuotes: number;
  accountTrigger?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DashboardHero({
  firstName,
  inProgressServices,
  expiringQuotes,
  accountTrigger,
  className,
}: DashboardHeroProps) {
  return (
    <section className={cn("dashboard-surface py-1", className)}>
      <ModuleHeader className="-mx-2" title={`Hola, ${firstName}`} subtitle={`${inProgressServices} servicios en curso · ${expiringQuotes} cotizaciones por vencer`} accountTrigger={accountTrigger} />
    </section>
  );
}
