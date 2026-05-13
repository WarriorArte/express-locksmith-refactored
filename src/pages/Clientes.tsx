import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion } from "framer-motion";
import {
  Plus,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Users,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useCustomers, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { CustomerServicesDialog } from "@/components/customers/CustomerServicesDialog";
import { CustomerAvatar } from "@/components/customers/CustomerAvatar";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useToast } from "@/hooks/use-toast";

export default function Clientes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [viewingServicesCustomer, setViewingServicesCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useCustomers();
  const deleteCustomerMutation = useDeleteCustomer();
  const { data: settings } = useBusinessSettings();
  const { toast } = useToast();

  const currencySymbol = settings?.currency_symbol || "$";

  const filteredClients = customers?.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.phone && client.phone.includes(searchQuery))
  ) || [];

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteCustomer) {
      await deleteCustomerMutation.mutateAsync(deleteCustomer.id);
      setDeleteCustomer(null);
    }
  };

  const handleViewServices = (customer: Customer) => {
    setViewingServicesCustomer(customer);
    setServicesDialogOpen(true);
  };

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
          title="Clientes"
          subtitle={`${customers?.length || 0} clientes registrados`}
          action={
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]" onClick={handleNewCustomer}>
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          }
          mobileAction={
            <button
              type="button"
              aria-label="Nuevo cliente"
              onClick={handleNewCustomer}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          }
        />
        <UnifiedSearchInput
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="card-elevated p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No se encontraron clientes con esa búsqueda" : "Comienza agregando tu primer cliente"}
          </p>
          <Button onClick={handleNewCustomer}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Cliente
          </Button>
        </div>
      )}

      {/* Clients List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.08 }}
            className="card-elevated overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => handleViewServices(client)}
          >
            <div className="p-4">
              {/* Header: avatar + nombre + badges | compras + menú */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CustomerAvatar
                    name={client.name}
                    customerType={client.customer_type}
                    noWorkAgain={!!client.no_work_again}
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground leading-tight truncate">{client.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {client.customer_type === "company" ? "Empresa" : "Persona"}
                      </Badge>
                      {client.is_vip && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Cerrajero Ext.</Badge>
                      )}
                      {client.is_frequent && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-success text-success-foreground">Frecuente</Badge>
                      )}
                      {client.has_debt && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-destructive text-destructive-foreground">Deuda</Badge>
                      )}
                      {client.no_work_again && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-destructive text-destructive-foreground">
                          <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                          No trabajar
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">Compras</p>
                    <p className="text-xl font-bold text-primary">{currencySymbol}{(client.total_purchases || 0).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{client.total_services || 0} servicios</p>
                  </div>
                  <div className="hidden md:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewServices(client)}>
                          <Eye className="w-4 h-4 mr-2" /> Ver historial
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(client)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteCustomer(client)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Contacto */}
              {(client.phone || client.email || client.address) && (
                <div className="space-y-1">
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </motion.div>
        ))}
      </div>
      </div>

      {/* Customer Form Dialog */}
      <CustomerFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen}
        customer={editingCustomer}
      />

      {/* Customer Detail + Services Dialog */}
      <CustomerServicesDialog
        open={servicesDialogOpen}
        onOpenChange={setServicesDialogOpen}
        customer={viewingServicesCustomer}
        onEdit={() => {
          setServicesDialogOpen(false);
          setEditingCustomer(viewingServicesCustomer);
          setFormOpen(true);
        }}
        onDelete={() => {
          setServicesDialogOpen(false);
          setDeleteCustomer(viewingServicesCustomer);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente "{deleteCustomer?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
