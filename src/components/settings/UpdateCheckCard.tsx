import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { requestManualUpdateCheck } from "@/lib/appUpdates";

export function UpdateCheckCard({ compact = false }: { compact?: boolean }) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);

    try {
      const { updateAvailable } = await requestManualUpdateCheck();

      toast({
        title: updateAvailable ? "Actualización disponible" : "Todo al día",
        description: updateAvailable
          ? "Toca el aviso de la parte inferior para actualizar la app."
          : "Estás usando la última versión disponible.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-3 rounded-[20px] bg-muted p-4"
          : "card-elevated p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="min-w-0">
        <div className={compact ? "text-[15px] font-medium text-foreground" : "text-lg font-semibold"}>
          Actualizaciones
        </div>
        <div className="text-sm text-muted-foreground">
          La app revisa una vez al día. Consulta manualmente cuando quieras.
        </div>
      </div>

      <Button type="button" variant="secondary" onClick={handleCheck} disabled={isChecking} className={compact ? "w-full" : undefined}>
        <RefreshCw className={isChecking ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"} />
        {isChecking ? "Consultando..." : "Consultar actualizaciones"}
      </Button>
    </div>
  );
}
