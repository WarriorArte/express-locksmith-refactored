import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsLayout } from "@/components/ui/stats-layout";
import { motion } from "framer-motion";
import gsap from "gsap";
import { 
  ShieldCheck, 
  Calendar,
  User,
  MoreVertical,
  Eye,
  Printer,
  Filter,
  Loader2,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useWarranties, useVoidWarranty, type Warranty } from "@/hooks/useWarranties";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isPast, isFuture, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { WarrantyPrintTicket } from "@/components/warranties/WarrantyPrintTicket";
import { WarrantySettingsDialog } from "@/components/warranties/WarrantySettingsDialog";
import { useWarrantyPrint } from "@/hooks/useWarrantyPrint";
import { WarrantyDetailDialog } from "@/components/warranties/WarrantyDetailDialog";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";

const getWarrantyStatus = (warranty: Warranty) => {
  if (warranty.is_voided) {
    return { label: "Anulada", color: "bg-destructive text-destructive-foreground", icon: XCircle };
  }
  const endDate = parseISO(warranty.end_date);
  if (isPast(endDate)) {
    return { label: "Vencida", color: "bg-muted text-muted-foreground", icon: AlertCircle };
  }
  const daysLeft = differenceInDays(endDate, new Date());
  if (daysLeft <= 7) {
    return { label: "Por Vencer", color: "bg-warning text-warning-foreground", icon: Clock };
  }
  return { label: "Vigente", color: "bg-success text-success-foreground", icon: CheckCircle };
};

