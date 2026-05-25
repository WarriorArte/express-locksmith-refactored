import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsLayout } from "@/components/ui/stats-layout";
import { m as motion } from "framer-motion";
import gsap from "gsap";
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
  Loader2,
} from "lucide-react";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { ConvertQuoteDialog } from "@/components/quotes/ConvertQuoteDialog";
import { DetailViewDialog } from "@/components/shared/DetailViewDialog";
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
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const { data: quotes, isLoading } = useQuotes();
  const deleteQuote = useDeleteQuote();
  const updateQuote = useUpdateQuote();
  const duplicateQuote = useDuplicateQuote();
  
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

  const handlePrint = (quote: Quote) => {
    printQuote(quote);
  };

  const handleViewDetail = (quote: Quote) => {
    setViewingQuote(quote);
    setDetailDialogOpen(true);
  };

  const handleDuplicate = async (quote: Quote) => {
    await duplicateQuote.mutateAsync(quote);
  };

  const handleGeneratePDF = (quote: Quote) => {
    setPdfPreviewQuote(quote);
    setPdfPreviewOpen(true);
  };

  const getPrintData = (quote: Quote) => ({
    type: "quote" as const,
    number: quote.quote_number,
    date: quote.created_at,
    customer_name: quote.customer_name || quote.customer?.name,
    customer_phone: quote.customer_phone || quote.customer?.phone,
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
  });

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
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-2 pb-4">
        <PageHeader
          title="Cotizaciones"
          subtitle={`${stats.pending} pendientes · ${stats.accepted} aceptadas este mes`}
          action={
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]" onClick={() => { setEditingQuote(null); setFormDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          }
          mobileAction={
            <button
              type="button"
              aria-label="Nueva cotizaciÃ³n"
              onClick={() => { setEditingQuote(null); setFormDialogOpen(true); }}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          }
        />
        <UnifiedSearchInput
          placeholder="Buscar por folio, cliente o descripción..."
          value={searchQuery}
          onChange={setSearchQuery}
          onFocus={() => { searchFocusedRef.current = true; }}
          onBlur={() => { searchFocusedRef.current = false; }}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      <div ref={statsRef}>
        <StatsLayout
          mainStat={{
            title: "Total del Mes",
            value: stats.total,
            icon: FileText,
            className: "bg-primary/5",
            iconClassName: "bg-primary text-primary-foreground",
          }}
          secondaryStats={[
            {
              title: "Pendientes",
              value: stats.pending,
              icon: Clock,
              className: "bg-warning/5",
              iconClassName: "bg-warning text-warning-foreground",
            },
            {
              title: "Aceptadas",
              value: stats.accepted,
              icon: CheckCircle,
              className: "bg-success/5",
              iconClassName: "bg-success text-success-foreground",
            }
          ]}
        />
      </div>

      {/* Quotes List */}
      <div className="space-y-4 mt-6">
        {filteredQuotes.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No hay cotizaciones</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron resultados" : "Crea tu primera cotización"}
            </p>
          </div>
        ) : (
          filteredQuotes.map((quote, index) => {
            const status = statusConfig[quote.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            const daysLeft = getDaysLeft(quote.valid_until);

            return (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.08 }}
                className="card-elevated overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => handleViewDetail(quote)}
              >
                <div className="p-4">
                  {/* Header: folio + badges | total + menú */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-info-light flex-shrink-0">
                        <FileText className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-foreground dark:text-primary font-semibold leading-tight">{quote.quote_number}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge className={cn("text-xs", status.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          {quote.status === "pending" && daysLeft <= 3 && daysLeft > 0 && (
                            <Badge className="bg-destructive-light text-destructive text-xs">
                              Vence en {daysLeft}d
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">Total</p>
                        <p className="text-xl font-bold text-foreground">{currencySymbol}{quote.total.toLocaleString()}</p>
                        {quote.valid_until && (
                          <p className="text-[11px] text-muted-foreground">
                            hasta {format(parseISO(quote.valid_until), "dd MMM", { locale: es })}
                          </p>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="hidden md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrint(quote)}>
                              <Printer className="w-4 h-4 mr-2" /> Imprimir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGeneratePDF(quote)}>
                              <Eye className="w-4 h-4 mr-2" /> Vista previa / PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
                              <Copy className="w-4 h-4 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingQuote(quote); setFormDialogOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
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
                      </div>
                    </div>
                  </div>

                  {/* Descripción + meta */}
                  {quote.description && (
                    <p className="text-sm font-medium text-foreground truncate mb-2">{quote.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-foreground font-medium">
                        {quote.customer_name || quote.customer?.name || "Sin cliente"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(quote.created_at), "dd MMM · HH:mm", { locale: es })}
                    </span>
                  </div>

                  {/* Items preview */}
                  {quote.quote_items && quote.quote_items.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1.5">
                      {quote.quote_items.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate pr-2">
                            <span className="text-foreground font-medium">{item.quantity}×</span> {item.description}
                          </span>
                          <span className="font-medium flex-shrink-0">{currencySymbol}{Number(item.subtotal).toLocaleString()}</span>
                        </div>
                      ))}
                      {quote.quote_items.length > 2 && (
                        <p className="text-xs text-muted-foreground pt-0.5">
                          +{quote.quote_items.length - 2} producto{quote.quote_items.length - 2 > 1 ? "s" : ""} más
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </motion.div>
            );
          })
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
        onEdit={() => {
          setDetailDialogOpen(false);
          setEditingQuote(viewingQuote);
          setFormDialogOpen(true);
        }}
        onPrint={() => viewingQuote && handlePrint(viewingQuote)}
        overflowActions={[
          { icon: Eye, label: "PDF", onClick: () => { viewingQuote && handleGeneratePDF(viewingQuote); } },
          { icon: Copy, label: "Duplicar", onClick: () => { viewingQuote && handleDuplicate(viewingQuote); } },
          ...(viewingQuote?.status === "pending" ? [
            { icon: CheckCircle, label: "Marcar aceptada", onClick: () => { viewingQuote && handleStatusChange(viewingQuote, "accepted"); }, className: "text-foreground dark:text-success", separator: true },
            { icon: XCircle, label: "Marcar rechazada", onClick: () => { viewingQuote && handleStatusChange(viewingQuote, "rejected"); }, className: "text-destructive" },
            { icon: ArrowRight, label: "Convertir a venta", onClick: () => { setDetailDialogOpen(false); setConvertingQuote(viewingQuote); setConvertDialogOpen(true); }, className: "text-foreground dark:text-primary" },
          ] : []),
        ]}
        onDelete={isAdmin ? () => { viewingQuote && handleDelete(viewingQuote); } : undefined}
      />

      {/* PDF Preview Dialog */}
      <QuotePrintPreview
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        quote={pdfPreviewQuote ? {
          quote_number: pdfPreviewQuote.quote_number,
          created_at: pdfPreviewQuote.created_at,
          valid_until: pdfPreviewQuote.valid_until,
          customer_name: pdfPreviewQuote.customer_name || pdfPreviewQuote.customer?.name,
          customer_phone: pdfPreviewQuote.customer_phone || pdfPreviewQuote.customer?.phone,
          customer_email: pdfPreviewQuote.customer_email || pdfPreviewQuote.customer?.email,
          customer_address: pdfPreviewQuote.customer_address || pdfPreviewQuote.customer?.address,
          description: pdfPreviewQuote.description,
          location: pdfPreviewQuote.location,
          items: pdfPreviewQuote.quote_items?.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          })) || [],
          subtotal: pdfPreviewQuote.subtotal,
          discount: pdfPreviewQuote.discount,
          total: pdfPreviewQuote.total,
          notes: pdfPreviewQuote.notes,
          policies: pdfPreviewQuote.policies,
        } : null}
      />
    </div>
  );
}
