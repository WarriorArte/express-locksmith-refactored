import type { DialogAction } from "@/components/shared/DialogActionBar";

export interface DetailItem {
  id: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ServiceImage {
  id: string;
  image_url: string;
  description?: string | null;
  created_at?: string;
}

export interface DetailData {
  type: "sale" | "service" | "quote";
  number: string;
  date: string;
  status?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  description?: string | null;
  problem?: string | null;
  items: DetailItem[];
  subtotal: number;
  discount?: number | null;
  deposit?: number | null;
  total: number;
  notes?: string | null;
  payment_method?: string | null;
  created_by?: string | null;
  valid_until?: string | null;
  estimated_price?: number | null;
  final_price?: number | null;
  labor_cost?: number | null;
  images?: ServiceImage[];
}

export type OverflowAction = DialogAction;

import { ShoppingCart, Wrench, FileText } from "lucide-react";

export const typeConfig = {
  sale: { label: "Venta", icon: ShoppingCart, color: "bg-secondary text-secondary-foreground" },
  service: { label: "Servicio", icon: Wrench, color: "bg-primary text-primary-foreground" },
  quote: { label: "Cotización", icon: FileText, color: "bg-info text-info-foreground" },
} as const;

export const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-warning text-warning-foreground" },
  accepted: { label: "Aceptada", color: "bg-success text-success-foreground" },
  rejected: { label: "Rechazada", color: "bg-destructive text-destructive-foreground" },
  converted: { label: "Convertida", color: "bg-primary text-primary-foreground" },
  expired: { label: "Vencida", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "En Curso", color: "bg-info text-info-foreground" },
  completed: { label: "Finalizado", color: "bg-success text-success-foreground" },
  delivered: { label: "Entregado", color: "bg-primary text-primary-foreground" },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};
