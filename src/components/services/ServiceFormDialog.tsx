import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnitNumberInput } from "@/components/ui/unit-number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { IconTabs } from "@/components/ui/icon-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, MapPin, Shield, Package, User, Wrench, FileText, Image, Trash2 } from "lucide-react";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { ServiceProductsEditor } from "@/components/shared/ServiceProductsEditor";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useCreateService, useUpdateService, generateServiceNumber, type Service, type ServiceType } from "@/hooks/useServices";
import { useCreateServiceImage, useDeleteServiceImage } from "@/hooks/useServices";
import { useBatchInventoryUpdate } from "@/hooks/useInventoryMovements";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiUpload, resolveStorageUrl } from "@/lib/phpApi";
import { cn } from "@/lib/utils";
import type { Customer } from "@/hooks/useCustomers";
import { useProducts, type Product } from "@/hooks/useProducts";
import {
  MAX_SERVICE_IMAGES,
  serviceTypes,
  SERVICE_FORM_TABS_ORDER,
  type ServiceItem,
  type ServiceImage,
  type ServiceFormTab,
} from "./serviceFormTypes";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  templateServiceId?: string | null;
}

export function ServiceFormDialog({ open, onOpenChange, service, templateServiceId }: ServiceFormDialogProps) {
  const MANUAL_TEMPLATE = "__manual";
  const isEditing = !!service;
  const createService = useCreateService();
  const updateService = useUpdateService();
  const createServiceImage = useCreateServiceImage();
  const deleteServiceImage = useDeleteServiceImage();
  const { updateForService } = useBatchInventoryUpdate();
  const { data: settings } = useBusinessSettings();
  const { data: inventoryItems } = useProducts();
  const { currentWorkshop } = useWorkshop();
  
  const currencySymbol = settings?.currency_symbol || "$";
  
  const [activeTab, setActiveTab] = useState<ServiceFormTab>("servicio");
  const [maxUnlockedTabIndex, setMaxUnlockedTabIndex] = useState(0);
  const [attemptedTabs, setAttemptedTabs] = useState<Set<ServiceFormTab>>(new Set());
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(MANUAL_TEMPLATE);

  const [form, setForm] = useState({
    service_number: "",
    customer_id: null as string | null,
    customer_name: "",
    customer_phone: "",
    service_type: "" as ServiceType | "",
    description: "",
    problem: "",
    address: "",
    location: "",
    estimated_price: 0,
    labor_cost: 0,
    discount: 0,
    internal_notes: "",
    scheduled_start_at: null as string | null,
    has_warranty: false,
    warranty_days: 30,
    warranty_value: 30,
    warranty_unit: "days" as "days" | "weeks" | "months" | "years",
  });

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [noProductsConsumed, setNoProductsConsumed] = useState(false);
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [imageUploaderKey, setImageUploaderKey] = useState(0);
  const pendingFilesRef = useRef(new Map<string, File>());
  const tabsOrder = SERVICE_FORM_TABS_ORDER;
  const serviceTemplates = (inventoryItems || []).filter(
    (item) => (item.item_type ?? "product") === "service" && item.is_active !== false && item.is_active !== 0,
  );
  const inventoryProducts = (inventoryItems || []).filter(
    (item) => (item.item_type ?? "product") !== "service" && item.is_active !== false && item.is_active !== 0,
  );

  useEffect(() => {
    if (open) {
      setActiveTab("servicio");
      setMaxUnlockedTabIndex(service ? tabsOrder.length - 1 : 0);
      setAttemptedTabs(new Set());
      pendingFilesRef.current.clear();
      setImageUploaderKey(0);
      if (service) {
        const days = service.warranty_days || 30;
        let unit: "days" | "weeks" | "months" | "years" = "days";
        let value = days;
        if (days % 365 === 0 && days >= 365) {
          unit = "years";
          value = days / 365;
        } else if (days % 30 === 0 && days >= 30) {
          unit = "months";
          value = days / 30;
        } else if (days % 7 === 0 && days >= 7) {
          unit = "weeks";
          value = days / 7;
        }
        
        setForm({
          service_number: service.service_number,
          customer_id: service.customer_id,
          customer_name: service.customer?.name || "",
          customer_phone: service.customer?.phone || "",
          service_type: service.service_type,
          description: service.description,
          problem: service.problem || "",
          address: service.address || "",
          location: service.location || "",
          estimated_price: Number(service.estimated_price),
          labor_cost: Number(service.labor_cost) || 0,
          discount: Number(service.discount) || 0,
          internal_notes: service.internal_notes || "",
          scheduled_start_at: service.scheduled_start_at || null,
          has_warranty: service.has_warranty || false,
          warranty_days: days,
          warranty_value: value,
          warranty_unit: unit,
        });
        setItems(service.service_products?.map(p => ({
          tempId: p.id,
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: p.quantity,
          unit_price: Number(p.unit_price),
          subtotal: Number(p.subtotal),
        })) || []);
        setNoProductsConsumed(!service.service_products?.length);
        setImages(service.service_images?.map(i => ({
          tempId: i.id,
          image_url: i.image_url,
          id: i.id,
          description: i.description || "",
        })) || []);
        setSelectedTemplateId(MANUAL_TEMPLATE);
      } else {
        if (currentWorkshop?.id) {
          generateServiceNumber(currentWorkshop.id).then(num => {
            setForm(prev => ({ ...prev, service_number: num }));
          });
        }
        setForm(prev => ({
          ...prev,
          customer_id: null,
          customer_name: "",
          customer_phone: "",
          service_type: "",
          description: "",
          problem: "",
          address: "",
          location: "",
          estimated_price: 0,
          labor_cost: 0,
          discount: 0,
          internal_notes: "",
          scheduled_start_at: null,
          has_warranty: false,
          warranty_days: 30,
          warranty_value: 30,
          warranty_unit: "days",
        }));
        setItems([]);
        setNoProductsConsumed(false);
        setImages([]);
        if (templateServiceId) {
          handleTemplateImport(templateServiceId);
        } else {
          setSelectedTemplateId(MANUAL_TEMPLATE);
        }
      }
    }
  // Template import is intentionally triggered only when the dialog is initialized.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service, currentWorkshop?.id, templateServiceId, tabsOrder.length]);

  const handleTemplateImport = (templateId: string) => {
    if (templateId === MANUAL_TEMPLATE) {
      setSelectedTemplateId(MANUAL_TEMPLATE);
      setForm((prev) => ({ ...prev, description: "" }));
      setItems([]);
      setNoProductsConsumed(false);

      return;
    }

    setSelectedTemplateId(templateId);
    const template = serviceTemplates.find((item) => item.id === templateId);
    if (!template) return;

    const productById = new Map(inventoryProducts.map((product) => [product.id, product]));
    const productByName = new Map(
      inventoryProducts.map((product) => [product.name.trim().toLowerCase(), product]),
    );

    const templateItems: ServiceItem[] = (template.service_products || []).map((item) => {
      const fromId = item.product_id ? productById.get(item.product_id) : undefined;
      const fromName = !fromId && item.product_name
        ? productByName.get(item.product_name.trim().toLowerCase())
        : undefined;
      const resolvedProduct = fromId || fromName;
      const quantity = 1;
      const unitPrice = Number(item.unit_price ?? resolvedProduct?.sale_price_min ?? 0);
      const subtotal = Number(quantity * unitPrice);

      return {
        tempId: crypto.randomUUID(),
        product_id: resolvedProduct?.id || item.product_id || null,
        product_name: resolvedProduct?.name || item.product_name || "",
        quantity,
        unit_price: unitPrice,
        subtotal,
      };
    });

    setForm((prev) => ({
      ...prev,
      service_type: (template.service_type as ServiceType) || prev.service_type,
      description: template.name || prev.description,
      labor_cost: Number(template.labor_cost || 0),
    }));
    setItems(templateItems);
    setNoProductsConsumed(templateItems.length === 0);
  };

  useEffect(() => {
    if (!open || isEditing || !templateServiceId) return;
    if (selectedTemplateId === templateServiceId) return;

    const exists = serviceTemplates.some((item) => item.id === templateServiceId);
    if (!exists) return;

    handleTemplateImport(templateServiceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, templateServiceId, selectedTemplateId, serviceTemplates]);

  const handleCustomerChange = (customerId: string | null, customer: Customer | null) => {
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || "",
      customer_phone: customer?.phone || "",
      address: customer?.address || prev.address,
    }));
  };

  const addImage = (url: string) => {
    if (!url.trim()) return;
    if (images.length >= MAX_SERVICE_IMAGES) return;

    setImages(prev => [...prev, {
      tempId: crypto.randomUUID(),
      image_url: url.trim(),
      description: "",
    }]);
    // Limpia el bloque superior para permitir agregar la siguiente imagen.
    setImageUploaderKey(prev => prev + 1);
  };

  const removeImage = (tempId: string) => {
    setImages(prev => prev.filter(img => img.tempId !== tempId));
  };

  const productsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalEstimated = productsTotal + form.labor_cost - form.discount;
  const invalidFieldClass = "border-destructive placeholder:text-destructive focus-visible:border-destructive";
  const isValidServiceNumber = form.service_number.trim().length > 0;
  const isValidDescription = form.description.trim().length > 0;
  const isValidServiceType = form.service_type.trim().length > 0;
  const isValidCustomer = !!form.customer_id;
  const isValidAddress = form.address.trim().length > 0;
  const invalidProductIds = new Set(
    items
      .filter((item) => !item.product_id && !item.product_name.trim())
      .map((item) => item.tempId),
  );
  const invalidQuantityIds = new Set(
    items
      .filter((item) => !Number.isFinite(item.quantity) || item.quantity < 1)
      .map((item) => item.tempId),
  );
  const isCostsValid =
    form.labor_cost > 0 &&
    form.discount >= 0 &&
    (!form.has_warranty || form.warranty_value >= 1) &&
    (!form.scheduled_start_at || !Number.isNaN(Date.parse(form.scheduled_start_at)));
  const tabValidity: Record<ServiceFormTab, boolean> = {
    servicio: isValidServiceNumber && isValidDescription && isValidServiceType,
    productos:
      noProductsConsumed ||
      (items.length > 0 && invalidProductIds.size === 0 && invalidQuantityIds.size === 0),
    imagenes: true,
    cliente: isValidCustomer && isValidAddress,
    costos: isCostsValid,
  };
  const maxAccessibleTabIndex = isEditing ? tabsOrder.length - 1 : maxUnlockedTabIndex;
  const activeTabIsValid = tabValidity[activeTab];
  const allTabsValid = tabsOrder.every((tab) => tabValidity[tab]);
  const shouldShowInvalid = (tab: ServiceFormTab) => attemptedTabs.has(tab);
  const showServicioInvalid = shouldShowInvalid("servicio");
  const showProductosInvalid = shouldShowInvalid("productos");
  const showClienteInvalid = shouldShowInvalid("cliente");
  const showCostosInvalid = shouldShowInvalid("costos");

  const handleTabChange = (nextTab: string) => {
    const typedNextTab = nextTab as ServiceFormTab;
    if (isEditing) {
      setActiveTab(typedNextTab);
      return;
    }

    const nextIndex = tabsOrder.indexOf(typedNextTab);
    if (nextIndex !== -1 && nextIndex <= maxAccessibleTabIndex) {
      setActiveTab(typedNextTab);
    }
  };

  const handleWarrantyValueChange = (value: number) => {
    let days = value;
    if (form.warranty_unit === "weeks") days = value * 7;
    if (form.warranty_unit === "months") days = Math.round((value * 365) / 12);
    if (form.warranty_unit === "years") days = value * 365;
    setForm(prev => ({ ...prev, warranty_value: value, warranty_days: days }));
  };

  const handleWarrantyUnitChange = (unit: "days" | "weeks" | "months" | "years") => {
    let days = form.warranty_value;
    if (unit === "weeks") days = form.warranty_value * 7;
    if (unit === "months") days = Math.round((form.warranty_value * 365) / 12);
    if (unit === "years") days = form.warranty_value * 365;
    setForm(prev => ({ ...prev, warranty_unit: unit, warranty_days: days }));
  };

  const handleSubmit = async () => {
    if (!allTabsValid) {
      const nextTab = tabsOrder.find((tab) => !tabValidity[tab]) || "servicio";
      setAttemptedTabs((current) => new Set([...current, nextTab]));
      setActiveTab(nextTab);
      return;
    }

    const normalizedItems = items
      .filter((item) => item.product_name)
      .map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

    const serviceData = {
      service_number: form.service_number,
      customer_id: form.customer_id,
      service_type: form.service_type as ServiceType,
      description: form.description,
      problem: form.problem || null,
      address: form.address || null,
      location: form.location || null,
      estimated_price: totalEstimated,
      labor_cost: form.labor_cost,
      discount: form.discount,
      internal_notes: form.internal_notes || null,
      scheduled_start_at: form.scheduled_start_at || null,
      has_warranty: form.has_warranty,
      warranty_days: form.has_warranty ? form.warranty_days : null,
      custom_fields: form.has_warranty
        ? { warranty_duration_unit: form.warranty_unit, warranty_duration_value: form.warranty_value }
        : {},
      service_products: normalizedItems,
    };

    let createdServiceId: string | null = null;

    if (isEditing && service) {
      await updateService.mutateAsync({ id: service.id, ...serviceData });
      createdServiceId = service.id;
      
      const originalImageIds = new Set(
        service.service_images?.map(img => img.id) || []
      );
      
      const currentImageIds = new Set(
        images.filter(img => img.id).map(img => img.id!)
      );
      
      const imagesToDelete = Array.from(originalImageIds).filter(
        id => !currentImageIds.has(id)
      );
      
      for (const imageId of imagesToDelete) {
        try {
          await deleteServiceImage.mutateAsync(imageId);
        } catch (error) {
          console.error("Error al eliminar imagen:", error);
        }
      }
      
      const newImages = images.filter(img => !img.id);

      for (const image of newImages) {
        try {
          let imageUrl = image.image_url;
          if (imageUrl.startsWith('blob:')) {
            const file = pendingFilesRef.current.get(imageUrl);
            if (file) {
              const result = await phpApiUpload(file, 'services', currentWorkshop?.code);
              imageUrl = result.url;
            } else {
              continue;
            }
          }
          await createServiceImage.mutateAsync({
            service_id: service.id,
            image_url: imageUrl,
            description: image.description || null,
          });
        } catch (error) {
          console.error("Error al crear imagen:", error);
        }
      }
    } else {
      const newService = await createService.mutateAsync(serviceData);
      createdServiceId = newService.id;
      
      const itemsWithProducts: { product_id: string | null; quantity: number }[] = [];
      for (const item of normalizedItems) {
        if (item.product_id) {
          itemsWithProducts.push({
            product_id: item.product_id,
            quantity: item.quantity || 0,
          });
        }
      }
      
      if (itemsWithProducts.length > 0) {
        await updateForService(itemsWithProducts, newService.id);
      }

      for (const image of images) {
        let imageUrl = image.image_url;
        if (imageUrl.startsWith('blob:')) {
          const file = pendingFilesRef.current.get(imageUrl);
          if (file) {
            const result = await phpApiUpload(file, 'services', currentWorkshop?.code);
            imageUrl = result.url;
          } else {
            continue;
          }
        }
        await createServiceImage.mutateAsync({
          service_id: newService.id,
          image_url: imageUrl,
          description: image.description || null,
        });
      }
    }

    if (form.has_warranty && createdServiceId && currentWorkshop?.id && !isEditing) {
      // La garantía se crea automáticamente en el backend cuando el servicio se marca como entregado
    }

    onOpenChange(false);
  };

  const handleNext = () => {
    if (!activeTabIsValid) {
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

  const isPending = createService.isPending || updateService.isPending || deleteServiceImage.isPending || createServiceImage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{isEditing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear o editar un servicio
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <IconTabs
            value={activeTab}
            onChange={handleTabChange}
            items={[
              { id: "servicio", icon: Wrench, label: "Servicio" },
              { id: "productos", icon: Package, label: "Productos" },
              { id: "imagenes", icon: Image, label: "Imágenes" },
              { id: "cliente", icon: User, label: "Cliente" },
              { id: "costos", icon: FileText, label: "Resumen" },
            ].map((item, index) => ({
              ...item,
              disabled: !isEditing && index > maxAccessibleTabIndex,
            }))}
          />

          {/* Tab: Cliente */}
          <TabsContent value="cliente" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Folio</Label>
              <Input value={form.service_number} disabled />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cliente</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomerFormOpen(true)}
                  className="h-8 gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo
                </Button>
              </div>
              <CustomerSelect
                value={form.customer_id}
                onValueChange={handleCustomerChange}
                onCreateNew={() => setCustomerFormOpen(true)}
                invalid={showClienteInvalid && !isValidCustomer}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={showClienteInvalid && !isValidAddress ? "Campo obligatorio" : "Dirección del servicio"}
                  aria-invalid={showClienteInvalid && !isValidAddress}
                  className={cn(showClienteInvalid && !isValidAddress && invalidFieldClass)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ubicación / Zona</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej: Col. Centro..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            setForm(prev => ({ ...prev, location: `${lat}, ${lng}` }));
                          },
                          (error) => {
                            console.error("Error obteniendo ubicación:", error);
                          }
                        );
                      }
                    }}
                    title="Usar ubicación actual"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Servicio */}
          <TabsContent value="servicio" className="space-y-4 mt-4">
            {!isEditing && (
              <div className="space-y-2">
                <Label>Plantilla de inventario (opcional)</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateImport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Crear servicio desde cero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MANUAL_TEMPLATE}>Crear desde cero (sin plantilla)</SelectItem>
                    {serviceTemplates.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No hay servicios preconfigurados
                      </SelectItem>
                    ) : (
                      serviceTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre del servicio *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={showServicioInvalid && !isValidDescription ? "Campo obligatorio" : "Ej: Reparación switch Honda 2001-2011"}
                aria-invalid={showServicioInvalid && !isValidDescription}
                className={cn(showServicioInvalid && !isValidDescription && invalidFieldClass)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Servicio *</Label>
              <Select
                value={form.service_type}
                onValueChange={(value: ServiceType) => setForm(prev => ({ ...prev, service_type: value }))}
              >
                <SelectTrigger
                  aria-invalid={showServicioInvalid && !isValidServiceType}
                  className={cn(showServicioInvalid && !isValidServiceType && "border-destructive text-destructive")}
                >
                  <SelectValue placeholder={showServicioInvalid && !isValidServiceType ? "Campo obligatorio" : "Seleccionar tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Problema reportado</Label>
              <Textarea
                value={form.problem}
                onChange={(e) => setForm(prev => ({ ...prev, problem: e.target.value }))}
                placeholder="Describe lo que reporta el cliente..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea
                value={form.internal_notes}
                onChange={(e) => setForm(prev => ({ ...prev, internal_notes: e.target.value }))}
                placeholder="Notas solo visibles para el equipo..."
                rows={2}
              />
            </div>
          </TabsContent>

          {/* Tab: Productos */}
          <TabsContent value="productos" className="mt-4">
            <ServiceProductsEditor
              items={items}
              noProductsConsumed={noProductsConsumed}
              onNoProductsConsumedChange={setNoProductsConsumed}
              onItemsChange={(newItems) => setItems(newItems)}
              editable={true}
              excludeServiceItems={true}
              currencySymbol={currencySymbol}
              showInvalid={showProductosInvalid}
              invalidQuantityIds={invalidQuantityIds}
            />
          </TabsContent>

          {/* Tab: Costos */}
          <TabsContent value="costos" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mano de obra</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.labor_cost}
                  onChange={(e) => setForm(prev => ({ ...prev, labor_cost: parseFloat(e.target.value) || 0 }))}
                  placeholder={showCostosInvalid && form.labor_cost <= 0 ? "Debe ser mayor a 0" : "0"}
                  aria-invalid={showCostosInvalid && form.labor_cost <= 0}
                  className={cn(showCostosInvalid && form.labor_cost <= 0 && invalidFieldClass)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descuento</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.discount}
                  onChange={(e) => setForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  aria-invalid={showCostosInvalid && form.discount < 0}
                  className={cn(showCostosInvalid && form.discount < 0 && invalidFieldClass)}
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Productos:</span>
                <span>{currencySymbol}{productsTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mano de obra:</span>
                <span>{currencySymbol}{form.labor_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descuento:</span>
                <span className="text-destructive">-{currencySymbol}{form.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Estimado:</span>
                <span className="text-foreground dark:text-primary">{currencySymbol}{totalEstimated.toLocaleString()}</span>
              </div>
            </div>

            {/* Schedule Service Option */}
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20 space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="schedule_service"
                  checked={!!form.scheduled_start_at}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, scheduled_start_at: checked ? new Date().toISOString() : null }))
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="schedule_service"
                    className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                  >
                    📅 Programar servicio
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">Establece una fecha y hora para iniciar este servicio</p>
                </div>
              </div>

              {form.scheduled_start_at && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date">Fecha programada</Label>
                    <Input
                      id="scheduled_date"
                      type="date"
                      value={form.scheduled_start_at?.split('T')[0] || ''}
                      onChange={(e) => {
                        const date = e.target.value;
                        const time = form.scheduled_start_at?.split('T')[1]?.split('.')[0] || '09:00:00';
                        setForm(prev => ({ ...prev, scheduled_start_at: `${date}T${time}.000Z` }));
                      }}
                      aria-invalid={showCostosInvalid && !!form.scheduled_start_at && Number.isNaN(Date.parse(form.scheduled_start_at))}
                      className={cn(showCostosInvalid && !!form.scheduled_start_at && Number.isNaN(Date.parse(form.scheduled_start_at)) && invalidFieldClass)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_time">Hora programada</Label>
                    <Input
                      id="scheduled_time"
                      type="time"
                      value={form.scheduled_start_at?.split('T')[1]?.split('.')[0] || '09:00'}
                      onChange={(e) => {
                        const time = e.target.value;
                        const date = form.scheduled_start_at?.split('T')[0] || new Date().toISOString().split('T')[0];
                        setForm(prev => ({ ...prev, scheduled_start_at: `${date}T${time}:00.000Z` }));
                      }}
                      aria-invalid={showCostosInvalid && !!form.scheduled_start_at && Number.isNaN(Date.parse(form.scheduled_start_at))}
                      className={cn(showCostosInvalid && !!form.scheduled_start_at && Number.isNaN(Date.parse(form.scheduled_start_at)) && invalidFieldClass)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Warranty Option */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="has_warranty"
                  checked={form.has_warranty}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, has_warranty: checked === true }))
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="has_warranty"
                    className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-primary" />
                    Aplicar Garantía
                  </Label>
                </div>
              </div>

              {form.has_warranty && (
                <div className="flex items-center gap-2">
                  <UnitNumberInput
                    min={1}
                    value={form.warranty_value}
                    onValueChange={(value) => handleWarrantyValueChange(value || 1)}
                    aria-invalid={showCostosInvalid && form.has_warranty && form.warranty_value < 1}
                    className={cn("w-20", showCostosInvalid && form.has_warranty && form.warranty_value < 1 && invalidFieldClass)}
                  />
                  <Select
                    value={form.warranty_unit}
                    onValueChange={handleWarrantyUnitChange}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">días</SelectItem>
                      <SelectItem value="weeks">semanas</SelectItem>
                      <SelectItem value="months">meses</SelectItem>
                      <SelectItem value="years">años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Imágenes */}
          <TabsContent value="imagenes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Agregar imagen ({images.length}/{MAX_SERVICE_IMAGES})</Label>
              <ImageUploader
                key={imageUploaderKey}
                value=""
                onChange={(url) => addImage(url)}
                onPendingFile={(file, blobUrl) => {
                  if (file && blobUrl) pendingFilesRef.current.set(blobUrl, file);
                }}
                folder="services"
                workshopCode={currentWorkshop?.code}
                placeholder="URL de la imagen o subir archivo"
                disabled={images.length >= MAX_SERVICE_IMAGES}
                preserveObjectUrls
              />
              {images.length < MAX_SERVICE_IMAGES && (
                <p className="text-xs text-muted-foreground">
                  Puedes agregar hasta {MAX_SERVICE_IMAGES} imágenes.
                </p>
              )}
              {images.length >= MAX_SERVICE_IMAGES && (
                <p className="text-xs text-muted-foreground">
                  Máximo de {MAX_SERVICE_IMAGES} imágenes por servicio.
                </p>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.tempId} className="relative group">
                    <img
                      src={resolveStorageUrl(img.image_url) ?? undefined}
                      alt="Service"
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(img.tempId)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay imágenes agregadas
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row gap-3 pt-2">
          <Button variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!isEditing && activeTab !== "costos" ? (
            <Button
              variant="proto"
              size="lg"
              className="flex-[2] h-12"
              onClick={handleNext}
              disabled={isPending}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="proto"
              size="lg"
              className="flex-[2] h-12"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Servicio"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
      />

    </Dialog>
  );
}
