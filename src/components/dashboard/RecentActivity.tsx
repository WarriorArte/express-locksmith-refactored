import { m as motion } from "framer-motion";
import { Package, FileText, Users, Wrench, ShoppingCart, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getPhpAuthToken, phpApiRequest } from "@/lib/phpApi";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshop } from "@/hooks/useWorkshop";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Activity {
  id: string;
  type: "venta" | "servicio" | "cotizacion" | "cliente" | "producto";
  title: string;
  description: string;
  time: string;
  created_at: string;
}

const typeConfig = {
  venta: { icon: ShoppingCart, color: "text-secondary bg-secondary-light" },
  servicio: { icon: Wrench, color: "text-foreground dark:text-success bg-success-light" },
  cotizacion: { icon: FileText, color: "text-info bg-info-light" },
  cliente: { icon: Users, color: "text-accent bg-accent-light" },
  producto: { icon: Package, color: "text-warning bg-warning-light" },
};

export function RecentActivity() {
  const { currentWorkshop } = useWorkshop();
  const { user, loading: authLoading } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["recent-activity", user?.id, currentWorkshop?.id],
    queryFn: async () => {
      if (!user || !currentWorkshop?.id || !getPhpAuthToken()) return [];

      const rows = await phpApiRequest<Array<{
        type: "venta" | "servicio" | "cotizacion" | "cliente" | "producto";
        id: string;
        title: string;
        description: string;
        created_at: string;
      }>>(`/recent-activity.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`, { method: "GET" });

      return (rows ?? []).map(r => ({
        id: `${r.type}-${r.id}`,
        type: r.type,
        title: r.type === "venta" ? `Venta ${r.title}`
          : r.type === "servicio" ? `Servicio ${r.title}`
          : r.type === "cotizacion" ? `Cotización ${r.title}`
          : r.type === "cliente" ? "Nuevo cliente"
          : "Producto agregado",
        description: r.type === "cliente"
          ? `${r.title} - ${r.description === "business" ? "Empresa" : "Persona"}`
          : r.description,
        time: formatDistanceToNow(parseISO(r.created_at), { addSuffix: true, locale: es }),
        created_at: r.created_at,
      }));
    },
    enabled: !authLoading && !!user && !!currentWorkshop?.id && !!getPhpAuthToken(),
    refetchOnWindowFocus: true,
    retry: false,
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.08 }}
        className="card-elevated p-5"
      >
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className="card-elevated p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Actividad Reciente</h3>
      </div>
      
      <div className="space-y-4">
        {(!activities || activities.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay actividad reciente
          </p>
        ) : (
          activities.map((activity, index) => {
            const config = typeConfig[activity.type];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.08 }}
                className="flex items-start gap-3 group cursor-pointer"
              >
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0 transition-transform group-hover:scale-110",
                  config.color
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span className="whitespace-nowrap">{activity.time}</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
