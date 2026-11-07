import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useCreateCustomer, useUpdateCustomer, type Customer } from "@/hooks/useCustomers";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreationDialogHeader } from "@/components/shared/CreationDialogHeader";

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
}).superRefine((values, ctx) => {
  if (values.no_work_again && !values.no_work_reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["no_work_reason"],
      message: "La razón es requerida",
    });
  }
});

type CustomerFormValues = z.infer<typeof customerSchema>;

type CustomerFormPayload = {
  name: string;
  customer_type: "person" | "company";
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  address: string | null;
  notes: string | null;
  is_normal: boolean;
  is_vip: boolean;
  is_frequent: boolean;
  has_debt: boolean;
  no_work_again: boolean;
  no_work_reason: string | null;
};

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

const TAG_FIELDS: {
  name: "is_normal" | "is_frequent" | "is_vip" | "has_debt" | "no_work_again";
  label: string;
  destructive?: boolean;
}[] = [
  { name: "is_normal", label: "Normal" },
  { name: "is_frequent", label: "Frecuente" },
  { name: "is_vip", label: "Cerrajero externo" },
  { name: "has_debt", label: "Con deuda" },
  { name: "no_work_again", label: "No volver a trabajar", destructive: true },
];

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { data: settings } = useBusinessSettings();
  const isEditing = !!customer;
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
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
  const nameValue = form.watch("name");
  const emailValue = form.watch("email");
  const noWorkReasonValue = form.watch("no_work_reason");
  const invalidFieldClass = "border-destructive placeholder:text-destructive focus-visible:border-destructive";
  const isValidName = nameValue.trim().length > 0;
  const isValidEmail = !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const isValidNoWorkReason = !watchNoWork || !!noWorkReasonValue?.trim();

  useEffect(() => {
    if (open) {
      setSubmitAttempted(false);
    }

    if (customer) {
      form.reset({
        name: customer.name,
        customer_type: customer.customer_type as "person" | "company",
        phone: customer.phone || "",
        phone_secondary: customer.phone_secondary || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
        is_normal: !!customer.is_normal,
        is_vip: !!customer.is_vip,
        is_frequent: !!customer.is_frequent,
        has_debt: !!customer.has_debt,
        no_work_again: !!customer.no_work_again,
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
  }, [customer, form, open]);

  const onSubmit = async (values: CustomerFormValues) => {
    const customerData: CustomerFormPayload = {
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
          <CreationDialogHeader
            icon={UserPlus}
            title={isEditing ? "Editar cliente" : "Nuevo cliente"}
            description="Ficha de contacto con historial, etiquetas y notas de atención"
            meta={phoneCountryCode}
          />
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
                      <Input
                        placeholder={submitAttempted && !isValidName ? "Campo obligatorio" : "Nombre completo o razón social"}
                        aria-invalid={submitAttempted && !isValidName}
                        className={cn(submitAttempted && !isValidName && invalidFieldClass)}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <FormControl>
                      <NativeSelect value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                        <option value="person">Persona</option>
                        <option value="company">Empresa</option>
                      </NativeSelect>
                    </FormControl>
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
                      <Input
                        type="email"
                        placeholder={submitAttempted && !isValidEmail ? "Correo inválido" : "correo@ejemplo.com"}
                        aria-invalid={submitAttempted && !isValidEmail}
                        className={cn(submitAttempted && !isValidEmail && invalidFieldClass)}
                        {...field}
                      />
                    </FormControl>
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

              {/* Etiquetas: filas con interruptor, estilo Ajustes de Android */}
              <div className="col-span-2">
                <p className="mb-2 text-sm font-medium text-foreground">Etiquetas</p>
                <div className="m3-list">
                  {TAG_FIELDS.map((tag) => (
                    <FormField
                      key={tag.name}
                      control={form.control}
                      name={tag.name}
                      render={({ field }) => (
                        <FormItem className="m3-list-item flex min-h-14 items-center justify-between gap-4 space-y-0 bg-muted px-4 py-2">
                          <FormLabel className={cn("mb-0 text-[15px]", tag.destructive && "text-destructive")}>
                            {tag.label}
                          </FormLabel>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
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
                        <Textarea
                          placeholder={submitAttempted && !isValidNoWorkReason ? "Campo obligatorio" : "Explica por qué no se debe trabajar con este cliente..."}
                          aria-invalid={submitAttempted && !isValidNoWorkReason}
                          className={cn(submitAttempted && !isValidNoWorkReason && invalidFieldClass)}
                          {...field}
                        />
                      </FormControl>
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
                  setSubmitAttempted(true);
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
