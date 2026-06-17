# Guía de Integración — Módulo Herramientas

Instrucciones para integrar este módulo standalone a la app base (LockMaster Pro).

---

## 1. Archivos a copiar

Nota critica para no perder funciones: copiar tambien `src/components/llaves/`
completo. `KeycodeManager.tsx` y `KeycodeWorkspace.tsx` importan
`GeneradorLlaveSVG`, y ese generador depende de los demas archivos de esa
carpeta.

### Componentes del módulo
Copiar la carpeta completa:
```
src/components/herramientas/  →  app_base/src/components/herramientas/
```

Componentes incluidos:

| Archivo | Descripción |
|---------|-------------|
| `HerramientasModule.tsx` | Componente raíz — único que se importa desde la ruta |
| `KeycodeManager.tsx` | CRUD perfiles keycode (SuperAdmin) |
| `AssignmentManager.tsx` | Asignación de herramientas a vehículos (SuperAdmin) |
| `WorkshopAssignmentManager.tsx` | Asignación de módulos a talleres (SuperAdmin) |
| `VehicleDatabaseManager.tsx` | CRUD base de vehículos (SuperAdmin) |
| `KeycodeWorkspace.tsx` | Búsqueda de códigos y bitting (Taller) |
| `KeyPhotoDecoder.tsx` | Decodificador de llave por foto (Taller) |
| `AlarmasManager.tsx` | CRUD perfiles alarma + importar JSON (SuperAdmin) |
| `AlarmasWorkspace.tsx` | Consulta de diagramas eléctricos (Taller) |
| `ImmoManager.tsx` | CRUD perfiles immo + exporta `ImmoAssignmentManager` (SuperAdmin) |
| `ImmoSuppliesManager.tsx` | Catálogo de equipos/transponders (SuperAdmin) |
| `ImmoWorkspace.tsx` | Consulta info de inmovilizadores (Taller) |

### Tipos
```
src/types/index.ts  →  agregar al archivo de tipos existente en app_base
```

Interfaces que exporta:
- **Keycode:** `KeyReference`, `CodeEntry`, `BittingConfig`, `KeycodeProfile`, `DecoderConfig`
- **Alarmas:** `AlarmaProfile`, `AlarmaDataValue`, `AlarmaDetalle`, `AlarmaYearValue`,
  `AlarmaYearImage`, `AlarmaNote`, `AlarmaVehicleImage`
- **Immo:** `ImmoProfile`, `ImmoAssignmentDetail`, `ImmoCatalogItem`, `ImmoGenField`
- **Compartidos:** `Workshop`, `ToolAssignment`, `LockKey`, `LockSelectionsMap`

> Si la app base ya define `Workshop`, omitir ese tipo para evitar conflicto.

### Datos

Produccion: los JSON de `temp_db/auto-list/*.json` no deben consumirse como
fuente runtime. Solo sirven como seed/importacion administrativa. La app base
debe leer vehiculos desde BD (`vehicle_makes`, `vehicle_models`, `vehicle_years`) mediante
`useVehicleDatabase`.

La BD debe consultarse con indices y carga incremental: `vehicle_makes.name_norm`,
`vehicle_models(make_id, name_norm)` y `vehicle_years(model_id, year)`. No traer
toda la base al abrir la pantalla; pedir marcas, luego modelos por marca, luego
anos por modelo. Para el listado administrativo usar paginacion o limite.

Importacion JSON de vehiculos desde SuperAdmin:
```json
{ "results": [{ "Year": 2018, "Make": "Honda", "Model": "Fit" }] }
```
Antes de confirmar la importacion solo se asigna el tipo global de esa carga:
`Vehiculo`, `Motocicleta` o `Camion`. No se editan `Make`, `Model` ni `Year`
registro por registro durante la importacion.
```
src/data/tools.ts        →  app_base/src/data/tools.ts
src/data/carDatabase.ts  →  app_base/src/data/carDatabase.ts
```

