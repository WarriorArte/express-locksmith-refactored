import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "info";
  delay?: number;
}

/**
 * StatCard — Cerrajería Express Redesign
 * - "primary" variant: solid neon-green hero card (the eye-catcher).
 * - All other variants: clean white/dark surface card with green icon tile.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0,
}: StatCardProps) {
  const isHero = variant === "primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className={cn(
        "relative overflow-hidden rounded-sm p-4",
        isHero
          ? "bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.30)]"
          : "bg-card text-foreground border border-border",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-sm flex items-center justify-center",
            isHero
              ? "bg-[hsl(var(--primary-foreground)/0.12)]"
              : "bg-[hsl(var(--surface-2))]",
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              isHero ? "text-primary-foreground" : "text-primary",
            )}
          />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
              trend.isPositive
                ? isHero
                  ? "bg-[hsl(var(--primary-foreground)/0.15)] text-primary-foreground"
                  : "bg-success-light text-foreground dark:text-success"
                : "bg-destructive-light text-destructive",
            )}
          >
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "text-[22px] sm:text-2xl font-extrabold tracking-tight leading-[1.1] mb-1",
          isHero ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "text-[11px] font-semibold",
          isHero
            ? "text-[hsl(var(--primary-foreground)/0.75)]"
            : "text-muted-foreground",
        )}
      >
        {title}
      </div>
      {subtitle && (
        <div
          className={cn(
            "text-[10px] mt-0.5",
            isHero
              ? "text-[hsl(var(--primary-foreground)/0.55)]"
              : "text-muted-foreground/70",
          )}
        >
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
