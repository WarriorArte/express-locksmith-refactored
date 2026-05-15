/**
 * IconTabs — prototype v2 style.
 *
 * Horizontal scrollable strip of tabs where each tab is:
 *   [icon]
 *   [label]
 * with an animated bottom border on the active tab. Drop-in replacement
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
  return (
    <div
      className={cn(
        "flex w-full overflow-x-auto border-b border-border",
        "[&::-webkit-scrollbar]:hidden",
        className,
      )}
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
              "flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1",
              "py-2.5 px-1 text-[11px] font-semibold whitespace-nowrap",
              "border-b-2 -mb-px transition-colors",
              item.disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
              active
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground/80",
            )}
          >
            <Icon className="w-[15px] h-[15px]" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
