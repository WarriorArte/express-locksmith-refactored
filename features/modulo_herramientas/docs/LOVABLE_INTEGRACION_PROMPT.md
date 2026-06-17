# Integración — Módulo Herramientas → LockMaster Pro

Integra el módulo **Herramientas** (express-locksmith-companion) en esta app (LockMaster Pro).
El módulo es un standalone de desarrollo completamente funcional; solo hay que copiarlo,
rewirear imports, corregir colores y conectar los puntos de integración correctos.
NO inventar ni modificar funciones existentes. NO agregar estados globales innecesarios.

---

## ARCHIVOS A COPIAR

### Componentes del módulo
```
src/components/herramientas/HerramientasModule.tsx
src/components/herramientas/KeycodeManager.tsx
src/components/herramientas/AssignmentManager.tsx
src/components/herramientas/WorkshopAssignmentManager.tsx
src/components/herramientas/VehicleDatabaseManager.tsx
src/components/herramientas/WorkshopToolView.tsx
src/components/herramientas/KeycodeWorkspace.tsx
src/components/herramientas/KeyPhotoDecoder.tsx
src/components/herramientas/AlarmasManager.tsx
src/components/herramientas/AlarmasWorkspace.tsx
src/components/herramientas/ImmoManager.tsx          ← también exporta ImmoAssignmentManager
src/components/herramientas/ImmoSuppliesManager.tsx
src/components/herramientas/ImmoWorkspace.tsx
```

### Dependencia crítica de Keycode — copiar carpeta entera
```
src/components/llaves/GeneradorLlaveSVG.tsx
src/components/llaves/LlaveSimetricaDobleLado.tsx
src/components/llaves/LlaveEstandarUnLado.tsx
src/components/llaves/LlaveDobleEjeExterior.tsx
src/components/llaves/LlaveDobleEjeInterior.tsx
src/components/llaves/LlavePistaCanalUnificada.tsx
src/components/llaves/LlavePistaSemiCanal.tsx
src/components/llaves/LlaveUnEjeLateral.tsx
src/components/llaves/InputCorteSVG.tsx
```

### Hooks (localStorage — se migran a BD en el Paso 7)
```
src/hooks/useKeycodeProfiles.ts
src/hooks/useToolAssignments.ts
src/hooks/useVehicleDatabase.ts
src/hooks/useAlarmaProfiles.ts
src/hooks/useImmoProfiles.ts
src/hooks/useImmoCatalog.ts
src/hooks/useImageFolder.ts
```

> `useWorkshopAssignments` NO es un archivo en /hooks/ — está embebido y exportado
> desde `WorkshopAssignmentManager.tsx`. Ya viene incluido al copiar esa carpeta.

### Datos
```
src/data/tools.ts       ← AVAILABLE_TOOLS array (keycode, immo, alarmas)
src/data/carDatabase.ts ← seed de vehículos solo para desarrollo/reset
```

### Tipos TypeScript
Agregar al archivo de tipos de la app base (`src/types/index.ts` o equivalente).
Si la app base ya define `Workshop`, NO redefinirla.

