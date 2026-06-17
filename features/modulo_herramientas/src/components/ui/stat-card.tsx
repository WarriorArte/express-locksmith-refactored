import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardVariant = "default" | "primary" | "secondary" | "success" | "warning" | "info";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: StatCardVariant;
  delay?: number;
  className?: string;
}

const variantStyles: Record<StatCardVariant, string> = {
  default: "bg-card text-foreground",
  primary: "bg-primary-light text-primary",
  secondary: "bg-secondary-light text-secondary-foreground",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning-foreground",
  info: "bg-info-light text-info",
};

const iconVariantStyles: Record<StatCardVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 shadow-md border border-border/50",
        variantStyles[variant],
        className
      )}
    >
      {/* Decoración circular de fondo */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-current opacity-5 pointer-events-none" />

      <div className="flex items-center gap-4 relative z-10">
        {/* Icono */}
        <div
          className={cn(
            "p-3 rounded-full flex items-center justify-center shrink-0",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-medium opacity-80">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight leading-none">{value}</span>
            {subtitle && (
              <span className="text-xs opacity-60 font-medium">{subtitle}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
