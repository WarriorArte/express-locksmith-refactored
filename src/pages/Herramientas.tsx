import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wrench, Construction } from "lucide-react";

export default function Herramientas() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Herramientas"
        subtitle="Utilidades adicionales para tu trabajo"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-6"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Construction className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-medium text-foreground mb-2">
            Próximamente
          </h4>
          <p className="text-sm text-muted-foreground max-w-md">
            Esta sección contendrá herramientas adicionales para facilitar tu trabajo. 
            Estamos desarrollando nuevas funcionalidades que estarán disponibles pronto.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
