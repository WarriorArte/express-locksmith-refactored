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
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/useCategories";
import { useCreateProduct, useUpdateProduct, type Product } from "@/hooks/useProducts";
import { useProducts } from "@/hooks/useProducts";
import { Loader2, Package, DollarSign, Warehouse, FileText, Plus, X } from "lucide-react";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiUpload } from "@/lib/phpApi";

const toOptionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().min(0, "Debe ser mayor o igual a 0").optional()
);

const toRequiredNumber = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().min(0, "Debe ser mayor o igual a 0")
);

const serviceProductSchema = z.object({
  product_id: z.string().min(1, "Producto requerido"),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
  product_name: z.string().optional(),
});

type ServiceProduct = z.infer<typeof serviceProductSchema>;

const productSchema = z
  .object({
    item_type: z.literal("product"),
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().optional(),
    category_id: z.string().min(1, "La categoría es requerida"),
    image_url: z.string().optional().or(z.literal("")),
    purchase_price_local: toOptionalNumber,
    purchase_price_imported: toOptionalNumber,
    sale_price_min: toOptionalNumber,
    sale_price_max: toOptionalNumber,
    stock_store: toOptionalNumber,
    stock_warehouse: toOptionalNumber,
    min_stock: toOptionalNumber,
    instructions: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const sale_price_max = values.sale_price_max;
    const sale_price_min = values.sale_price_min;
    const purchase_price_local = values.purchase_price_local;
    const stock_store = values.stock_store;
    const stock_warehouse = values.stock_warehouse;
    const min_stock = values.min_stock;

    if (sale_price_max === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sale_price_max"],
        message: "El precio es requerido",
      });
    }

    if (sale_price_min === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sale_price_min"],
        message: "El precio con descuento es requerido",
      });
    }

    if (purchase_price_local === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchase_price_local"],
        message: "El costo local es requerido",
      });
    }
    if (stock_store === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock_store"],
        message: "El stock tienda es requerido",
      });
    }
    if (stock_warehouse === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock_warehouse"],
        message: "El stock bodega es requerido",
      });
    }
    if (min_stock === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["min_stock"],
        message: "El stock mínimo es requerido",
      });
    }
  });

const serviceSchema = z.object({
  item_type: z.literal("service"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category_id: z.string().optional().or(z.literal("")), // Servicios no requieren categoría
  image_url: z.string().optional().or(z.literal("")),
  service_type: z.enum(["automotive", "residential", "commercial", "industrial"], {
    errorMap: () => ({ message: "Tipo de servicio requerido" }),
  }),
  labor_cost: toRequiredNumber,
  discount: toOptionalNumber.default(0),
  service_products: z.array(serviceProductSchema).optional().default([]),
  instructions: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.labor_cost === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["labor_cost"],
      message: "La mano de obra es requerida",
    });
  }
});

type ProductFormValues = z.infer<typeof productSchema> | z.infer<typeof serviceSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

