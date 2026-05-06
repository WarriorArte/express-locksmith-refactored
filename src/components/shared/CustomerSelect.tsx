import { useState } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
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
import { useCustomers, type Customer } from "@/hooks/useCustomers";

interface CustomerSelectProps {
  value: string | null;
  onValueChange: (customerId: string | null, customer: Customer | null) => void;
  onCreateNew?: () => void;
}

export function CustomerSelect({ value, onValueChange, onCreateNew }: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: customers, isLoading } = useCustomers();

  const selectedCustomer = customers?.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCustomer ? (
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {selectedCustomer.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar cliente...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        side="top"
        sideOffset={8}
        avoidCollisions
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList className="max-h-52 overflow-y-auto">
            <CommandEmpty>
              {isLoading ? "Cargando..." : "No se encontraron clientes."}
            </CommandEmpty>
            <CommandGroup>
              {onCreateNew && (
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear nuevo cliente
                </CommandItem>
              )}
              <CommandItem
                onSelect={() => {
                  onValueChange(null, null);
                  setOpen(false);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                Cliente mostrador
              </CommandItem>
              {customers?.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.name}
                  onSelect={() => {
                    onValueChange(customer.id, customer);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground">{customer.phone}</span>
                    )}
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
