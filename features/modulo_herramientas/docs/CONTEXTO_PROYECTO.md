# Contexto del Proyecto — Módulo Herramientas (Cerrajería)

> Documento de referencia completo para desarrolladores. Cubre arquitectura frontend existente, diseño de base de datos MariaDB y plan de integración con Laravel como API backend.

---

## 1. Qué es este proyecto

**express-locksmith-companion** es un módulo de herramientas técnicas para una app de gestión de cerrajería automotriz. Existe como proyecto standalone para desarrollo independiente; al terminar se integra en la app base **LockMaster Pro**.

### Herramientas que gestiona

| ID | Nombre | Estado |
|----|--------|--------|
| `keycode` | Keycode (cortes de llave) | Implementado |
| `immo` | Immo Info (inmovilizadores) | Implementado |
| `alarmas` | Auto Alarmas (diagramas eléctricos) | Implementado |

---

## 2. Stack técnico

### Frontend (existente)
- **React 18.3** + **TypeScript** (strict)
- **Vite 6** como bundler
- **React Router DOM 7** para navegación
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI) para componentes
- **Framer Motion 12** para animaciones
- **Sonner** para notificaciones toast
- **Lucide React** para iconos
- Estado: `useState` + `localStorage` (sin Redux ni Zustand)
- Gestor de paquetes: **pnpm**

### Backend (a implementar)
- **Laravel 11** como API REST
- **MariaDB 10.11+** como base de datos
- **Laravel Sanctum** para autenticación (tokens de API)
- **Laravel Storage** con S3/local para archivos (diagramas, imágenes)
- **Spatie Laravel Permission** para roles y permisos

---

## 3. Sistema de roles

El módulo tiene dos vistas radicalmente distintas según el rol:

```
isSuperAdmin = true  →  Panel de Administración (escritorio obligatorio)
isSuperAdmin = false →  Vista de Taller (responsive, acceso desde móvil)
```

### SuperAdmin
Accede a las secciones del panel via tabs de navegación:

| Tab (`superAdminView`) | Componente(s) | Descripción |
|---|---|---|
| `asignacion` | `WorkshopAssignmentManager` | Asignar módulos (keycode/immo/alarmas) a talleres |
| `keycode` | `KeycodeManager` + `AssignmentManager` | CRUD de perfiles de llave y asignación a vehículos |
| `immo` | `ImmoManager` + `ImmoAssignmentManager` + `ImmoSuppliesManager` | Gestión completa de inmovilizadores |
| `alarmas` | `AlarmasManager` | Gestión de perfiles de alarmas (diagramas) |
| `vehiculos` | `VehicleDatabaseManager` | CRUD de marcas/modelos/años |

### Workshop (Taller)
Ve únicamente `WorkshopToolView`: selector de vehículo (Año → Marca → Modelo) y las herramientas que el SuperAdmin le habilitó.

---

## 4. Arquitectura de componentes

```
App.tsx
└── DevWorkshopProvider   (mock de auth; en prod: providers reales)
    └── DevLayout
        ├── DevSidebar    (nav con superAdminView prop)
        └── HerramientasModule
            ├── [SuperAdmin] KeycodeManager
            ├── [SuperAdmin] AssignmentManager
            ├── [SuperAdmin] WorkshopAssignmentManager
            ├── [SuperAdmin] VehicleDatabaseManager
            ├── [SuperAdmin] AlarmasManager
            ├── [SuperAdmin] ImmoManager
            ├── [SuperAdmin] ImmoAssignmentManager
            ├── [SuperAdmin] ImmoSuppliesManager
            └── [Taller]    WorkshopToolView
                ├── KeycodeWorkspace
                ├── AlarmasWorkspace
                └── ImmoWorkspace
```

### Flujo de datos (localStorage)

Base de vehiculos:
```
Desarrollo standalone
    -> temp_db/auto-list/*.json se usa solo como seed inicial

Produccion
    -> La fuente de verdad es BD/API: vehicle_makes + vehicle_models + vehicle_years
    -> Los JSON completos se importan desde el panel SuperAdmin
    -> En la importacion solo se asigna categoria: Vehiculo | Motocicleta | Camion
```

