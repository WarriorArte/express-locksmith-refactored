import { useState } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { m as motion } from "framer-motion";
import {
  Plus,
  Filter,
  Wrench,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Car,
  Home,
  BriefcaseBusiness,
  Factory,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  MapPin,
  ImagePlus,
  Printer,
} from "lucide-react";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";

import { ServiceImagesDialog } from "@/components/services/ServiceImagesDialog";
import { DetailViewDialog } from "@/components/shared/DetailViewDialog";
import type { DialogAction } from "@/components/shared/DialogActionBar";
import { TicketDialog, type TicketData } from "@/components/shared/TicketDialog";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import { clearActiveElementFocus } from "@/lib/focus";
import { useServices, useDeleteService, useUpdateService, type Service, type ServiceStatus, type ServiceType } from "@/hooks/useServices";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useToast } from "@/hooks/use-toast";
import { useBatchInventoryUpdate } from "@/hooks/useInventoryMovements";
import { useProducts } from "@/hooks/useProducts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<ServiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendiente", color: "bg-warning text-warning-foreground", icon: Clock },
  in_progress: { label: "En Curso", color: "bg-info text-info-foreground", icon: Wrench },
  completed: { label: "Finalizado", color: "bg-success text-success-foreground", icon: CheckCircle },
  delivered: { label: "Entregado", color: "bg-primary text-primary-foreground", icon: Truck },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground", icon: XCircle },
};

const typeConfig: Record<ServiceType, { label: string; icon: typeof Car; iconColor: string; bgColor: string }> = {
  automotive: { label: "Automotriz", icon: Car, iconColor: "text-info", bgColor: "bg-info/15" },
  residential: { label: "Residencial", icon: Home, iconColor: "text-success", bgColor: "bg-success/15" },
  commercial: { label: "Comercial", icon: BriefcaseBusiness, iconColor: "text-warning", bgColor: "bg-warning/15" },
  industrial: { label: "Industrial", icon: Factory, iconColor: "text-accent", bgColor: "bg-accent/15" },
};

