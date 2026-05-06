import { useState, useEffect } from "react";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { IconTabs } from "@/components/ui/icon-tabs";
import { Loader2, Plus, Trash2, User, Package, FileText } from "lucide-react";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { ProductSelect } from "@/components/shared/ProductSelect";
import { useCreateQuote, useUpdateQuote, generateQuoteNumber, type Quote } from "@/hooks/useQuotes";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { Customer } from "@/hooks/useCustomers";
import type { Product } from "@/hooks/useProducts";
import { addDays, format } from "date-fns";

interface QuoteItem {
  tempId: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote | null;
}

export function QuoteFormDialog({ open, onOpenChange, quote }: QuoteFormDialogProps) {
  const isEditing = !!quote;
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const { currentWorkshop } = useWorkshop();

  const [activeTab, setActiveTab] = useState("cliente");
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

  const [items, setItems] = useState<QuoteItem[]>([
    { tempId: crypto.randomUUID(), product_id: null, description: "", quantity: 1, unit_price: 0, subtotal: 0 }
  ]);

  useEffect(() => {
    if (open) {
      setActiveTab("cliente");
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
          description: item.description,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          subtotal: Number(item.subtotal),
        })) || [{ tempId: crypto.randomUUID(), product_id: null, description: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
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
        setItems([
          { tempId: crypto.randomUUID(), product_id: null, description: "", quantity: 1, unit_price: 0, subtotal: 0 }
        ]);
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

  const addItem = () => {
    setItems(prev => [...prev, {
      tempId: crypto.randomUUID(),
      product_id: null,
      description: "",
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
    }]);
  };

  const updateItem = (tempId: string, field: keyof QuoteItem, value: any) => {
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
        description: product?.name || item.description,
        unit_price: product?.sale_price_min || item.unit_price,
        subtotal: item.quantity * (product?.sale_price_min || item.unit_price),
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
  const validUntil = format(addDays(new Date(), form.validity_days), "yyyy-MM-dd");

  const validItems = items.filter(item => item.description && item.quantity > 0);

  const handleSubmit = async () => {
    if (validItems.length === 0) return;

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
        description: item.description,
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
          <DialogTitle className="text-base sm:text-lg">{isEditing ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <IconTabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: "cliente", icon: User, label: "Cliente" },
              { id: "productos", icon: Package, label: "Items" },
              { id: "resumen", icon: FileText, label: "Resumen" },
            ]}
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
          <TabsContent value="productos" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Productos / Servicios *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {items.map((item, index) => (
                <div key={item.tempId} className="p-3 bg-muted/50 rounded-lg border space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-5 mt-2">{index + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <ProductSelect
                        value={item.product_id}
                        onValueChange={(id, product) => handleProductSelect(item.tempId, id, product)}
                      />
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.tempId, "description", e.target.value)}
                        placeholder="Descripción del item..."
                        className="text-sm"
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
                        <div>
                          <Label className="text-xs text-muted-foreground">Subtotal</Label>
                          <div className="h-9 px-2 py-1 bg-background rounded text-sm font-medium flex items-center">
                            ${item.subtotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 mt-1"
                      onClick={() => removeItem(item.tempId)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
                  className="w-32 text-right"
                />
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-primary">${total.toLocaleString()}</span>
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
          <Button variant="proto" size="lg" className="flex-[2] h-12" onClick={handleSubmit} disabled={isPending || validItems.length === 0}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar Cambios" : "Crear Cotización"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
      />
    </Dialog>
  );
}
