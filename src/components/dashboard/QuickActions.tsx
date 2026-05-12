import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Package, FileText, Wrench, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    icon: Package,
    label: "Agregar Producto",
    path: "/inventario/nuevo",
    color: "bg-primary hover:bg-primary-hover",
    textColor: "text-primary-foreground",
  },
  {
    icon: FileText,
    label: "Crear Cotización",
    path: "/cotizaciones/nueva",
    color: "bg-info hover:bg-info/90",
    textColor: "text-info-foreground",
  },
  {
    icon: Wrench,
    label: "Iniciar Servicio",
    path: "/servicios/nuevo",
    color: "bg-success hover:bg-success/90",
    textColor: "text-success-foreground",
  },
  {
    icon: ShoppingCart,
    label: "Registrar Venta",
    path: "/ventas/nueva",
    color: "bg-secondary hover:bg-secondary-hover",
    textColor: "text-secondary-foreground",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className="card-elevated p-5"
    >
      <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.path}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
              action.color,
              action.textColor
            )}
          >
            <action.icon className="w-6 h-6" />
            <span className="text-xs font-medium text-center">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
