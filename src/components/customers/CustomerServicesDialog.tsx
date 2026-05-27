import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { Wrench, Eye, Loader2, Edit, Trash2, Phone, Mail, MapPin, AlertCircle } from "lucide-react";
import { useServices, type Service } from "@/hooks/useServices";
import type { Customer } from "@/hooks/useCustomers";
import { ServiceDetailSheet } from "@/components/services/ServiceDetailSheet";
import { CustomerAvatar } from "@/components/customers/CustomerAvatar";
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

const getServiceDisplayStatus = (service: Service) => {
  if (service.status === "pending" && service.scheduled_start_at) {
    return { label: "Programado", color: "bg-accent text-accent-foreground" };
  }

  return statusConfig[service.status as keyof typeof statusConfig];
};

const getServiceDisplayDate = (service: Service) => {
  if (service.status === "pending" && service.scheduled_start_at) {
    return service.scheduled_start_at;
  }

  if (service.started_at) {
    return service.started_at;
  }

  return service.created_at;
};

export function CustomerServicesDialog({
  open,
  onOpenChange,
  customer,
  onEdit,
  onDelete,
}: CustomerServicesDialogProps) {
  const { data: allServices, isLoading } = useServices();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const customerServices = allServices?.filter(s => s.customer_id === customer?.id) || [];
  const footerActions: DialogAction[] = [
    ...(onEdit ? [{ icon: Edit, label: "Editar", onClick: onEdit }] : []),
    ...(onDelete ? [{ icon: Trash2, label: "Eliminar", onClick: onDelete, tone: "destructive" as const }] : []),
  ];

  const handleViewDetail = (service: Service) => {
    setSelectedService(service);
    onOpenChange(false);
    window.setTimeout(() => {
      setDetailDialogOpen(true);
    }, 0);
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fixedHeight className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <CustomerAvatar
                name={customer.name}
                customerType={customer.customer_type}
                noWorkAgain={!!customer.no_work_again}
                className="h-9 w-9 flex-shrink-0"
              />
              <span className="truncate">{customer.name}</span>
            </DialogTitle>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
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

            {/* Contacto */}
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

            {/* Título historial */}
            <div className="border-t pt-3 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="font-semibold text-sm">
                Historial de Servicios ({customerServices.length})
              </span>
            </div>
          </DialogHeader>

          {/* Services list */}
          <div>

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
                  const status = getServiceDisplayStatus(service);
                  return (
                    <div
                      key={service.id}
                      className="p-3 rounded-xl border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(service)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-mono text-sm text-foreground dark:text-primary font-medium">{service.service_number}</span>
                            <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(getServiceDisplayDate(service)), "dd MMM yyyy", { locale: es })}
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

          {/* Footer: Editar + Eliminar */}
          {(onEdit || onDelete) && (
            <DialogFooter>
              <DialogActionBar actions={footerActions} />
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ServiceDetailSheet
        open={detailDialogOpen}
        onOpenChange={(nextOpen) => {
          setDetailDialogOpen(nextOpen);
          if (!nextOpen) {
            setSelectedService(null);
          }
        }}
        service={selectedService}
      />
    </>
  );
}
