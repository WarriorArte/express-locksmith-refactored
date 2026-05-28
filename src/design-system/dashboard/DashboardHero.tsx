import * as React from "react";

interface DashboardHeroProps {
  firstName: string;
  inProgressServices: number;
  expiringQuotes: number;
  accountTrigger?: React.ReactNode;
}

export function DashboardHero({
  firstName,
  inProgressServices,
  expiringQuotes,
  accountTrigger,
}: DashboardHeroProps) {
  return (
    <section className="ce-hero ce-hero-mobile-bleed p-[22px_16px] lg:p-[22px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="ce-hero-eyebrow">Panel principal</div>
          <h1 className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]">
            Hola, <span className="text-primary">{firstName}.</span>
          </h1>
          <p className="ce-hero-meta mt-2 max-w-[460px] lg:mt-3">
            <b className="text-[hsl(240_22%_95%)]">{inProgressServices} servicios en curso</b>
            {" "}y{" "}
            <b className="text-[hsl(240_22%_95%)]">{expiringQuotes} cotizaciones</b>
            {" "}a punto de vencer esta semana.
          </p>
        </div>

        {accountTrigger}
      </div>
    </section>
  );
}
