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

export type FeatureGroup = "general" | "herramientas";

export const AVAILABLE_FEATURES: Array<{
  key: string;
  label: string;
  description: string;
  group?: FeatureGroup;
  /** Para features del grupo "herramientas": id usado en localStorage de WorkshopAssignmentManager */
  toolId?: "keycode" | "alarmas" | "immo";
}> = [
  { key: "inventory", label: "Inventario", description: "Gestión de productos y stock", group: "general" },
  { key: "quotes", label: "Cotizaciones", description: "Crear y gestionar cotizaciones", group: "general" },
  { key: "services", label: "Servicios", description: "Gestión de órdenes de servicio", group: "general" },
  { key: "sales", label: "Ventas", description: "Punto de venta y registro de ventas", group: "general" },
  { key: "customers", label: "Clientes", description: "Base de datos de clientes", group: "general" },
  { key: "reports", label: "Reportes", description: "Estadísticas y reportes", group: "general" },
  { key: "tool_keycode", label: "Herramienta: Keycode", description: "Acceso a la base de Keycodes y cortes de llave", group: "herramientas", toolId: "keycode" },
  { key: "tool_alarmas", label: "Herramienta: Auto Alarmas", description: "Acceso a diagramas y datos de programación de alarmas", group: "herramientas", toolId: "alarmas" },
  { key: "tool_immo", label: "Herramienta: Immo Info", description: "Acceso a información de inmovilizadores y programación", group: "herramientas", toolId: "immo" },
];
