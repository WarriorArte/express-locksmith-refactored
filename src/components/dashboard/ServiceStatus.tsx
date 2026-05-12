import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ServiceStatusProps {
  stats?: {
    pending: number;
    in_progress: number;
    completed: number;
    delivered: number;
    cancelled: number;
  };
}

export function ServiceStatus({ stats }: ServiceStatusProps) {
  const statuses = [
    { label: "Pendientes", count: stats?.pending || 0, color: "bg-warning" },
    { label: "En Curso", count: stats?.in_progress || 0, color: "bg-info" },
    { label: "Finalizados", count: stats?.completed || 0, color: "bg-success" },
    { label: "Entregados", count: stats?.delivered || 0, color: "bg-primary" },
    { label: "Cancelados", count: stats?.cancelled || 0, color: "bg-destructive" },
  ];
  const total = statuses.reduce((acc, s) => acc + s.count, 0) || 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className="card-elevated p-5"
    >
      <h3 className="text-lg font-semibold mb-4">Estado de Servicios</h3>
      
      {/* Progress bar */}
      <div className="flex h-3 rounded-sm overflow-hidden bg-muted mb-4">
        {statuses.map((status, index) => {
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

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statuses.map((status) => (
          <div key={status.label} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-sm", status.color)} />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">{status.label}</span>
              <span className="text-sm font-semibold">{status.count}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
