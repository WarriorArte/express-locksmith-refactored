import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface StatItem {
  id?: string;
  title: string;
  value: string | number | ReactNode;
  icon: React.ElementType;
  className?: string; // class for the card background, e.g. "bg-primary/5"
  iconClassName?: string; // class for the icon container, e.g. "bg-primary text-primary-foreground"
}

interface StatsLayoutProps {
  mainStat: StatItem;
  secondaryStats: StatItem[];
  className?: string;
}

export function StatsLayout({ mainStat, secondaryStats, className }: StatsLayoutProps) {
  const MainIcon = mainStat.icon;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn("grid grid-cols-[1fr_1.2fr] sm:grid-cols-[1fr_2fr] lg:grid-cols-[1fr_2.5fr] gap-3", className)}
    >
      {/* Principal (Izquierda) */}
      <div className="card-elevated flex flex-col justify-center items-center text-center p-4 min-h-[100px]">
        <div className={cn("p-2.5 sm:p-3.5 rounded-sm mb-2 sm:mb-3", mainStat.iconClassName)}>
          <MainIcon className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <p className="text-xl sm:text-3xl lg:text-4xl font-black text-foreground mb-1 leading-none">{mainStat.value}</p>
        <p className="text-[11px] sm:text-xs lg:text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 text-balance">
          {mainStat.title}
        </p>
      </div>

      {/* Secundarios (Derecha, en filas) */}
      <div className="flex flex-col gap-2 sm:gap-3 justify-center">
        {secondaryStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.id || idx} 
              className="card-elevated flex items-center justify-between p-2.5 sm:p-4 px-3 sm:px-5 flex-1"
            >
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className={cn("p-2 rounded-sm shadow-sm", stat.iconClassName)}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-[12px] sm:text-[14px] font-medium text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                  {stat.title}
                </p>
              </div>
              <p className="text-sm sm:text-xl font-bold text-foreground">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
