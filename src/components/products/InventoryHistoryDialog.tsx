import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Store, 
  Warehouse, 
  ArrowRightLeft, 
  ShoppingCart, 
  Wrench, 
  Plus,
  Minus,
  Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useInventoryMovements } from "@/hooks/useInventoryMovementsList";
import type { Product } from "@/hooks/useProducts";

interface InventoryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const movementTypeLabels: Record<string, string> = {
  sale: "Venta",
  service: "Servicio",
  adjustment: "Ajuste",
  purchase: "Compra",
  return: "Devolución",
  transfer: "Traslado",
};

const movementTypeIcons: Record<string, React.ReactNode> = {
  sale: <ShoppingCart className="w-4 h-4" />,
  service: <Wrench className="w-4 h-4" />,
  adjustment: <Plus className="w-4 h-4" />,
  purchase: <Plus className="w-4 h-4" />,
  return: <Plus className="w-4 h-4" />,
  transfer: <ArrowRightLeft className="w-4 h-4" />,
};

export function InventoryHistoryDialog({ 
  open, 
  onOpenChange, 
  product 
}: InventoryHistoryDialogProps) {
  const { data: movements, isLoading } = useInventoryMovements(product?.id);

  const getLocationIcon = (location: string | null) => {
    if (location === "store") return <Store className="w-3 h-3" />;
    if (location === "warehouse") return <Warehouse className="w-3 h-3" />;
    return null;
  };

  const getLocationLabel = (location: string | null) => {
    if (location === "store") return "Tienda";
    if (location === "warehouse") return "Bodega";
    return "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de Movimientos - {product?.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {movements && movements.length > 0 ? (
                movements.map((movement) => (
                  <div 
                    key={movement.id} 
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1 p-2 rounded-lg bg-muted">
                          {movementTypeIcons[movement.movement_type]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {movementTypeLabels[movement.movement_type]}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                            </Badge>
                          </div>
                          
                          {movement.movement_type === "transfer" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              {getLocationIcon(movement.from_location)}
                              <span>{getLocationLabel(movement.from_location)}</span>
                              <ArrowRightLeft className="w-3 h-3" />
                              {getLocationIcon(movement.to_location)}
                              <span>{getLocationLabel(movement.to_location)}</span>
                            </div>
                          )}

                          {movement.notes && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {movement.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(movement.created_at), "PPp", { locale: es })}
                            </span>
                            {movement.reference_type && (
                              <span className="capitalize">
                                Ref: {movement.reference_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay movimientos registrados</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
