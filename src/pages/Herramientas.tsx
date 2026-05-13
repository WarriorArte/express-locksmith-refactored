import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wrench, Construction } from "lucide-react";

export default function Herramientas() {
  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pt-10 lg:pt-2 px-5 lg:px-6 pb-24 md:pb-6 space-y-6 no-scrollbar">
      {/* Header */}
      <PageHeader
        title="Herramientas"
        subtitle="Utilidades adicionales para tu trabajo"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.08 }}
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
