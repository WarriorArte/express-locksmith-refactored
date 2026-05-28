import { m as motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ServiceStatusCounts {
  pending: number;
  in_progress: number;
  completed: number;
  delivered: number;
  cancelled: number;
}

interface ServiceStatusPanelProps {
  stats?: ServiceStatusCounts;
}

export function ServiceStatusPanel({ stats }: ServiceStatusPanelProps) {
  const statuses = [
    { label: "Pendientes", count: stats?.pending || 0, color: "bg-warning" },
    { label: "En Curso", count: stats?.in_progress || 0, color: "bg-info" },
    { label: "Finalizados", count: stats?.completed || 0, color: "bg-success/55" },
    { label: "Entregados", count: stats?.delivered || 0, color: "bg-primary" },
    { label: "Cancelados", count: stats?.cancelled || 0, color: "bg-destructive" },
  ];
  const total = statuses.reduce((acc, s) => acc + s.count, 0) || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className="card-elevated p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold tracking-tight">Estado de Servicios</h3>
        <span className="text-xs font-semibold text-muted-foreground">{total} hoy</span>
      </div>

      <div className="flex h-3.5 rounded-sm overflow-hidden bg-muted mb-3.5">
        {statuses.map((status) => {
          const width = (status.count / total) * 100;
          return (
            <motion.div
              key={status.label}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.08 }}
              className={cn("h-full", status.color)}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {statuses.map((status) => (
          <div key={status.label} className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-[3px] shrink-0", status.color)} />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold leading-none text-muted-foreground">{status.label}</span>
              <span className="mt-1 text-sm font-extrabold leading-none tabular-nums">{status.count}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
