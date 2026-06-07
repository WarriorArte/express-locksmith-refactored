import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { m as motion } from "framer-motion";
import {
  Plus,
  FileText,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Eye,
} from "lucide-react";
import { QuotePrintDialog } from "@/components/quotes/QuotePrintDialog";
import { MobileListCard, MobileListCardSkeleton } from "@/components/shared/MobileListCard";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { ConvertQuoteDialog } from "@/components/quotes/ConvertQuoteDialog";
import { DetailViewDialog } from "@/components/shared/DetailViewDialog";
import type { DialogAction } from "@/components/shared/DialogActionBar";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";
import { Button } from "@/components/ui/button";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
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
import { useQuotes, useDeleteQuote, useUpdateQuote, useDuplicateQuote, type Quote } from "@/hooks/useQuotes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-warning text-warning-foreground", icon: Clock },
  accepted: { label: "Aceptada", color: "bg-success text-success-foreground", icon: CheckCircle },
  rejected: { label: "Rechazada", color: "bg-destructive text-destructive-foreground", icon: XCircle },
  converted: { label: "Convertida", color: "bg-primary text-primary-foreground", icon: ArrowRight },
  expired: { label: "Vencida", color: "bg-muted text-muted-foreground", icon: Calendar },
};

export default function Cotizaciones() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printingQuote, setPrintingQuote] = useState<Quote | null>(null);
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const { data: quotes, isLoading } = useQuotes();
  const deleteQuote = useDeleteQuote();
  const updateQuote = useUpdateQuote();
  const duplicateQuote = useDuplicateQuote();
  

  const filteredQuotes = quotes?.filter((quote) =>
    quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stats = {
    total: quotes?.length || 0,
    pending: quotes?.filter(q => q.status === "pending").length || 0,
    accepted: quotes?.filter(q => q.status === "accepted" || q.status === "converted").length || 0,
  };

  const getDaysLeft = (validUntil: string | null) => {
    if (!validUntil) return 0;
    const days = differenceInDays(parseISO(validUntil), new Date());
    return Math.max(0, days);
  };

  const handleDelete = (quote: Quote) => {
    setSelectedQuote(quote);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedQuote) {
      await deleteQuote.mutateAsync(selectedQuote.id);
      setDeleteDialogOpen(false);
      setSelectedQuote(null);
    }
  };

  const handleStatusChange = async (quote: Quote, newStatus: "accepted" | "rejected") => {
    await updateQuote.mutateAsync({
      id: quote.id,
      status: newStatus,
    });
  };

  const handleViewDetail = (quote: Quote) => {
    setViewingQuote(quote);
    setDetailDialogOpen(true);
  };

  const handleDuplicate = async (quote: Quote) => {
    await duplicateQuote.mutateAsync(quote);
  };

  const getDetailData = (quote: Quote) => ({
    type: "quote" as const,
    number: quote.quote_number,
    date: quote.created_at,
    customer_name: quote.customer_name || quote.customer?.name,
    customer_phone: quote.customer_phone || quote.customer?.phone,
    customer_email: quote.customer_email || quote.customer?.email,
    customer_address: quote.customer_address || quote.customer?.address,
    items: quote.quote_items?.map(item => ({
      id: item.id,
      product_name: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })) || [],
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
    notes: quote.notes,
    valid_until: quote.valid_until,
    policies: quote.policies,
    status: quote.status,
    description: quote.description,
    location: quote.location,
  });

  const detailActions: DialogAction[] = viewingQuote
    ? [
        {
          icon: Edit,
          label: "Editar",
          onClick: () => {
            setDetailDialogOpen(false);
            setEditingQuote(viewingQuote);
            setFormDialogOpen(true);
          },
        },
        {
          icon: Printer,
          label: "PDF",
          tooltip: "Imprimir / PDF",
          onClick: () => {
            setDetailDialogOpen(false);
            setPrintingQuote(viewingQuote);
            setPrintDialogOpen(true);
          },
        },
        { icon: Copy, label: "Duplicar", onClick: () => handleDuplicate(viewingQuote) },
        ...(isAdmin
          ? [{ icon: Trash2, label: "Eliminar", onClick: () => handleDelete(viewingQuote), tone: "destructive" as const }]
          : []),
      ]
    : [];

  const detailMenuActions: DialogAction[] =
    viewingQuote?.status === "pending"
      ? [
          {
            icon: CheckCircle,
            label: "Marcar aceptada",
            onClick: () => handleStatusChange(viewingQuote, "accepted"),
            tone: "primary",
          },
          {
            icon: XCircle,
            label: "Marcar rechazada",
            onClick: () => handleStatusChange(viewingQuote, "rejected"),
            tone: "destructive",
          },
          {
            icon: ArrowRight,
            label: "Convertir a venta",
            onClick: () => {
              setDetailDialogOpen(false);
              setConvertingQuote(viewingQuote);
              setConvertDialogOpen(true);
            },
            tone: "primary",
          },
        ]
      : [];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
        <PageHeader
          eyebrow="Cotizaciones"
          title={<>Presupuestos al <span className="text-primary">instante.</span></>}
          subtitle={`${stats.pending} pendientes · ${stats.accepted} aceptadas este mes`}
          action={
            <Button className="h-11 rounded-[12px] bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => { setEditingQuote(null); setFormDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          }
        >
        <div className="flex items-center gap-2">
          <UnifiedSearchInput
            className="flex-1"
            placeholder="Buscar por folio, cliente o descripción..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <button
            type="button"
            aria-label="Nueva cotización"
            onClick={() => { setEditingQuote(null); setFormDialogOpen(true); }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.40)] transition-transform active:scale-95 lg:hidden"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Quotes List */}
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
                  <div className="w-24 h-3 rounded bg-muted/60" />
                  <div className="w-20 h-5 rounded-full bg-muted/60" />
                  <div className="flex-1 h-3 rounded bg-muted/60 max-w-[160px]" />
                  <div className="w-36 h-3 rounded bg-muted/60" />
                  <div className="w-20 h-3 rounded bg-muted/60" />
                  <div className="w-14 h-3 rounded bg-muted/60 ml-auto" />
                  <div className="w-8 h-8 rounded bg-muted/60 shrink-0" />
                </div>
              ))}
            </div>
          </>
        ) : filteredQuotes.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? "Sin resultados" : "Sin cotizaciones registradas"}
            </h3>
            <p className="text-muted-foreground mb-5 max-w-xs mx-auto">
              {searchQuery
                ? "Intenta con otro folio, cliente o descripción."
                : "Crea una cotización para compartirla con tus clientes."}
            </p>
            {!searchQuery && (
              <Button onClick={() => { setEditingQuote(null); setFormDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva cotización
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
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descripción</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Vence</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredQuotes.map((quote) => {
                    const status = statusConfig[quote.status as keyof typeof statusConfig];
                    const StatusIcon = status.icon;
                    const daysLeft = getDaysLeft(quote.valid_until);
                    return (
                      <tr
                        key={quote.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(quote)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-foreground dark:text-primary font-semibold whitespace-nowrap">{quote.quote_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn("text-xs whitespace-nowrap", status.color)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                            {quote.status === "pending" && daysLeft <= 3 && daysLeft > 0 && (
                              <Badge className="bg-destructive-light text-destructive text-xs whitespace-nowrap">
                                {daysLeft}d
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[140px]">
                          <span className="text-sm text-foreground truncate block">{quote.customer_name || quote.customer?.name || "Sin cliente"}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-sm text-muted-foreground truncate block">{quote.description || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {quote.valid_until ? format(parseISO(quote.valid_until), "dd MMM yy", { locale: es }) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-foreground whitespace-nowrap">{currencySymbol}{quote.total.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(quote)}>
                                <Eye className="w-4 h-4 mr-2" /> Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
                                <Copy className="w-4 h-4 mr-2" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingQuote(quote); setFormDialogOpen(true); }}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setPrintingQuote(quote); setPrintDialogOpen(true); }}>
                                <Printer className="w-4 h-4 mr-2" /> PDF
                              </DropdownMenuItem>
                              {quote.status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-foreground dark:text-success" onClick={() => handleStatusChange(quote, "accepted")}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Marcar aceptada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(quote, "rejected")}>
                                    <XCircle className="w-4 h-4 mr-2" /> Marcar rechazada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-foreground dark:text-primary" onClick={() => { setConvertingQuote(quote); setConvertDialogOpen(true); }}>
                                    <ArrowRight className="w-4 h-4 mr-2" /> Convertir
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(quote)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5">
              {filteredQuotes.map((quote) => {
                const daysLeft = getDaysLeft(quote.valid_until);
                const statusTextClass =
                  quote.status === "accepted" ? "text-success" :
                  quote.status === "rejected" ? "text-destructive" :
                  quote.status === "converted" ? "text-primary" :
                  quote.status === "expired" ? "text-muted-foreground" : "text-warning";
                const statusDotClass =
                  quote.status === "accepted" ? "bg-success" :
                  quote.status === "rejected" ? "bg-destructive/70" :
                  quote.status === "converted" ? "bg-primary" :
                  quote.status === "expired" ? "bg-muted-foreground/50" : "bg-warning";
                const quoteTitle = quote.description || quote.customer_name || quote.customer?.name || quote.quote_number;
                return (
                  <MobileListCard
                    key={quote.id}
                    onClick={() => handleViewDetail(quote)}
                    code={quote.quote_number}
                    statusLabel={statusConfig[quote.status as keyof typeof statusConfig].label}
                    statusTextClass={statusTextClass}
                    statusDotClass={statusDotClass}
                    statusExtra={
                      quote.status === "pending" && daysLeft <= 3 && daysLeft > 0
                        ? <span className="ml-1 text-[10px] font-bold text-destructive">· {daysLeft}d</span>
                        : undefined
                    }
                    title={quoteTitle}
                    subtitle={quote.customer_name || quote.customer?.name || "Sin cliente"}
                    valueText={`${currencySymbol}${quote.total.toLocaleString()}`}
                    valueClass="text-foreground"
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
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cotización {selectedQuote?.quote_number}.
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
      <QuoteFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        quote={editingQuote}
      />

      {/* Convert Dialog */}
      <ConvertQuoteDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        quote={convertingQuote}
      />

      {/* Detail Dialog */}
      <DetailViewDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        data={viewingQuote ? getDetailData(viewingQuote) : null}
        actions={detailActions}
        overflowActions={detailMenuActions}
      />

      <QuotePrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        quote={printingQuote}
      />


    </div>
  );
}
