import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  productSchema,
  serviceSchema,
  hasText,
  hasNumber,
  hasPositiveNumber,
  hasEmptyOrPositiveNumber,
  type ProductFormValues,
  type KeysOfUnion,
} from "./productFormSchema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useCreateProduct, useUpdateProduct, type Product } from "@/hooks/useProducts";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Check, ChevronsUpDown, Loader2, Package, DollarSign, Warehouse, FileText, Wrench, Plus } from "lucide-react";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { ServiceProductsEditor, type ProductEditorItem } from "@/components/shared/ServiceProductsEditor";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiUpload } from "@/lib/phpApi";
import { cn } from "@/lib/utils";
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

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

type InventoryItemType = "product" | "service";
type ProductFormTab = "general" | "productos" | "precios" | "inventario" | "notas";
type ProductFormWatchValues = Partial<Record<KeysOfUnion<ProductFormValues>, unknown>>;

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { data: categories } = useCategories();
  const { data: businessSettings } = useBusinessSettings();
  const { currentWorkshop } = useWorkshop();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;
  const [activeTab, setActiveTab] = useState<ProductFormTab>("general");
  const [maxUnlockedTabIndex, setMaxUnlockedTabIndex] = useState(0);
  const [attemptedTabs, setAttemptedTabs] = useState<Set<ProductFormTab>>(new Set());
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [inventoryItemType, setInventoryItemType] = useState<InventoryItemType | "">("");
  const [serviceProductsList, setServiceProductsList] = useState<ProductEditorItem[]>([]);
  const [noServiceProducts, setNoServiceProducts] = useState(false);

  // Use conditional resolver based on item type
  const currentSchema = inventoryItemType === "service" ? serviceSchema : productSchema;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      item_type: "product",
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
    } as unknown as ProductFormValues,
  });

  useEffect(() => {
    if (open) {
      setActiveTab("general");
      setMaxUnlockedTabIndex(product ? 10 : 0);
      setAttemptedTabs(new Set());
      setPendingImageFile(null);
      setServiceProductsList([]);
      setNoServiceProducts(false);
    }
    const incomingItemType = product ? ((product?.item_type === "service" ? "service" : "product") as InventoryItemType) : "";
    setInventoryItemType(incomingItemType);
  }, [open, product]);

  // Reset form when inventoryItemType changes
  useEffect(() => {
    if (isEditing) return; // Don't reset when editing existing products
    if (!inventoryItemType) {
      form.reset({
        item_type: "product",
        name: "",
        description: "",
        category_id: "",
        image_url: "",
        instructions: "",
        notes: "",
      } as unknown as ProductFormValues);
      return;
    }

    setActiveTab("general");
    setMaxUnlockedTabIndex(0);
    setAttemptedTabs(new Set());
    setServiceProductsList([]);
    setNoServiceProducts(false);

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
      } as unknown as ProductFormValues);
    } else {
      form.reset({
        ...defaultValues,
        item_type: "service",
        service_type: "",
        labor_cost: "",
        discount: "",
        service_products: [],
      } as unknown as ProductFormValues);
    }
  }, [inventoryItemType, form, isEditing]);

  // Load existing product data
  useEffect(() => {
    if (!product) return;

    const incomingItemType = (product?.item_type === "service" ? "service" : "product") as InventoryItemType;
    const baseValues = {
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
      } as ProductFormValues);
    } else {
      form.reset({
        ...baseValues,
        item_type: "service",
        service_type: product.service_type || "",
        labor_cost: product.labor_cost ?? "",
        discount: product.discount ?? "",
        service_products: product.service_products || [],
      } as ProductFormValues);
      if (product.service_products) {
        setServiceProductsList(
          product.service_products.map((sp) => ({
            tempId: crypto.randomUUID(),
            product_id: sp.product_id,
            product_name: sp.product_name || "",
            quantity: sp.quantity || 1,
            unit_price: Number(sp.unit_price || 0),
            subtotal: Number(sp.subtotal || 0),
          })),
        );
      }
      setNoServiceProducts(!product.service_products?.length);
    }
  }, [product, form]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!isInventoryItemTypeSelected) {
      return;
    }

    if (!allTabsValid) {
      const firstInvalidTab = tabsOrder.find((tab) => !tabValidity[tab]) || "general";
      setAttemptedTabs((current) => new Set([...current, firstInvalidTab]));
      setActiveTab(firstInvalidTab);
      return;
    }

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
        service_products: serviceProductsList
          .filter((item) => item.product_id !== null)
          .map((item) => ({
            product_id: item.product_id!,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          })),
        instructions: serviceValues.instructions || null,
        notes: serviceValues.notes || null,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...serviceData });
      } else {
        await createProduct.mutateAsync(serviceData);
      }
    }

    onOpenChange(false);
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;
  const isInventoryItemTypeSelected = inventoryItemType === "product" || inventoryItemType === "service";
  const isServiceMode = inventoryItemType === "service";
  const invalidFieldClass = "border-destructive placeholder:text-destructive focus-visible:border-destructive";
  const values = form.watch() as ProductFormWatchValues;


  const tabValidationFields: Record<string, KeysOfUnion<ProductFormValues>[]> = isServiceMode
    ? {
        general: ["name", "service_type"],
        productos: [],
        precios: ["labor_cost"],
        notas: [],
      }
    : {
        general: ["name", "category_id"],
        precios: ["purchase_price_local", "purchase_price_imported", "sale_price_min", "sale_price_max"],
        inventario: ["stock_store", "stock_warehouse", "min_stock"],
        notas: [],
      };

  const tabsOrder: ProductFormTab[] = isServiceMode
    ? ["general", "productos", "precios", "notas"] 
    : ["general", "precios", "inventario", "notas"];

  const tabValidity: Record<ProductFormTab, boolean> = {
    general: isInventoryItemTypeSelected && (isServiceMode
      ? hasText(values.name) && hasText(values.service_type)
      : hasText(values.name) && hasText(values.category_id)),
    productos: isInventoryItemTypeSelected && (!isServiceMode || noServiceProducts || serviceProductsList.length > 0),
    precios: isInventoryItemTypeSelected && (isServiceMode
      ? hasPositiveNumber(values.labor_cost)
      : hasPositiveNumber(values.purchase_price_local) &&
        hasEmptyOrPositiveNumber(values.purchase_price_imported) &&
        hasPositiveNumber(values.sale_price_min) &&
        hasPositiveNumber(values.sale_price_max)),
    inventario: isServiceMode
      ? true
      : isInventoryItemTypeSelected && hasNumber(values.stock_store) && hasNumber(values.stock_warehouse) && hasNumber(values.min_stock),
    notas: isInventoryItemTypeSelected,
  };
  const maxAccessibleTabIndex = isEditing ? tabsOrder.length - 1 : maxUnlockedTabIndex;
  const activeTabIsValid = tabValidity[activeTab] ?? true;
  const allTabsValid = tabsOrder.every((tab) => tabValidity[tab]);
  const shouldShowInvalid = (tab: ProductFormTab) => attemptedTabs.has(tab);
  const showGeneralInvalid = shouldShowInvalid("general");
  const showProductosInvalid = shouldShowInvalid("productos");
  const showPreciosInvalid = shouldShowInvalid("precios");
  const showInventarioInvalid = shouldShowInvalid("inventario");
  const serviceProductsSubtotal = serviceProductsList.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const serviceLaborCost = Number(values.labor_cost || 0);
  const serviceDiscountPrice = Number(values.discount || 0);
  const servicePrice = Math.max(0, serviceLaborCost + serviceProductsSubtotal);
  const currencySymbol = businessSettings?.currency_symbol || "$";
  const formatMoney = (value: number) => `${currencySymbol}${Number(value || 0).toLocaleString()}`;

  const handleTabChange = (nextTab: string) => {
    const typedNextTab = nextTab as ProductFormTab;
    if (isEditing) {
      setActiveTab(typedNextTab);
      return;
    }

    const nextIndex = tabsOrder.indexOf(typedNextTab);
    if (nextIndex !== -1 && nextIndex <= maxAccessibleTabIndex) {
      setActiveTab(typedNextTab);
    }
  };

  const handleNext = async () => {
    if (!isInventoryItemTypeSelected) {
      return;
    }

    const fields = tabValidationFields[activeTab] || [];
    const valid = await form.trigger(fields as Parameters<typeof form.trigger>[0]);
    if (!valid || !activeTabIsValid) {
      setAttemptedTabs((current) => new Set([...current, activeTab]));
      return;
    }
    const idx = tabsOrder.indexOf(activeTab);
    if (idx === -1) return;
    const next = tabsOrder[idx + 1];
    if (next) {
      setMaxUnlockedTabIndex((current) => Math.max(current, idx + 1));
      setActiveTab(next);
    }
  };

  const selectInventoryItemType = (type: InventoryItemType) => {
    setInventoryItemType(type);
    const baseValues = {
      item_type: type,
      name: "",
      description: "",
      category_id: "",
      image_url: "",
      instructions: "",
      notes: "",
    };

    form.reset(
      type === "product"
        ? {
            ...baseValues,
            item_type: "product",
            purchase_price_local: "",
            purchase_price_imported: "",
            sale_price_min: "",
            sale_price_max: "",
            stock_store: "",
            stock_warehouse: "",
            min_stock: "",
          }
        : {
            ...baseValues,
            item_type: "service",
            service_type: "",
            labor_cost: "",
            discount: "",
            service_products: [],
          } as ProductFormValues,
    );
    setActiveTab("general");
    setMaxUnlockedTabIndex(0);
    setAttemptedTabs(new Set());
  };

  return (
    <>
    <Dialog
      open={open && !isEditing && !isInventoryItemTypeSelected}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 pt-0.5">
              <DialogTitle className="text-[1.55rem] font-extrabold leading-[1.05] tracking-[-0.03em]">
                ¿Qué deseas crear?
              </DialogTitle>
              <DialogDescription className="mt-2 text-[13px] leading-snug">
                Selecciona el tipo de ítem para agregarlo al inventario.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 pb-1 pt-1">
          <button
            type="button"
            onClick={() => selectInventoryItemType("product")}
            className="group flex min-h-[136px] flex-col rounded-[14px] border border-border bg-card p-4 text-left transition-all active:scale-[0.98] hover:border-primary/35 hover:bg-primary/[0.03]"
          >
            <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Package className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold leading-tight text-foreground">Producto</span>
            <span className="mt-2 text-xs font-medium leading-snug text-muted-foreground">
              Stock en tienda y bodega
            </span>
            <span className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              4 pasos
            </span>
          </button>
          <button
            type="button"
            onClick={() => selectInventoryItemType("service")}
            className="group flex min-h-[136px] flex-col rounded-[14px] border border-border bg-card p-4 text-left transition-all active:scale-[0.98] hover:border-primary/35 hover:bg-primary/[0.03]"
          >
            <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold leading-tight text-foreground">Servicio</span>
            <span className="mt-2 text-xs font-medium leading-snug text-muted-foreground">
              Mano de obra y productos
            </span>
            <span className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              4 pasos
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open && (isEditing || isInventoryItemTypeSelected)} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
              {isServiceMode ? <Wrench className="h-5 w-5" /> : <Package className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight">
                {isEditing
                  ? (isServiceMode ? "Editar servicio" : "Editar producto")
                  : (isServiceMode ? "Nuevo servicio" : "Nuevo producto")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isServiceMode
                  ? "Mano de obra, productos consumidos y notas"
                  : "Inventario con stock por tienda y bodega"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pb-2">
            {isInventoryItemTypeSelected && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <IconTabs
                value={activeTab}
                onChange={handleTabChange}
                items={(isServiceMode
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
                    ]).map((item, index) => ({
                      ...item,
                      disabled: !isEditing && index > maxAccessibleTabIndex,
                    }))}
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
                          <Input
                            placeholder={showGeneralInvalid && !hasText(field.value) ? "Campo obligatorio" : (isServiceMode ? "Ej: Apertura de puerta" : "Ej: Cerradura Yale 3 Golpes")}
                            aria-invalid={showGeneralInvalid && !hasText(field.value)}
                            className={cn(showGeneralInvalid && !hasText(field.value) && invalidFieldClass)}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
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
                          <FormControl>
                            <CategoryCombobox
                              categories={categories || []}
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              invalid={showGeneralInvalid && !hasText(field.value)}
                            />
                          </FormControl>
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
                              <SelectTrigger
                                aria-invalid={showGeneralInvalid && !hasText(field.value)}
                                className={cn(showGeneralInvalid && !hasText(field.value) && "border-destructive text-destructive")}
                              >
                                <SelectValue placeholder={showGeneralInvalid && !hasText(field.value) ? "Campo obligatorio" : "Seleccionar tipo"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="residential">Residencial</SelectItem>
                              <SelectItem value="commercial">Comercial</SelectItem>
                              <SelectItem value="automotive">Automotriz</SelectItem>
                              <SelectItem value="industrial">Industrial</SelectItem>
                            </SelectContent>
                          </Select>
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
                          value={field.value ?? ""}
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
                        <Textarea placeholder={isServiceMode ? "Descripción del servicio..." : "Descripción del producto..."} rows={3} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab: Productos (solo para servicios) */}
              {isServiceMode && (
              <TabsContent value="productos" className="mt-4">
                <ServiceProductsEditor
                  items={serviceProductsList}
                  noProductsConsumed={noServiceProducts}
                  onNoProductsConsumedChange={setNoServiceProducts}
                  onItemsChange={(newItems) => setServiceProductsList(newItems)}
                  editable={false}
                  excludeServiceItems={true}
                  currencySymbol={currencySymbol}
                  showInvalid={showProductosInvalid}
                />
              </TabsContent>
              )}

              {/* Tab: Precios */}
              <TabsContent value="precios" className="space-y-4 mt-4">
                {isServiceMode ? (
                  <div className="space-y-4">
                    {serviceProductsList.length > 0 && (
                      <div className="rounded-lg border bg-secondary/30 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <FormLabel className="text-sm">Productos</FormLabel>
                          <span className="text-sm font-semibold">{formatMoney(serviceProductsSubtotal)}</span>
                        </div>
                        <div className="space-y-2">
                          {serviceProductsList.map((item) => (
                            <div key={item.product_id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate text-muted-foreground">{item.product_name}</span>
                              <span className="font-medium">{formatMoney(Number(item.subtotal || 0))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="labor_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mano de Obra *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={showPreciosInvalid && !hasPositiveNumber(field.value) ? "Debe ser mayor a 0" : "0.00"}
                                aria-invalid={showPreciosInvalid && !hasPositiveNumber(field.value)}
                                className={cn(showPreciosInvalid && !hasPositiveNumber(field.value) && invalidFieldClass)}
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Mano de obra</span>
                        <span className="font-medium">{formatMoney(serviceLaborCost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Productos</span>
                        <span className="font-medium">{formatMoney(serviceProductsSubtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Precio del servicio</span>
                        <span className="text-lg font-extrabold">{formatMoney(servicePrice)}</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio con Descuento</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Referencia comercial; no modifica el precio del servicio.
                          </p>
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
                          <FormLabel>Precio distribuidor local *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={showPreciosInvalid && !hasPositiveNumber(field.value) ? "Debe ser mayor a 0" : "0.00"}
                              aria-invalid={showPreciosInvalid && !hasPositiveNumber(field.value)}
                              className={cn(showPreciosInvalid && !hasPositiveNumber(field.value) && invalidFieldClass)}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchase_price_imported"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Importado</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={showPreciosInvalid && !hasEmptyOrPositiveNumber(field.value) ? "Debe ser mayor a 0" : "Opcional"}
                              aria-invalid={showPreciosInvalid && !hasEmptyOrPositiveNumber(field.value)}
                              className={cn(showPreciosInvalid && !hasEmptyOrPositiveNumber(field.value) && invalidFieldClass)}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
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
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={showPreciosInvalid && !hasPositiveNumber(field.value) ? "Debe ser mayor a 0" : "0.00"}
                              aria-invalid={showPreciosInvalid && !hasPositiveNumber(field.value)}
                              className={cn(showPreciosInvalid && !hasPositiveNumber(field.value) && invalidFieldClass)}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
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
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={showPreciosInvalid && !hasPositiveNumber(field.value) ? "Debe ser mayor a 0" : "0.00"}
                              aria-invalid={showPreciosInvalid && !hasPositiveNumber(field.value)}
                              className={cn(showPreciosInvalid && !hasPositiveNumber(field.value) && invalidFieldClass)}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
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
                            aria-invalid={showInventarioInvalid && !hasNumber(field.value)}
                            className={cn(showInventarioInvalid && !hasNumber(field.value) && invalidFieldClass)}
                          />
                        </FormControl>
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
                            aria-invalid={showInventarioInvalid && !hasNumber(field.value)}
                            className={cn(showInventarioInvalid && !hasNumber(field.value) && invalidFieldClass)}
                          />
                        </FormControl>
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
                            aria-invalid={showInventarioInvalid && !hasNumber(field.value)}
                            className={cn(showInventarioInvalid && !hasNumber(field.value) && invalidFieldClass)}
                          />
                        </FormControl>
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
                        <Textarea placeholder={isServiceMode ? "Requisitos previos del servicio..." : "Instrucciones para instalación o uso..."} rows={4} {...field} value={field.value ?? ""} />
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
                        <Textarea placeholder="Notas adicionales..." rows={4} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            )}
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
                    if (!allTabsValid) {
                      const firstInvalidTab = tabsOrder.find((tab) => !tabValidity[tab]) || "general";
                      setAttemptedTabs((current) => new Set([...current, firstInvalidTab]));
                      setActiveTab(firstInvalidTab);
                      return;
                    }
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
    </>
  );
}

function CategoryCombobox({
  categories,
  value,
  onValueChange,
  invalid,
}: {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputReady, setInputReady] = useState(false);
  const selectedCategory = categories.find((category) => category.id === value);

  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => setInputReady(true), 120);
      return () => clearTimeout(timeoutId);
    }

    setInputReady(false);
    return undefined;
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "h-11 w-full justify-between rounded-sm px-3 font-medium",
            invalid && "border-destructive text-destructive hover:text-destructive",
          )}
        >
          {selectedCategory ? (
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-[3px]"
                style={{ backgroundColor: selectedCategory.color || "#9898D0" }}
              />
              <span className="truncate">{selectedCategory.name}</span>
            </span>
          ) : (
            <span className={cn(invalid ? "text-destructive" : "text-muted-foreground")}>
              {invalid ? "Selecciona una categoría" : "Seleccionar categoría..."}
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
            placeholder="Buscar categoría..."
            autoFocus={false}
            readOnly={!inputReady}
          />
          <CommandList className="max-h-[180px]">
            <CommandEmpty>No se encontraron categorías.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onValueChange(category.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === category.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className="mr-2 h-3 w-3 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: category.color || "#9898D0" }}
                  />
                  <span className="truncate">{category.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
