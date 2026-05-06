import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnitNumberInput } from "@/components/ui/unit-number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Warehouse, ArrowRightLeft, Plus } from "lucide-react";
import { useCreateInventoryMovement } from "@/hooks/useInventoryMovements";
import type { Product } from "@/hooks/useProducts";

interface InventoryMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function InventoryMovementDialog({ 
  open, 
  onOpenChange, 
  product 
}: InventoryMovementDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const createMovement = useCreateInventoryMovement();

  const handleSubmit = async (type: "store" | "warehouse" | "store-to-warehouse" | "warehouse-to-store") => {
    if (!product || quantity <= 0) return;

    const qty = quantity;

    try {
      if (type === "store") {
        await createMovement.mutateAsync({
          product_id: product.id,
          quantity: qty,
          movement_type: "adjustment",
          to_location: "store",
          notes: notes || "Agregar a tienda",
        });
      } else if (type === "warehouse") {
        await createMovement.mutateAsync({
          product_id: product.id,
          quantity: qty,
          movement_type: "purchase",
          to_location: "warehouse",
          notes: notes || "Agregar a bodega",
        });
      } else if (type === "store-to-warehouse") {
        await createMovement.mutateAsync({
          product_id: product.id,
          quantity: qty,
          movement_type: "transfer",
          from_location: "store",
          to_location: "warehouse",
          notes: notes || "Traslado tienda → bodega",
        });
      } else if (type === "warehouse-to-store") {
        await createMovement.mutateAsync({
          product_id: product.id,
          quantity: qty,
          movement_type: "transfer",
          from_location: "warehouse",
          to_location: "store",
          notes: notes || "Traslado bodega → tienda",
        });
      }

      setQuantity(1);
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error al crear movimiento:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Movimientos de Inventario - {product?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tienda</p>
                <p className="text-xl font-bold">{product?.stock_store || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Bodega</p>
                <p className="text-xl font-bold">{product?.stock_warehouse || 0}</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="add-store" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="add-store">+ Tienda</TabsTrigger>
              <TabsTrigger value="add-warehouse">+ Bodega</TabsTrigger>
              <TabsTrigger value="to-warehouse">→ Bodega</TabsTrigger>
              <TabsTrigger value="to-store">→ Tienda</TabsTrigger>
            </TabsList>

            <TabsContent value="add-store" className="space-y-4">
              <div className="space-y-2">
                <Label>Cantidad a agregar</Label>
                <UnitNumberInput
                  min={1}
                  value={quantity}
                  onValueChange={setQuantity}
                  placeholder="Ingrese cantidad"
                />
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Compra local, ajuste de inventario..."
                />
              </div>
              <Button 
                onClick={() => handleSubmit("store")} 
                disabled={quantity <= 0 || createMovement.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar a Tienda
              </Button>
            </TabsContent>

            <TabsContent value="add-warehouse" className="space-y-4">
              <div className="space-y-2">
                <Label>Cantidad a agregar</Label>
                <UnitNumberInput
                  min={1}
                  value={quantity}
                  onValueChange={setQuantity}
                  placeholder="Ingrese cantidad"
                />
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Compra mayorista, reabastecimiento..."
                />
              </div>
              <Button 
                onClick={() => handleSubmit("warehouse")} 
                disabled={quantity <= 0 || createMovement.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar a Bodega
              </Button>
            </TabsContent>

            <TabsContent value="to-warehouse" className="space-y-4">
              <div className="space-y-2">
                <Label>Cantidad a trasladar</Label>
                <UnitNumberInput
                  min={1}
                  max={product?.stock_store || 0}
                  value={quantity}
                  onValueChange={setQuantity}
                  placeholder="Ingrese cantidad"
                />
                <p className="text-xs text-muted-foreground">
                  Disponible en tienda: {product?.stock_store || 0}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Reorganización de inventario..."
                />
              </div>
              <Button 
                onClick={() => handleSubmit("store-to-warehouse")} 
                disabled={quantity <= 0 || createMovement.isPending}
                className="w-full"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Trasladar a Bodega
              </Button>
            </TabsContent>

            <TabsContent value="to-store" className="space-y-4">
              <div className="space-y-2">
                <Label>Cantidad a trasladar</Label>
                <UnitNumberInput
                  min={1}
                  max={product?.stock_warehouse || 0}
                  value={quantity}
                  onValueChange={setQuantity}
                  placeholder="Ingrese cantidad"
                />
                <p className="text-xs text-muted-foreground">
                  Disponible en bodega: {product?.stock_warehouse || 0}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Reabastecimiento de tienda..."
                />
              </div>
              <Button 
                onClick={() => handleSubmit("warehouse-to-store")} 
                disabled={quantity <= 0 || createMovement.isPending}
                className="w-full"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Trasladar a Tienda
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
