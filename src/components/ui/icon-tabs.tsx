/**
 * IconTabs — prototype v2 style.
 *
 * Horizontal scrollable strip of tabs where each tab is:
 *   [icon]
 *   [label]
 * with a tonal pill behind the active icon (M3 style). Drop-in replacement
 * for shadcn Tabs in mobile-first form modals.
 *
 * Usage:
 *   <IconTabs
 *     value={tab}
 *     onChange={setTab}
 *     items={[{ id: "general", icon: Package, label: "General" }, ...]}
 *   />
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconTabItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}

interface IconTabsProps {
  value: string;
  onChange: (id: string) => void;
  items: IconTabItem[];
  className?: string;
}

export function IconTabs({ value, onChange, items, className }: IconTabsProps) {
  // Estilo M3 (criterio docs/CRITERIO-DISENO-M3E.md): el ícono activo va dentro
  // de una píldora tonal, etiqueta de 12 px debajo, sin línea divisoria.
  return (
    <div
      className={cn("flex w-full gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden", className)}
      style={{ scrollbarWidth: "none" }}
      role="tablist"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={item.disabled}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap px-1 py-1.5 text-xs font-medium transition-colors",
              item.disabled && "cursor-not-allowed opacity-40",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                active ? "bg-accent text-accent-foreground" : "bg-transparent",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className={active ? "font-semibold" : undefined}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
