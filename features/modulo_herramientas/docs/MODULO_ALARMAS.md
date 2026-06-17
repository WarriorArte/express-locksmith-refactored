# Módulo Auto Alarmas — Documentación técnica

> Cubre la arquitectura completa del módulo: componentes, tipos de datos, flujo de
> importación desde diagramas_pro y convenciones de UI de la app base.

---

## Visión general

El módulo de Auto Alarmas permite gestionar y consultar **diagramas de conexión eléctrica**
para instalación de alarmas vehiculares. Los datos provienen del sistema `diagramas_pro`
(archivos `data.json`) e incluyen puntos de conexión, ubicaciones de cables, imágenes de
referencia y variaciones por año de fabricación.

---

## Componentes

### AlarmasManager.tsx (SuperAdmin)

Panel de administración para gestión de perfiles de alarma.

**Responsabilidades:**
- Listar perfiles de alarma existentes
- Importar nuevos perfiles desde archivos `data.json`
- Editar nombre/metadatos de un perfil
- Eliminar perfiles
- Configurar la carpeta de imágenes (`useImageFolder`)

**Props:**
```typescript
interface AlarmasManagerProps {
  profiles: AlarmaProfile[];
  onSave: (p: AlarmaProfile) => void;
  onUpdate: (id: string, updates: Partial<AlarmaProfile>) => void;
  onDelete: (id: string) => void;
  assignments: ToolAssignment[];
  onSaveAssignment: (a: ToolAssignment) => void;
  onUpdateAssignment: (a: ToolAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  vehicleDb: ReturnType<typeof useVehicleDatabase>;
}
```

El estado lo gestiona `HerramientasModule` y lo baja como props para compartirlo con otros managers (AssignmentManager también necesita las asignaciones).

**Hooks que usa:**
```typescript
// Internos (sin prop drilling):
const { folderName, openFolder } = useImageFolder();
```

---

### AlarmasWorkspace.tsx (Taller)

Vista de consulta para técnicos de taller. Muestra los puntos de conexión de un perfil
de alarma específico para el vehículo seleccionado.

**Props:**
```typescript
interface AlarmasWorkspaceProps {
  year: number;         // año del vehículo seleccionado
  make: string;         // marca
  model: string;        // modelo
  profileIds: string[]; // IDs de perfiles asignados a este vehículo
  allProfiles: AlarmaProfile[];
  onBack: () => void;
}
```

**Modos de vista:**
- **Buscar**: combobox de búsqueda libre + panel de detalle del punto seleccionado
- **Explorar**: chips de categoría + lista compacta de todos los puntos

**Funcionalidades:**
- Búsqueda de puntos por título, label o valor
- Categorización automática por tipo de sistema eléctrico
- Valores específicos por año del vehículo (`year_values`)
- Visualización de imágenes de referencia (con `useImageFolder`)
- Notas de variación (`image_variation`) y cobertura (`coverage`)
- Soporte multi-perfil (si hay más de un perfil para el vehículo, aparecen tabs)

---

## Flujo de datos

```
diagramas_pro/
└── Toyota/4Runner (Smart Key) 2010-2019/data.json
    │
    │ [Importación en AlarmasManager]
    ▼
AlarmaProfile (localStorage via useAlarmaProfiles)
    │
    │ [SuperAdmin asigna a vehículo en AssignmentManager]
    ▼
ToolAssignment.alarmaProfileIds[]
    │
    │ [Taller selecciona vehículo en WorkshopToolView]
    ▼
AlarmasWorkspace (recibe profileIds + allProfiles + year)
    │
    │ [useImageFolder resuelve rutas de imágenes]
    ▼
DataPointDetail (muestra info con imagen inline)
```

---

## Tipos de datos

Definidos en `src/types/index.ts`:

```typescript
// Perfil raíz (un data.json = un AlarmaProfile)
interface AlarmaProfile {
  id: string;
  nombre: string;       // ej: "Toyota 4Runner Smart Key"
  marca?: string;       // brand del JSON
  modelo?: string;      // base_model del JSON
  variante?: string;    // variant del JSON
  yearRange?: string;   // ej: "2010-2019"
  vehicleImages?: AlarmaVehicleImage[];
  dataValues: AlarmaDataValue[];
  dateAdded: string;
}

// Un punto de conexión eléctrica
interface AlarmaDataValue {
  id: string;
  title: string;           // ej: "12 Volts"
  details: AlarmaDetalle[];
  imageUrl?: string;       // base64 (legado) o URL directa
  yearImages?: AlarmaYearImage[];
  notes?: AlarmaNote[];
}

// Un campo de información del punto
interface AlarmaDetalle {
  id: string;
  label: string;           // "Cable" | "Polaridad" | "Ubicación"
  value: string;           // valor genérico
  yearValues?: AlarmaYearValue[];  // overrides por año
}

// Override de valor por año
interface AlarmaYearValue {
  years: string[];
  value: string;
}

// Imagen ligada a uno o varios años
interface AlarmaYearImage {
  sku: string;
  file: string;   // ruta relativa ej: "../../_images/SHARED-xxx.webp"
  years: string[];
}

// Nota de variación o advertencia de cobertura
interface AlarmaNote {
  id: string;
  type: 'image_variation' | 'coverage';
  title: string;
  text?: string;
  documented?: string[];
  probable?: string[];
}

// Imagen del vehículo (logo o foto por año)
interface AlarmaVehicleImage {
  sku: string;
  file: string;
  years: string[];
  kind: 'logo' | 'vehicle';
}
```

