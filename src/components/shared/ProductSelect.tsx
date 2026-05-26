import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface ProductSelectProps {
  value: string | null;
  onValueChange: (productId: string | null, product: Product | null) => void;
  excludeIds?: string[];
  excludeServiceItems?: boolean;
  invalid?: boolean;
}

export function ProductSelect({ value, onValueChange, excludeIds = [], excludeServiceItems = false, invalid = false }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputReady, setInputReady] = useState(false);
  const { data: products, isLoading } = useProducts();
  const { data: settings } = useBusinessSettings();

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setInputReady(true), 120);
      return () => clearTimeout(t);
    } else {
      setInputReady(false);
    }
  }, [open]);
  
  const currencySymbol = settings?.currency_symbol || "$";

  const availableProducts = products?.filter((p) => {
    const isActive = Boolean(p.is_active);
    const isExcluded = excludeIds.includes(p.id);
    const isServiceItem = (p.item_type ?? "product") === "service";

    if (!isActive || isExcluded) {
      return false;
    }

    if (excludeServiceItems && isServiceItem) {
      return false;
    }

    return true;
  });
  const selectedProduct = products?.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "w-full justify-between",
            invalid && "border-destructive text-destructive hover:text-destructive",
          )}
        >
          {selectedProduct ? (
            <span className="flex items-center gap-2 truncate">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedProduct.name}</span>
            </span>
          ) : (
            <span className={cn(invalid ? "text-destructive" : "text-muted-foreground")}>
              {invalid ? "Selecciona un producto" : "Seleccionar..."}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(350px,90vw)] p-0"
        align="start"
        side="bottom"
        avoidCollisions={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command>
          <CommandInput
            placeholder="Buscar..."
            autoFocus={false}
            readOnly={!inputReady}
          />
          <CommandList className="max-h-[160px]">
            <CommandEmpty>
              {isLoading ? "Cargando..." : "No se encontraron productos."}
            </CommandEmpty>
            <CommandGroup>
              {availableProducts?.map((product) => {
                const isService = (product.item_type ?? "product") === "service";
                return (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => {
                      onValueChange(product.id, product);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        value === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{product.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isService ? (
                          (() => {
                            const labor = Number(product.labor_cost || 0);
                            const disc = Number(product.discount || 0);
                            const productsSubtotal = (product.service_products || []).reduce(
                              (sum, item) => sum + Number(item.subtotal || 0), 0
                            );
                            const total = Math.max(0, labor + productsSubtotal);
                            return disc > 0 ? (
                              <span>{currencySymbol}{total.toLocaleString()} • -{currencySymbol}{disc.toLocaleString()} desc.</span>
                            ) : (
                              <span>{currencySymbol}{total.toLocaleString()}</span>
                            );
                          })()
                        ) : (
                          (() => {
                            const priceMax = Number(product.sale_price_max || 0);
                            const priceMin = Number(product.sale_price_min || 0);
                            const disc = priceMin < priceMax ? priceMax - priceMin : 0;
                            const stock = (product.stock_store ?? 0) + (product.stock_warehouse ?? 0);
                            return (
                              <>
                                <span>{currencySymbol}{priceMax.toLocaleString()}</span>
                                {disc > 0 && <span>• -{currencySymbol}{disc.toLocaleString()} desc.</span>}
                                <span>• Stock: {stock}</span>
                              </>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
