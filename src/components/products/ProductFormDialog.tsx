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
} from "@/components/ui/form";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { IconTabs } from "@/components/ui/icon-tabs";
import { Input } from "@/components/ui/input";
import { UnitNumberInput } from "@/components/ui/unit-number-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useCreateProduct, useUpdateProduct, type Product } from "@/hooks/useProducts";
import { Loader2, Package, DollarSign, Warehouse, FileText } from "lucide-react";
import { ImageUploader } from "@/components/shared/ImageUploader";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category_id: z.string().min(1, "La categoría es requerida"),
  image_url: z.string().url("URL inválida").optional().or(z.literal("")),
  purchase_price_local: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ required_error: "El costo local es requerido", invalid_type_error: "El costo local es requerido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  purchase_price_imported: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number().optional()
  ),
  sale_price_min: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ required_error: "El precio con descuento es requerido", invalid_type_error: "El precio con descuento es requerido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  sale_price_max: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ required_error: "El precio sugerido es requerido", invalid_type_error: "El precio sugerido es requerido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  stock_store: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ required_error: "El stock tienda es requerido", invalid_type_error: "El stock tienda es requerido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  stock_warehouse: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ required_error: "El stock bodega es requerido", invalid_type_error: "El stock bodega es requerido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  min_stock: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ required_error: "El stock mínimo es requerido", invalid_type_error: "El stock mínimo es requerido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  instructions: z.string().optional(),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;
  const [activeTab, setActiveTab] = useState("general");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      image_url: "",
      purchase_price_local: undefined,
      purchase_price_imported: undefined,
      sale_price_min: undefined,
      sale_price_max: undefined,
      stock_store: undefined,
      stock_warehouse: undefined,
      min_stock: undefined,
      instructions: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      setActiveTab("general");
    }
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || "",
        category_id: product.category_id || "",
        image_url: product.image_url || "",
        purchase_price_local: product.purchase_price_local ?? undefined,
        purchase_price_imported: product.purchase_price_imported ?? undefined,
        sale_price_min: product.sale_price_min ?? undefined,
        sale_price_max: product.sale_price_max ?? undefined,
        stock_store: product.stock_store ?? undefined,
        stock_warehouse: product.stock_warehouse ?? undefined,
        min_stock: product.min_stock ?? undefined,
        instructions: product.instructions || "",
        notes: product.notes || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        category_id: "",
        image_url: "",
        purchase_price_local: undefined,
        purchase_price_imported: undefined,
        sale_price_min: undefined,
        sale_price_max: undefined,
        stock_store: undefined,
        stock_warehouse: undefined,
        min_stock: undefined,
        instructions: "",
        notes: "",
      });
    }
  }, [product, form, open]);

  const onSubmit = async (values: ProductFormValues) => {
    const productData = {
      name: values.name,
      description: values.description || null,
      category_id: values.category_id,
      image_url: values.image_url || null,
      purchase_price_local: values.purchase_price_local,
      purchase_price_imported: values.purchase_price_imported || null,
      sale_price_min: values.sale_price_min,
      sale_price_max: values.sale_price_max,
      stock_store: values.stock_store,
      stock_warehouse: values.stock_warehouse,
      min_stock: values.min_stock,
      instructions: values.instructions || null,
      notes: values.notes || null,
    };

    if (isEditing && product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }
    onOpenChange(false);
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  const tabValidationFields: Record<string, (keyof ProductFormValues)[]> = {
    general: ["name", "category_id"],
    precios: ["purchase_price_local", "sale_price_min", "sale_price_max"],
    inventario: ["stock_store", "stock_warehouse", "min_stock"],
    notas: ["instructions", "notes"],
  };

  const tabsOrder = ["general", "precios", "inventario", "notas"];

  const handleNext = async () => {
    const fields = tabValidationFields[activeTab] || [];
    const valid = await form.trigger(fields as any);
    if (!valid) return;
    const idx = tabsOrder.indexOf(activeTab);
    if (idx === -1) return;
    const next = tabsOrder[idx + 1];
    if (next) setActiveTab(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <IconTabs
                value={activeTab}
                onChange={setActiveTab}
                items={[
                  { id: "general", icon: Package, label: "General" },
                  { id: "precios", icon: DollarSign, label: "Precios" },
                  { id: "inventario", icon: Warehouse, label: "Inventario" },
                  { id: "notas", icon: FileText, label: "Notas" },
                ]}
              />

              {/* Tab: General */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Producto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Cerradura Yale 3 Golpes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen del Producto</FormLabel>
                      <FormControl>
                        <ImageUploader
                          value={field.value}
                          onChange={field.onChange}
                          folder="products"
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción del producto..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab: Precios */}
              <TabsContent value="precios" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchase_price_local"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Costo Local *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchase_price_imported"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo Importado</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Opcional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sale_price_min"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Precio con Descuento *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sale_price_max"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Precio Sugerido *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Tab: Inventario */}
              <TabsContent value="inventario" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_store"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Stock Tienda *</FormLabel>
                        <FormControl>
                          <UnitNumberInput
                            min={0}
                            value={field.value ?? 0}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock_warehouse"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Stock Bodega *</FormLabel>
                        <FormControl>
                          <UnitNumberInput
                            min={0}
                            value={field.value ?? 0}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_stock"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Stock Mínimo *</FormLabel>
                        <FormControl>
                          <UnitNumberInput
                            min={0}
                            value={field.value ?? 0}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Tab: Notas */}
              <TabsContent value="notas" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instrucciones de Uso</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Instrucciones para instalación o uso..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Internas</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notas adicionales..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-row gap-3 pt-2">
              <Button type="button" variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {!isEditing && activeTab !== "notas" ? (
                <Button type="button" variant="proto" size="lg" className="flex-[2] h-12" onClick={handleNext} disabled={isLoading}>
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="proto"
                  size="lg"
                  className="flex-[2] h-12"
                  disabled={isLoading}
                  onClick={() => {
                    void form.handleSubmit(onSubmit)();
                  }}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? "Guardar Cambios" : "Crear Producto"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
