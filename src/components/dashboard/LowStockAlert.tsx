import { m as motion } from "framer-motion";
import { resolveStorageUrl } from "@/lib/phpApi";
import { AlertTriangle, ExternalLink, Package } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

interface LowStockAlertProps {
  products: {
    id: string;
    name: string;
    stock_store: number;
    stock_warehouse: number;
    min_stock: number;
    image_url: string | null;
  }[];
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className="card-elevated p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-warning-light text-foreground">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-none mb-1">Stock Bajo</h3>
            <p className="text-xs text-muted-foreground">Productos por reabastecer</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/inventario?filter=low-stock")}
          className="text-xs font-semibold rounded-sm h-8"
        >
          Ver todos
        </Button>
      </div>
      
      {products.length === 0 ? (
        <div className="py-8 text-center bg-muted rounded-[20px]">
          <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Inventario en niveles óptimos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.slice(0, 4).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.08 }}
              className="flex items-center justify-between p-3 rounded-[16px] bg-muted hover:bg-secondary-hover transition-colors hover:border-border/50 group cursor-pointer"
              onClick={() => navigate("/inventario?filter=low-stock")}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={resolveStorageUrl(product.image_url) ?? undefined} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Mínimo sugerido: {product.min_stock}</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-3">
                <div className="inline-flex flex-col items-end">
                  <span className="text-sm font-bold text-destructive">
                    {product.stock_store + product.stock_warehouse}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    Disponibles
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