### Hooks
```
src/hooks/useKeycodeProfiles.ts   →  app_base/src/hooks/useKeycodeProfiles.ts
src/hooks/useToolAssignments.ts   →  app_base/src/hooks/useToolAssignments.ts
src/hooks/useVehicleDatabase.ts   →  app_base/src/hooks/useVehicleDatabase.ts
src/hooks/useAlarmaProfiles.ts    →  app_base/src/hooks/useAlarmaProfiles.ts
src/hooks/useImmoProfiles.ts      →  app_base/src/hooks/useImmoProfiles.ts
src/hooks/useImmoCatalog.ts       →  app_base/src/hooks/useImmoCatalog.ts
src/hooks/useImageFolder.ts       →  app_base/src/hooks/useImageFolder.ts
```

> Estos hooks usan `useState` + `localStorage`. Al conectar el backend, reemplazarlos
> por hooks con React Query + API calls.

---

## 2. Archivos que NO se copian

No listar `src/components/llaves/GeneradorLlaveSVG.tsx` como opcional: es una
dependencia directa de Keycode. La carpeta `src/components/llaves/` si se copia.

`ImmoAssignmentManager` no existe como archivo separado; se exporta desde
`ImmoManager.tsx`. Copiar toda `src/components/herramientas/` conserva ese
manager.

Exclusivos del entorno de desarrollo standalone:

| Archivo | Motivo |
|---------|--------|
| `src/App.tsx` | Reemplazado por el enrutador de la app base |
| `src/main.tsx` | Punto de entrada de la app base ya existe |
| `src/components/layout/DevSidebar.tsx` | La app base tiene su propio `Sidebar.tsx` |
| `src/components/layout/DevLayout.tsx` | La app base tiene su propio `MainLayout.tsx` |
| `src/hooks/useDevContext.tsx` | Mock reemplazado por los providers reales |

---

## 3. Registrar la ruta en la app base

En el archivo de rutas de la app base (probablemente `App.tsx`):

```tsx
import { HerramientasModule } from "@/components/herramientas/HerramientasModule";

// Dentro del bloque de rutas protegidas (MainLayout):
<Route path="/herramientas" element={<HerramientasModule />} />
```

La ruta `/herramientas` ya está en el sidebar (`workshopNavItems`) de la app base.

---

## 4. Ajustar imports en los componentes copiados

Los componentes importan `useWorkshop` desde `@/hooks/useDevContext`. Cambiar en todos:

```tsx
// ANTES (standalone dev)
import { useWorkshop } from "@/hooks/useDevContext";

// DESPUÉS (app base)
import { useWorkshop } from "@/hooks/useWorkshop";
```

Archivos afectados (verificado por grep):
- `HerramientasModule.tsx`
- `AssignmentManager.tsx`
- `WorkshopAssignmentManager.tsx`
- `WorkshopToolView.tsx`

> `KeycodeWorkspace.tsx` **no** usa `useDevContext` — no requiere cambio.

El hook `useWorkshop` de la app base debe exponer: `currentWorkshop`, `workshops`, `isSuperAdmin`.

---

## 5. Corregir colores hardcodeados — CRÍTICO

El módulo usa colores Tailwind directos en **6 archivos**. Al integrar, reemplazar todos
para respetar el design system y el dark mode de la app base.

### Regla general
No usar `bg-blue-*`, `text-slate-*`, `bg-gray-*`, `bg-white`, `border-blue-*`, etc.
Siempre usar los tokens CSS semánticos del design system. Ver tabla maestra en `docs/GUIA_APP_BASE.md`.

---

### AlarmasWorkspace.tsx — mayor densidad de hardcoded colors