```
SuperAdmin crea perfil keycode
    → useKeycodeProfiles → localStorage["herramientas:keycode_profiles"]

SuperAdmin crea perfil de alarma (desde data.json)
    → useAlarmaProfiles → localStorage["herramientas:alarma_profiles"]

SuperAdmin crea perfil immo
    → useImmoProfiles → localStorage["herramientas:immo_profiles"]

SuperAdmin gestiona catálogo Immo
    → useImmoCatalog → localStorage["herramientas:immo_catalog"]

SuperAdmin asigna herramienta a Marca/Modelo/Año
    → useToolAssignments → localStorage["herramientas:tool_assignments"]

SuperAdmin habilita herramienta a taller
    → useWorkshopAssignments → localStorage["herramientas:workshop_assignments"]

Taller selecciona vehículo
    → WorkshopToolView filtra tool_assignments + verifica workshop_assignments
    → Muestra herramientas disponibles para esa combinación
```

---

## 5. Tipos TypeScript clave

```typescript
// src/types/index.ts

interface Workshop {
  id: string;
  name: string;
}

interface KeycodeProfile {
  id: string;
  references: KeyReference[];     // [{brand, refCode, isPrimary}]
  icCard: string;
  series: string;
  bittingConfig: BittingConfig;   // {length, maxDepth, depthMapping?, axes?}
  codesData: CodeEntry[];         // [{codigo, bitting: string[]}]
  dateAdded: string;
  configuracionVisual?: ConfiguracionVisualLlave;
  profileImage?: string;
  decoderConfig?: DecoderConfig;
}

interface ToolAssignment {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  tools: string[];
  workshops: string[];
  keycodeProfileIds: string[];
  lockSelections?: LockSelectionsMap;
  alarmaProfileIds?: string[];
  immoDetails?: ImmoAssignmentDetail[];
  dateAdded: string;
}

// ── Immo Info ─────────────────────────────────────────

interface ImmoCatalogItem {
  id: string;
  label: string;
  image?: string;
  category: 'equipo' | 'transponder';
}

interface ImmoGenField {
  id: string;
  label: string;
  value: string;
}

interface ImmoProfile {
  id: string;
  marca: string;
  fccId: string;
  frecuencia: string;
  bateria: string;
  mainImage?: string;
  generacionRemoto: ImmoGenField[];  // campos "generación" del remote
  dateAdded: string;
}

interface ImmoAssignmentDetail {
  profileId: string;
  transponder: string;
  generadoConIds: string[];        // IDs de ImmoCatalogItem (equipos)
  equiposRemotoIds: string[];      // IDs de ImmoCatalogItem (equipos de programación remoto)
  equiposTransponderIds: string[]; // IDs de ImmoCatalogItem (equipos de transponder)
  programacionManual: boolean;
  programacionOBD: boolean;
  procedimientoProgramacion: string;
}

// ── Auto Alarmas ───────────────────────────────────────

interface AlarmaYearValue {
  years: string[];
  value: string;
}

interface AlarmaDetalle {
  id: string;
  label: string;
  value: string;
  yearValues?: AlarmaYearValue[];  // valores específicos por año
}

interface AlarmaNote {
  id: string;
  type: 'image_variation' | 'coverage';
  title: string;
  text?: string;
  documented?: string[];   // años confirmados
  probable?: string[];     // años probables
}

interface AlarmaYearImage {
  sku: string;
  file: string;   // ruta relativa: "../../_images/SHARED-xxx.webp"
  years: string[];
}

interface AlarmaDataValue {
  id: string;
  title: string;
  details: AlarmaDetalle[];
  imageUrl?: string;          // base64 o URL directa
  yearImages?: AlarmaYearImage[];
  notes?: AlarmaNote[];
}

interface AlarmaVehicleImage {
  sku: string;
  file: string;
  years: string[];
  kind: 'logo' | 'vehicle';
}

interface AlarmaProfile {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  variante?: string;
  yearRange?: string;
  vehicleImages?: AlarmaVehicleImage[];
  dataValues: AlarmaDataValue[];
  dateAdded: string;
}
```

---

## 6. Archivos clave

Nota de integracion: `ImmoAssignmentManager` se exporta desde
`src/components/herramientas/ImmoManager.tsx`; no hay un archivo separado con
ese nombre. Para Keycode tambien se debe copiar `src/components/llaves/`
completo, porque el manager y el workspace usan el generador SVG.

