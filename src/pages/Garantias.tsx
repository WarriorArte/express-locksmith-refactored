import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsLayout } from "@/components/ui/stats-layout";
import { m as motion } from "framer-motion";
import gsap from "gsap";
import { 
  ShieldCheck, 
  Calendar,
  User,
  MoreVertical,
  Eye,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useWarranties, useVoidWarranty, type Warranty } from "@/hooks/useWarranties";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isPast, isFuture, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { WarrantySettingsDialog } from "@/components/warranties/WarrantySettingsDialog";
import { WarrantyDetailDialog } from "@/components/warranties/WarrantyDetailDialog";
import { TicketDialog, type TicketData } from "@/components/shared/TicketDialog";
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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingWarranty, setViewingWarranty] = useState<Warranty | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: warranties, isLoading } = useWarranties();
  const voidWarranty = useVoidWarranty();
  
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


  const handleViewDetail = (warranty: Warranty) => {
    setViewingWarranty(warranty);
    setDetailDialogOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-2 pb-4">
        <PageHeader
          title="Garantías"
          subtitle={`${warranties?.length || 0} garantías registradas`}
          action={
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]" onClick={() => setSettingsDialogOpen(true)}>
              <Clock className="w-4 h-4 mr-1" />
              Duración
            </Button>
          }
          mobileAction={
            <button
              type="button"
              aria-label="Ajustar duración"
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

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
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
      <div className="mt-6">
        {isLoading ? (
          <>
            <div className="md:hidden space-y-3 animate-pulse">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="card-elevated p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="h-3 w-28 rounded bg-muted/60" />
                      <div className="flex gap-1.5">
                        <div className="h-5 w-16 rounded-full bg-muted/60" />
                        <div className="h-5 w-14 rounded-full bg-muted/60" />
                      </div>
                    </div>
                    <div className="h-6 w-12 rounded bg-muted/60 shrink-0" />
                  </div>
                  <div className="h-3 w-1/2 rounded bg-muted/60" />
                  <div className="h-3 w-3/4 rounded bg-muted/60" />
                </div>
              ))}
            </div>
            <div className="hidden md:block card-elevated overflow-hidden animate-pulse">
              <div className="h-10 bg-muted/30 border-b border-border" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
                  <div className="w-24 h-3 rounded bg-muted/60" />
                  <div className="w-20 h-5 rounded-full bg-muted/60" />
                  <div className="w-16 h-5 rounded-full bg-muted/60" />
                  <div className="flex-1 h-3 rounded bg-muted/60 max-w-[160px]" />
                  <div className="w-12 h-3 rounded bg-muted/60" />
                  <div className="w-28 h-3 rounded bg-muted/60" />
                  <div className="w-8 h-8 rounded bg-muted/60 shrink-0 ml-auto" />
                </div>
              ))}
            </div>
          </>
        ) : filteredWarranties.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? "Sin resultados" : "Sin garantías registradas"}
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              {searchQuery
                ? "Intenta con otro código, cliente o producto."
                : "Las garantías aparecen aquí cuando las activas al crear ventas o servicios."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card-elevated overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Código</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Días rest.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Vigencia</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredWarranties.map((warranty) => {
                    const status = getWarrantyStatus(warranty);
                    const StatusIcon = status.icon;
                    const daysLeft = differenceInDays(parseISO(warranty.end_date), new Date());
                    const isActive = !warranty.is_voided && isFuture(parseISO(warranty.end_date));
                    return (
                      <tr
                        key={warranty.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(warranty)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-foreground dark:text-primary font-semibold whitespace-nowrap">{warranty.warranty_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs whitespace-nowrap", status.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {warranty.warranty_type === "sale" ? "Venta" : "Servicio"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <span className="text-sm text-foreground truncate block">{warranty.customer_name || "Sin cliente"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <span className={cn("text-sm font-bold whitespace-nowrap", daysLeft <= 7 ? "text-warning" : "text-foreground dark:text-success")}>
                              {daysLeft}d
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(parseISO(warranty.start_date), "dd MMM", { locale: es })} → {format(parseISO(warranty.end_date), "dd MMM yy", { locale: es })}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(warranty)}>
                                <Eye className="w-4 h-4 mr-2" /> Ver detalle
                              </DropdownMenuItem>
                              {!warranty.is_voided && isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleVoid(warranty)}>
                                    <XCircle className="w-4 h-4 mr-2" /> Anular garantía
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
            <div className="md:hidden space-y-3">
              {filteredWarranties.map((warranty) => {
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
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-primary-light flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono text-sm text-foreground dark:text-primary font-semibold leading-tight">{warranty.warranty_code}</p>
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
                        <div className="text-right flex-shrink-0">
                          {isActive ? (
                            <>
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">Restantes</p>
                              <p className={cn("text-xl font-bold", daysLeft <= 7 ? "text-warning" : "text-foreground dark:text-success")}>
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
                      </div>

                      <p className="text-sm font-medium text-foreground truncate mb-2">
                        {warranty.warranty_type === "sale" ? warranty.product_name : warranty.service_description}
                      </p>

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

                      {(warranty.is_voided || (warranty.warranty_type === "sale" && warranty.sale?.sale_number) || (warranty.warranty_type === "service" && warranty.service?.service_number)) && (
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
              })}
            </div>
          </>
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
        onVoid={isAdmin && viewingWarranty && !viewingWarranty.is_voided
          ? () => { setDetailDialogOpen(false); handleVoid(viewingWarranty); }
          : undefined}
        onPrint={viewingWarranty ? () => {
          if (!viewingWarranty) return;
          setTicketData({
            kind: "warranty",
            number: viewingWarranty.warranty_code,
            date: viewingWarranty.created_at,
            customer_name: viewingWarranty.customer_name,
            customer_phone: viewingWarranty.customer?.phone,
            customer_email: viewingWarranty.customer?.email,
            warranty_type: viewingWarranty.warranty_type,
            warranty_days: viewingWarranty.warranty_days,
            start_date: viewingWarranty.start_date,
            end_date: viewingWarranty.end_date,
            product_name: viewingWarranty.product_name,
            service_description: viewingWarranty.service_description,
            reference_number: viewingWarranty.sale?.sale_number || viewingWarranty.service?.service_number || null,
            notes: viewingWarranty.notes,
          });
          setDetailDialogOpen(false);
          setTicketOpen(true);
        } : undefined}
      />

      <TicketDialog open={ticketOpen} onOpenChange={setTicketOpen} data={ticketData} />
    </div>
  );
}
