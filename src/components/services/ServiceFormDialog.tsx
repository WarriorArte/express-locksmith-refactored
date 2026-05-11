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
import { Loader2, Plus, Trash2, MapPin, Shield, Package, User, Wrench, FileText, Image } from "lucide-react";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { ProductSelect } from "@/components/shared/ProductSelect";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useCreateService, useUpdateService, generateServiceNumber, type Service, type ServiceType } from "@/hooks/useServices";
import { useCreateServiceImage, useDeleteServiceImage } from "@/hooks/useServices";
import { useBatchInventoryUpdate } from "@/hooks/useInventoryMovements";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useCreateWarranty, generateWarrantyCode, calculateWarrantyEndDate } from "@/hooks/useWarranties";
import { useWorkshop } from "@/hooks/useWorkshop";
import { phpApiUpload } from "@/lib/phpApi";
import { WarrantyPrintTicket } from "@/components/warranties/WarrantyPrintTicket";
import type { Customer } from "@/hooks/useCustomers";
import type { Product } from "@/hooks/useProducts";

interface ServiceItem {
  tempId: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ServiceImage {
  tempId: string;
  image_url: string;
  description: string;
  id?: string;
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: "residential", label: "Residencial" },
  { value: "commercial", label: "Comercial" },
  { value: "automotive", label: "Automotriz" },
  { value: "industrial", label: "Industrial" },
];

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const isEditing = !!service;
  const createService = useCreateService();
  const updateService = useUpdateService();
  const createServiceImage = useCreateServiceImage();
  const deleteServiceImage = useDeleteServiceImage();
  const createWarranty = useCreateWarranty();
  const { updateForService } = useBatchInventoryUpdate();
  const { data: settings } = useBusinessSettings();
  const { currentWorkshop } = useWorkshop();
  
  const currencySymbol = settings?.currency_symbol || "$";
  
  const [activeTab, setActiveTab] = useState("servicio");
  const [warrantyPrintOpen, setWarrantyPrintOpen] = useState(false);
  const [createdWarranty, setCreatedWarranty] = useState<any>(null);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

  const [form, setForm] = useState({
    service_number: "",
    customer_id: null as string | null,
    customer_name: "",
    customer_phone: "",
    service_type: "residential" as ServiceType,
    description: "",
    problem: "",
    address: "",
    location: "",
    estimated_price: 0,
    labor_cost: 0,
    discount: 0,
    internal_notes: "",
    has_warranty: false,
    warranty_days: 30,
    warranty_value: 30,
    warranty_unit: "days" as "days" | "weeks" | "months",
  });

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [images, setImages] = useState<ServiceImage[]>([]);
  const pendingFilesRef = useRef(new Map<string, File>());
  const tabsOrder = ["servicio", "productos", "imagenes", "cliente", "costos"];

  useEffect(() => {
    if (open) {
      setActiveTab("servicio");
      pendingFilesRef.current.clear();
      if (service) {
        const days = service.warranty_days || 30;
        let unit: "days" | "weeks" | "months" = "days";
        let value = days;
        if (days % 30 === 0 && days >= 30) {
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
        setImages(service.service_images?.map(i => ({
          tempId: i.id,
          image_url: i.image_url,
          id: i.id,
          description: i.description || "",
        })) || []);
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
          service_type: "residential",
          description: "",
          problem: "",
          address: "",
          location: "",
          estimated_price: 0,
          labor_cost: 0,
          discount: 0,
          internal_notes: "",
          has_warranty: false,
          warranty_days: 30,
          warranty_value: 30,
          warranty_unit: "days",
        }));
        setItems([]);
        setImages([]);
      }
    }
  }, [open, service, currentWorkshop?.id]);

  const handleCustomerChange = (customerId: string | null, customer: Customer | null) => {
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || "",
      customer_phone: customer?.phone || "",
      address: customer?.address || prev.address,
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      tempId: crypto.randomUUID(),
      product_id: null,
      product_name: "",
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
    }]);
  };

  const updateItem = (tempId: string, field: keyof ServiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unit_price") {
        updated.subtotal = updated.quantity * updated.unit_price;
      }
      return updated;
    }));
  };

  const handleProductSelect = (tempId: string, productId: string | null, product: Product | null) => {
    setItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      return {
        ...item,
        product_id: productId,
        product_name: product?.name || "",
        unit_price: product?.sale_price_min || 0,
        subtotal: item.quantity * (product?.sale_price_min || 0),
      };
    }));
  };

  const removeItem = (tempId: string) => {
    setItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const addImage = (url: string) => {
    if (url.trim()) {
      setImages(prev => [...prev, {
        tempId: crypto.randomUUID(),
        image_url: url.trim(),
        description: "",
      }]);
    }
  };

  const removeImage = (tempId: string) => {
    setImages(prev => prev.filter(img => img.tempId !== tempId));
  };

  const productsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalEstimated = productsTotal + form.labor_cost - form.discount;

  const handleWarrantyValueChange = (value: number) => {
    let days = value;
    if (form.warranty_unit === "weeks") days = value * 7;
    if (form.warranty_unit === "months") days = value * 30;
    setForm(prev => ({ ...prev, warranty_value: value, warranty_days: days }));
  };

  const handleWarrantyUnitChange = (unit: "days" | "weeks" | "months") => {
    let days = form.warranty_value;
    if (unit === "weeks") days = form.warranty_value * 7;
    if (unit === "months") days = form.warranty_value * 30;
    setForm(prev => ({ ...prev, warranty_unit: unit, warranty_days: days }));
  };

  const handleSubmit = async () => {
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
      service_type: form.service_type,
      description: form.description,
      problem: form.problem || null,
      address: form.address || null,
      location: form.location || null,
      estimated_price: totalEstimated,
      labor_cost: form.labor_cost,
      discount: form.discount,
      internal_notes: form.internal_notes || null,
      has_warranty: form.has_warranty,
      warranty_days: form.has_warranty ? form.warranty_days : null,
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
      const warrantyCode = await generateWarrantyCode(currentWorkshop.id);
      const startDate = new Date();
      const endDate = calculateWarrantyEndDate(startDate, form.warranty_days);
      
      const customerName = form.customer_name || "Cliente";
      
      const warrantyData = await createWarranty.mutateAsync({
        warranty_code: warrantyCode,
        sale_id: null,
        service_id: createdServiceId,
        customer_id: form.customer_id,
        customer_name: customerName,
        product_name: null,
        service_description: form.description,
        warranty_type: "service",
        warranty_days: form.warranty_days,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        notes: null,
        is_voided: false,
        voided_at: null,
        voided_reason: null,
        workshop_id: currentWorkshop.id,
        created_by: null,
      });
      
      setCreatedWarranty(warrantyData);
      setWarrantyPrintOpen(true);
    }

    onOpenChange(false);
  };

  const handleNext = () => {
    const idx = tabsOrder.indexOf(activeTab);
    if (idx === -1) return;
    const next = tabsOrder[idx + 1];
    if (next) {
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <IconTabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: "servicio", icon: Wrench, label: "Servicio" },
              { id: "productos", icon: Package, label: "Productos" },
              { id: "imagenes", icon: Image, label: "Imágenes" },
              { id: "cliente", icon: User, label: "Cliente" },
              { id: "costos", icon: FileText, label: "Resumen" },
            ]}
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
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Dirección del servicio"
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
            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select
                value={form.service_type}
                onValueChange={(value: ServiceType) => setForm(prev => ({ ...prev, service_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Problema reportado *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del problema..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Solución del servicio</Label>
              <Textarea
                value={form.problem}
                onChange={(e) => setForm(prev => ({ ...prev, problem: e.target.value }))}
                placeholder="Descripción de la solución..."
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
          <TabsContent value="productos" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Productos utilizados</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            
            {items.length === 0 ? (
              <div className="min-h-[38vh] flex items-center justify-center text-center text-muted-foreground text-sm select-none">
                No hay productos agregados
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.tempId}
                    className="space-y-2 p-3 bg-muted/50 rounded-lg border"
                  >
                    <ProductSelect
                      value={item.product_id}
                      onValueChange={(id, product) => handleProductSelect(item.tempId, id, product)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Cantidad</Label>
                        <UnitNumberInput
                          min={1}
                          value={item.quantity}
                          onValueChange={(value) => updateItem(item.tempId, "quantity", value || 1)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Precio</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.tempId, "unit_price", parseFloat(e.target.value) || 0)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Subtotal</Label>
                          <div className="h-9 px-2 py-1 bg-background rounded text-sm font-medium flex items-center">
                            {currencySymbol}{item.subtotal.toLocaleString()}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => removeItem(item.tempId)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  placeholder="0"
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
                <span className="text-primary">{currencySymbol}{totalEstimated.toLocaleString()}</span>
              </div>
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
                    className="w-20"
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
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Imágenes */}
          <TabsContent value="imagenes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Agregar imagen</Label>
              <ImageUploader
                value=""
                onChange={(url) => addImage(url)}
                onPendingFile={(file, blobUrl) => {
                  if (file && blobUrl) pendingFilesRef.current.set(blobUrl, file);
                }}
                folder="services"
                workshopCode={currentWorkshop?.code}
                placeholder="URL de la imagen o subir archivo"
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.tempId} className="relative group">
                    <img
                      src={img.image_url}
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
              disabled={isPending || !form.description}
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

      {createdWarranty && (
        <WarrantyPrintTicket
          warranty={createdWarranty}
          open={warrantyPrintOpen}
          onOpenChange={setWarrantyPrintOpen}
        />
      )}
    </Dialog>
  );
}