```typescript
// ── Keycode ───────────────────────────────────────────────────────────────────
export interface KeyReference { id: number; brand: string; refCode: string; isPrimary: boolean; }
export interface DepthMapping { [key: string]: string; }
export interface AxisConfig { label: string; length: number; }
export interface BittingConfig { length: number; maxDepth: number; depthMapping?: DepthMapping; axes?: AxisConfig[]; }
export interface CodeEntry { codigo: string; bitting: string[]; }
export type TipoLlaveSVG = 'doble_lado'|'estandar_1_lado'|'2_ejes_exterior'|'2_ejes_internos'|'pista_canal'|'pista_semi_canal'|'1_eje_lateral';
export interface ConfiguracionVisualLlave { tipo: TipoLlaveSVG; shoulderDrop?: number; grosorLlave: number; maxDepth: number; distanciaHombro: number; spacing: number; distanciaPunta: number; depthStep?: number; valleyWidth?: number; crestWidth?: number; biselPunta?: number; anclaYPorcentaje?: number; separacionBase?: number; profundidadActiva?: number; anchoPlanoActivo?: number; dinamismoActivo?: number; profSup?: number; anchoSup?: number; dinamismoSup?: number; profInf?: number; anchoInf?: number; dinamismoInf?: number; orientacion?: 'inferior'|'superior'; }
export type DecoderTipoLlave = 'estandar_doble'|'estandar_un'|'dos_ejes_exterior'|'dos_ejes_interior'|'pista_canal'|'1_eje_lateral';
export type DecoderAlineacion = 'punta'|'hombro';
export type DecoderLado = 'izq'|'der';
export interface DecoderConfig { tipoLlave: DecoderTipoLlave; alineacion: DecoderAlineacion; ladoEstandarUn: DecoderLado; anchoLlave: number; profundidades: number[]; distanciasCortes: number[]; distanciasCortesDer: number[]; escalaPixelMm: number; }
export interface KeycodeProfile { id: string; references: KeyReference[]; icCard: string; series: string; bittingConfig: BittingConfig; codesData: CodeEntry[]; dateAdded: string; configuracionVisual?: ConfiguracionVisualLlave; profileImage?: string; decoderConfig?: DecoderConfig; }

// ── Shared ────────────────────────────────────────────────────────────────────
export type LockKey = 'ignicion'|'puerta'|'guantera'|'maletero'|'compuerta'|'gas';
export const LOCK_LABELS: Record<LockKey,string> = { ignicion:'Ignición', puerta:'Puerta', guantera:'Guantera', maletero:'Maletero', compuerta:'Compuerta', gas:'Gas' };
export const LOCK_ORDER: LockKey[] = ['ignicion','puerta','guantera','maletero','compuerta','gas'];
export type LockSelectionsMap = Record<string, Partial<Record<LockKey, boolean[]>>>;

export interface ToolAssignment {
  id: string; make: string; model: string; yearStart: number; yearEnd: number;
  tools: string[]; workshops: string[]; dateAdded: string;
  keycodeProfileId?: string | null;
  keycodeProfileIds: string[];
  lockSelections?: LockSelectionsMap;
  alarmaProfileIds?: string[];
  immoProfileIds?: string[];
  immoDetails?: ImmoAssignmentDetail[];
}

// ── Immo ──────────────────────────────────────────────────────────────────────
export interface ImmoCatalogItem { id: string; label: string; image?: string; category: 'equipo'|'transponder'; }
export interface ImmoGenField { id: string; label: string; value: string; }
export interface ImmoProfile { id: string; marca: string; fccId: string; frecuencia: string; bateria: string; mainImage?: string; generacionRemoto: ImmoGenField[]; dateAdded: string; }
export interface ImmoAssignmentDetail { profileId: string; transponder: string; generadoConIds: string[]; equiposRemotoIds: string[]; equiposTransponderIds: string[]; programacionManual: boolean; programacionOBD: boolean; procedimientoProgramacion: string; }

// ── Alarmas ───────────────────────────────────────────────────────────────────
export interface AlarmaYearValue { years: string[]; value: string; }
export interface AlarmaDetalle { id: string; label: string; value: string; yearValues?: AlarmaYearValue[]; }
export interface AlarmaNote { id: string; type: 'image_variation'|'coverage'; title: string; text?: string; documented?: string[]; probable?: string[]; }
export interface AlarmaYearImage { sku: string; file: string; years: string[]; }
export interface AlarmaDataValue { id: string; title: string; details: AlarmaDetalle[]; imageUrl?: string; yearImages?: AlarmaYearImage[]; notes?: AlarmaNote[]; }
export interface AlarmaVehicleImage { sku: string; file: string; years: string[]; kind: 'logo'|'vehicle'; }
export interface AlarmaProfile { id: string; nombre: string; marca?: string; modelo?: string; variante?: string; yearRange?: string; vehicleImages?: AlarmaVehicleImage[]; dataValues: AlarmaDataValue[]; dateAdded: string; }
```

---