---

## Hook: useAlarmaProfiles

Gestiona el estado y persistencia de los perfiles de alarma.

```typescript
// Ubicación: src/hooks/useAlarmaProfiles.ts

const {
  profiles,               // AlarmaProfile[]
  addProfile,             // (p: AlarmaProfile) => void
  updateProfile,          // (id: string, updates: Partial<AlarmaProfile>) => void
  deleteProfile,          // (id: string) => void
} = useAlarmaProfiles();
```

**Almacenamiento:** `localStorage["herramientas:alarma_profiles"]`

---

## Hook: useImageFolder

Gestiona el acceso al directorio de imágenes del sistema `diagramas_pro`.

```typescript
// Ubicación: src/hooks/useImageFolder.ts

// Hook (reactivo — se suscribe a cambios de carpeta):
const { folderName, imageCount, isSupported, openFolder, clearFolder } = useImageFolder();
```

### Exports de módulo (no reactivos — usar directamente en componentes)

```typescript
import {
  getImageByFile,
  getYearImageUrl,
  getFirstImageUrl,
  openImageFolder,
  clearImageFolder,
} from "@/hooks/useImageFolder";

// Resuelve una ruta relativa a URL de imagen (blob URL en caché)
getImageByFile("../../_images/SHARED-xxx.webp");
// → string | null

// Resuelve la imagen correcta para un año concreto del vehículo
getYearImageUrl(dataValue.yearImages, 2015);
// → string | null  (toma la primera si ninguna cubre el año)

// Resuelve la primera imagen disponible (fallback sin año)
getFirstImageUrl(dataValue.yearImages);
// → string | null

// Abre el selector de carpeta (File System Access API)
await openImageFolder();
// → boolean (true si el usuario seleccionó carpeta)

// Libera la carpeta y revoca todos los blob URLs
clearImageFolder();
```

> **Crítico al migrar a S3/backend:** reemplazar los 5 exports, no solo el hook.
> `AlarmasWorkspace` usa directamente `getYearImageUrl` y `getFirstImageUrl`.
> Si solo se reemplaza `useImageFolder()` las imágenes por año dejarán de resolverse.

**Cómo funciona (modo local):**
1. El usuario selecciona la carpeta raíz de `diagramas_optimized/`
2. El navegador da acceso al sistema de archivos vía File System Access API
3. Se escanean y cachean todos los `.webp/.jpg/.png` en un `Map<filename, blobUrl>`
4. `getImageByFile(file)` extrae el filename de la ruta relativa y lo busca en el caché
5. Retorna un blob URL o `null` si la carpeta no está seleccionada

**Compatibilidad:** requiere navegador con File System Access API (Chrome/Edge modernos).

---

## Importación de data.json al sistema

### Proceso manual (actual)

La importación convierte un `data.json` de `diagramas_pro` en un `AlarmaProfile`:

```typescript
function importarDataJson(json: DiagramasProDataJson): AlarmaProfile {
  return {
    id: crypto.randomUUID(),
    nombre: `${json.brand} ${json.base_model} ${json.variant}`,
    marca: json.brand,
    modelo: json.base_model,
    variante: json.variant,
    yearRange: json.year_range,
    vehicleImages: json.vehicle_images.map((vi) => ({
      sku: vi.sku,
      file: vi.file,
      years: vi.years,
      kind: vi.kind,
    })),
    dataValues: json.dataValues.map((dv, i) => ({
      id: dv.id ?? `dv-${i}`,
      title: dv.title,
      details: dv.details.map((d, j) => ({
        id: `${dv.id}-d-${j}`,
        label: d.label,
        value: d.value,
        yearValues: d.year_values?.map((yv) => ({
          years: yv.years,
          value: yv.value,
        })),
      })),
      yearImages: dv.images?.map((img) => ({
        sku: img.sku,
        file: img.file,
        years: img.years,
      })),
      notes: dv.notes?.map((n, k) => ({
        id: `${dv.id}-n-${k}`,
        type: n.type as 'image_variation' | 'coverage',
        title: n.title,
        text: n.text,
        documented: n.documented,
        probable: n.probable,
      })),
    })),
    dateAdded: new Date().toISOString(),
  };
}
```

