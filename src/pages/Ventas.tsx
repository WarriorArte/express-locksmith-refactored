import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsLayout } from "@/components/ui/stats-layout";
import { motion } from "framer-motion";
import gsap from "gsap";
import { 
  Plus, 
  ShoppingCart, 
  Calendar,
  User,
  Printer,
  Eye,
  MessageCircle,
  TrendingUp,
  DollarSign,
  Loader2,
  Trash2,
  Share2,
} from "lucide-react";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";
import { SalePrintPreview } from "@/components/sales/SalePrintPreview";
import { useSalePrint } from "@/hooks/useSalePrint";
import { DetailViewDialog } from "@/components/shared/DetailViewDialog";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useSales, useDeleteSale, paymentMethodLabels, type Sale, type PaymentMethod } from "@/hooks/useSales";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

const paymentMethodColors: Record<PaymentMethod, string> = {
  cash: "bg-success-light text-success",
  card: "bg-info-light text-info",
  transfer: "bg-primary-light text-primary",
  credit: "bg-warning-light text-warning",
};

export default function Ventas() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewSale, setPdfPreviewSale] = useState<Sale | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: sales, isLoading } = useSales();
  const { data: settings } = useBusinessSettings();
  const deleteSale = useDeleteSale();
  const { printSale } = useSalePrint();
  const statsRef = useRef<HTMLDivElement>(null);
  const statsHeightRef = useRef(0);
  const searchActiveRef = useRef(false);
  const searchFocusedRef = useRef(false);
  const searchActive = searchQuery.length > 0;

  useEffect(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    const el = statsRef.current;
    if (!main || !el) return;

    const mt = 24;
    const onScroll = () => {
      const h = statsHeightRef.current;
      if (!h || searchActiveRef.current || searchFocusedRef.current) return;
      const p = Math.min(Math.max((main.scrollTop - 20) / (h + mt), 0), 1);
      gsap.set(el, { height: h * (1 - p), opacity: 1 - p, marginTop: mt * (1 - p) });
    };

    const rafId = requestAnimationFrame(() => {
      statsHeightRef.current = el.scrollHeight;
      const h = statsHeightRef.current;
      if (h > 0) {
        gsap.set(el, { height: h, overflow: "hidden", marginTop: mt });
        main.addEventListener("scroll", onScroll, { passive: true });
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      main.removeEventListener("scroll", onScroll);
      gsap.set(el, { clearProps: "all" });
    };
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    const h = statsHeightRef.current;
    if (!el || !h) return;
    const mt = 24;

    if (searchActive) {
      searchActiveRef.current = true;
      gsap.to(el, { height: 0, opacity: 0, marginTop: 0, duration: 0.25, ease: "power2.in", overwrite: true });
    } else {
      const main = document.querySelector("main") as HTMLElement | null;
      const p = Math.min(Math.max(((main?.scrollTop ?? 0) - 20) / (h + mt), 0), 1);
      gsap.to(el, {
        height: h * (1 - p), opacity: 1 - p, marginTop: mt * (1 - p),
        duration: 0.25, ease: "power2.out", overwrite: true,
        onComplete: () => { searchActiveRef.current = false; },
      });
    }
  }, [searchActive]);

  const currencySymbol = settings?.currency_symbol || "$";

  const filteredSales = sales?.filter((sale) =>
    sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const todayTotal = sales
    ?.filter(s => isToday(parseISO(s.created_at)))
    .reduce((acc, s) => acc + Number(s.total), 0) || 0;

  const currentMonth = new Date();
  const monthTotal = sales
    ?.filter(s => isWithinInterval(parseISO(s.created_at), {
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    }))
    .reduce((acc, s) => acc + Number(s.total), 0) || 0;

  const handleDelete = (sale: Sale) => {
    setSelectedSale(sale);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedSale) {
      await deleteSale.mutateAsync(selectedSale.id);
      setDeleteDialogOpen(false);
      setSelectedSale(null);
    }
  };

  const handlePrint = (sale: Sale) => {
    printSale(sale);
  };

  const handlePreview = (sale: Sale) => {
    setPdfPreviewSale(sale);
    setPdfPreviewOpen(true);
  };

  const handleViewDetail = (sale: Sale) => {
    setViewingSale(sale);
    setDetailDialogOpen(true);
  };

  const handleShare = (sale: Sale) => {
    const phone = sale.customer?.phone;
    const businessName = settings?.name || "Mi Negocio";
    
    const itemsList = sale.sale_items?.map(item => 
      `• ${item.product_name} (${item.quantity}): ${currencySymbol}${Number(item.subtotal).toLocaleString()}`
    ).join("\n") || "";
    
    const message = `*${businessName}*\n\n` +
      `🧾 *Ticket de Venta ${sale.sale_number}*\n` +
      `📅 ${format(parseISO(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}\n\n` +
      (itemsList ? `*Productos:*\n${itemsList}\n\n` : "") +
      `*Total: ${currencySymbol}${Number(sale.total).toLocaleString()}*\n\n` +
      `Pago: ${paymentMethodLabels[sale.payment_method]}\n\n` +
      `¡Gracias por su compra!`;
    
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = phone ? phone.replace(/\D/g, "") : "";
    
    if (phoneNumber) {
      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
    } else {
      navigator.clipboard.writeText(message);
      toast({
        title: "Mensaje copiado",
        description: "El mensaje ha sido copiado al portapapeles.",
      });
    }
  };

  const getPdfData = (sale: Sale) => ({
    sale_number: sale.sale_number,
    created_at: sale.created_at,
    customer_name: sale.customer_name || sale.customer?.name,
    customer_phone: sale.customer?.phone,
    items: sale.sale_items?.map(item => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })) || [],
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    notes: sale.notes,
    payment_method: sale.payment_method,
  });

  const getPrintData = (sale: Sale) => ({
    type: "sale" as const,
    number: sale.sale_number,
    date: sale.created_at,
    customer_name: sale.customer_name || sale.customer?.name,
    customer_phone: sale.customer?.phone,
    items: sale.sale_items?.map(item => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })) || [],
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    notes: sale.notes,
    payment_method: sale.payment_method,
  });

  const getDetailData = (sale: Sale) => ({
    type: "sale" as const,
    number: sale.sale_number,
    date: sale.created_at,
    customer_name: sale.customer_name || sale.customer?.name,
    customer_phone: sale.customer?.phone,
    customer_email: sale.customer?.email,
    customer_address: sale.customer?.address,
    items: sale.sale_items?.map(item => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })) || [],
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    notes: sale.notes,
    payment_method: sale.payment_method,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background -mx-5 lg:-mx-6 px-5 lg:px-6 pb-4">
        <PageHeader
          title="Ventas"
          subtitle={`${sales?.length || 0} ventas registradas`}
          action={
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]" onClick={() => setFormDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          }
          mobileAction={
            <button
              type="button"
              aria-label="Nueva venta"
              onClick={() => setFormDialogOpen(true)}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          }
        />
        <UnifiedSearchInput
          placeholder="Buscar por folio o cliente..."
          value={searchQuery}
          onChange={setSearchQuery}
          onFocus={() => { searchFocusedRef.current = true; }}
          onBlur={() => { searchFocusedRef.current = false; }}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain pb-24 md:pb-6">
      <div ref={statsRef}>
        <StatsLayout
          mainStat={{
            title: "Ventas Hoy",
            value: `${currencySymbol}${todayTotal.toLocaleString()}`,
            icon: DollarSign,
            className: "bg-secondary/5",
            iconClassName: "bg-secondary text-secondary-foreground",
          }}
          secondaryStats={[
            {
              title: "Ventas del Mes",
              value: `${currencySymbol}${monthTotal.toLocaleString()}`,
              icon: TrendingUp,
              className: "bg-success/5",
              iconClassName: "bg-success text-success-foreground",
            },
            {
              title: "Transacciones",
              value: sales?.length || 0,
              icon: ShoppingCart,
              className: "bg-primary/5",
              iconClassName: "bg-primary text-primary-foreground",
            }
          ]}
        />
      </div>

      {/* Sales List */}
      <div className="space-y-4 mt-6">
        {filteredSales.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No hay ventas</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron resultados" : "Registra tu primera venta"}
            </p>
          </div>
        ) : (
          filteredSales.map((sale, index) => (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.08 }}
              className="card-elevated overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => handleViewDetail(sale)}
            >
              <div className="p-4">
                {/* Header: folio + total */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-secondary-light flex-shrink-0">
                      <ShoppingCart className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-mono text-sm text-primary font-semibold leading-tight">{sale.sale_number}</p>
                      <Badge className={cn("text-xs mt-1", paymentMethodColors[sale.payment_method])}>
                        {paymentMethodLabels[sale.payment_method]}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">Total</p>
                    <p className="text-xl font-bold text-success">{currencySymbol}{Number(sale.total).toLocaleString()}</p>
                    {sale.discount && Number(sale.discount) > 0 && (
                      <p className="text-[11px] text-destructive">-{currencySymbol}{Number(sale.discount).toLocaleString()} desc.</p>
                    )}
                  </div>
                </div>

                {/* Cliente + fecha */}
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground font-medium">
                      {sale.customer_name || sale.customer?.name || "Cliente mostrador"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    {format(parseISO(sale.created_at), "dd MMM · HH:mm", { locale: es })}
                  </span>
                </div>

                {/* Items */}
                {sale.sale_items && sale.sale_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1.5">
                    {sale.sale_items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate pr-2">
                          <span className="text-foreground font-medium">{item.quantity}×</span> {item.product_name}
                        </span>
                        <span className="font-medium flex-shrink-0">{currencySymbol}{Number(item.subtotal).toLocaleString()}</span>
                      </div>
                    ))}
                    {sale.sale_items.length > 2 && (
                      <p className="text-xs text-muted-foreground pt-0.5">
                        +{sale.sale_items.length - 2} producto{sale.sale_items.length - 2 > 1 ? "s" : ""} más
                      </p>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          ))
        )}
      </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la venta {selectedSale?.sale_number}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <SaleFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
      />

      {/* Detail Dialog */}
      <DetailViewDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        data={viewingSale ? getDetailData(viewingSale) : null}
        onPrint={() => viewingSale && handlePrint(viewingSale)}
        onPreview={() => viewingSale && handlePreview(viewingSale)}
        onShare={() => viewingSale && handleShare(viewingSale)}
        onDelete={isAdmin ? () => viewingSale && handleDelete(viewingSale) : undefined}
      />

      {/* PDF Preview Dialog */}
      <SalePrintPreview
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        sale={pdfPreviewSale ? getPdfData(pdfPreviewSale) : null}
      />
    </div>
  );
}