## PASO 1 — Cambiar import useWorkshop (4 archivos exactos)

En ESTOS 4 archivos, cambiar:
```tsx
// ANTES
import { useWorkshop } from "@/hooks/useDevContext";
// DESPUÉS
import { useWorkshop } from "@/hooks/useWorkshop";
```

Archivos afectados (verificado — exactamente estos 4, no más):
- `HerramientasModule.tsx`
- `AssignmentManager.tsx`
- `WorkshopAssignmentManager.tsx`
- `WorkshopToolView.tsx`

El hook `useWorkshop` de la app base debe exponer como mínimo:
`currentWorkshop`, `workshops`, `isSuperAdmin`

---

## PASO 2 — Registrar ruta /herramientas (Workshop)

La ruta `/herramientas` ya existe en el sidebar de la app base con `featureKey: null`
(siempre visible). Asegurarse de que el archivo que mapea esa ruta renderice el módulo:

```tsx
import { HerramientasModule } from "@/components/herramientas/HerramientasModule";

export default function Herramientas() {
  return <HerramientasModule />;
}
```

Cuando `isSuperAdmin === false` → renderiza `WorkshopToolView` (responsive, para taller).
Cuando `isSuperAdmin === true` → renderiza el panel de administración con tabs.

---

## PASO 3 — Integrar en SuperAdmin

En `SuperAdmin.tsx` agregar un nuevo tab "Herramientas" que controla el panel admin.
`HerramientasModule` acepta `superAdminView` para que el parent maneje la navegación.
Los valores posibles: `"asignacion" | "keycode" | "immo" | "alarmas" | "vehiculos"`.

```tsx
import { HerramientasModule, type SuperAdminHerramientasView } from "@/components/herramientas/HerramientasModule";

// Estado en SuperAdmin:
const [herramientasView, setHerramientasView] = useState<SuperAdminHerramientasView>("asignacion");

// En el body del tab "Herramientas":
<HerramientasModule superAdminView={herramientasView} />
```

Qué hace cada sub-tab:
- `asignacion` → WorkshopAssignmentManager (qué talleres tienen qué herramientas)
- `keycode`    → KeycodeManager + AssignmentManager (CRUD perfiles + asignación vehículos)
- `immo`       → ImmoManager + ImmoAssignmentManager + ImmoSuppliesManager
- `alarmas`    → AlarmasManager (importar data.json de diagramas_pro)
- `vehiculos`  → VehicleDatabaseManager (CRUD marcas/modelos/años)

Si se pasa `superAdminView={undefined}`, el módulo maneja sus propios tabs internamente.

---

## PASO 4 — Corregir colores hardcoded (6 archivos)

### 4a. AlarmasWorkspace.tsx

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

### 4b. WorkshopToolView.tsx

| Clase actual | Reemplazar por |
|---|---|
| `bg-blue-50 dark:bg-blue-950/20` (card buscador) | `bg-primary/5` |
| `bg-blue-600 text-white` (icono + chips activos) | `bg-primary text-primary-foreground` |
| `border-blue-600` | `border-primary` |
| `hover:border-blue-300` | `hover:border-primary/40` |
| `text-slate-500 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-700 dark:text-slate-300` (labels) | `text-foreground` |
| `text-slate-800 dark:text-slate-100` | `text-foreground` |
| `text-blue-600 dark:text-blue-400` | `text-primary` |
| `bg-blue-500/10` | `bg-primary/10` |
| `text-blue-500/40` | `text-primary/40` |
| `group-hover:border-blue-400/70` | `group-hover:border-primary/40` |

Además, reemplazar los 3 `<select>` nativos (Año, Marca, Modelo) por el componente
`<Select>` de shadcn/ui para consistencia con el design system:

```tsx
<Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)||""); setSelectedMake(""); setSelectedModel(""); }}>
  <SelectTrigger><SelectValue placeholder="-- Año --" /></SelectTrigger>
  <SelectContent>
    {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
  </SelectContent>
</Select>
```

### 4c. KeyPhotoDecoder.tsx — 27 ocurrencias

