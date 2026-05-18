import type { ServiceType } from "@/hooks/useServices";

export interface ServiceItem {
  tempId: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ServiceImage {
  tempId: string;
  image_url: string;
  description: string;
  id?: string;
}

export const MAX_SERVICE_IMAGES = 2;

export type ServiceFormTab = "servicio" | "productos" | "imagenes" | "cliente" | "costos";

export const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: "residential", label: "Residencial" },
  { value: "commercial", label: "Comercial" },
  { value: "automotive", label: "Automotriz" },
  { value: "industrial", label: "Industrial" },
];

export const SERVICE_FORM_TABS_ORDER: ServiceFormTab[] = [
  "servicio",
  "productos",
  "imagenes",
  "cliente",
  "costos",
];