| Clase actual | Reemplazar por |
|---|---|
| `bg-blue-50 dark:bg-blue-950/20` | `bg-primary/5` |
| `text-slate-500 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-800 dark:text-slate-100` | `text-foreground` |
| `border-blue-100 dark:border-blue-900/50` | `border-border` |
| `bg-blue-600 text-white` (tabs activos perfiles) | `bg-primary text-primary-foreground` |
| `bg-white/70 dark:bg-slate-800/60` | `bg-card` |
| `text-slate-600 hover:text-slate-900 dark:text-slate-400` | `text-muted-foreground hover:text-foreground` |
| `border-blue-300 dark:border-blue-700` | `border-primary/30` |
| `text-blue-500`, `text-blue-600 dark:text-blue-400` | `text-primary` |
| `bg-blue-600 border-blue-600` (categoría activa) | `bg-primary border-primary` |
| `bg-amber-50 dark:bg-amber-950/20` (notas) | `bg-warning/10` o mantener si no hay token |

---

### WorkshopToolView.tsx — selector de vehículo

| Clase actual | Reemplazar por |
|---|---|
| `bg-blue-50 dark:bg-blue-950/20` (card buscador) | `bg-primary/5` |
| `bg-blue-600 text-white` (icono + chips activos) | `bg-primary text-primary-foreground` |
| `border-blue-600` (chips activos) | `border-primary` |
| `hover:border-blue-300` (chips inactivos) | `hover:border-primary/40` |
| `text-slate-500 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-700 dark:text-slate-300` (labels) | `text-foreground` |
| `text-slate-800 dark:text-slate-100` | `text-foreground` |
| `bg-white/70 dark:bg-slate-900/50 border-blue-200/60 text-slate-800` (selectClass) | Usar `<Select>` de shadcn/ui en vez de `<select>` nativo |
| `group-hover:border-blue-400/70` (imagen hover) | `group-hover:border-primary/40` |
| `text-blue-600 dark:text-blue-400` (icono radio) | `text-primary` |
| `bg-blue-500/10` (fondo icono radio) | `bg-primary/10` |
| `text-blue-500/40` (icono vacío) | `text-primary/40` |

> **Nota adicional:** el selector de vehículo usa `<select>` nativo con clases manuales
> (`selectClass`). Al integrar, reemplazar por el componente `<Select>` de shadcn/ui
> para consistencia con el design system.

---

### KeyPhotoDecoder.tsx — 27 ocurrencias

Revisar archivo completo y aplicar la tabla de `docs/GUIA_APP_BASE.md`.
Patrón dominante: `bg-blue-*` → `bg-primary/*`, `text-slate-*` → `text-foreground` / `text-muted-foreground`.

---

### ImmoWorkspace.tsx — 1 ocurrencia

| Clase actual | Reemplazar por |
|---|---|
| `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800` (chips Manual/OBD) | `bg-primary/10 text-primary border-primary/30` |

---

### AlarmasManager.tsx — 2 ocurrencias

| Clase actual | Reemplazar por |
|---|---|
| `bg-white` (imagen preview) | `bg-card` |
| `bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300` (info banner) | `bg-primary/5 border-primary/20 text-primary` |

---

### VehicleDatabaseManager.tsx — 3 ocurrencias (colores de categoría)

Estas son intencionales (colores de badge por categoría de vehículo). Si la app base
tiene tokens para categorías, usar esos. Si no, pueden mantenerse o reemplazarse con
variantes de `bg-primary`, `bg-secondary`, `bg-accent`.

| Archivo | Qué hace |
|---|---|
| `CATEGORY_COLORS.Vehiculo` = `bg-blue-100 text-blue-700 ...` | Badge de categoría |
| `bg-slate-800 text-white` (chip "Todos" activo) | Reemplazar por `bg-primary text-primary-foreground` |
| `hover:border-slate-400` (chips inactivos) | Reemplazar por `hover:border-border` |

---

## 6. Componentes UI

El módulo usa componentes de `@/components/ui/` (shadcn/ui). Verificar que la app base tenga:

- `button` ✓
- `input` ✓
- `textarea` ✓
- `card`, `card-header`, `card-content`, `card-title` ✓
- `tabs`, `tabs-list`, `tabs-trigger`, `tabs-content` ✓
- `badge` ✓
- `separator` ✓
- `table`, `table-header`, `table-row`, `table-cell` ✓
- `checkbox` ✓
- `label` ✓
- `dropdown-menu` ✓ *(copiar desde este módulo si falta)*
- `select`, `select-trigger`, `select-content`, `select-item` ✓
- `dialog` ✓
- `tooltip` ✓