Aplicar tabla general: `bg-blue-*` → `bg-primary/*` · `text-blue-*` → `text-primary`
· `text-slate-*` → `text-foreground` / `text-muted-foreground` · `bg-white` → `bg-card`
· `border-blue-*` → `border-primary/30`

### 4d. ImmoWorkspace.tsx

| Clase actual | Reemplazar por |
|---|---|
| `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800` (chips Manual/OBD) | `bg-primary/10 text-primary border-primary/30` |

### 4e. AlarmasManager.tsx

| Clase actual | Reemplazar por |
|---|---|
| `bg-white` (imagen preview) | `bg-card` |
| `bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300` | `bg-primary/5 border-primary/20 text-primary` |

### 4f. VehicleDatabaseManager.tsx

| Clase actual | Reemplazar por |
|---|---|
| `bg-blue-100 text-blue-700 border-blue-200 ...` (badge Vehiculo) | `bg-primary/10 text-primary border-primary/20` |
| `bg-slate-800 text-white border-slate-800` (chip "Todos" activo) | `bg-primary text-primary-foreground border-primary` |
| `hover:border-slate-400` | `hover:border-border` |

---

## PASO 5 — Archivos dev que NO se copian

```
src/App.tsx
src/main.tsx
src/components/layout/DevLayout.tsx
src/components/layout/DevSidebar.tsx
src/hooks/useDevContext.tsx
```

---

## PASO 6 — Verificar dependencias npm

```bash
pnpm add framer-motion sonner   # si no están en la app base
```

`lucide-react` ya debe estar. Si faltan componentes shadcn/ui (`dropdown-menu`, `tooltip`),
copiar desde `src/components/ui/` del módulo fuente.

---

## PASO 7 — Migraciones Laravel (MariaDB) — 19 tablas en orden

### 001_create_tool_files_table.php
```php
Schema::create('tool_files', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('disk', 50)->default('public');
    $table->string('path', 500);
    $table->string('original_name', 255)->nullable();
    $table->string('mime_type', 100)->nullable();
    $table->unsignedBigInteger('size_bytes')->nullable();
    $table->char('checksum_sha256', 64)->nullable();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->unique(['disk', 'path']);
    $table->index('checksum_sha256');
});
```

### 002_create_workshop_tools_table.php
```php
Schema::create('workshop_tools', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workshop_id')->constrained('workshops')->cascadeOnDelete();
    $table->enum('tool_id', ['keycode', 'immo', 'alarmas']);
    $table->boolean('enabled')->default(true);
    $table->timestamps();
    $table->unique(['workshop_id', 'tool_id']);
    $table->index('tool_id');
});
```

### 003_create_vehicle_makes_table.php
```php
Schema::create('vehicle_makes', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('name', 120);
    $table->string('name_norm', 120)->unique();
    $table->enum('category', ['Vehiculo', 'Camion', 'Motocicleta'])->default('Vehiculo');
    $table->unsignedInteger('sort_order')->nullable();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->index(['category', 'name_norm']);
});
```

### 004_create_vehicle_models_table.php
```php
Schema::create('vehicle_models', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('make_id')->constrained('vehicle_makes')->cascadeOnDelete();
    $table->string('name', 180);
    $table->string('name_norm', 180);
    $table->unsignedInteger('sort_order')->nullable();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->unique(['make_id', 'name_norm']);
    $table->index('name_norm');
});
```

### 005_create_vehicle_years_table.php
```php
Schema::create('vehicle_years', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('model_id')->constrained('vehicle_models')->cascadeOnDelete();
    $table->unsignedSmallInteger('year');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->unique(['model_id', 'year']);
    $table->index('year');
});
```

### 006_create_vehicle_import_batches_table.php
```php
Schema::create('vehicle_import_batches', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('original_name', 255)->nullable();
    $table->enum('category', ['Vehiculo', 'Camion', 'Motocicleta']);
    $table->unsignedInteger('total_rows')->default(0);
    $table->unsignedInteger('valid_rows')->default(0);
    $table->unsignedInteger('created_makes')->default(0);
    $table->unsignedInteger('created_models')->default(0);
    $table->unsignedInteger('created_years')->default(0);
    $table->unsignedInteger('skipped_existing')->default(0);
    $table->unsignedInteger('updated_existing')->default(0);
    $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
    $table->text('error_message')->nullable();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->index('status');
});
```

