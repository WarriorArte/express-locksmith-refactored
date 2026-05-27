import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ShoppingCart, Wrench } from "lucide-react";
import { useCreateSale, generateSaleNumber } from "@/hooks/useSales";
import { useCreateService, generateServiceNumber } from "@/hooks/useServices";
import { useUpdateQuote, type Quote } from "@/hooks/useQuotes";
import { useBatchInventoryUpdate } from "@/hooks/useInventoryMovements";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useToast } from "@/hooks/use-toast";

interface ConvertQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
}

export function ConvertQuoteDialog({ open, onOpenChange, quote }: ConvertQuoteDialogProps) {
  const [convertTo, setConvertTo] = useState<"sale" | "service">("sale");
  const [isConverting, setIsConverting] = useState(false);
  
  const createSale = useCreateSale();
  const createService = useCreateService();
  const updateQuote = useUpdateQuote();
  const { updateForSale, updateForService } = useBatchInventoryUpdate();
  const { currentWorkshop } = useWorkshop();
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!quote) return;
    
    setIsConverting(true);
    
    try {
      if (convertTo === "sale") {
        // Generate sale number
        if (!currentWorkshop?.id) {
          throw new Error("No hay taller seleccionado");
        }

        const saleNumber = await generateSaleNumber(currentWorkshop.id);
        
        // Create sale
        const newSale = await createSale.mutateAsync({
          sale_number: saleNumber,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name || quote.customer?.name || "Cliente mostrador",
          payment_method: "cash",
          subtotal: Number(quote.subtotal),
          discount: Number(quote.discount),
          total: Number(quote.total),
          notes: `Convertido de cotización ${quote.quote_number}`,
          items: (quote.quote_items || []).map((item) => ({
            product_id: item.product_id,
            product_name: item.description,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            subtotal: Number(item.subtotal),
          })),
        });
        
        const itemsWithProducts: { product_id: string | null; quantity: number }[] = [];
        for (const item of quote.quote_items || []) {
          if (item.product_id) {
            itemsWithProducts.push({
              product_id: item.product_id,
              quantity: item.quantity,
            });
          }
        }
        
        // Update inventory
        if (itemsWithProducts.length > 0) {
          await updateForSale(itemsWithProducts, newSale.id);
        }
        
        toast({
          title: "Venta creada",
          description: `Se creó la venta ${saleNumber} a partir de la cotización`,
        });
      } else {
        // Generate service number
        if (!currentWorkshop?.id) {
          throw new Error("No hay taller seleccionado");
        }

        const serviceNumber = await generateServiceNumber(currentWorkshop.id);
        
        // Create service
        const newService = await createService.mutateAsync({
          service_number: serviceNumber,
          customer_id: quote.customer_id,
          service_type: "residential",
          description: quote.description || `Servicio de cotización ${quote.quote_number}`,
          address: quote.customer_address,
          location: quote.location,
          estimated_price: Number(quote.total),
          labor_cost: 0,
          discount: Number(quote.discount),
          quote_id: quote.id,
          internal_notes: `Convertido de cotización ${quote.quote_number}`,
          service_products: (quote.quote_items || []).map((item) => ({
            product_id: item.product_id,
            product_name: item.description,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            subtotal: Number(item.subtotal),
          })),
        });
        
        const itemsWithProducts: { product_id: string | null; quantity: number }[] = [];
        for (const item of quote.quote_items || []) {
          if (item.product_id) {
            itemsWithProducts.push({
              product_id: item.product_id,
              quantity: item.quantity,
            });
          }
        }
        
        // Update inventory
        if (itemsWithProducts.length > 0) {
          await updateForService(itemsWithProducts, newService.id);
        }
        
        toast({
          title: "Servicio creado",
          description: `Se creó el servicio ${serviceNumber} a partir de la cotización`,
        });
      }
      
      // Update quote status to converted
      await updateQuote.mutateAsync({
        id: quote.id,
        status: "converted",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Error al convertir la cotización",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convertir Cotización</DialogTitle>
          <DialogDescription>
            Convierte la cotización {quote.quote_number} en una venta o servicio
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <Label className="mb-4 block">¿A qué deseas convertir esta cotización?</Label>
          
          <RadioGroup
            value={convertTo}
            onValueChange={(value) => setConvertTo(value as "sale" | "service")}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="sale" id="sale" />
              <Label htmlFor="sale" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="p-2 rounded-lg bg-secondary-light text-secondary">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Venta</p>
                  <p className="text-sm text-muted-foreground">Registrar como venta directa</p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="service" id="service" />
              <Label htmlFor="service" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="p-2 rounded-lg bg-success-light text-foreground dark:text-success">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Servicio</p>
                  <p className="text-sm text-muted-foreground">Crear orden de servicio</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Resumen de la cotización:</p>
            <div className="flex justify-between text-sm">
              <span>Items:</span>
              <span>{quote.quote_items?.length || 0} productos</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cliente:</span>
              <span>{quote.customer_name || quote.customer?.name || "Sin cliente"}</span>
            </div>
            <div className="flex justify-between font-medium mt-2 pt-2 border-t">
              <span>Total:</span>
              <span>${Number(quote.total).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            {isConverting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Convertir a {convertTo === "sale" ? "Venta" : "Servicio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
