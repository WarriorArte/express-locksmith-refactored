import { Wrench, Construction } from "lucide-react";

export function ToolsSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary" />
        Herramientas
      </h3>

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
    </div>
  );
}