### 007_create_keycode_profiles_table.php
```php
Schema::create('keycode_profiles', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('ic_card', 120)->nullable();
    $table->string('series', 120)->nullable();
    $table->unsignedTinyInteger('bitting_length');
    $table->unsignedTinyInteger('bitting_max_depth');
    $table->json('bitting_depth_mapping')->nullable();
    $table->json('bitting_axes')->nullable();
    $table->json('visual_config')->nullable();
    $table->json('decoder_config')->nullable();
    $table->foreignId('profile_image_file_id')->nullable()->constrained('tool_files')->nullOnDelete();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->index('ic_card');
    $table->index('series');
});
```

### 008_create_keycode_references_table.php
```php
Schema::create('keycode_references', function (Blueprint $table) {
    $table->id();
    $table->foreignId('keycode_profile_id')->constrained('keycode_profiles')->cascadeOnDelete();
    $table->string('brand', 120);
    $table->string('ref_code', 120);
    $table->boolean('is_primary')->default(false);
    $table->unsignedInteger('sort_order')->default(0);
    $table->timestamps();
    $table->unique(['keycode_profile_id', 'brand', 'ref_code']);
    $table->index(['brand', 'ref_code']);
});
```

### 009_create_keycode_codes_table.php
```php
Schema::create('keycode_codes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('keycode_profile_id')->constrained('keycode_profiles')->cascadeOnDelete();
    $table->string('codigo', 80);
    $table->json('bitting');
    $table->timestamps();
    $table->unique(['keycode_profile_id', 'codigo']);
    $table->index('codigo');
});
```

### 010_create_tool_assignments_table.php
```php
Schema::create('tool_assignments', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('vehicle_make_id')->constrained('vehicle_makes')->restrictOnDelete();
    $table->foreignId('vehicle_model_id')->constrained('vehicle_models')->restrictOnDelete();
    $table->unsignedSmallInteger('year_start');
    $table->unsignedSmallInteger('year_end');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->index(['vehicle_make_id', 'vehicle_model_id', 'year_start', 'year_end']);
    $table->index(['vehicle_model_id', 'year_start', 'year_end']);
});
```

### 011_create_tool_assignment_tools_table.php
```php
Schema::create('tool_assignment_tools', function (Blueprint $table) {
    $table->foreignId('tool_assignment_id')->constrained('tool_assignments')->cascadeOnDelete();
    $table->enum('tool_id', ['keycode', 'immo', 'alarmas']);
    $table->timestamps();
    $table->primary(['tool_assignment_id', 'tool_id']);
    $table->index('tool_id');
});
```

### 012_create_tool_assignment_workshops_table.php
```php
Schema::create('tool_assignment_workshops', function (Blueprint $table) {
    $table->foreignId('tool_assignment_id')->constrained('tool_assignments')->cascadeOnDelete();
    $table->foreignId('workshop_id')->constrained('workshops')->cascadeOnDelete();
    $table->timestamps();
    $table->primary(['tool_assignment_id', 'workshop_id']);
});
```

### 013_create_tool_assignment_keycode_profiles_table.php
```php
Schema::create('tool_assignment_keycode_profiles', function (Blueprint $table) {
    $table->foreignId('tool_assignment_id')->constrained('tool_assignments')->cascadeOnDelete();
    $table->foreignId('keycode_profile_id')->constrained('keycode_profiles')->cascadeOnDelete();
    $table->json('lock_selections')->nullable();
    $table->timestamps();
    $table->primary(['tool_assignment_id', 'keycode_profile_id']);
});
```