export default function Servicios() {
  // Helper to get current datetime in MySQL format (local time, not UTC)
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteErrorDialogOpen, setDeleteErrorDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
  const [imagesService, setImagesService] = useState<Service | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingService, setViewingService] = useState<Service | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: services, isLoading } = useServices();
  const { data: settings } = useBusinessSettings();
  const { data: products } = useProducts();
  const deleteService = useDeleteService();
  const updateService = useUpdateService();
  
  const { updateForService } = useBatchInventoryUpdate();

  const currencySymbol = settings?.currency_symbol || "$";

  const getServiceDisplayDate = (service: Service) => {
    if (service.status === "pending" && service.scheduled_start_at) {
      return service.scheduled_start_at;
    }

    if (service.started_at) {
      return service.started_at;
    }

    return service.created_at;
  };

  const getServiceDisplayStatus = (service: Service) => {
    if (service.status === "pending" && service.scheduled_start_at) {
      return {
        label: "Programado",
        color: "bg-accent text-accent-foreground",
        icon: Clock,
      };
    }

    return statusConfig[service.status];
  };

  const filteredServices = services?.filter((service) => {
    const matchesSearch =
      service.service_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  })?.sort((a, b) => {
    // Servicios programados primero, ordenados por scheduled_start_at mas proximo
    if (a.scheduled_start_at && !b.scheduled_start_at) return -1;
    if (!a.scheduled_start_at && b.scheduled_start_at) return 1;
    if (a.scheduled_start_at && b.scheduled_start_at) {
      return new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime();
    }
    // Servicios sin programar, ordenados por created_at descendente (mas recientes primero)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  }) || [];

  const stats = {
    pending: services?.filter(s => s.status === "pending").length || 0,
    inProgress: services?.filter(s => s.status === "in_progress").length || 0,
    completed: services?.filter(s => s.status === "completed").length || 0,
    delivered: services?.filter(s => s.status === "delivered").length || 0,
    cancelled: services?.filter(s => s.status === "cancelled").length || 0,
    today: services?.length || 0,
  };

  const handleDelete = (service: Service) => {
    clearActiveElementFocus();
    if (service.status !== "cancelled" && service.status !== "delivered") {
      setSelectedService(service);
      setDeleteErrorDialogOpen(true);
      return;
    }
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedService) {
      setDeleteDialogOpen(false);
      return;
    }
    
    try {
      await deleteService.mutateAsync(selectedService.id);
      toast({
        title: "Servicio eliminado",
        description: `Servicio ${selectedService.service_number} eliminado exitosamente.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el servicio. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedService(null);
    }
  };

  const handleStatusChange = async (service: Service, newStatus: ServiceStatus) => {
    const updates: Partial<Service> & { id: string } = {
      id: service.id,
      status: newStatus,
    };
    
    if (newStatus === "in_progress" && !service.started_at) {
      updates.started_at = getCurrentDateTime();
      updates.scheduled_start_at = null;
    } else if (newStatus === "completed" && !service.completed_at) {
      updates.completed_at = getCurrentDateTime();
      
      // Consumir del inventario cuando se marca como completado
      if (service.service_products && products && products.length > 0) {
        const outOfStockProducts: string[] = [];
        
        for (const item of service.service_products) {
          if (item.product_id) {
            const product = products.find(p => p.id === item.product_id);
            const availableStock = product?.stock_store || 0;
            
            if (availableStock < (item.quantity || 0)) {
              outOfStockProducts.push(`${item.product_name} (disponible: ${availableStock}, requerido: ${item.quantity})`);
            }
          }
        }
        
        // Mostrar alerta si hay productos sin stock, pero permitir continuar
        if (outOfStockProducts.length > 0) {
          toast({
            title: "Stock insuficiente",
            description: `${outOfStockProducts.join(", ")} no tienen suficiente stock en tienda. El servicio se completara igual, pero el stock no sera deducido.`,
            variant: "destructive",
          });
        }
        
        // Descontar del inventario solo los productos que tienen stock disponible
        try {
          await updateForService(
            service.service_products
              .filter(item => {
                if (!item.product_id) return false;
                const product = products.find(p => p.id === item.product_id);
                const availableStock = product?.stock_store || 0;
                return availableStock > 0 && item.quantity && item.quantity <= availableStock;
              })
              .map(item => ({ product_id: item.product_id as string, quantity: item.quantity as number })),
            service.id
          );
        } catch (error) {
          toast({
            title: "Error",
            description: "No se pudo descontar el inventario, pero el servicio se marco como completado.",
            variant: "destructive",
          });
        }
      }
    } else if (newStatus === "delivered" && !service.delivered_at) {
      updates.delivered_at = getCurrentDateTime();
    }
    
    const updatedService = await updateService.mutateAsync(updates);
    
    setViewingService((prev) => prev ? { ...prev, status: newStatus, started_at: updates.started_at, scheduled_start_at: updates.scheduled_start_at, completed_at: updates.completed_at } : null);
    void updatedService;
  };

  const handleViewDetail = (service: Service) => {
    setViewingService(service);
    setDetailDialogOpen(true);
  };

  const getDetailData = (service: Service) => {
    const productsSubtotal = service.service_products?.reduce((acc, p) => acc + Number(p.subtotal), 0) || 0;
    return {
      type: "service" as const,
      number: service.service_number,
      date: getServiceDisplayDate(service),
      status: service.status,
      customer_name: service.customer?.name,
      customer_phone: service.customer?.phone,
      customer_email: service.customer?.email,
      customer_address: service.address || service.customer?.address,
      description: service.description,
      problem: service.problem,
      items: service.service_products?.map(item => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })) || [],
      subtotal: productsSubtotal,
      discount: service.discount,
      deposit: service.deposit,
      total: service.final_price || service.estimated_price,
      notes: service.internal_notes,
      estimated_price: service.estimated_price,
      final_price: service.final_price,
      labor_cost: service.labor_cost,
      images: service.service_images,
    };
  };

  const openServiceTicket = (service: Service) => {
    const serviceProducts = service.service_products ?? [];
    const productsSubtotal = serviceProducts.reduce((acc, p) => acc + Number(p.subtotal || 0), 0);
    setTicketData({
      kind: "service",
      number: service.service_number,
      date: service.created_at,
      status: service.status,
      customer_name: service.customer_name || service.customer?.name,
      customer_phone: service.customer?.phone,
      customer_email: service.customer?.email,
      description: service.description,
      problem: service.problem,
      items: serviceProducts.map((it) => ({
        name: it.product_name,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        subtotal: Number(it.subtotal),
      })),
      labor_cost: Number(service.labor_cost || 0),
      subtotal: productsSubtotal,
      discount: Number(service.discount || 0),
      deposit: Number(service.deposit || 0),
      total: Number(service.final_price || service.estimated_price || 0),
      notes: service.internal_notes,
    });
    setDetailDialogOpen(false);
    setTicketOpen(true);
  };

  const serviceStatusAction: DialogAction | null =
    viewingService?.status === "pending"
      ? { icon: Wrench, label: "Iniciar servicio", desktopLabel: "Estado", onClick: () => handleStatusChange(viewingService, "in_progress"), tone: "primary" }
      : viewingService?.status === "in_progress"
      ? { icon: CheckCircle, label: "Marcar completado", desktopLabel: "Estado", onClick: () => handleStatusChange(viewingService, "completed"), tone: "primary" }
      : viewingService?.status === "completed"
      ? { icon: Truck, label: "Marcar entregado", desktopLabel: "Estado", onClick: () => handleStatusChange(viewingService, "delivered"), tone: "primary" }
      : null;

  const serviceCanCancel =
    viewingService?.status === "pending" || viewingService?.status === "in_progress";
  const detailActions: DialogAction[] = viewingService
    ? [
        ...(serviceStatusAction ? [serviceStatusAction] : []),
        {
          icon: Edit,
          label: "Editar",
          onClick: () => {
            setDetailDialogOpen(false);
            setEditingService(viewingService);
            setFormDialogOpen(true);
          },
        },
        { icon: Printer, label: "Ticket", onClick: () => openServiceTicket(viewingService) },
        {
          icon: ImagePlus,
          label: "Imagenes",
          desktopLabel: "Imagenes",
          onClick: () => {
            setImagesService(viewingService);
            setImagesDialogOpen(true);
          },
        },
      ]
    : [];
  const detailMenuActions: DialogAction[] = viewingService
    ? [
        ...(serviceCanCancel
          ? [
              {
                icon: XCircle,
                label: "Cancelar servicio",
                onClick: () => handleStatusChange(viewingService, "cancelled"),
                tone: "warning" as const,
              },
            ]
          : []),
        ...(isAdmin
          ? [
              {
                icon: Trash2,
                label: "Eliminar",
                onClick: () => handleDelete(viewingService),
                tone: "destructive" as const,
                separator: serviceCanCancel,
              },
            ]
          : []),
      ]
    : [];

  const statusOptions: { key: "all" | ServiceStatus; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Pendientes" },
    { key: "in_progress", label: "En Curso" },
    { key: "completed", label: "Finalizados" },
    { key: "delivered", label: "Entregados" },
    { key: "cancelled", label: "Cancelados" },
  ];


  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar */}
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-2 pb-4">
        <section className="ce-hero ce-hero-mobile-bleed p-[22px_16px] lg:p-[22px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="ce-hero-eyebrow">Servicios</div>
              <h1 className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]">
                En el <span className="text-primary">taller.</span>
              </h1>
              <p className="ce-hero-meta mt-2 max-w-[460px] lg:mt-3">
                <b className="text-[hsl(240_22%_95%)]">{stats.today} servicios</b>
                {" "}hoy ·{" "}
                <b className="text-[hsl(240_22%_95%)]">{stats.inProgress} en curso</b>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Button
                size="sm"
                className="hidden bg-primary text-primary-foreground hover:bg-primary-hover lg:inline-flex"
                onClick={() => { setEditingService(null); setFormDialogOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo
              </Button>
              <AccountMenu />
            </div>
          </div>

          <div className="relative z-[1] mt-4 flex flex-row items-center gap-2 animate-hero-search-in lg:mt-5">
            <UnifiedSearchInput
              className="flex-1 min-w-0"
              placeholder="Buscar folio, cliente..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <div className="flex shrink-0 items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | ServiceStatus)}>
                <SelectTrigger
                  className="h-10 w-10 shrink-0 justify-center rounded-xl px-0 bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg:last-child]:hidden lg:w-48 lg:justify-start lg:px-3 lg:[&>svg:last-child]:block"
                  aria-label="Filtrar por estado"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 shrink-0" />
                    <span className="hidden truncate lg:inline">
                      {statusOptions.find((o) => o.key === statusFilter)?.label ?? "Todos"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label="Nuevo servicio"
                onClick={() => { setEditingService(null); setFormDialogOpen(true); }}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex shrink-0 items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform lg:hidden"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {isLoading ? (
        <>
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3 animate-pulse">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card-elevated p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3 w-28 rounded bg-muted/60" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-16 rounded-full bg-muted/60" />
                      <div className="h-5 w-20 rounded-full bg-muted/60" />
                    </div>
                  </div>
                  <div className="h-6 w-20 rounded bg-muted/60 shrink-0" />
                </div>
                <div className="h-3 w-3/4 rounded bg-muted/60" />
                <div className="h-3 w-1/2 rounded bg-muted/60" />
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden md:block card-elevated overflow-hidden animate-pulse">
            <div className="h-10 bg-muted/30 border-b border-border" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
                <div className="w-7 h-7 rounded-lg bg-muted/60 shrink-0" />
                <div className="w-24 h-3 rounded bg-muted/60" />
                <div className="w-20 h-5 rounded-full bg-muted/60" />
                <div className="flex-1 h-3 rounded bg-muted/60 max-w-[180px]" />
                <div className="w-24 h-3 rounded bg-muted/60" />
                <div className="w-24 h-3 rounded bg-muted/60" />
                <div className="w-14 h-3 rounded bg-muted/60 ml-auto" />
                <div className="w-8 h-8 rounded bg-muted/60 shrink-0" />
              </div>
            ))}
          </div>
        </>
      ) : filteredServices.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {searchQuery ? "Sin resultados" : "Sin servicios registrados"}
          </h3>
          <p className="text-muted-foreground mb-5 max-w-xs mx-auto">
            {searchQuery
              ? "Intenta con otro folio, cliente o descripcion."
              : "Registra el primer servicio para comenzar a gestionar tu operacion."}
          </p>
          {!searchQuery && (
            <Button onClick={() => { setEditingService(null); setFormDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo servicio
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-10" />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Folio</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descripcion</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Precio</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredServices.map((service) => {
                  const status = getServiceDisplayStatus(service);
                  const type = typeConfig[service.service_type];
                  const StatusIcon = status.icon;
                  const TypeIcon = type.icon;
                  const price = service.final_price ?? service.estimated_price ?? 0;
                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(service)}
                    >
                      <td className="px-4 py-3">
                        <div className={cn("p-1.5 rounded-lg w-fit", type.bgColor)}>
                          <TypeIcon className={cn("w-3.5 h-3.5", type.iconColor)} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground dark:text-primary font-semibold whitespace-nowrap">{service.service_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-xs whitespace-nowrap", status.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-sm text-foreground truncate">{service.description}</p>
                        {service.address && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />{service.address}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground whitespace-nowrap">{service.customer?.name || "Sin cliente"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(parseISO(getServiceDisplayDate(service)), "dd MMM · HH:mm", { locale: es })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="text-sm font-bold text-foreground">{currencySymbol}{Number(price).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{service.final_price ? "Final" : "Estimado"}</p>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(service)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setImagesService(service); setImagesDialogOpen(true); }}>
                              <ImagePlus className="w-4 h-4 mr-2" /> Agregar imagenes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingService(service); setFormDialogOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {service.status === "pending" && (
                              <DropdownMenuItem className="text-info" onClick={() => handleStatusChange(service, "in_progress")}>
                                <Wrench className="w-4 h-4 mr-2" /> Iniciar servicio
                              </DropdownMenuItem>
                            )}
                            {service.status === "in_progress" && (
                              <DropdownMenuItem className="text-foreground dark:text-success" onClick={() => handleStatusChange(service, "completed")}>
                                <CheckCircle className="w-4 h-4 mr-2" /> Marcar completado
                              </DropdownMenuItem>
                            )}
                            {service.status === "completed" && (
                              <DropdownMenuItem className="text-foreground dark:text-primary" onClick={() => handleStatusChange(service, "delivered")}>
                                <Truck className="w-4 h-4 mr-2" /> Marcar entregado
                              </DropdownMenuItem>
                            )}
                            {(service.status === "pending" || service.status === "in_progress") && (
                              <DropdownMenuItem className="text-warning" onClick={() => handleStatusChange(service, "cancelled")}>
                                <XCircle className="w-4 h-4 mr-2" /> Cancelar servicio
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(service)}>
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
          <div className="md:hidden space-y-3">
            <h2 className="pb-1 text-lg font-extrabold tracking-tight">Cola de trabajo</h2>
            {filteredServices.map((service) => {
              const status = getServiceDisplayStatus(service);
              const type = typeConfig[service.service_type];
              const StatusIcon = status.icon;
              const TypeIcon = type.icon;
              const price = service.final_price ?? service.estimated_price ?? 0;
              const imgs = service.service_images ?? [];

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.08 }}
                  className="card-elevated overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => handleViewDetail(service)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("p-2.5 rounded-xl flex-shrink-0", type.bgColor)}>
                          <TypeIcon className={cn("w-5 h-5", type.iconColor)} />
                        </div>
                        <div>
                          <p className="font-mono text-sm text-foreground dark:text-primary font-semibold leading-tight">{service.service_number}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge className={cn("text-xs", status.color)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{type.label}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">
                          {service.final_price ? "Final" : "Estimado"}
                        </p>
                        <p className={cn("text-xl font-bold", service.final_price ? "text-foreground dark:text-success" : "text-foreground")}>
                          {currencySymbol}{Number(price).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-foreground truncate mb-1">{service.description}</p>
                    {service.problem && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{service.problem}</p>
                    )}

                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-foreground font-medium">
                          {service.customer?.name || "Sin cliente"}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(getServiceDisplayDate(service)), "dd MMM · HH:mm", { locale: es })}
                      </span>
                    </div>

                    {service.address && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{service.address}</span>
                      </div>
                    )}

                    {imgs.length > 0 && (
                      <div className="flex gap-1.5 mt-3 pt-3 border-t">
                        {imgs.slice(0, 4).map((img) => (
                          <div key={img.id} className="w-11 h-11 rounded-xl overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {img.image_url ? (
                              <img src={resolveStorageUrl(img.image_url) ?? undefined} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                        {imgs.length > 4 && (
                          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                            +{imgs.length - 4}
                          </div>
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el servicio {selectedService?.service_number}.
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

      {/* Delete Error Dialog */}
      <AlertDialog open={deleteErrorDialogOpen} onOpenChange={setDeleteErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se puede eliminar este servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se pueden eliminar servicios que esten <strong>Cancelados</strong> o <strong>Entregados</strong>.
              {selectedService && (
                <>
                  <br />
                  <br />
                  El servicio {selectedService.service_number} se encuentra en estado <strong>{statusConfig[selectedService.status]?.label}</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteErrorDialogOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <ServiceFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        service={editingService}
      />

      {/* Images Dialog */}
      <ServiceImagesDialog
        open={imagesDialogOpen}
        onOpenChange={setImagesDialogOpen}
        service={imagesService}
      />

      {/* Detail Dialog */}
      <DetailViewDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        data={viewingService ? getDetailData(viewingService) : null}
        actions={detailActions}
        overflowActions={detailMenuActions}
      />




      <TicketDialog open={ticketOpen} onOpenChange={setTicketOpen} data={ticketData} />

    </div>
  );
}
