import { ServiceStatusPanel } from "@/design-system/dashboard/ServiceStatusPanel";

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
  return <ServiceStatusPanel stats={stats} />;
}
