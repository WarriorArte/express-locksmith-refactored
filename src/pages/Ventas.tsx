import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { m as motion } from "framer-motion";
import {
  Plus,
  ShoppingCart,
  Calendar,
  User,
  Printer,
  Trash2,
  Eye,
  MoreVertical,
} from "lucide-react";
import { MobileListCard, MobileListCardSkeleton } from "@/components/shared/MobileListCard";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";
import { DetailViewDialog } from "@/components/shared/DetailViewDialog";
import type { DialogAction } from "@/components/shared/DialogActionBar";
import { TicketDialog, type TicketData } from "@/components/shared/TicketDialog";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";
import {
  DateFilterButton,
  emptyDateFilter,
  hasDateFilterValue,
  isDateInDateFilter,
} from "@/components/shared/DateFilterButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format, parseISO, isToday, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

const paymentMethodColors: Record<PaymentMethod, string> = {
  cash: "bg-success-light text-foreground dark:text-success",
  card: "bg-info-light text-info",
  transfer: "bg-primary-light text-foreground dark:text-primary",
  credit: "bg-warning-light text-warning",
};

export default function Ventas() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(emptyDateFilter);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  
  const { isAdmin } = useAuth();
  const { data: sales, isLoading } = useSales();
  const { data: settings } = useBusinessSettings();
  const deleteSale = useDeleteSale();

  const currencySymbol = settings?.currency_symbol || "$";

  const filteredSales = sales?.filter((sale) => {
    const matchesSearch =
      sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = isDateInDateFilter(sale.created_at, dateFilter);

    return matchesSearch && matchesDate;
  }) || [];
  const hasActiveFilters =
    searchQuery.trim().length > 0 || hasDateFilterValue(dateFilter);

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

  const handleViewDetail = (sale: Sale) => {
    setViewingSale(sale);
    setDetailDialogOpen(true);
  };

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

  const openSaleTicket = (sale: Sale) => {
    setTicketData({
      kind: "sale",
      number: sale.sale_number,
      date: sale.created_at,
      customer_name: sale.customer_name || sale.customer?.name,
      customer_phone: sale.customer?.phone,
      customer_email: sale.customer?.email,
      items: (sale.sale_items || []).map(it => ({
        name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        subtotal: Number(it.subtotal),
      })),
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount || 0),
      total: Number(sale.total),
      payment_method: sale.payment_method,
      notes: sale.notes,
    });
    setDetailDialogOpen(false);
    setTicketOpen(true);
  };

  const detailActions: DialogAction[] = viewingSale
    ? [
        { icon: Printer, label: "Ticket", onClick: () => openSaleTicket(viewingSale) },
        ...(isAdmin
          ? [{ icon: Trash2, label: "Eliminar", onClick: () => handleDelete(viewingSale), tone: "destructive" as const }]
          : []),
      ]
    : [];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
        <PageHeader
          eyebrow="Ventas"
          title={<>Registro de <span className="text-primary">ventas.</span></>}
          subtitle={`${sales?.length || 0} ventas registradas`}
          action={
            <Button className="h-11 rounded-[12px] bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => setFormDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          }
        >
        <div className="flex items-center gap-2">
          <UnifiedSearchInput
            className="flex-1"
            placeholder="Buscar por folio o cliente..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <DateFilterButton
            value={dateFilter}
            onChange={setDateFilter}
            ariaLabel="Filtrar ventas por fecha"
          />
          <button
            type="button"
            aria-label="Nueva venta"
            onClick={() => setFormDialogOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.40)] transition-transform active:scale-95 lg:hidden"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Sales List */}
      <div className="mt-6">
        {isLoading ? (
          <>
            <div className="md:hidden space-y-2.5">
              {[0, 1, 2, 3].map((i) => <MobileListCardSkeleton key={i} />)}
            </div>
            <div className="hidden md:block card-elevated overflow-hidden animate-pulse">
              <div className="h-10 bg-muted/30 border-b border-border" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
                  <div className="w-20 h-3 rounded bg-muted/60" />
                  <div className="w-16 h-5 rounded-full bg-muted/60" />
                  <div className="flex-1 h-3 rounded bg-muted/60 max-w-[160px]" />
                  <div className="w-36 h-3 rounded bg-muted/60" />
                  <div className="w-24 h-3 rounded bg-muted/60" />
                  <div className="w-14 h-3 rounded bg-muted/60 ml-auto" />
                  <div className="w-8 h-8 rounded bg-muted/60 shrink-0" />
                </div>
              ))}
            </div>
          </>
        ) : filteredSales.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {hasActiveFilters ? "Sin resultados" : "Sin ventas registradas"}
            </h3>
            <p className="text-muted-foreground mb-5 max-w-xs mx-auto">
              {hasActiveFilters
                ? "Intenta con otro folio, cliente o fecha."
                : "Registra la primera venta para ver el historial aquí."}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => setFormDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva venta
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card-elevated overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Folio</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Pago</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Artículos</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(sale)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground dark:text-primary font-semibold whitespace-nowrap">{sale.sale_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-xs whitespace-nowrap", paymentMethodColors[sale.payment_method])}>
                          {paymentMethodLabels[sale.payment_method]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-sm text-foreground truncate block">{sale.customer_name || sale.customer?.name || "Cliente mostrador"}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {sale.sale_items && sale.sale_items.length > 0 ? (
                          <span className="text-sm text-muted-foreground truncate block">
                            {sale.sale_items[0].product_name}
                            {sale.sale_items.length > 1 && ` +${sale.sale_items.length - 1} más`}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(parseISO(sale.created_at), "dd MMM · HH:mm", { locale: es })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="text-sm font-bold text-foreground dark:text-success">{currencySymbol}{Number(sale.total).toLocaleString()}</p>
                        {sale.discount && Number(sale.discount) > 0 && (
                          <p className="text-[10px] text-destructive">-{currencySymbol}{Number(sale.discount).toLocaleString()} desc.</p>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(sale)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSaleTicket(sale)}>
                              <Printer className="w-4 h-4 mr-2" /> Ticket
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(sale)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5">
              {filteredSales.map((sale) => {
                const statusTextClass =
                  sale.payment_method === "cash" ? "text-success" :
                  sale.payment_method === "card" ? "text-info" :
                  sale.payment_method === "transfer" ? "text-primary" : "text-warning";
                const statusDotClass =
                  sale.payment_method === "cash" ? "bg-success" :
                  sale.payment_method === "card" ? "bg-info" :
                  sale.payment_method === "transfer" ? "bg-primary" : "bg-warning";
                const saleTitle = sale.sale_items && sale.sale_items.length > 0
                  ? sale.sale_items.length === 1
                    ? sale.sale_items[0].product_name
                    : `${sale.sale_items[0].product_name} +${sale.sale_items.length - 1} más`
                  : "Sin artículos";
                return (
                  <MobileListCard
                    key={sale.id}
                    onClick={() => handleViewDetail(sale)}
                    code={sale.sale_number}
                    statusLabel={paymentMethodLabels[sale.payment_method]}
                    statusTextClass={statusTextClass}
                    statusDotClass={statusDotClass}
                    title={saleTitle}
                    subtitle={sale.customer_name || sale.customer?.name || "Cliente mostrador"}
                    valueText={`${currencySymbol}${Number(sale.total).toLocaleString()}`}
                    valueClass="text-success"
                  />
                );
              })}
            </div>
          </>
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
        actions={detailActions}
      />

      <TicketDialog open={ticketOpen} onOpenChange={setTicketOpen} data={ticketData} />

    </div>
  );
}