| Archivo | Rol |
|---|---|
| `src/components/herramientas/HerramientasModule.tsx` | Contenedor raíz; enruta por rol y por `superAdminView` |
| `src/components/herramientas/KeycodeManager.tsx` | CRUD de perfiles keycode (SuperAdmin) |
| `src/components/herramientas/AssignmentManager.tsx` | Asignar perfiles keycode a vehículos |
| `src/components/herramientas/WorkshopAssignmentManager.tsx` | Asignar módulos a talleres |
| `src/components/herramientas/WorkshopToolView.tsx` | Vista taller: selector vehículo + herramientas |
| `src/components/herramientas/KeycodeWorkspace.tsx` | Workspace keycode del taller |
| `src/components/herramientas/AlarmasManager.tsx` | CRUD perfiles alarma (SuperAdmin) |
| `src/components/herramientas/AlarmasWorkspace.tsx` | Workspace alarmas del taller |
| `src/components/herramientas/ImmoManager.tsx` | CRUD perfiles immo y export de `ImmoAssignmentManager` |
| `src/components/herramientas/ImmoWorkspace.tsx` | Workspace immo del taller |
| `src/components/herramientas/ImmoSuppliesManager.tsx` | Catálogo de equipos/transponders |
| `src/components/herramientas/VehicleDatabaseManager.tsx` | CRUD base de vehículos |
| `src/hooks/useKeycodeProfiles.ts` | Estado y persistencia de perfiles keycode |
| `src/hooks/useToolAssignments.ts` | Estado y persistencia de asignaciones |
| `src/hooks/useVehicleDatabase.ts` | Estado y persistencia de vehículos |
| `src/hooks/useAlarmaProfiles.ts` | Estado y persistencia de perfiles de alarma |
| `src/hooks/useImmoProfiles.ts` | Estado y persistencia de perfiles immo |
| `src/hooks/useImmoCatalog.ts` | Estado y persistencia del catálogo immo |
| `src/hooks/useImageFolder.ts` | Acceso al sistema de imágenes (diagramas_pro) |
| `src/hooks/useDevContext.tsx` | Mock providers (solo dev; se elimina al integrar) |
| `src/types/index.ts` | Todas las interfaces TypeScript del módulo |
| `src/data/tools.ts` | Array `AVAILABLE_TOOLS` con definiciones de herramientas |
| `src/data/carDatabase.ts` | Seed de vehículos para desarrollo |

---

## 7. Esquema MariaDB

> Esquema canonico actualizado: ver `docs/ESQUEMA_BD_MODULO_HERRAMIENTAS.md`.
> La seccion siguiente queda como referencia historica/resumen; para migraciones
> Laravel usar el documento dedicado.

### Convenciones
- Todos los IDs son `BIGINT UNSIGNED AUTO_INCREMENT`.
- Las entidades que cruzan la barrera frontend ↔ backend exponen también un `uuid CHAR(36)`.
- Configuraciones complejas se guardan como `JSON` en MariaDB (soportado desde 10.2).
- Timestamps: `created_at` y `updated_at` en todas las tablas.
- Soft deletes (`deleted_at`) donde se necesite historial.

---

### 7.1 Autenticación y Talleres

```sql
CREATE TABLE workshops (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid        CHAR(36)        NOT NULL UNIQUE,
    name        VARCHAR(255)    NOT NULL,
    slug        VARCHAR(255)    NOT NULL UNIQUE,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP       NULL
);

CREATE TABLE users (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workshop_id  BIGINT UNSIGNED NULL,
    name         VARCHAR(255)    NOT NULL,
    email        VARCHAR(255)    NOT NULL UNIQUE,
    password     VARCHAR(255)    NOT NULL,
    role         ENUM('superadmin', 'workshop_admin', 'workshop_user') NOT NULL DEFAULT 'workshop_user',
    is_active    TINYINT(1)      NOT NULL DEFAULT 1,
    remember_token VARCHAR(100)  NULL,
    created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP       NULL,
    CONSTRAINT fk_users_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE SET NULL
);

CREATE TABLE workshop_tools (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workshop_id  BIGINT UNSIGNED NOT NULL,
    tool_id      VARCHAR(50)     NOT NULL,
    created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_workshop_tool (workshop_id, tool_id),
    CONSTRAINT fk_workshop_tools_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
```

