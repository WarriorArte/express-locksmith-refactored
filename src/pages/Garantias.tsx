import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { m as motion } from "framer-motion";
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
import { MobileListCard, MobileListCardSkeleton } from "@/components/shared/MobileListCard";
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
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
        <PageHeader
          eyebrow="Garantías"
          title={<>Control de <span className="text-primary">garantías.</span></>}
          subtitle={`${warranties?.length || 0} garantías registradas`}
          action={
            <Button className="h-11 rounded-[12px] bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => setSettingsDialogOpen(true)}>
              <Clock className="w-4 h-4 mr-1" />
              Duración
            </Button>
          }
        >
        <div className="flex items-center gap-2">
          <UnifiedSearchInput
            className="flex-1"
            placeholder="Buscar por código, cliente o producto..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <button
            type="button"
            aria-label="Ajustar duración"
            onClick={() => setSettingsDialogOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.40)] transition-transform active:scale-95 lg:hidden"
          >
            <Clock className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Warranties List */}
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
            <div className="md:hidden space-y-2.5">
              {filteredWarranties.map((warranty) => {
                const status = getWarrantyStatus(warranty);
                const daysLeft = differenceInDays(parseISO(warranty.end_date), new Date());
                const isActive = !warranty.is_voided && isFuture(parseISO(warranty.end_date));
                const statusTextClass =
                  warranty.is_voided ? "text-destructive" :
                  isPast(parseISO(warranty.end_date)) ? "text-muted-foreground" :
                  daysLeft <= 7 ? "text-warning" : "text-success";
                const statusDotClass =
                  warranty.is_voided ? "bg-destructive/70" :
                  isPast(parseISO(warranty.end_date)) ? "bg-muted-foreground/50" :
                  daysLeft <= 7 ? "bg-warning" : "bg-success";
                const warrantyTitle = warranty.warranty_type === "sale"
                  ? (warranty.product_name || "Sin producto")
                  : (warranty.service_description || "Sin descripción");
                return (
                  <MobileListCard
                    key={warranty.id}
                    onClick={() => handleViewDetail(warranty)}
                    code={warranty.warranty_code}
                    statusLabel={status.label}
                    statusTextClass={statusTextClass}
                    statusDotClass={statusDotClass}
                    statusPulse={!warranty.is_voided && isActive && daysLeft <= 7}
                    statusExtra={
                      <span className="ml-1 text-[10px] text-muted-foreground/60">
                        · {warranty.warranty_type === "sale" ? "Venta" : "Servicio"}
                      </span>
                    }
                    title={warrantyTitle}
                    subtitle={warranty.customer_name || "Sin cliente"}
                    valueText={isActive ? `${daysLeft}d` : undefined}
                    valueClass={daysLeft <= 7 ? "text-warning" : "text-success"}
                  />
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