### Asignación a vehículo

Después de importar el perfil:

1. Ir a `AssignmentManager` (tab `asignacion` en SuperAdmin)
2. Crear o editar una asignación para la Marca/Modelo/Año correspondiente
3. Marcar `tools: ["alarmas"]`
4. Seleccionar el perfil de alarma recién importado en la lista de perfiles
5. Guardar

---

## Compliance con el UI kit de la app base

### Colores a corregir en AlarmasWorkspace.tsx al integrar

El componente actual usa algunos colores hardcodeados que deben reemplazarse con tokens semánticos:

| Actual (standalone) | Reemplazar por (app base) |
|---------------------|--------------------------|
| `bg-blue-50 dark:bg-blue-950/20` | `bg-primary/5` |
| `text-slate-500 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-800 dark:text-slate-100` | `text-foreground` |
| `border-blue-100 dark:border-blue-900/50` | `border-border` |
| `bg-blue-600 text-white` (tabs activos) | `bg-primary text-primary-foreground` |
| `bg-white/70 dark:bg-slate-800/60` | `bg-card` |
| `text-slate-600 dark:text-slate-400` | `text-muted-foreground` |
| `bg-amber-50 dark:bg-amber-950/20` (notas) | `bg-warning/10` (si existe) o mantener |
| `border-blue-300 dark:border-blue-700` | `border-primary/30` |
| `text-blue-600 dark:text-blue-400` | `text-primary` |

### Patrón de header de sección (en AlarmasWorkspace)

El header de `AlarmasWorkspace` usa una card azul personalizada. Al integrar, convertir a:

```tsx
// ANTES (hardcoded)
<Card className="bg-blue-50 dark:bg-blue-950/20 border-none shadow-sm rounded-[24px]">

// DESPUÉS (tokens semánticos)
<Card className="bg-primary/5 border-border shadow-sm">
```

---

## Categorías del sistema

El `AlarmasWorkspace` clasifica los puntos automáticamente según el `title` del `dataValue`.
La categorización es case-insensitive y busca coincidencia de subcadena:

```typescript
const CATEGORIES = [
  { id: "alimentacion", label: "Alimentación",
    keywords: ["12 volt", "ground", "starter", "ignition", "accessory"] },
  { id: "smartkey",     label: "Smart Key",
    keywords: ["pts", "slp"] },
  { id: "can",          label: "CAN / OBD",
    keywords: ["can bus", "obd", "rx data", "tx data", "immo data"] },
  { id: "cerraduras",   label: "Cerraduras",
    keywords: ["power lock", "power unlock", "lock motor", "driver unlock", "passenger unlock"] },
  { id: "puertas",      label: "Puertas",
    keywords: ["door trigger", "trunk/hatch", "hood pin", "trunk release"] },
  { id: "alarma",       label: "Alarma",
    keywords: ["factory alarm", "disarm no unlock", "security light"] },
  { id: "luces",        label: "Luces",
    keywords: ["parking light", "headlight", "turn signal", "hazard", "reverse light",
               "autolights", "dome light"] },
  { id: "audio",        label: "Audio",
    keywords: ["radio", "speaker", "tweeter", "amplifier"] },
  { id: "sensores",     label: "Sensores",
    keywords: ["speed sense", "tachometer", "brake wire", "fuel pump", "parking brake"] },
  { id: "confort",      label: "Confort",
    keywords: ["heated seat", "defroster", "wiper", "window", "sun roof"] },
  { id: "otros",        label: "Otros",    keywords: [] },
];
```

---

## Flujo completo de la vista taller

```
WorkshopToolView
├── Taller selecciona: Toyota → 4Runner → 2015
├── useToolAssignments filtra asignaciones para ese vehículo
├── Encuentra ToolAssignment con alarmaProfileIds: ["uuid-del-perfil"]
├── useWorkshopAssignments confirma que el taller tiene "alarmas" habilitado
└── Muestra botón "Auto Alarmas" → AlarmasWorkspace
    ├── Recibe: year=2015, make="Toyota", model="4Runner", profileIds=["uuid-del-perfil"]
    ├── Busca el AlarmaProfile en allProfiles
    ├── Muestra header: logo Toyota + foto 2015-2016 + nombre del perfil
    ├── Modo Buscar: combobox con 86 puntos de conexión
    └── Modo Explorar: chips de categoría → lista filtrada
        └── Al seleccionar un punto:
            ├── Muestra campos (Cable, Polaridad, Ubicación)
            ├── Si year=2015 tiene year_values → muestra valor específico del año
            ├── Si hay imágenes → carga con useImageFolder y muestra inline
            └── Si hay notas → muestra alertas de variación/cobertura
```