---

### 7.2 Base de Vehículos

```sql
CREATE TABLE car_makes (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)    NOT NULL UNIQUE,
    category   ENUM('Vehiculo', 'Camion', 'Motocicleta') NOT NULL DEFAULT 'Vehiculo',
    created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE car_models (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    car_make_id BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(100)    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_make_model (car_make_id, name),
    CONSTRAINT fk_car_models_make FOREIGN KEY (car_make_id) REFERENCES car_makes(id) ON DELETE CASCADE
);

CREATE TABLE car_years (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    car_model_id BIGINT UNSIGNED NOT NULL,
    year         SMALLINT UNSIGNED NOT NULL,
    UNIQUE KEY uq_model_year (car_model_id, year),
    CONSTRAINT fk_car_years_model FOREIGN KEY (car_model_id) REFERENCES car_models(id) ON DELETE CASCADE
);
```

Rendimiento esperado:
- Las claves `UNIQUE` anteriores funcionan como indices para las consultas principales.
- En produccion no cargar toda la base de vehiculos de golpe en el cliente.
- Cargar lazy: marcas primero, modelos solo al seleccionar marca, anos solo al seleccionar modelo.
- Para tablas administrativas usar paginacion o limite (`page`, `per_page`) y busqueda server-side.
- El importador JSON debe hacer upsert: crear marca/modelo/ano si falta y omitir duplicados por `(make, model, year)`.

---

### 7.3 Módulo Keycode

```sql
CREATE TABLE keycode_profiles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid                CHAR(36)         NOT NULL UNIQUE,
    ic_card             VARCHAR(50)      NOT NULL,
    series              VARCHAR(100)     NOT NULL,
    bitting_length      TINYINT UNSIGNED NOT NULL,
    bitting_max_depth   TINYINT UNSIGNED NOT NULL,
    bitting_depth_mapping JSON           NULL,
    bitting_axes        JSON             NULL,
    visual_config       JSON             NULL,
    decoder_config      JSON             NULL,
    profile_image_url   VARCHAR(500)     NULL,
    created_by          BIGINT UNSIGNED  NULL,
    created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP        NULL,
    CONSTRAINT fk_keycode_profiles_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE keycode_references (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    keycode_profile_id  BIGINT UNSIGNED NOT NULL,
    brand               VARCHAR(100)    NOT NULL,
    ref_code            VARCHAR(100)    NOT NULL,
    is_primary          TINYINT(1)      NOT NULL DEFAULT 0,
    sort_order          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_keycode_refs_profile FOREIGN KEY (keycode_profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
);

CREATE TABLE keycode_codes (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    keycode_profile_id  BIGINT UNSIGNED NOT NULL,
    codigo              VARCHAR(50)     NOT NULL,
    bitting             JSON            NOT NULL,
    INDEX idx_codigo (codigo),
    CONSTRAINT fk_keycode_codes_profile FOREIGN KEY (keycode_profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
);
```

---

### 7.4 Asignaciones Vehículo ↔ Herramientas

```sql
CREATE TABLE tool_assignments (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid         CHAR(36)         NOT NULL UNIQUE,
    car_make_id  BIGINT UNSIGNED  NOT NULL,
    car_model_id BIGINT UNSIGNED  NOT NULL,
    year_start   SMALLINT UNSIGNED NOT NULL,
    year_end     SMALLINT UNSIGNED NOT NULL,
    tools        JSON             NOT NULL DEFAULT ('[]'),
    created_by   BIGINT UNSIGNED  NULL,
    created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tool_assign_make  FOREIGN KEY (car_make_id)  REFERENCES car_makes(id),
    CONSTRAINT fk_tool_assign_model FOREIGN KEY (car_model_id) REFERENCES car_models(id),
    CONSTRAINT fk_tool_assign_user  FOREIGN KEY (created_by)   REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE tool_assignment_workshops (
    tool_assignment_id BIGINT UNSIGNED NOT NULL,
    workshop_id        BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (tool_assignment_id, workshop_id),
    CONSTRAINT fk_taw_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_taw_workshop   FOREIGN KEY (workshop_id)        REFERENCES workshops(id)        ON DELETE CASCADE
);

CREATE TABLE tool_assignment_keycode_profiles (
    tool_assignment_id  BIGINT UNSIGNED NOT NULL,
    keycode_profile_id  BIGINT UNSIGNED NOT NULL,
    lock_selections     JSON            NULL,
    PRIMARY KEY (tool_assignment_id, keycode_profile_id),
    CONSTRAINT fk_takp_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id)   ON DELETE CASCADE,
    CONSTRAINT fk_takp_profile    FOREIGN KEY (keycode_profile_id) REFERENCES keycode_profiles(id)   ON DELETE CASCADE
);
```