### 014_create_alarma_perfiles_table.php
```php
Schema::create('alarma_perfiles', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('nombre', 180);
    $table->string('marca', 120)->nullable();
    $table->string('modelo', 160)->nullable();
    $table->string('variante', 160)->nullable();
    $table->string('year_range', 80)->nullable();
    $table->string('schema_version', 20)->nullable();
    $table->json('data_values');
    $table->json('vehicle_images')->nullable();
    $table->char('source_checksum', 64)->nullable();
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->index(['marca', 'modelo']);
    $table->index('source_checksum');
});
```

### 015_create_alarma_asignaciones_table.php
```php
Schema::create('alarma_asignaciones', function (Blueprint $table) {
    $table->foreignId('tool_assignment_id')->constrained('tool_assignments')->cascadeOnDelete();
    $table->foreignId('alarma_perfil_id')->constrained('alarma_perfiles')->cascadeOnDelete();
    $table->timestamps();
    $table->primary(['tool_assignment_id', 'alarma_perfil_id']);
});
```

### 016_create_immo_catalog_items_table.php
```php
Schema::create('immo_catalog_items', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('label', 120);
    $table->enum('category', ['equipo', 'transponder']);
    $table->foreignId('image_file_id')->nullable()->constrained('tool_files')->nullOnDelete();
    $table->unsignedInteger('sort_order')->default(0);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->unique(['category', 'label']);
    $table->index(['category', 'sort_order']);
});
```

### 017_create_immo_profiles_table.php
```php
Schema::create('immo_profiles', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->string('marca', 120)->nullable();
    $table->string('fcc_id', 120)->nullable();
    $table->string('frecuencia', 80)->nullable();
    $table->string('bateria', 80)->nullable();
    $table->foreignId('main_image_file_id')->nullable()->constrained('tool_files')->nullOnDelete();
    $table->json('generacion_remoto');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->index('marca');
    $table->index('fcc_id');
});
```

### 018_create_immo_assignment_details_table.php
```php
Schema::create('immo_assignment_details', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('tool_assignment_id')->constrained('tool_assignments')->cascadeOnDelete();
    $table->foreignId('immo_profile_id')->constrained('immo_profiles')->cascadeOnDelete();
    $table->string('transponder', 120)->nullable();
    $table->boolean('programacion_manual')->default(false);
    $table->boolean('programacion_obd')->default(false);
    $table->text('procedimiento_programacion')->nullable();
    $table->timestamps();
    $table->unique(['tool_assignment_id', 'immo_profile_id']);
    $table->index('immo_profile_id');
});
```

### 019_create_immo_assignment_catalog_items_table.php
```php
Schema::create('immo_assignment_catalog_items', function (Blueprint $table) {
    $table->foreignId('immo_assignment_detail_id')->constrained('immo_assignment_details')->cascadeOnDelete();
    $table->foreignId('immo_catalog_item_id')->constrained('immo_catalog_items')->cascadeOnDelete();
    $table->enum('role', ['generado_con', 'equipo_remoto', 'equipo_transponder']);
    $table->timestamps();
    $table->primary(['immo_assignment_detail_id', 'immo_catalog_item_id', 'role']);
    $table->index(['immo_catalog_item_id', 'role']);
});
```

---

## PASO 8 — Endpoints Laravel mínimos

Registrar en `routes/api.php` bajo prefijo `/api/v1` con middleware `auth:sanctum`.

```
GET  PUT   /workshops/{uuid}/tools

GET  POST  /vehicles/makes
PUT  DELETE /vehicles/makes/{uuid}
GET  POST  /vehicles/makes/{uuid}/models
GET        /vehicles/models/{uuid}/years
POST       /vehicles/import-json

GET  POST  /keycode/profiles
GET  PUT   DELETE /keycode/profiles/{uuid}
POST       /keycode/profiles/{uuid}/image

GET  POST  /tool-assignments
GET  PUT   DELETE /tool-assignments/{uuid}

GET  POST  /alarmas/perfiles
GET  PUT   DELETE /alarmas/perfiles/{uuid}
POST       /alarmas/import-json

GET  POST  /immo/catalog
PUT  DELETE /immo/catalog/{uuid}
GET  POST  /immo/profiles
GET  PUT   DELETE /immo/profiles/{uuid}

GET  /taller/vehicles
GET  /taller/keycode?make_uuid=&model_uuid=&year=
GET  /taller/alarmas?make_uuid=&model_uuid=&year=
GET  /taller/immo?make_uuid=&model_uuid=&year=
```

