import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wrench, Eye, Loader2, Edit, Trash2, Phone, Mail, MapPin, AlertCircle, MoreHorizontal } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import type { Customer } from "@/hooks/useCustomers";
import { DetailViewDialog } from "@/components/shared/DetailViewDialog";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CustomerServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-warning text-warning-foreground" },
  in_progress: { label: "En Curso", color: "bg-info text-info-foreground" },
  completed: { label: "Finalizado", color: "bg-success text-success-foreground" },
  delivered: { label: "Entregado", color: "bg-primary text-primary-foreground" },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function CustomerServicesDialog({
  open,
  onOpenChange,
  customer,
  onEdit,
  onDelete,
}: CustomerServicesDialogProps) {
  const { data: allServices, isLoading } = useServices();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const servicesListRef = useRef<HTMLDivElement | null>(null);

  const customerServices = allServices?.filter(s => s.customer_id === customer?.id) || [];

  const handleViewDetail = (service: any) => {
    const productsSubtotal = service.service_products?.reduce((acc: number, p: any) => acc + Number(p.subtotal), 0) || 0;
    setSelectedService({
      type: "service" as const,
      number: service.service_number,
      date: service.created_at,
      status: service.status,
      customer_name: service.customer?.name,
      customer_phone: service.customer?.phone,
      customer_email: service.customer?.email,
      customer_address: service.address || service.customer?.address,
      description: service.description,
      problem: service.problem,
      items: service.service_products?.map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })) || [],
      subtotal: productsSubtotal,
      discount: service.discount,
      total: service.final_price || service.estimated_price,
      notes: service.internal_notes,
      estimated_price: service.estimated_price,
      final_price: service.final_price,
      labor_cost: service.labor_cost,
      images: service.service_images,
    });
    setDetailDialogOpen(true);
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
                customer.customer_type === "company" ? "bg-primary-light text-primary" : "bg-secondary-light text-secondary"
              )}>
                {getInitials(customer.name)}
              </div>
              <span className="truncate">{customer.name}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Client info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {customer.customer_type === "company" ? "Empresa" : "Persona"}
              </Badge>
              {customer.is_vip && (
                <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Cerrajero Ext.</Badge>
              )}
              {customer.is_frequent && (
                <Badge className="text-[10px] px-1.5 py-0 bg-success text-success-foreground">Frecuente</Badge>
              )}
              {customer.has_debt && (
                <Badge className="text-[10px] px-1.5 py-0 bg-destructive text-destructive-foreground">Deuda</Badge>
              )}
              {customer.no_work_again && (
                <Badge className="text-[10px] px-1.5 py-0 bg-destructive text-destructive-foreground">
                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                  No trabajar
                </Badge>
              )}
            </div>

            {(customer.phone || customer.email || customer.address) && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Services list */}
          <div ref={servicesListRef} className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Historial de Servicios ({customerServices.length})
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : customerServices.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Sin servicios registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerServices.map((service) => {
                  const status = statusConfig[service.status as keyof typeof statusConfig];
                  return (
                    <div
                      key={service.id}
                      className="p-3 rounded-xl border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(service)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-mono text-sm text-primary font-medium">{service.service_number}</span>
                            <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(service.created_at), "dd MMM yyyy", { locale: es })}
                            </span>
                          </div>
                          <p className="text-sm truncate text-muted-foreground">{service.description}</p>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer: Eliminar + Editar + ⋮ */}
          {(onEdit || onDelete) && (
            <div className="pt-4 border-t mt-2">
              <div className="flex items-center gap-2 w-full">
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex-1 h-12 rounded-2xl bg-destructive/10 text-destructive font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                )}
                {onEdit && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-2xl font-semibold"
                    onClick={onEdit}
                  >
                    <Edit className="w-4 h-4 mr-1.5" /> Editar
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl flex-shrink-0">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    <DropdownMenuItem
                      onClick={() => servicesListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      <Wrench className="w-4 h-4 mr-2" /> Ver historial
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DetailViewDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        data={selectedService}
      />
    </>
  );
}