export default function Garantias() {
  const [searchQuery, setSearchQuery] = useState("");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewWarranty, setPreviewWarranty] = useState<Warranty | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingWarranty, setViewingWarranty] = useState<Warranty | null>(null);
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: warranties, isLoading } = useWarranties();
  const voidWarranty = useVoidWarranty();
  const { printWarranty } = useWarrantyPrint();
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

  const filteredWarranties = warranties?.filter((warranty) =>
    warranty.warranty_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warranty.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warranty.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warranty.service_description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stats = {
    active: warranties?.filter(w => !w.is_voided && isFuture(parseISO(w.end_date))).length || 0,
    expiringSoon: warranties?.filter(w => !w.is_voided && isFuture(parseISO(w.end_date)) && differenceInDays(parseISO(w.end_date), new Date()) <= 7).length || 0,
    expired: warranties?.filter(w => !w.is_voided && isPast(parseISO(w.end_date))).length || 0,
    voided: warranties?.filter(w => w.is_voided).length || 0,
  };

  const handleVoid = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setVoidReason("");
    setVoidDialogOpen(true);
  };

  const confirmVoid = async () => {
    if (selectedWarranty && voidReason.trim()) {
      await voidWarranty.mutateAsync({ id: selectedWarranty.id, reason: voidReason });
      setVoidDialogOpen(false);
      setSelectedWarranty(null);
      setVoidReason("");
    } else {
      toast({
        title: "Error",
        description: "Debes especificar una razón para anular la garantía.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (warranty: Warranty) => {
    printWarranty(warranty);
  };

  const handlePreview = (warranty: Warranty) => {
    setPreviewWarranty(warranty);
    setPreviewDialogOpen(true);
  };

  const handleViewDetail = (warranty: Warranty) => {
    setViewingWarranty(warranty);
    setDetailDialogOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background -mx-5 lg:-mx-6 px-5 lg:px-6 pb-4">
        <PageHeader
          title="Garantías"
          subtitle={`${warranties?.length || 0} garantías registradas`}
          action={
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]" onClick={() => setSettingsDialogOpen(true)}>
              <Clock className="w-4 h-4 mr-1" />
              DuraciÃ³n
            </Button>
          }
          mobileAction={
            <button
              type="button"
              aria-label="Ajustar duraciÃ³n"
              onClick={() => setSettingsDialogOpen(true)}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform"
            >
              <Clock className="w-5 h-5" strokeWidth={2.5} />
            </button>
          }
        />
        <UnifiedSearchInput
          placeholder="Buscar por código, cliente o producto..."
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
            title: "Vigentes",
            value: stats.active,
            icon: CheckCircle,
            className: "bg-success/5",
            iconClassName: "bg-success text-success-foreground",
          }}
          secondaryStats={[
            {
              title: "Por Vencer",
              value: stats.expiringSoon,
              icon: Clock,
              className: "bg-warning/5",
              iconClassName: "bg-warning text-warning-foreground",
            },
            {
              title: "Vencidas",
              value: stats.expired,
              icon: AlertCircle,
              className: "bg-muted",
              iconClassName: "bg-muted-foreground/20 text-muted-foreground",
            },
            {
              title: "Anuladas",
              value: stats.voided,
              icon: XCircle,
              className: "bg-destructive/5",
              iconClassName: "bg-destructive text-destructive-foreground",
            }
          ]}
        />
      </div>

      {/* Warranties List */}
      <div className="space-y-4 mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredWarranties.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No hay garantías</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron resultados" : "Las garantías aparecerán aquí cuando las actives en ventas o servicios"}
            </p>
          </div>
        ) : (
          filteredWarranties.map((warranty, index) => {
            const status = getWarrantyStatus(warranty);
            const StatusIcon = status.icon;
            const daysLeft = differenceInDays(parseISO(warranty.end_date), new Date());
            const isActive = !warranty.is_voided && isFuture(parseISO(warranty.end_date));

            return (
              <motion.div
                key={warranty.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.08 }}
                className="card-elevated overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => handleViewDetail(warranty)}
              >
                <div className="p-4">
                  {/* Header: código + badges | días restantes + menú */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-primary-light flex-shrink-0">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-primary font-semibold leading-tight">{warranty.warranty_code}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge className={cn("text-xs", status.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {warranty.warranty_type === "sale" ? "Venta" : "Servicio"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1 flex-shrink-0">
                      <div className="text-right">
                        {isActive ? (
                          <>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">Restantes</p>
                            <p className={cn("text-xl font-bold", daysLeft <= 7 ? "text-warning" : "text-success")}>
                              {daysLeft}d
                            </p>
                          </>
                        ) : (
                          <p className="text-base font-bold text-muted-foreground mt-1">
                            {warranty.is_voided ? "Anulada" : "Vencida"}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">{warranty.warranty_days}d garantía</p>
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="hidden md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(warranty)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(warranty)}>
                              <Printer className="w-4 h-4 mr-2" /> Imprimir Ticket
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(warranty)}>
                              <Eye className="w-4 h-4 mr-2" /> Vista previa
                            </DropdownMenuItem>
                            {!warranty.is_voided && isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleVoid(warranty)}>
                                  <XCircle className="w-4 h-4 mr-2" /> Anular Garantía
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Producto/servicio */}
                  <p className="text-sm font-medium text-foreground truncate mb-2">
                    {warranty.warranty_type === "sale" ? warranty.product_name : warranty.service_description}
                  </p>

                  {/* Cliente + fechas */}
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-foreground font-medium">
                        {warranty.customer_name || "Sin cliente"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(warranty.start_date), "dd MMM", { locale: es })} → {format(parseISO(warranty.end_date), "dd MMM yy", { locale: es })}
                    </span>
                  </div>

                  {/* Referencia o razón de anulación */}
                  {(warranty.is_voided || warranty.warranty_type === "sale" && warranty.sale?.sale_number || warranty.warranty_type === "service" && warranty.service?.service_number) && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {warranty.is_voided && warranty.voided_reason && (
                        <span className="text-destructive">Anulada: {warranty.voided_reason}</span>
                      )}
                      {!warranty.is_voided && warranty.warranty_type === "sale" && warranty.sale?.sale_number && (
                        <span>Ref. venta: {warranty.sale.sale_number}</span>
                      )}
                      {!warranty.is_voided && warranty.warranty_type === "service" && warranty.service?.service_number && (
                        <span>Ref. servicio: {warranty.service.service_number}</span>
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

      {/* Void Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular garantía?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la garantía {selectedWarranty?.warranty_code} como anulada. Por favor, especifica la razón.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="voidReason">Razón de anulación</Label>
            <Textarea
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Ej: Producto devuelto, garantía transferida..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmVoid} 
              className="bg-destructive text-destructive-foreground"
              disabled={!voidReason.trim()}
            >
              Anular Garantía
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Preview Dialog */}
      <WarrantyPrintTicket
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        warranty={previewWarranty}
      />

      {/* Settings Dialog */}
      <WarrantySettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      {/* Detail Dialog */}
      <WarrantyDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        warranty={viewingWarranty}
        onPrint={() => viewingWarranty && handlePrint(viewingWarranty)}
        onPreview={() => viewingWarranty && handlePreview(viewingWarranty)}
        onVoid={isAdmin && viewingWarranty && !viewingWarranty.is_voided
          ? () => { setDetailDialogOpen(false); handleVoid(viewingWarranty); }
          : undefined}
      />
    </div>
  );
}
