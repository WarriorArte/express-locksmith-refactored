# Módulo Immo Info — Documentación técnica

> Cubre la arquitectura completa del módulo de inmovilizadores: componentes,
> tipos de datos, catálogo de equipos y flujo de datos.

---

## Visión general

El módulo Immo Info gestiona información técnica sobre **controles remotos e inmovilizadores**
de vehículos. Permite al SuperAdmin registrar perfiles de remoto (FCC ID, frecuencia, batería,
generación) y asignarles datos específicos por vehículo (transponder, método de programación,
equipos necesarios). El taller consulta esta información después de seleccionar su vehículo.

---

## Componentes

### ImmoManager.tsx (SuperAdmin)

CRUD de perfiles de remoto/inmovilizador.

**Responsabilidades:**
- Listar perfiles immo existentes
- Crear nuevo perfil (marca, FCC ID, frecuencia, batería, imagen principal)
- Editar campos de generación del remoto (`generacionRemoto: ImmoGenField[]`)
- Eliminar perfiles

**Hooks que usa:**
```typescript
const { profiles, addProfile, updateProfile, deleteProfile } = useImmoProfiles();
```

---

### ImmoAssignmentManager.tsx (SuperAdmin)

Asigna perfiles immo a vehículos con datos específicos por asignación.

**Responsabilidades:**
- Seleccionar Marca/Modelo/Año (reutiliza `VehicleDatabaseManager` data)
- Para cada vehículo: vincular uno o varios perfiles immo
- Configurar por perfil + vehículo:
  - Transponder
  - Método de programación (manual, OBD, ambos)
  - Procedimiento de programación (texto libre)
  - Equipos necesarios (selección desde catálogo)

**Datos que modifica:** `ToolAssignment.immoDetails: ImmoAssignmentDetail[]`

---

### ImmoWorkspace.tsx (Taller)

Vista de consulta para técnicos. Muestra la info de immo del vehículo seleccionado.

**Props:**
```typescript
interface ImmoWorkspaceProps {
  profile: ImmoProfile;                           // perfil ya resuelto por WorkshopToolView
  detail: ImmoAssignmentDetail | null;            // detalle ya resuelto para este vehículo
  catalog: ImmoCatalogItem[];                     // catálogo completo para resolver IDs
  vehicle?: { year: number; make: string; model: string };  // info del vehículo (header)
  onBack: () => void;
}
```

`WorkshopToolView` resuelve el `ImmoProfile` activo y su `ImmoAssignmentDetail` antes de
renderizar `ImmoWorkspace`. El workspace no hace lookup interno — recibe los datos pre-resueltos.

**Layout:**
- Header sticky con botón Back + título del vehículo
- Imagen del remote + datos base (marca, FCC, frecuencia, batería)
- Campos de generación del remoto (`generacionRemoto`)
- Equipos de generación de transponder (con imagen)
- Equipos de programación remoto y transponder (con imagen)
- Método de programación (chips: Manual / OBD)
- Procedimiento de programación (texto)

---

### ImmoSuppliesManager.tsx (SuperAdmin)

Gestión del catálogo centralizado de equipos e insumos para programación immo.

**Responsabilidades:**
- Listar items del catálogo divididos por categoría (`equipo` / `transponder`)
- Agregar nuevo item (label + imagen + categoría)
- Editar label o imagen de un item existente
- Eliminar items
- Reordenar items mediante drag-and-drop

**Hook que usa:**
```typescript
const {
  catalog,          // ImmoCatalogItem[]
  addItem,          // (item: Omit<ImmoCatalogItem, 'id'>) => void
  updateItem,       // (id: string, updates: Partial<ImmoCatalogItem>) => void
  deleteItem,       // (id: string) => void
  reorderItems,     // (category: string, newOrder: ImmoCatalogItem[]) => void
} = useImmoCatalog();
```

---

## Tipos de datos

Definidos en `src/types/index.ts`:

```typescript
// Item del catálogo centralizado
interface ImmoCatalogItem {
  id: string;
  label: string;            // ej: "XT27", "KD26", "IM508"
  image?: string;           // base64 de la imagen del equipo/transponder
  category: 'equipo' | 'transponder';
}

// Campo de "generación" del remote — flexible, definido por el SuperAdmin
interface ImmoGenField {
  id: string;
  label: string;   // ej: "Generación", "FCC ID Range", "Parte"
  value: string;   // ej: "G7", "FWY-1U5C-433", "88835-08010"
}

// Perfil del remote — datos independientes del vehículo
interface ImmoProfile {
  id: string;
  marca: string;            // ej: "Toyota", "Lexus"
  fccId: string;            // ej: "HYQ12BEL"
  frecuencia: string;       // ej: "315 MHz", "433.92 MHz"
  bateria: string;          // ej: "CR2032"
  mainImage?: string;       // base64 de la foto del control
  generacionRemoto: ImmoGenField[];
  dateAdded: string;
}

// Datos específicos de un ImmoProfile para un vehículo concreto
interface ImmoAssignmentDetail {
  profileId: string;                  // FK → ImmoProfile.id
  transponder: string;                // ej: "Texas Crypto (128 bit)"
  generadoConIds: string[];           // ImmoCatalogItem IDs (equipos para generación)
  equiposRemotoIds: string[];         // ImmoCatalogItem IDs (equipos programación remote)
  equiposTransponderIds: string[];    // ImmoCatalogItem IDs (equipos programación transponder)
  programacionManual: boolean;
  programacionOBD: boolean;
  procedimientoProgramacion: string;  // texto del procedimiento
}
```