---

### 7.5 Módulo Auto Alarmas

```sql
CREATE TABLE alarma_perfiles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid            CHAR(36)        NOT NULL UNIQUE,
    nombre          VARCHAR(255)    NOT NULL,
    marca           VARCHAR(100)    NULL,
    modelo          VARCHAR(100)    NULL,
    variante        VARCHAR(100)    NULL,
    year_range      VARCHAR(50)     NULL,
    data_values     JSON            NOT NULL DEFAULT ('[]'),  -- AlarmaDataValue[]
    vehicle_images  JSON            NULL,                     -- AlarmaVehicleImage[]
    schema_version  VARCHAR(20)     NULL,                     -- "7.3"
    estado          ENUM('activo', 'borrador', 'archivado') NOT NULL DEFAULT 'borrador',
    created_by      BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP       NULL,
    CONSTRAINT fk_alarma_perfiles_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE alarma_asignaciones (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tool_assignment_id  BIGINT UNSIGNED NOT NULL,
    alarma_perfil_id    BIGINT UNSIGNED NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_alarma_assignment (tool_assignment_id, alarma_perfil_id),
    CONSTRAINT fk_aa_tool_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_aa_perfil          FOREIGN KEY (alarma_perfil_id)   REFERENCES alarma_perfiles(id)  ON DELETE CASCADE
);
```

---

### 7.6 Módulo Immo

```sql
CREATE TABLE immo_catalog_items (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid        CHAR(36)        NOT NULL UNIQUE,
    label       VARCHAR(255)    NOT NULL,
    category    ENUM('equipo', 'transponder') NOT NULL,
    image_url   VARCHAR(500)    NULL,
    sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE immo_profiles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid                CHAR(36)        NOT NULL UNIQUE,
    marca               VARCHAR(100)    NOT NULL,
    fcc_id              VARCHAR(100)    NOT NULL,
    frecuencia          VARCHAR(50)     NOT NULL,
    bateria             VARCHAR(50)     NOT NULL,
    main_image_url      VARCHAR(500)    NULL,
    generacion_remoto   JSON            NOT NULL DEFAULT ('[]'),  -- ImmoGenField[]
    created_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP       NULL,
    CONSTRAINT fk_immo_profiles_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE immo_assignment_details (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tool_assignment_id      BIGINT UNSIGNED NOT NULL,
    immo_profile_id         BIGINT UNSIGNED NOT NULL,
    transponder             VARCHAR(100)    NOT NULL DEFAULT '',
    generado_con_ids        JSON            NOT NULL DEFAULT ('[]'),
    equipos_remoto_ids      JSON            NOT NULL DEFAULT ('[]'),
    equipos_transponder_ids JSON            NOT NULL DEFAULT ('[]'),
    programacion_manual     TINYINT(1)      NOT NULL DEFAULT 0,
    programacion_obd        TINYINT(1)      NOT NULL DEFAULT 0,
    procedimiento           TEXT            NULL,
    UNIQUE KEY uq_immo_assignment (tool_assignment_id, immo_profile_id),
    CONSTRAINT fk_immo_ad_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_immo_ad_profile    FOREIGN KEY (immo_profile_id)    REFERENCES immo_profiles(id)    ON DELETE CASCADE
);
```

---

### 7.7 Diagrama entidad-relación (resumen)

```
workshops ──< workshop_tools
workshops ──< users
workshops ──< tool_assignment_workshops

car_makes ──< car_models ──< car_years

tool_assignments >── car_makes
tool_assignments >── car_models
tool_assignments ──< tool_assignment_workshops >── workshops
tool_assignments ──< tool_assignment_keycode_profiles >── keycode_profiles
tool_assignments ──< alarma_asignaciones >── alarma_perfiles
tool_assignments ──< immo_assignment_details >── immo_profiles

keycode_profiles ──< keycode_references
keycode_profiles ──< keycode_codes
```

