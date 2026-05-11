export interface BaseRow {
  id: string;
  workshop_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Permitir cualquier otra columna del backend sin forzar typings estrictos por ahora.
  // Las columnas críticas se tipan explícitamente en cada interfaz.
  [key: string]: any;
}

export interface Category extends BaseRow {
  name: string;
  color?: string | null;
}

export interface Tag extends BaseRow {
  name: string;
  color?: string | null;
}

export interface BusinessSettingsRow extends BaseRow {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  printer_size?: string | null;
  printer_model?: string | null;
  currency_symbol?: string | null;
  phone_country_code?: string | null;
  print_logo?: boolean | number;
  auto_cut?: boolean | number;
}

export interface Customer extends BaseRow {
  name: string;
  customer_type?: "person" | "company" | "business";
  phone?: string | null;
  email?: string | null;
  is_frequent?: boolean | number;
}

export interface Profile extends BaseRow {
  user_id?: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface UserRole extends BaseRow {
  user_id: string;
  role: "admin" | "employee";
}

export interface Product extends BaseRow {
  name: string;
  category_id?: string | null;
  stock_store?: number;
  stock_warehouse?: number;
}

export interface SaleItem extends BaseRow {
  sale_id?: string;
  product_id?: string | null;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
}

export interface Sale extends BaseRow {
  sale_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal?: number;
  discount?: number;
  total?: number;
}

export interface QuoteItem extends BaseRow {
  quote_id?: string;
  product_id?: string | null;
  description?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
}

export interface Quote extends BaseRow {
  quote_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  status?: "pending" | "accepted" | "rejected" | "converted" | "expired";
  subtotal?: number;
  discount?: number;
  total?: number;
}

export type ServiceStatus = "pending" | "in_progress" | "completed" | "delivered" | "cancelled";
// Coincide con la ENUM del schema MariaDB (services.service_type)
export type ServiceType = "automotive" | "residential" | "commercial" | "industrial";

export interface Service extends BaseRow {
  service_number?: string;
  customer_id?: string | null;
  quote_id?: string | null;
  service_type?: ServiceType;
  status?: ServiceStatus;
  description?: string;
}

export interface ServiceProduct extends BaseRow {
  service_id?: string;
  product_id?: string | null;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
}

export interface ServiceImage extends BaseRow {
  service_id?: string;
  image_url: string;
  description?: string | null;
}
