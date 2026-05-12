import { useState } from "react";
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
}

export function ProductSelect({ value, onValueChange, excludeIds = [], excludeServiceItems = false }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: products, isLoading } = useProducts();
  const { data: settings } = useBusinessSettings();
  
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
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span className="flex items-center gap-2 truncate">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedProduct.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar producto...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[350px] p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Buscar producto..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Cargando..." : "No se encontraron productos."}
            </CommandEmpty>
            <CommandGroup>
              {availableProducts?.map((product) => (
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
                      <span>{currencySymbol}{product.sale_price_min.toLocaleString()} - {currencySymbol}{product.sale_price_max.toLocaleString()}</span>
                      <span>•</span>
                      <span>Stock: {product.stock_store + product.stock_warehouse}</span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
