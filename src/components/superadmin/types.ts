export type WorkshopRow = {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
  created_at?: string;
};

export type WorkshopFeatureRow = {
  id: string;
  feature_key: string;
  is_enabled: boolean | number;
  settings?: string | null;
  created_at?: string;
};

export type UserRoleRow = {
  id: string;
  user_id: string;
  workshop_id: string | null;
  role: "admin" | "employee" | null;
  globalRole: string | null;
  profile: {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

export type SuperAdminAccessSettings = {
  id: string;
  workshop_code: string;
  email: string;
  login_path: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export const AVAILABLE_FEATURES = [
  { key: "inventory", label: "Inventario", description: "Gestión de productos y stock" },
  { key: "quotes", label: "Cotizaciones", description: "Crear y gestionar cotizaciones" },
  { key: "services", label: "Servicios", description: "Gestión de órdenes de servicio" },
  { key: "sales", label: "Ventas", description: "Punto de venta y registro de ventas" },
  { key: "customers", label: "Clientes", description: "Base de datos de clientes" },
  { key: "reports", label: "Reportes", description: "Estadísticas y reportes" },
];
