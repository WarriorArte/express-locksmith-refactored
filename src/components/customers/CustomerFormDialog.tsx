import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateCustomer, useUpdateCustomer, type Customer } from "@/hooks/useCustomers";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Loader2 } from "lucide-react";

const customerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  customer_type: z.enum(["person", "company"]),
  phone: z.string().optional(),
  phone_secondary: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_normal: z.boolean().default(false),
  is_vip: z.boolean().default(false),
  is_frequent: z.boolean().default(false),
  has_debt: z.boolean().default(false),
  no_work_again: z.boolean().default(false),
  no_work_reason: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { data: settings } = useBusinessSettings();
  const isEditing = !!customer;
  
  const phoneCountryCode = settings?.phone_country_code || "+52";

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      customer_type: "person",
      phone: "",
      phone_secondary: "",
      email: "",
      address: "",
      notes: "",
      is_normal: false,
      is_vip: false,
      is_frequent: false,
      has_debt: false,
      no_work_again: false,
      no_work_reason: "",
    },
  });

  const watchNoWork = form.watch("no_work_again");

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        customer_type: customer.customer_type as "person" | "company",
        phone: customer.phone || "",
        phone_secondary: customer.phone_secondary || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
        is_normal: (customer as any).is_normal || false,
        is_vip: customer.is_vip || false,
        is_frequent: !!customer.is_frequent,
        has_debt: customer.has_debt || false,
        no_work_again: customer.no_work_again || false,
        no_work_reason: customer.no_work_reason || "",
      });
    } else {
      form.reset({
        name: "",
        customer_type: "person",
        phone: "",
        phone_secondary: "",
        email: "",
        address: "",
        notes: "",
        is_normal: false,
        is_vip: false,
        is_frequent: false,
        has_debt: false,
        no_work_again: false,
        no_work_reason: "",
      });
    }
  }, [customer, form]);

  const onSubmit = async (values: CustomerFormValues) => {
    const customerData: any = {
      name: values.name,
      customer_type: values.customer_type,
      email: values.email || null,
      phone: values.phone || null,
      phone_secondary: values.phone_secondary || null,
      address: values.address || null,
      notes: values.notes || null,
      is_normal: values.is_normal,
      is_vip: values.is_vip,
      is_frequent: values.is_frequent,
      has_debt: values.has_debt,
      no_work_again: values.no_work_again,
      no_work_reason: values.no_work_again ? values.no_work_reason || null : null,
    };

    if (isEditing && customer) {
      await updateCustomer.mutateAsync({ id: customer.id, ...customerData });
    } else {
      await createCustomer.mutateAsync(customerData);
    }
    onOpenChange(false);
  };

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form id="customer-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo o razón social" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="person">Persona</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Principal</FormLabel>
                    <FormControl>
                      <Input placeholder={phoneCountryCode} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Secundario</FormLabel>
                    <FormControl>
                      <Input placeholder={phoneCountryCode} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Calle, número, colonia, ciudad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Etiquetas especiales */}
              <div className="col-span-2 space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Etiquetas</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <FormField
                    control={form.control}
                    name="is_normal"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Normal</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_vip"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3 border-primary/50">
                        <FormLabel className="text-sm text-primary">Cerrajero Ext.</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_frequent"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Frecuente</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="has_debt"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Con Deuda</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="no_work_again"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3 border-destructive/50">
                        <FormLabel className="text-sm text-destructive">No Trabajar</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {watchNoWork && (
                <FormField
                  control={form.control}
                  name="no_work_reason"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Razón (No Trabajar)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Explica por qué no se debe trabajar con este cliente..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionales sobre el cliente..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-row gap-3 pt-2">
              <Button type="button" variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="proto" 
                size="lg" 
                className="flex-[2] h-12" 
                disabled={isLoading}
                onClick={async () => {
                  const isValid = await form.trigger();
                  if (isValid) {
                    void form.handleSubmit(onSubmit)();
                  }
                }}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