Validar en todos los endpoints de taller que el workshop autenticado tenga
`workshop_tools.enabled = 1` para la herramienta solicitada antes de responder.

---

## CHECKLIST — No se puede perder ninguna de estas funciones

### Keycode
- [ ] Búsqueda de código → bitting con visualización SVG de la llave
- [ ] Decodificador por foto (KeyPhotoDecoder) con calibración por tipo de llave
- [ ] CRUD perfiles (referencias, IC card, series, configuración visual, decoder config)
- [ ] Asignación a rango Marca/Modelo/Año con selección de cerraduras por corte (LockSelections)

### Auto Alarmas
- [ ] Importar data.json schema v7.3 → convierte a AlarmaProfile
- [ ] Detección de reimportación por checksum
- [ ] Búsqueda de puntos por título/label/valor (combobox + modo explorar)
- [ ] Categorización automática por keywords (11 categorías)
- [ ] Valores específicos por año (year_values)
- [ ] Imágenes por año del vehículo (getYearImageUrl / getFirstImageUrl)
- [ ] Notas de variación (image_variation) y cobertura (coverage)
- [ ] Soporte multi-perfil por vehículo (tabs cuando hay más de 1)
- [ ] Acceso a imágenes vía File System Access API (useImageFolder)
- [ ] Configuración de carpeta de imágenes desde AlarmasManager (SuperAdmin)

### Immo
- [ ] CRUD perfiles de remoto (marca, FCC ID, frecuencia, batería, imagen, campos generación dinámicos)
- [ ] Catálogo de equipos/transponders con imagen, reordenable por drag-and-drop
- [ ] Asignación immo a vehículo: transponder, equipos ×3, método Manual/OBD, procedimiento
- [ ] Migración automática legacy: immoProfileIds[] → immoDetails[], keycodeProfileId → keycodeProfileIds[]

### Sistema de roles
- [ ] isSuperAdmin=true → panel admin solo desktop (bloquea en móvil con mensaje)
- [ ] isSuperAdmin=false → WorkshopToolView responsive
- [ ] Taller solo ve herramientas que el SuperAdmin le asignó (workshop_tools)
- [ ] Selector de vehículo muestra la unión de las 3 herramientas autorizadas

### Vehículos
- [ ] Importación JSON `{ results: [{Make, Model, Year}] }` con elección de categoría previa
- [ ] Carga lazy: marcas → modelos → años (nunca toda la BD de golpe)
- [ ] CRUD manual de marcas/modelos/años

---

## NOTAS CRÍTICAS

1. **`useWorkshopAssignments`** no es un archivo en `/hooks/` — vive embebido en
   `WorkshopAssignmentManager.tsx` y se importa desde ahí. Al migrar al backend,
   moverlo a `/hooks/useWorkshopAssignments.ts`.

2. **`useImageFolder`** exporta 5 funciones de módulo además del hook:
   `getImageByFile`, `getYearImageUrl`, `getFirstImageUrl`, `openImageFolder`, `clearImageFolder`.
   Al migrar imágenes a S3, reemplazar TODAS. `AlarmasWorkspace` usa directamente
   `getYearImageUrl` para resolver imágenes por año.

3. **`ImmoAssignmentManager`** no es un archivo separado — se exporta desde `ImmoManager.tsx`.

4. **`temp_db/auto-list/*.json`** — NO usar en producción. Solo son seeds de desarrollo.

5. **`ImmoSuppliesManager`** usa drag-and-drop. Si la librería no está disponible en la
   app base, implementar con botones subir/bajar usando `reorderItems` del hook.

6. **Imágenes base64** en perfiles (keycode profileImage, immo mainImage, catalog items)
   deben migrar a `tool_files` + Laravel Storage al conectar el backend.