---

## 8. API Laravel — Endpoints

Base URL: `/api/v1` | Auth: Bearer token (Laravel Sanctum)

### Autenticación
```
POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

### Talleres (solo SuperAdmin)
```
GET    /workshops
POST   /workshops
PUT    /workshops/{id}
DELETE /workshops/{id}
GET    /workshops/{id}/tools
PUT    /workshops/{id}/tools
```

### Base de vehículos
```
GET/POST       /vehicles/makes
PUT/DELETE     /vehicles/makes/{id}
GET/POST       /vehicles/makes/{makeId}/models
PUT/DELETE     /vehicles/models/{id}
GET/POST       /vehicles/models/{modelId}/years
DELETE         /vehicles/years/{id}
```

### Perfiles Keycode
```
GET/POST       /keycode/profiles
GET/PUT/DELETE /keycode/profiles/{uuid}
POST           /keycode/profiles/{uuid}/image
```

### Asignaciones Vehículo
```
GET/POST       /tool-assignments
GET/PUT/DELETE /tool-assignments/{uuid}
PUT            /tool-assignments/{uuid}/keycode-profiles
PUT            /tool-assignments/{uuid}/alarmas
PUT            /tool-assignments/{uuid}/immo
PUT            /tool-assignments/{uuid}/workshops
```

### Auto Alarmas
```
GET/POST       /alarmas/perfiles
GET/PUT/DELETE /alarmas/perfiles/{uuid}
POST           /alarmas/perfiles/{uuid}/import-json   ← importar data.json
```

### Immo
```
GET/POST       /immo/catalog
PUT/DELETE     /immo/catalog/{uuid}
GET/POST       /immo/profiles
GET/PUT/DELETE /immo/profiles/{uuid}
```

### Taller (lectura)
```
GET  /taller/vehicles
GET  /taller/keycode?make=&model=&year=
GET  /taller/alarmas?make=&model=&year=
GET  /taller/immo?make=&model=&year=
```

---

## 9. Plan de migración localStorage → Laravel API

### Fase 1: Backend base
1. Crear proyecto Laravel 11 con Sanctum
2. Correr migraciones del esquema (sección 7)
3. Seeders/importador: cargar JSON formato `{ results: [{ Year, Make, Model }] }` hacia `vehicle_makes`, `vehicle_models`, `vehicle_years`
4. Implementar auth + CRUD workshops

### Fase 2: Módulo Keycode
5. Endpoints keycode_profiles + tool_assignments
6. Reemplazar hooks localStorage por hooks con fetch

### Fase 3: Módulo Auto Alarmas
7. Endpoints alarma_perfiles con soporte de importación JSON
8. Sistema de imágenes en storage (S3 o local) para los diagramas_pro
9. Reemplazar `useAlarmaProfiles.ts`

### Fase 4: Módulo Immo
10. Endpoints immo_catalog + immo_profiles + immo_assignment_details
11. Reemplazar `useImmoProfiles.ts` y `useImmoCatalog.ts`

---

## 10. Variables de entorno

```env
# Frontend
VITE_API_BASE_URL=https://api.lockmaster.pro/api/v1
VITE_STORAGE_URL=https://cdn.lockmaster.pro
```

```env
# Laravel .env
APP_NAME="LockMaster Pro API"
DB_CONNECTION=mysql
DB_DATABASE=lockmaster
FILESYSTEM_DISK=s3
AWS_BUCKET=lockmaster-files
SANCTUM_STATEFUL_DOMAINS=lockmaster.pro,localhost:5173
```

---

## 11. Integración en la app base (LockMaster Pro)

Ver `docs/INTEGRACION.md` para el checklist completo.

Resumen:
1. Copiar `src/components/herramientas/` completo
2. Copiar hooks, tipos y datos
3. Cambiar import `useWorkshop` de `useDevContext` → `useWorkshop` real
4. Corregir colores hardcodeados por tokens semánticos (ver `docs/GUIA_APP_BASE.md`)
5. Registrar ruta `/herramientas`
6. Eliminar archivos dev
