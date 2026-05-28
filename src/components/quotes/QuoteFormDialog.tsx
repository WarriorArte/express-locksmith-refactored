import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnitNumberInput } from "@/components/ui/unit-number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { IconTabs } from "@/components/ui/icon-tabs";
import { Loader2, Plus, User, Package, FileText } from "lucide-react";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { ServiceProductsEditor, type ProductEditorItem } from "@/components/shared/ServiceProductsEditor";
import { CreationDialogHeader } from "@/components/shared/CreationDialogHeader";
import { useCreateQuote, useUpdateQuote, generateQuoteNumber, type Quote } from "@/hooks/useQuotes";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useWorkshop } from "@/hooks/useWorkshop";
import { cn } from "@/lib/utils";
import type { Customer } from "@/hooks/useCustomers";
import { addDays, format } from "date-fns";

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote | null;
}

type QuoteFormTab = "cliente" | "productos" | "resumen";

export function QuoteFormDialog({ open, onOpenChange, quote }: QuoteFormDialogProps) {
  const isEditing = !!quote;
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const { currentWorkshop } = useWorkshop();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || "$";

  const [activeTab, setActiveTab] = useState<QuoteFormTab>("cliente");
  const [maxUnlockedTabIndex, setMaxUnlockedTabIndex] = useState(0);
  const [attemptedTabs, setAttemptedTabs] = useState<Set<QuoteFormTab>>(new Set());
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

  const [form, setForm] = useState({
    quote_number: "",
    customer_id: null as string | null,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    description: "",
    location: "",
    validity_days: 15,
    discount: 0,
    notes: "",
    policies: "",
  });

  const [items, setItems] = useState<ProductEditorItem[]>([]);

  useEffect(() => {
    if (open) {
      setActiveTab("cliente");
      setMaxUnlockedTabIndex(quote ? 2 : 0);
      setAttemptedTabs(new Set());
      if (quote) {
        setForm({
          quote_number: quote.quote_number,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name || "",
          customer_phone: quote.customer_phone || "",
          customer_email: quote.customer_email || "",
          customer_address: quote.customer_address || "",
          description: quote.description || "",
          location: quote.location || "",
          validity_days: quote.validity_days,
          discount: Number(quote.discount),
          notes: quote.notes || "",
          policies: quote.policies || "",
        });
        setItems(quote.quote_items?.map(item => ({
          tempId: item.id,
          product_id: item.product_id,
          product_name: item.description,
          description: item.description,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          subtotal: Number(item.subtotal),
        })) || []);
      } else {
        if (currentWorkshop?.id) {
          generateQuoteNumber(currentWorkshop.id).then(num => {
            setForm(prev => ({ ...prev, quote_number: num }));
          });
        }
        setForm(prev => ({
          ...prev,
          customer_id: null,
          customer_name: "",
          customer_phone: "",
          customer_email: "",
          customer_address: "",
          description: "",
          location: "",
          validity_days: 15,
          discount: 0,
          notes: "",
          policies: "",
        }));
        setItems([]);
      }
    }
  }, [open, quote, currentWorkshop?.id]);

  const handleCustomerChange = (customerId: string | null, customer: Customer | null) => {
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || "",
      customer_phone: customer?.phone || "",
      customer_email: customer?.email || "",
      customer_address: customer?.address || "",
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - form.discount;
  const validUntil = format(addDays(new Date(), form.validity_days), "yyyy-MM-dd");
  const invalidFieldClass = "border-destructive placeholder:text-destructive focus-visible:border-destructive";
  const tabsOrder: QuoteFormTab[] = ["cliente", "productos", "resumen"];
  const invalidItemIds = new Set(items.filter(item => !(item.description ?? "").trim()).map(item => item.tempId));
  const invalidQuantityIds = new Set(items.filter(item => !Number.isFinite(item.quantity) || item.quantity < 1).map(item => item.tempId));
  const invalidUnitPriceIds = new Set(items.filter(item => !Number.isFinite(item.unit_price) || item.unit_price <= 0).map(item => item.tempId));
  const validItems = items.filter(item => (item.description ?? "").trim() && item.quantity > 0);
  const tabValidity: Record<QuoteFormTab, boolean> = {
    cliente: form.quote_number.trim().length > 0 && form.validity_days >= 1,
    productos: validItems.length > 0 && invalidItemIds.size === 0 && invalidQuantityIds.size === 0 && invalidUnitPriceIds.size === 0,
    resumen: form.discount >= 0 && form.discount <= subtotal && total >= 0,
  };
  const activeTabIsValid = tabValidity[activeTab];
  const allTabsValid = tabsOrder.every((tab) => tabValidity[tab]);
  const maxAccessibleTabIndex = isEditing ? tabsOrder.length - 1 : maxUnlockedTabIndex;
  const shouldShowInvalid = (tab: QuoteFormTab) => attemptedTabs.has(tab);
  const showClienteInvalid = shouldShowInvalid("cliente");
  const showProductosInvalid = shouldShowInvalid("productos");
  const showResumenInvalid = shouldShowInvalid("resumen");

  const handleTabChange = (nextTab: string) => {
    const typedNextTab = nextTab as QuoteFormTab;
    if (isEditing) {
      setActiveTab(typedNextTab);
      return;
    }

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
      const nextTab = tabsOrder.find((tab) => !tabValidity[tab]) || "cliente";
      setAttemptedTabs((current) => new Set([...current, nextTab]));
      setActiveTab(nextTab);
      return;
    }

    const quoteData = {
      quote_number: form.quote_number,
      customer_id: form.customer_id,
      customer_name: form.customer_name || null,
      customer_phone: form.customer_phone || null,
      customer_email: form.customer_email || null,
      customer_address: form.customer_address || null,
      description: form.description || null,
      location: form.location || null,
      validity_days: form.validity_days,
      valid_until: validUntil,
      subtotal: subtotal,
      discount: form.discount,
      total: total,
      notes: form.notes || null,
      policies: form.policies || null,
      items: validItems.map((item, index) => ({
        product_id: item.product_id,
        description: item.description ?? item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        sort_order: index,
      })),
    };

    if (isEditing && quote) {
      await updateQuote.mutateAsync({ id: quote.id, ...quoteData });
    } else {
      await createQuote.mutateAsync(quoteData);
    }

    onOpenChange(false);
  };

  const isPending = createQuote.isPending || updateQuote.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <CreationDialogHeader
            icon={FileText}
            title={isEditing ? "Editar cotización" : "Nueva cotización"}
            description="Propuesta con cliente, ítems, vigencia y resumen comercial"
            meta={form.quote_number || undefined}
          />
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <IconTabs
            value={activeTab}
            onChange={handleTabChange}
            items={[
              { id: "cliente", icon: User, label: "Cliente" },
              { id: "productos", icon: Package, label: "Items" },
              { id: "resumen", icon: FileText, label: "Resumen" },
            ].map((item, index) => ({
              ...item,
              disabled: !isEditing && index > maxAccessibleTabIndex,
            }))}
          />

          {/* Tab: Cliente */}
          <TabsContent value="cliente" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Folio</Label>
                <Input value={form.quote_number} disabled />
              </div>
              <div className="space-y-2">
                <Label>Vigencia (días)</Label>
                <UnitNumberInput
                  min={1}
                  max={90}
                  value={form.validity_days}
                  onValueChange={(value) => setForm(prev => ({ ...prev, validity_days: value || 15 }))}
                  aria-invalid={showClienteInvalid && form.validity_days < 1}
                  className={cn(showClienteInvalid && form.validity_days < 1 && invalidFieldClass)}
                />
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

            {form.customer_id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={form.customer_phone}
                    onChange={(e) => setForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => setForm(prev => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descripción / Título</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Instalación de cerraduras para oficinas..."
                rows={2}
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
              showDescriptionField={true}
              showInvalid={showProductosInvalid}
              invalidQuantityIds={invalidQuantityIds}
              invalidDescriptionIds={invalidItemIds}
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
                <span className="font-medium">${subtotal.toLocaleString()}</span>
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
                <span className="text-foreground dark:text-primary">${total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Válida hasta:</span>
                <span>{validUntil}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales para el cliente..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Políticas / Términos</Label>
              <Textarea
                value={form.policies}
                onChange={(e) => setForm(prev => ({ ...prev, policies: e.target.value }))}
                placeholder="Políticas de garantía, condiciones de pago, etc..."
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row gap-3 pt-2">
          <Button variant="proto-ghost" size="lg" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!isEditing && activeTab !== "resumen" ? (
            <Button variant="proto" size="lg" className="flex-[2] h-12" onClick={handleNext} disabled={isPending}>
              Siguiente
            </Button>
          ) : (
            <Button variant="proto" size="lg" className="flex-[2] h-12" onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Cotización"}
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
