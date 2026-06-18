import * as React from "react";

import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  firstName: string;
  inProgressServices: number;
  expiringQuotes: number;
  accountTrigger?: React.ReactNode;
  className?: string;
}

export function DashboardHero({
  firstName,
  inProgressServices,
  expiringQuotes,
  accountTrigger,
  className,
}: DashboardHeroProps) {
  return (
    <section className={cn("ce-hero ce-hero-mobile-bleed p-[22px_16px] lg:p-[22px] lg:min-h-0 min-h-[280px]", className)}>

      {/* Top: título + descripción + avatar */}
      <div className="relative z-[3] flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 pr-56 lg:pr-0">
          <div className="ce-hero-eyebrow whitespace-nowrap">Panel principal</div>
          <h1 className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]">
            Hola, <span className="text-primary">{firstName}.</span>
          </h1>


          {/* Desktop: estadísticas */}
          <p className="hidden lg:block ce-hero-meta mt-3 max-w-[460px]">
            <b className="text-[hsl(240_22%_95%)]">{inProgressServices} servicios en curso</b>
            {" "}y{" "}
            <b className="text-[hsl(240_22%_95%)]">{expiringQuotes} cotizaciones</b>
            {" "}a punto de vencer esta semana.
          </p>
        </div>

        <div className="shrink-0">{accountTrigger}</div>
      </div>

      {/* Descripción — fondo del hero, justo encima de los botones */}
      <p className="lg:hidden absolute z-[3] bottom-[70px] left-[16px] ce-hero-meta">
        Tu taller<br />en la palma de tu mano.
      </p>

      {/* Imagen decorativa — derecha, solo mobile */}
      <img
        src="/hero.avif"
        alt=""
        className="lg:hidden absolute inset-y-0 right-0 h-full w-56 object-cover object-left pointer-events-none z-[1]"
        draggable={false}
      />
    </section>
  );
}
