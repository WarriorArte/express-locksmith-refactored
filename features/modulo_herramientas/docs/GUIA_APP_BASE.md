# Guía de Referencia: App Base para Adaptar Módulo Herramientas

> Este documento describe cómo está hecha la app base (destino final) para que todo
> cambio en el módulo de herramientas siga las mismas convenciones.

---

## Stack de la app base
- React 18 + **TypeScript** (.tsx)
- Vite como bundler
- React Router v7 (BrowserRouter, rutas dentro de MainLayout con Outlet)
- Supabase (PostgreSQL) como BD
- TanStack React Query para fetch/cache de datos
- shadcn/ui (Radix UI) + Tailwind CSS con **variables CSS** y dark mode
- Framer Motion para animaciones
- Lucide React para iconos (misma librería que usa el módulo)
- Zod para validación de formularios

## Providers globales (main.tsx)
```
AuthProvider → WorkshopProvider → QueryClientProvider → TooltipProvider → BrowserRouter
```
- `useAuth()` → user, session, profile, isAdmin, signIn, signOut
- `useWorkshop()` → currentWorkshop, workshops, isSuperAdmin, globalRole, setCurrentWorkshop
- `useWorkshopFeatures()` → isFeatureEnabled(key), isRouteEnabled(path)

## Roles
- **SuperAdmin**: ve todo, gestiona talleres, usuarios, features. Detectado con `isSuperAdmin`.
- **Admin de taller**: gestiona un taller. Detectado con `isAdmin`.
- **Empleado**: operador, solo ve lo que el taller tiene habilitado.

## Ruta del módulo herramientas
- `/herramientas` — Ya existe en App.tsx, mapea a `pages/Herramientas.tsx`
- Está dentro de `ProtectedRoute > MainLayout`, así que ya tiene sidebar, header y auth.
- `featureKey: null` en el sidebar → **siempre visible**, no depende de features toggleables.

## Layout (MainLayout.tsx)
- Sidebar izquierdo (collapsible) + Header sticky + `<Outlet />` + BottomNav (móvil) + FAB
- Las páginas se renderizan dentro de `<Outlet />`, NO necesitan su propio layout/navbar.
- El contenido de cada página llena el área `<main className="flex-1 p-4 lg:p-6">`.

---

## Convenciones de UI (seguir en el módulo)

### Tokens de color — OBLIGATORIO, NO usar colores hardcoded

| En vez de...                            | Usar...                           |
|-----------------------------------------|-----------------------------------|
| `bg-slate-900`, `bg-gray-900`           | `bg-primary` o `bg-card`          |
| `text-white`                            | `text-primary-foreground`         |
| `bg-gray-50`, `bg-gray-100`             | `bg-background`                   |
| `text-slate-800`, `text-gray-800`       | `text-foreground`                 |
| `text-slate-500`, `text-gray-500`       | `text-muted-foreground`           |
| `border-slate-200`, `border-gray-200`   | `border-border`                   |
| `bg-blue-600`, `text-blue-600`          | `bg-primary`, `text-primary`      |
| `bg-green-100`, `text-green-600`        | `bg-success/10`, `text-success`   |
| `bg-red-500`, `text-red-500`            | `bg-destructive`, `text-destructive` |
| `bg-white`                              | `bg-card`                         |
| `hover:bg-slate-700`                    | `hover:bg-muted`                  |
| `bg-blue-50`, `bg-blue-950/20`          | `bg-primary/5` o `bg-card`        |
| `text-slate-400`, `text-slate-600`      | `text-muted-foreground`           |
| `border-blue-200`, `border-blue-800`    | `border-border` o `border-primary/30` |

> **Nota para AlarmasWorkspace y otros componentes existentes:** Al integrar a la app base,
> reemplazar todos los colores hardcoded (`bg-blue-50`, `text-slate-500`, etc.) por los
> tokens semánticos de la tabla de arriba. Los tokens funcionan automáticamente con dark mode.

### Componentes shadcn/ui disponibles (usar en vez de HTML crudo)
- **Button** en vez de `<button className="px-4 py-2 bg-blue-600...">`
- **Input** en vez de `<input className="w-full p-2 border...">`
- **Select, SelectTrigger, SelectContent, SelectItem** en vez de `<select>`
- **Table, TableHeader, TableRow, TableCell** en vez de `<table>`
- **Tabs, TabsList, TabsTrigger, TabsContent** en vez de botones toggle manuales
- **Card, CardHeader, CardContent** en vez de `<div className="bg-white p-6 rounded-xl shadow...">`
- **Badge** en vez de `<span className="text-xs bg-blue-100...">`
- **Dialog** para modales
- **Textarea** en vez de `<textarea>`
- **Separator** en vez de `border-b`

### Animaciones (framer-motion)
```tsx
<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
```
Todas las páginas usan este patrón en su header y contenido principal.

### Patrón de encabezado de página
```tsx
<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
  <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Título</h1>
  <p className="text-muted-foreground">Descripción breve</p>
</motion.div>
```

### Clases utilitarias propias de la app
- `card-elevated` → tarjeta con sombra elevada

### Fuente
- "DM Sans" (definida en tailwind.config.ts)

---

## Sistema de features por taller
```ts
FEATURE_ROUTES = {
  inventory: ["/inventario"],
  quotes: ["/cotizaciones"],
  customers: ["/clientes"],
  services: ["/servicios"],
  sales: ["/ventas"],
};
```
- Herramientas actualmente NO tiene feature key (siempre habilitado).
- A futuro: `tools: ["/herramientas"]` y sub-features por herramienta.

## SuperAdmin: Gestión de herramientas
- SuperAdmin.tsx tiene 4 tabs: Talleres, Features, Usuarios, Almacenamiento.
- La gestión de herramientas se integra como sub-tabs dentro de `/herramientas` 
  que se muestran solo si `isSuperAdmin`.

## Datos: Hooks con React Query
Patrón estándar en la app base:
```ts
const { data, isLoading } = useQuery({
  queryKey: ["nombre-recurso"],
  queryFn: async () => { /* fetch de supabase */ }
});
```
Para el módulo (mientras sea local): los hooks actuales usan `useState` + localStorage
y exponen la misma interfaz. Migrar a Supabase/Laravel es solo cambiar el interior del hook.

---

## Sidebar: Items de navegación del taller
```ts
workshopNavItems = [
  { icon, label: "Herramientas", path: "/herramientas", featureKey: null },
];
```
Ya incluye Herramientas. No hay que tocar el sidebar.

## Checklist de compliance para cada componente del módulo
- [ ] Archivo .tsx (no .jsx)
- [ ] Props tipadas con interface
- [ ] **Colores con tokens semánticos** (no hardcoded — revisar tabla arriba)
- [ ] Componentes shadcn/ui (no HTML crudo con clases)
- [ ] Animaciones con framer-motion en secciones principales
- [ ] Datos en hooks separados (no inline en componentes)
- [ ] Responsive: funciona en el `<Outlet />` del MainLayout (sin navbar propia)
- [ ] Dark mode compatible (garantizado automáticamente con tokens semánticos)
