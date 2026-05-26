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
import { Loader2, UserPlus, Shield, User, Package, FileText } from "lucide-react";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { ServiceProductsEditor, type ProductEditorItem } from "@/components/shared/ServiceProductsEditor";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useCreateSale, generateSaleNumber, paymentMethodLabels, type PaymentMethod } from "@/hooks/useSales";
import { useBatchInventoryUpdate } from "@/hooks/useInventoryMovements";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useWarrantyCategorySettings, useCreateWarranty, generateWarrantyCode, calculateWarrantyEndDate } from "@/hooks/useWarranties";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Customer } from "@/hooks/useCustomers";
import type { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProduct?: Product | null;
}

const paymentMethods: PaymentMethod[] = ["cash", "card", "transfer", "credit"];
type SaleFormTab = "productos" | "cliente" | "resumen";

export function SaleFormDialog({ open, onOpenChange, initialProduct }: SaleFormDialogProps) {
  const createSale = useCreateSale();
  const createWarranty = useCreateWarranty();
  const { updateForSale } = useBatchInventoryUpdate();
  const { data: settings } = useBusinessSettings();
  const { data: warrantySettings } = useWarrantyCategorySettings();
  const { currentWorkshop } = useWorkshop();
  
  const currencySymbol = settings?.currency_symbol || "$";
  
  const [activeTab, setActiveTab] = useState<SaleFormTab>("productos");
  const [maxUnlockedTabIndex, setMaxUnlockedTabIndex] = useState(0);
  const [attemptedTabs, setAttemptedTabs] = useState<Set<SaleFormTab>>(new Set());
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

  const [items, setItems] = useState<ProductEditorItem[]>([]);

  const createInitialItem = (product?: Product | null): ProductEditorItem => {
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
      setMaxUnlockedTabIndex(0);
      setAttemptedTabs(new Set());
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
      setItems(initialProduct ? [createInitialItem(initialProduct)] : []);
    }
  }, [open, initialProduct, currentWorkshop?.id]);

  const handleCustomerChange = (customerId: string | null, customer: Customer | null) => {
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || "",
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - form.discount;
  const invalidFieldClass = "border-destructive placeholder:text-destructive focus-visible:border-destructive";
  const tabsOrder: SaleFormTab[] = ["productos", "cliente", "resumen"];
  const invalidProductIds = new Set(items.filter(item => !item.product_id && !item.product_name.trim()).map(item => item.tempId));
  const invalidQuantityIds = new Set(items.filter(item => !Number.isFinite(item.quantity) || item.quantity < 1).map(item => item.tempId));
  const invalidUnitPriceIds = new Set(items.filter(item => !Number.isFinite(item.unit_price) || item.unit_price <= 0).map(item => item.tempId));
  const validItems = items.filter(item => item.product_name && item.quantity > 0);
  const tabValidity: Record<SaleFormTab, boolean> = {
    productos: validItems.length > 0 && invalidProductIds.size === 0 && invalidQuantityIds.size === 0 && invalidUnitPriceIds.size === 0,
    cliente: form.sale_number.trim().length > 0 && form.payment_method.trim().length > 0,
    resumen: form.discount >= 0 && form.discount <= subtotal && total >= 0,
  };
  const activeTabIsValid = tabValidity[activeTab];
  const allTabsValid = tabsOrder.every((tab) => tabValidity[tab]);
  const maxAccessibleTabIndex = maxUnlockedTabIndex;
  const shouldShowInvalid = (tab: SaleFormTab) => attemptedTabs.has(tab);
  const showProductosInvalid = shouldShowInvalid("productos");
  const showResumenInvalid = shouldShowInvalid("resumen");

  const handleTabChange = (nextTab: string) => {
    const typedNextTab = nextTab as SaleFormTab;
    const nextIndex = tabsOrder.indexOf(typedNextTab);
    if (nextIndex !== -1 && nextIndex <= maxAccessibleTabIndex) {
      setActiveTab(typedNextTab);
    }
  };

  const handleNext = () => {
    if (!activeTabIsValid) {
      setAttemptedTabs((current) => new Set([...current, activeTab]));
      return;
    }
    const index = tabsOrder.indexOf(activeTab);
    const next = tabsOrder[index + 1];
    if (next) {
      setMaxUnlockedTabIndex((current) => Math.max(current, index + 1));
      setActiveTab(next);
    }
  };

  const handleSubmit = async () => {
    if (!allTabsValid) {
      const nextTab = tabsOrder.find((tab) => !tabValidity[tab]) || "productos";
      setAttemptedTabs((current) => new Set([...current, nextTab]));
      setActiveTab(nextTab);
      return;
    }

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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <IconTabs
            value={activeTab}
            onChange={handleTabChange}
            items={[
              { id: "productos", icon: Package, label: "Productos" },
              { id: "cliente", icon: User, label: "Cliente" },
              { id: "resumen", icon: FileText, label: "Resumen" },
            ].map((item, index) => ({
              ...item,
              disabled: index > maxAccessibleTabIndex,
            }))}
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
          <TabsContent value="productos" className="mt-4">
            <ServiceProductsEditor
              items={items}
              onItemsChange={setItems}
              editable={true}
              minItems={1}
              excludeAddedProducts={true}
              excludeServiceItems={true}
              showInvalid={showProductosInvalid}
              invalidQuantityIds={invalidQuantityIds}
              invalidPriceIds={invalidUnitPriceIds}
              currencySymbol={currencySymbol}
            />
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
                  aria-invalid={showResumenInvalid && (form.discount < 0 || form.discount > subtotal)}
                  className={cn("w-32 text-right", showResumenInvalid && (form.discount < 0 || form.discount > subtotal) && invalidFieldClass)}
                />
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-foreground dark:text-success">{currencySymbol}{total.toLocaleString()}</span>
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
          {activeTab !== "resumen" ? (
            <Button variant="proto" size="lg" className="flex-[2] h-12" onClick={handleNext} disabled={isPending}>
              Siguiente
            </Button>
          ) : (
            <Button variant="proto" size="lg" className="flex-[2] h-12" onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar Venta
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
