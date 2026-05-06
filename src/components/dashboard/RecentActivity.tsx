import { motion } from "framer-motion";
import { Package, FileText, Users, Wrench, ShoppingCart, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { phpApiRequest } from "@/lib/phpApi";
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
  servicio: { icon: Wrench, color: "text-success bg-success-light" },
  cotizacion: { icon: FileText, color: "text-info bg-info-light" },
  cliente: { icon: Users, color: "text-accent bg-accent-light" },
  producto: { icon: Package, color: "text-warning bg-warning-light" },
};

export function RecentActivity() {
  const { currentWorkshop } = useWorkshop();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["recent-activity", currentWorkshop?.id],
    queryFn: async () => {
      if (!currentWorkshop?.id) return [];

      const results: Activity[] = [];

      // Fetch recent sales
      const sales = await phpApiRequest<Array<{ id: string; sale_number: string; customer_name: string | null; total: number; created_at: string }>>(
        `/sales.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      sales?.forEach(s => {
        results.push({
          id: `sale-${s.id}`,
          type: "venta",
          title: `Venta ${s.sale_number}`,
          description: `${s.customer_name || "Cliente mostrador"} - $${Number(s.total).toLocaleString()}`,
          time: formatDistanceToNow(parseISO(s.created_at), { addSuffix: true, locale: es }),
          created_at: s.created_at,
        });
      });

      // Fetch recent services
      const services = await phpApiRequest<Array<{ id: string; service_number: string; description: string; status: string; created_at: string }>>(
        `/services.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      services?.forEach(s => {
        results.push({
          id: `service-${s.id}`,
          type: "servicio",
          title: `Servicio ${s.service_number}`,
          description: s.description.substring(0, 40) + (s.description.length > 40 ? "..." : ""),
          time: formatDistanceToNow(parseISO(s.created_at), { addSuffix: true, locale: es }),
          created_at: s.created_at,
        });
      });

      // Fetch recent quotes
      const quotes = await phpApiRequest<Array<{ id: string; quote_number: string; customer_name: string | null; total: number; created_at: string }>>(
        `/quotes.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      quotes?.forEach(q => {
        results.push({
          id: `quote-${q.id}`,
          type: "cotizacion",
          title: `Cotización ${q.quote_number}`,
          description: `${q.customer_name || "Sin cliente"} - $${Number(q.total).toLocaleString()}`,
          time: formatDistanceToNow(parseISO(q.created_at), { addSuffix: true, locale: es }),
          created_at: q.created_at,
        });
      });

      // Fetch recent customers
      const customers = await phpApiRequest<Array<{ id: string; name: string; customer_type: "business" | "person"; created_at: string }>>(
        `/customers.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      customers?.forEach(c => {
        results.push({
          id: `customer-${c.id}`,
          type: "cliente",
          title: "Nuevo cliente",
          description: `${c.name} - ${c.customer_type === "business" ? "Empresa" : "Persona"}`,
          time: formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: es }),
          created_at: c.created_at,
        });
      });

      // Fetch recent products
      const products = await phpApiRequest<Array<{ id: string; name: string; stock_store: number; stock_warehouse: number; created_at: string }>>(
        `/products.php?workshop_id=${encodeURIComponent(currentWorkshop.id)}`,
        { method: "GET" }
      );

      products?.forEach(p => {
        results.push({
          id: `product-${p.id}`,
          type: "producto",
          title: "Producto agregado",
          description: `${p.name} - Stock: ${p.stock_store + p.stock_warehouse}`,
          time: formatDistanceToNow(parseISO(p.created_at), { addSuffix: true, locale: es }),
          created_at: p.created_at,
        });
      });

      // Sort by date and take last 8
      return results
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);
    },
    enabled: !!currentWorkshop?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
      transition={{ delay: 0.4 }}
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
                transition={{ delay: 0.5 + index * 0.05 }}
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