---

## Flujo de datos

```
SuperAdmin crea catálogo de equipos
    → useImmoCatalog → localStorage["herramientas:immo_catalog"]
    Ejemplos: XT27, KD26, AT100, CK100, T300, KM100, IM508/608, KTPLUS, KTPAD

SuperAdmin crea perfil immo (por FCC ID)
    → useImmoProfiles → localStorage["herramientas:immo_profiles"]

SuperAdmin asigna perfil a vehículo (ImmoAssignmentManager)
    → useToolAssignments → ToolAssignment.immoDetails[]
    Datos por vehículo: transponder, equipos, procedimiento

Taller selecciona vehículo (WorkshopToolView)
    → Filtra ToolAssignment con immoDetails para ese vehículo
    → Muestra botón "Immo Info" → ImmoWorkspace
    → Resuelve perfiles e items del catálogo por ID
    → Muestra info completa del remote para ese vehículo
```

---

## Hook: useImmoProfiles

```typescript
// Ubicación: src/hooks/useImmoProfiles.ts

const {
  profiles,           // ImmoProfile[]
  addProfile,         // (p: ImmoProfile) => void
  updateProfile,      // (id: string, updates: Partial<ImmoProfile>) => void
  deleteProfile,      // (id: string) => void
} = useImmoProfiles();
```

**Almacenamiento:** `localStorage["herramientas:immo_profiles"]`

**Migración automática:** Al cargar, el hook verifica y completa campos faltantes en perfiles
guardados con versiones anteriores del formato (añade `generacionRemoto: []` si falta).

---

## Hook: useImmoCatalog

```typescript
// Ubicación: src/hooks/useImmoCatalog.ts

const {
  catalog,            // ImmoCatalogItem[]
  addItem,
  updateItem,
  deleteItem,
  reorderItems,
} = useImmoCatalog();
```

**Almacenamiento:** `localStorage["herramientas:immo_catalog"]`

**Catálogo por defecto (9 items):**
| Label | Categoría |
|-------|-----------|
| XT27 | transponder |
| KD26 | transponder |
| AT100 | transponder |
| CK100 | equipo |
| T300 | equipo |
| KM100 | equipo |
| IM508/608 | equipo |
| KTPLUS | equipo |
| KTPAD | equipo |

---

## Integración en ToolAssignment

Los datos immo viven en `ToolAssignment.immoDetails`:

```typescript
interface ToolAssignment {
  // ...otros campos...
  immoDetails?: ImmoAssignmentDetail[];
}
```

**Migración de legado:** El hook `useToolAssignments` detecta la propiedad obsoleta
`immoProfileIds?: string[]` y la convierte automáticamente a `immoDetails` con valores vacíos
en el primer acceso.

---

## Flujo completo de la vista taller

```
WorkshopToolView
├── Taller selecciona: Lexus → ES350 → 2019
├── useToolAssignments filtra asignaciones
├── Encuentra ToolAssignment con immoDetails: [{profileId: "...", transponder: "..."}]
├── useWorkshopAssignments confirma que el taller tiene "immo" habilitado
├── Muestra cards de perfiles immo disponibles para ese vehículo
├── Taller selecciona un perfil → WorkshopToolView resuelve:
│   ├── immoProfile  = immoProfiles.find(p => p.id === activeImmoProfileId)
│   └── immoDetail   = immoDetails.find(d => d.profileId === activeImmoProfileId)
└── Renderiza ImmoWorkspace con props pre-resueltas:
    ├── profile  → ImmoProfile (imagen, marca, FCC, frecuencia, batería, generacionRemoto)
    ├── detail   → ImmoAssignmentDetail | null (transponder, equipos, programación)
    ├── catalog  → ImmoCatalogItem[] (para resolver IDs de equipos a objetos con imagen)
    └── vehicle  → { year: 2019, make: "Lexus", model: "ES350" } (para header)

    ImmoWorkspace muestra:
    ├── Header: año + marca + modelo del vehículo
    ├── Imagen del remote + datos base (FCC, frecuencia, batería)
    ├── generacionRemoto (campos flexibles definidos por el SuperAdmin)
    ├── transponder del vehículo
    ├── Equipos generadoConIds → ImmoCatalogItem[] (con imagen)
    ├── Equipos equiposRemotoIds → ImmoCatalogItem[] (con imagen)
    ├── Equipos equiposTransponderIds → ImmoCatalogItem[] (con imagen)
    ├── Chips: Manual / OBD
    └── procedimientoProgramacion (texto)

Múltiples perfiles: si el vehículo tiene varios ImmoAssignmentDetail, WorkshopToolView
muestra una card por perfil y el taller elige cuál ver antes de abrir el workspace.
```

---

## Compliance con el UI kit de la app base

### Tokens de color en ImmoWorkspace

`ImmoWorkspace.tsx` usa casi completamente tokens semánticos. Único color hardcoded a corregir:

| Actual | Reemplazar por |
|---|---|
| `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800` (chip de método programación) | `bg-primary/10 text-primary border-primary/30` |

> Ver también `docs/INTEGRACION.md` paso 5 para la lista completa de todos los archivos
> con colores hardcoded.

### ImmoSuppliesManager — drag and drop

Usa drag-and-drop para reordenar. Verificar que la librería usada esté disponible en la app base
o incluirla. Si la app base no tiene una librería de DnD, el reordenamiento puede implementarse
con botones de subir/bajar como alternativa.