type InventoryItemType = "product" | "service";

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { data: categories } = useCategories();
  const { data: allProducts } = useProducts();
  const { currentWorkshop } = useWorkshop();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;
  const [activeTab, setActiveTab] = useState("general");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [inventoryItemType, setInventoryItemType] = useState<InventoryItemType>("product");
  const [serviceProductsList, setServiceProductsList] = useState<ServiceProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Use conditional resolver based on item type
  const currentSchema = inventoryItemType === "service" ? serviceSchema : productSchema;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      item_type: inventoryItemType,
      name: "",
      description: "",
      category_id: "",
      image_url: "",
      ...(inventoryItemType === "product" && {
        purchase_price_local: "",
        purchase_price_imported: "",
        sale_price_min: "",
        sale_price_max: "",
        stock_store: "",
        stock_warehouse: "",
        min_stock: "",
      }),
      ...(inventoryItemType === "service" && {
        service_type: "",
        labor_cost: "",
        discount: "",
        service_products: [],
      }),
      instructions: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      setActiveTab("general");
      setPendingImageFile(null);
      setServiceProductsList([]);
      setSelectedProductId("");
    }
    const incomingItemType = (product?.item_type === "service" ? "service" : "product") as InventoryItemType;
    setInventoryItemType(incomingItemType);
  }, [open, product]);

  // Reset form when inventoryItemType changes
  useEffect(() => {
    if (isEditing) return; // Don't reset when editing existing products

    setActiveTab("general");
    setServiceProductsList([]);

    const defaultValues = {
      item_type: inventoryItemType,
      name: "",
      description: "",
      category_id: "",
      image_url: "",
      instructions: "",
      notes: "",
    };

    if (inventoryItemType === "product") {
      form.reset({
        ...defaultValues,
        item_type: "product",
        purchase_price_local: "",
        purchase_price_imported: "",
        sale_price_min: "",
        sale_price_max: "",
        stock_store: "",
        stock_warehouse: "",
        min_stock: "",
      } as any);
    } else {
      form.reset({
        ...defaultValues,
        item_type: "service",
        service_type: "",
        labor_cost: "",
        discount: "",
        service_products: [],
      } as any);
    }
  }, [inventoryItemType, form, isEditing]);

  // Load existing product data
  useEffect(() => {
    if (!product) return;

    const incomingItemType = (product?.item_type === "service" ? "service" : "product") as InventoryItemType;
    const baseValues: any = {
      item_type: incomingItemType,
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      image_url: product.image_url || "",
      instructions: product.instructions || "",
      notes: product.notes || "",
    };

    if (incomingItemType === "product") {
      form.reset({
        ...baseValues,
        item_type: "product",
        purchase_price_local: product.purchase_price_local ?? "",
        purchase_price_imported: product.purchase_price_imported ?? "",
        sale_price_min: product.sale_price_min ?? "",
        sale_price_max: product.sale_price_max ?? "",
        stock_store: product.stock_store ?? "",
        stock_warehouse: product.stock_warehouse ?? "",
        min_stock: product.min_stock ?? "",
      } as any);
    } else {
      form.reset({
        ...baseValues,
        item_type: "service",
        service_type: product.service_type || "",
        labor_cost: product.labor_cost ?? "",
        discount: product.discount ?? "",
        service_products: product.service_products || [],
      } as any);
      if (product.service_products) {
        setServiceProductsList(product.service_products);
      }
    }
  }, [product, form]);

  const onSubmit = async (values: ProductFormValues) => {
    let imageUrl: string | null = values.image_url || null;

    if (pendingImageFile) {
      const result = await phpApiUpload(pendingImageFile, 'products', currentWorkshop?.code);
      imageUrl = result.url;
    } else if (imageUrl?.startsWith('blob:')) {
      imageUrl = null;
    }

    if (values.item_type === "product") {
      const productValues = values as z.infer<typeof productSchema>;
      const productData = {
        item_type: "product" as const,
        name: productValues.name,
        description: productValues.description || null,
        category_id: productValues.category_id,
        image_url: imageUrl,
        purchase_price_local: productValues.purchase_price_local ? Number(productValues.purchase_price_local) : 0,
        purchase_price_imported: productValues.purchase_price_imported ? Number(productValues.purchase_price_imported) : null,
        sale_price_min: productValues.sale_price_min ? Number(productValues.sale_price_min) : 0,
        sale_price_max: productValues.sale_price_max ? Number(productValues.sale_price_max) : 0,
        stock_store: productValues.stock_store ? Number(productValues.stock_store) : 0,
        stock_warehouse: productValues.stock_warehouse ? Number(productValues.stock_warehouse) : 0,
        min_stock: productValues.min_stock ? Number(productValues.min_stock) : 0,
        instructions: productValues.instructions || null,
        notes: productValues.notes || null,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
    } else {
      const serviceValues = values as z.infer<typeof serviceSchema>;
      const serviceData = {
        item_type: "service" as const,
        name: serviceValues.name,
        description: serviceValues.description || null,
        category_id: null, // Services don't have categories
        image_url: imageUrl,
        service_type: serviceValues.service_type,
        labor_cost: serviceValues.labor_cost ? Number(serviceValues.labor_cost) : 0,
        discount: serviceValues.discount ? Number(serviceValues.discount) : 0,
        service_products: serviceProductsList,
        instructions: serviceValues.instructions || null,
        notes: serviceValues.notes || null,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...serviceData } as any);
      } else {
        await createProduct.mutateAsync(serviceData as any);
      }
    }

    onOpenChange(false);
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;
  const isServiceMode = inventoryItemType === "service";

  const tabValidationFields: Record<string, (keyof ProductFormValues)[]> = isServiceMode
    ? {
        general: ["name", "service_type"],
        productos: [],
        precios: ["labor_cost"],
        notas: [],
      }
    : {
        general: ["name", "category_id"],
        precios: ["purchase_price_local", "sale_price_min", "sale_price_max"],
        inventario: ["stock_store", "stock_warehouse", "min_stock"],
        notas: [],
      };

  const tabsOrder = isServiceMode 
    ? ["general", "productos", "precios", "notas"] 
    : ["general", "precios", "inventario", "notas"];

  const handleNext = async () => {
    const fields = tabValidationFields[activeTab] || [];
    const valid = await form.trigger(fields as any);
    if (!valid) return;
    const idx = tabsOrder.indexOf(activeTab);
    if (idx === -1) return;
    const next = tabsOrder[idx + 1];
    if (next) setActiveTab(next);
  };

  const addServiceProduct = () => {
    if (!selectedProductId) return;
    const product = allProducts?.find(p => p.id === selectedProductId && p.item_type !== "service");
    if (!product) return;

    const newProduct: ServiceProduct = {
      product_id: selectedProductId,
      product_name: product.name,
      quantity: 1,
    };

    setServiceProductsList([...serviceProductsList, newProduct]);
    setSelectedProductId("");
  };

  const removeServiceProduct = (productId: string) => {
    setServiceProductsList(serviceProductsList.filter(p => p.product_id !== productId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEditing
              ? (isServiceMode ? "Editar Servicio" : "Editar Producto")
              : "Nuevo Item"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pb-2">
            {!isEditing && (
              <div className="space-y-2">
                <FormLabel>Agregar al inventario como</FormLabel>
                <Select
                  value={inventoryItemType}
                  onValueChange={(value) => {
                    setInventoryItemType(value as InventoryItemType);
                    form.setValue("item_type", value as InventoryItemType, { shouldValidate: true });
                    setActiveTab("general");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="service">Servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <IconTabs
                value={activeTab}
                onChange={setActiveTab}
                items={isServiceMode
                  ? [
                      { id: "general", icon: Package, label: "General" },
                      { id: "productos", icon: Package, label: "Productos" },
                      { id: "precios", icon: DollarSign, label: "Precios" },
                      { id: "notas", icon: FileText, label: "Notas" },
                    ]
                  : [
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
                        <FormLabel>{isServiceMode ? "Nombre del Servicio *" : "Nombre del Producto *"}</FormLabel>
                        <FormControl>
                          <Input placeholder={isServiceMode ? "Ej: Apertura de puerta" : "Ej: Cerradura Yale 3 Golpes"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isServiceMode && (
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
                  )}
                </div>

                {isServiceMode && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="service_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Servicio *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="residential">Residencial</SelectItem>
                              <SelectItem value="commercial">Comercial</SelectItem>
                              <SelectItem value="automotive">Automotriz</SelectItem>
                              <SelectItem value="industrial">Industrial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isServiceMode ? "Imagen del Servicio" : "Imagen del Producto"}</FormLabel>
                      <FormControl>
                        <ImageUploader
                          value={field.value}
                          onChange={field.onChange}
                          onPendingFile={(file) => setPendingImageFile(file)}
                          folder="products"
                          workshopCode={currentWorkshop?.code}
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
                        <Textarea placeholder={isServiceMode ? "Descripción del servicio..." : "Descripción del producto..."} rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab: Productos (solo para servicios) */}
              {isServiceMode && (
              <TabsContent value="productos" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <FormLabel className="text-sm">Seleccionar Producto</FormLabel>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar producto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allProducts
                            ?.filter((p) => p.item_type !== "service")
                            .map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addServiceProduct}
                        disabled={!selectedProductId}
                        className="h-10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {serviceProductsList.length > 0 && (
                    <div className="space-y-2">
                      <FormLabel className="text-sm">Productos Agregados</FormLabel>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {serviceProductsList.map((item) => (
                          <div
                            key={item.product_id}
                            className="flex items-center justify-between p-2 bg-secondary/50 rounded border"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.product_name}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeServiceProduct(item.product_id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              )}

              {/* Tab: Precios */}
              <TabsContent value="precios" className="space-y-4 mt-4">
                {isServiceMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="labor_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mano de Obra *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
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
                )}
              </TabsContent>

              {/* Tab: Inventario */}
              {!isServiceMode && (
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
                            allowManualInput
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
                            allowManualInput
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
                            allowManualInput
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              )}

              {/* Tab: Notas */}
              <TabsContent value="notas" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isServiceMode ? "Requisitos" : "Instrucciones de Uso"}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={isServiceMode ? "Requisitos previos del servicio..." : "Instrucciones para instalación o uso..."} rows={4} {...field} />
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
            </div>

            <DialogFooter className="flex-row gap-3 pt-2 shrink-0">
              <Button type="button" variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {!isEditing && activeTab !== tabsOrder[tabsOrder.length - 1] ? (
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
                  {isEditing
                    ? "Guardar Cambios"
                    : (isServiceMode ? "Crear Servicio" : "Crear Producto")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