Si alguno falta, copiar desde `src/components/ui/` de este proyecto.

---

## 7. Verificar dependencias

Las dependencias del módulo que deben estar en la app base:

```json
{
  "framer-motion": "^12.x",
  "sonner": "^1.x",
  "lucide-react": "^0.x"
}
```

Si no están:
```bash
pnpm add framer-motion sonner
```

---

## 8. Configuración del sistema de imágenes (Auto Alarmas)

El módulo de Alarmas usa el hook `useImageFolder` para acceder a imágenes del sistema
`diagramas_pro` desde el sistema de archivos local. 

**Requerimientos del navegador:** File System Access API (Chrome/Edge modernos).

**Configuración post-integración:**
1. El SuperAdmin abre la sección de Alarmas
2. Hace click en "Seleccionar carpeta de imágenes"  
3. Navega hasta la raíz de `diagramas_optimized/` en su equipo
4. Confirma el acceso en el diálogo del navegador
5. Las imágenes quedan disponibles para todas las sesiones en ese navegador

Si la app base usa imágenes en un servidor (S3), `useImageFolder` deberá reemplazarse
por un hook que resuelva las URLs desde el storage. Ver `docs/ESQUEMA_DIAGRAMAS_PRO.md`
para el detalle de las rutas relativas que usa el sistema.

---

## 9. Migración futura a Supabase/Laravel

Cuando se conecte a base de datos real:

| Hook actual | Reemplazar por |
|---|---|
| `useKeycodeProfiles.ts` | Hook con `useQuery` + tabla `keycode_profiles` |
| `useToolAssignments.ts` | Hook con `useQuery` + tabla `tool_assignments` |
| `useVehicleDatabase.ts` | Hook con `useQuery` + tablas `vehicle_makes/vehicle_models/vehicle_years`; mantener importador JSON como flujo administrativo |
| `useAlarmaProfiles.ts` | Hook con `useQuery` + tabla `alarma_perfiles` |
| `useImmoProfiles.ts` | Hook con `useQuery` + tabla `immo_profiles` |
| `useImmoCatalog.ts` | Hook con `useQuery` + tabla `immo_catalog_items` |
| `useImageFolder.ts` | Resolver URLs desde S3/storage del servidor; reemplazar también los exports `getYearImageUrl`, `getFirstImageUrl`, `openImageFolder`, `clearImageFolder` |
| `useWorkshopAssignments` *(en `WorkshopAssignmentManager.tsx`)* | No es un archivo `.ts` separado — el hook vive embebido en el componente. Al migrar, reemplazar por `useQuery` + tabla `workshop_tools`; mover la lógica del hook a `/hooks/useWorkshopAssignments.ts` |

Ver esquema completo en `docs/CONTEXTO_PROYECTO.md` sección 7.

---

## Resumen rápido

```
1. Copiar: src/components/herramientas/  src/components/llaves/  src/data/  src/hooks/(todos)  src/types/
2. Agregar ruta /herramientas en el router
3. Cambiar import useWorkshop en 4 archivos (useDevContext → useWorkshop real):
   HerramientasModule, AssignmentManager, WorkshopAssignmentManager, WorkshopToolView
4. Corregir colores hardcoded en 6 archivos (ver paso 5):
   AlarmasWorkspace, WorkshopToolView, KeyPhotoDecoder, ImmoWorkspace, AlarmasManager, VehicleDatabaseManager
   + reemplazar <select> nativo en WorkshopToolView por <Select> de shadcn/ui
5. Verificar componentes UI disponibles (copiar los que falten)
6. Eliminar archivos dev: App.tsx, layout/Dev*, useDevContext
7. Configurar carpeta de imágenes diagramas_pro (primer uso de Alarmas)
```
