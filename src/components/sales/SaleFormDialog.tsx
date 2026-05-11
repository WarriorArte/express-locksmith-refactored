import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Plus, Trash2, UserPlus, Shield, User, Package, FileText } from "lucide-react";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { ProductSelect } from "@/components/shared/ProductSelect";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useCreateSale, generateSaleNumber, paymentMethodLabels, type PaymentMethod, type Sale } from "@/hooks/useSales";
import { useBatchInventoryUpdate } from "@/hooks/useInventoryMovements";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useWarrantyCategorySettings, useCreateWarranty, generateWarrantyCode, calculateWarrantyEndDate } from "@/hooks/useWarranties";
import { useProducts } from "@/hooks/useProducts";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Customer } from "@/hooks/useCustomers";
import type { Product } from "@/hooks/useProducts";
import { SalePrintPreview } from "@/components/sales/SalePrintPreview";
import { WarrantyPrintTicket } from "@/components/warranties/WarrantyPrintTicket";

interface SaleItem {
  tempId: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  category_id?: string | null;
}

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProduct?: Product | null;
}

const paymentMethods: PaymentMethod[] = ["cash", "card", "transfer", "credit"];

export function SaleFormDialog({ open, onOpenChange, initialProduct }: SaleFormDialogProps) {
  const createSale = useCreateSale();
  const createWarranty = useCreateWarranty();
  const { updateForSale } = useBatchInventoryUpdate();
  const { data: settings } = useBusinessSettings();
  const { data: warrantySettings } = useWarrantyCategorySettings();
  const { data: allProducts } = useProducts();
  const { currentWorkshop } = useWorkshop();
  
  const currencySymbol = settings?.currency_symbol || "$";
  
  const [activeTab, setActiveTab] = useState("productos");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [warrantyPrintOpen, setWarrantyPrintOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [createdWarranty, setCreatedWarranty] = useState<any>(null);

  const [form, setForm] = useState({
    sale_number: "",
    customer_id: null as string | null,
    customer_name: "",
    payment_method: "cash" as PaymentMethod,
    discount: 0,
    notes: "",
    has_warranty: false,
  });

  const [items, setItems] = useState<SaleItem[]>([
    { tempId: crypto.randomUUID(), product_id: null, product_name: "", quantity: 1, unit_price: 0, subtotal: 0, category_id: null }
  ]);

  const createInitialItem = (product?: Product | null): SaleItem => {
    if (!product) {
      return {
        tempId: crypto.randomUUID(),
        product_id: null,
        product_name: "",
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        category_id: null,
      };
    }

    const price = Number(product.sale_price_min || product.sale_price_max || 0);
    return {
      tempId: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: price,
      subtotal: price,
      category_id: product.category_id || null,
    };
  };

  useEffect(() => {
    if (open) {
      setActiveTab("productos");
      if (currentWorkshop?.id) {
        generateSaleNumber(currentWorkshop.id).then(num => {
          setForm(prev => ({ ...prev, sale_number: num }));
        });
      }
      setForm(prev => ({
        ...prev,
        customer_id: null,
        customer_name: "",
        payment_method: "cash",
        discount: 0,
        notes: "",
        has_warranty: false,
      }));
      setItems([createInitialItem(initialProduct)]);
    }
  }, [open, initialProduct, currentWorkshop?.id]);

  const handleCustomerChange = (customerId: string | null, customer: Customer | null) => {
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || "",
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
      category_id: null,
    }]);
  };

  const updateItem = (tempId: string, field: keyof SaleItem, value: any) => {
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
        category_id: product?.category_id || null,
      };
    }));
  };

  const removeItem = (tempId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.tempId !== tempId));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - form.discount;

  const validItems = items.filter(item => item.product_name && item.quantity > 0);

  const handleSubmit = async () => {
    if (validItems.length === 0) return;

    const saleData = {
      sale_number: form.sale_number,
      customer_id: form.customer_id,
      customer_name: form.customer_name || "Cliente mostrador",
      payment_method: form.payment_method,
      subtotal: subtotal,
      discount: form.discount,
      total: total,
      notes: form.notes || null,
      has_warranty: form.has_warranty,
      items: validItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
    };

    const newSale = await createSale.mutateAsync(saleData);
    
    const itemsWithProducts: { product_id: string | null; quantity: number }[] = [];
    const saleItems: any[] = [];

    for (const item of validItems) {
      saleItems.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        category_id: item.category_id,
      });

      if (item.product_id) {
        itemsWithProducts.push({
          product_id: item.product_id,
          quantity: item.quantity,
        });
      }
    }
    
    if (itemsWithProducts.length > 0) {
      await updateForSale(itemsWithProducts, newSale.id);
    }

    let warrantyData = null;
    if (form.has_warranty && currentWorkshop?.id) {
      let maxWarrantyDays = 30;
      
      for (const item of saleItems) {
        if (item.category_id && warrantySettings) {
          const categorySetting = warrantySettings.find(
            (s) => s.category_id === item.category_id
          );
          if (categorySetting && categorySetting.warranty_days > maxWarrantyDays) {
            maxWarrantyDays = categorySetting.warranty_days;
          }
        }
      }
      
      const warrantyCode = await generateWarrantyCode(currentWorkshop.id);
      const startDate = new Date();
      const endDate = calculateWarrantyEndDate(startDate, maxWarrantyDays);
      
      const productNames = saleItems.map((i) => i.product_name).join(", ");
      
      warrantyData = await createWarranty.mutateAsync({
        warranty_code: warrantyCode,
        sale_id: newSale.id,
        service_id: null,
        customer_id: form.customer_id,
        customer_name: form.customer_name || "Cliente mostrador",
        product_name: productNames,
        service_description: null,
        warranty_type: "sale",
        warranty_days: maxWarrantyDays,
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
    }

    const salePreviewData = {
      ...newSale,
      items: saleItems.map(item => ({
        id: item.id || crypto.randomUUID(),
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
    };

    setCompletedSale(salePreviewData);
    setPrintPreviewOpen(true);
    
    if (warrantyData) {
      setWarrantyPrintOpen(true);
    }
    
    onOpenChange(false);
  };
  
  const handleClosePrintPreview = useCallback(() => {
    setPrintPreviewOpen(false);
    setCompletedSale(null);
  }, []);

  const isPending = createSale.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Nueva Venta</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <IconTabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: "productos", icon: Package, label: "Productos" },
              { id: "cliente", icon: User, label: "Cliente" },
              { id: "resumen", icon: FileText, label: "Resumen" },
            ]}
          />

          {/* Tab: Cliente */}
          <TabsContent value="cliente" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Folio</Label>
                <Input value={form.sale_number} disabled />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(value: PaymentMethod) => setForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>
                        {paymentMethodLabels[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <UserPlus className="w-4 h-4" />
                  Nuevo
                </Button>
              </div>
              <CustomerSelect
                value={form.customer_id}
                onValueChange={handleCustomerChange}
              />
            </div>
          </TabsContent>

          {/* Tab: Productos */}
          <TabsContent value="productos" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Productos *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.tempId}
                  className="space-y-2 p-3 bg-muted/50 rounded-lg border"
                >
                  <ProductSelect
                    value={item.product_id}
                    onValueChange={(id, product) => handleProductSelect(item.tempId, id, product)}
                    excludeIds={items
                      .filter(i => i.tempId !== item.tempId && i.product_id)
                      .map(i => i.product_id!)}
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
                        onChange={(e) =>
                          updateItem(item.tempId, "unit_price", parseFloat(e.target.value) || 0)
                        }
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
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Resumen */}
          <TabsContent value="resumen" className="space-y-4 mt-4">
            {/* Totals */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{currencySymbol}{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Descuento:</Label>
                <Input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={form.discount}
                  onChange={(e) => setForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  className="w-32 text-right"
                />
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-success">{currencySymbol}{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Warranty Option */}
            <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Se generará un ticket de garantía con código QR
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row gap-3 pt-2">
          <Button variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="proto" size="lg" className="flex-[2] h-12" onClick={handleSubmit} disabled={isPending || validItems.length === 0}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar Venta
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
      />
      
      {completedSale && (
        <SalePrintPreview
          sale={completedSale}
          open={printPreviewOpen}
          onOpenChange={handleClosePrintPreview}
        />
      )}
      
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
