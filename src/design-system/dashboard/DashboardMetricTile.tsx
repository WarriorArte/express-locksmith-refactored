import type { LucideIcon } from "lucide-react";

interface DashboardMetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  foot: string;
}

export function DashboardMetricTile({
  icon: Icon,
  label,
  value,
  foot,
}: DashboardMetricTileProps) {
  return (
    <div className="rounded-[20px] bg-muted p-4">
      <div className="mb-2 flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[hsl(var(--surface-2))] text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[22px] font-extrabold leading-none tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
        {foot}
      </div>
    </div>
  );
}
