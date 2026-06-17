# Esquema BD - Modulo Herramientas

> Contrato propuesto para migrar el modulo Herramientas desde `localStorage` a
> MariaDB mediante Laravel. Este documento cubre todo lo que hoy persiste la app:
> vehiculos, accesos por taller, keycode, alarmas, immo, catalogos, asignaciones,
> importaciones JSON y archivos.

## 1. Principios del esquema

- Base de datos: MariaDB 10.11+.
- Backend: Laravel 11+ con Sanctum, Policies y Storage.
- Cada tabla de dominio usa `id` numerico interno y `uuid` publico para la API.
- Los archivos no se guardan como base64 en DB. Se guardan en Laravel Storage y la
  DB conserva metadatos/ruta mediante `tool_files`.
- Las configuraciones que son documentos tecnicos completos se guardan como JSON
  validado y versionado. Eso evita perder campos actuales y permite evolucionar el
  modulo sin romper migraciones.
- Los datos consultados por filtros frecuentes se normalizan e indexan:
  vehiculos, perfiles, relaciones y asignaciones.
- Usar `softDeletes()` en datos administrables para evitar perdida accidental.

## 2. Mapeo desde estado actual

| Estado actual | Tabla destino |
| --- | --- |
| `herramientas:vehicle_database` | `vehicle_makes`, `vehicle_models`, `vehicle_years`, `vehicle_import_batches` |
| `herramientas:workshop_assignments` | `workshop_tools` |
| `herramientas:keycode_profiles` | `keycode_profiles`, `keycode_references`, `keycode_codes` |
| `herramientas:tool_assignments` | `tool_assignments` y pivotes por herramienta |
| `herramientas:alarma_profiles` | `alarma_perfiles` |
| `herramientas:immo_profiles` | `immo_profiles` |
| `herramientas:immo_catalog` | `immo_catalog_items` |
| Imagenes base64 del frontend | `tool_files` + Laravel Storage |

## 3. Tablas existentes de la app principal

El modulo debe conectarse a las tablas reales de la app principal. No duplicarlas.

```sql
-- Referenciadas por el modulo, creadas por la main app.
users(id)
workshops(id)
```

Roles esperados:

- `superadmin`: administra catalogos, importaciones, perfiles y asignaciones.
- `workshop_admin`: puede consultar datos del taller y, si la app lo permite, gestionar usuarios del taller.
- `workshop_user`: solo consulta herramientas habilitadas.

## 4. Archivos del modulo

Sirve para imagenes de perfiles keycode, imagenes immo, imagenes de catalogo y
archivos asociados a diagramas de alarma.

```sql
CREATE TABLE tool_files (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid            CHAR(36)         NOT NULL,
    disk            VARCHAR(50)      NOT NULL DEFAULT 'public',
    path            VARCHAR(500)     NOT NULL,
    original_name   VARCHAR(255)     NULL,
    mime_type       VARCHAR(100)     NULL,
    size_bytes      BIGINT UNSIGNED  NULL,
    checksum_sha256 CHAR(64)         NULL,
    created_by      BIGINT UNSIGNED  NULL,
    created_at      TIMESTAMP        NULL,
    updated_at      TIMESTAMP        NULL,

    UNIQUE KEY uq_tool_files_uuid (uuid),
    UNIQUE KEY uq_tool_files_disk_path (disk, path),
    KEY idx_tool_files_checksum (checksum_sha256),
    CONSTRAINT fk_tool_files_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

Laravel:

- Modelo: `ToolFile`.
- Casts: ninguno especial.
- Storage recomendado: `tools/keycode`, `tools/immo`, `tools/alarmas`.

## 5. Acceso de herramientas por taller

Equivale al hook `useWorkshopAssignments`.

```sql
CREATE TABLE workshop_tools (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workshop_id BIGINT UNSIGNED NOT NULL,
    tool_id     ENUM('keycode', 'immo', 'alarmas') NOT NULL,
    enabled     TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL,

    UNIQUE KEY uq_workshop_tool (workshop_id, tool_id),
    KEY idx_workshop_tools_tool (tool_id),
    CONSTRAINT fk_workshop_tools_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
```

Regla:

- Si un taller no tiene `workshop_tools.enabled = 1` para una herramienta, no debe
  poder consultar sus endpoints de taller aunque existan asignaciones.

## 6. Base de datos vehicular

Reemplaza el consumo en produccion de `temp_db/auto-list/*.json`. Los JSON solo
son una fuente de importacion administrativa.

### 6.1 Marcas

```sql
CREATE TABLE vehicle_makes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid        CHAR(36) NOT NULL,
    name        VARCHAR(120) NOT NULL,
    name_norm   VARCHAR(120) NOT NULL,
    category    ENUM('Vehiculo', 'Camion', 'Motocicleta') NOT NULL DEFAULT 'Vehiculo',
    sort_order  INT UNSIGNED NULL,
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL,
    deleted_at  TIMESTAMP NULL,

    UNIQUE KEY uq_vehicle_makes_uuid (uuid),
    UNIQUE KEY uq_vehicle_makes_name_norm (name_norm),
    KEY idx_vehicle_makes_category_name (category, name_norm),
    CONSTRAINT fk_vehicle_makes_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 6.2 Modelos

```sql
CREATE TABLE vehicle_models (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid        CHAR(36) NOT NULL,
    make_id     BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(180) NOT NULL,
    name_norm   VARCHAR(180) NOT NULL,
    sort_order  INT UNSIGNED NULL,
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL,
    deleted_at  TIMESTAMP NULL,

    UNIQUE KEY uq_vehicle_models_uuid (uuid),
    UNIQUE KEY uq_vehicle_models_make_name (make_id, name_norm),
    KEY idx_vehicle_models_name (name_norm),
    CONSTRAINT fk_vehicle_models_make FOREIGN KEY (make_id) REFERENCES vehicle_makes(id) ON DELETE CASCADE,
    CONSTRAINT fk_vehicle_models_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 6.3 Anos

```sql
CREATE TABLE vehicle_years (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid        CHAR(36) NOT NULL,
    model_id    BIGINT UNSIGNED NOT NULL,
    year        SMALLINT UNSIGNED NOT NULL,
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL,
    deleted_at  TIMESTAMP NULL,

    UNIQUE KEY uq_vehicle_years_uuid (uuid),
    UNIQUE KEY uq_vehicle_years_model_year (model_id, year),
    KEY idx_vehicle_years_year (year),
    CONSTRAINT fk_vehicle_years_model FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_vehicle_years_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 6.4 Auditoria de importaciones

```sql
CREATE TABLE vehicle_import_batches (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid             CHAR(36) NOT NULL,
    original_name    VARCHAR(255) NULL,
    category         ENUM('Vehiculo', 'Camion', 'Motocicleta') NOT NULL,
    total_rows       INT UNSIGNED NOT NULL DEFAULT 0,
    valid_rows       INT UNSIGNED NOT NULL DEFAULT 0,
    created_makes    INT UNSIGNED NOT NULL DEFAULT 0,
    created_models   INT UNSIGNED NOT NULL DEFAULT 0,
    created_years    INT UNSIGNED NOT NULL DEFAULT 0,
    skipped_existing INT UNSIGNED NOT NULL DEFAULT 0,
    updated_existing INT UNSIGNED NOT NULL DEFAULT 0,
    status           ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    error_message    TEXT NULL,
    created_by       BIGINT UNSIGNED NULL,
    created_at       TIMESTAMP NULL,
    updated_at       TIMESTAMP NULL,

    UNIQUE KEY uq_vehicle_import_batches_uuid (uuid),
    KEY idx_vehicle_import_batches_status (status),
    CONSTRAINT fk_vehicle_import_batches_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

Formato de importacion aceptado:

```json
{
  "results": [
    { "Make": "Honda", "Model": "Civic", "Year": 2019 }
  ]
}
```

Reglas de importacion:

- El modal solo permite elegir `category`.
- Validar que `results` sea un array.
- Ignorar filas sin `Make`, sin `Model` o con `Year <= 0`.
- Normalizar duplicados por `lower(trim(Make)) + lower(trim(Model)) + Year`.
- Si la marca existe, actualizar su `category` solo cuando el usuario confirme.
- Crear solo marcas/modelos/anos faltantes.
- Si todo existe, responder con conteos y mensaje de "ya esta en la base".
- No cargar todos los vehiculos al cliente. Usar endpoints incremental/paginados.

Endpoints sugeridos:

```text
GET  /api/v1/vehicles/makes?category=&q=
GET  /api/v1/vehicles/makes/{uuid}/models?q=
GET  /api/v1/vehicles/models/{uuid}/years
POST /api/v1/vehicles/import-json
```

## 7. Keycode

### 7.1 Perfiles

Equivale a `KeycodeProfile`.

```sql
CREATE TABLE keycode_profiles (
    id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid                  CHAR(36) NOT NULL,
    ic_card               VARCHAR(120) NULL,
    series                VARCHAR(120) NULL,
    bitting_length        TINYINT UNSIGNED NOT NULL,
    bitting_max_depth     TINYINT UNSIGNED NOT NULL,
    bitting_depth_mapping JSON NULL,
    bitting_axes          JSON NULL,
    visual_config         JSON NULL,
    decoder_config        JSON NULL,
    profile_image_file_id BIGINT UNSIGNED NULL,
    created_by            BIGINT UNSIGNED NULL,
    created_at            TIMESTAMP NULL,
    updated_at            TIMESTAMP NULL,
    deleted_at            TIMESTAMP NULL,

    UNIQUE KEY uq_keycode_profiles_uuid (uuid),
    KEY idx_keycode_profiles_ic_card (ic_card),
    KEY idx_keycode_profiles_series (series),
    CONSTRAINT fk_keycode_profiles_image FOREIGN KEY (profile_image_file_id) REFERENCES tool_files(id) ON DELETE SET NULL,
    CONSTRAINT fk_keycode_profiles_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

JSON preservado:

- `bitting_depth_mapping`: `Record<string,string>`.
- `bitting_axes`: `AxisConfig[]`.
- `visual_config`: `ConfiguracionVisualLlave`.
- `decoder_config`: `DecoderConfig`.

### 7.2 Referencias

Equivale a `KeyReference[]`.

```sql
CREATE TABLE keycode_references (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    keycode_profile_id BIGINT UNSIGNED NOT NULL,
    brand              VARCHAR(120) NOT NULL,
    ref_code           VARCHAR(120) NOT NULL,
    is_primary         TINYINT(1) NOT NULL DEFAULT 0,
    sort_order         INT UNSIGNED NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,

    UNIQUE KEY uq_keycode_refs_profile_brand_code (keycode_profile_id, brand, ref_code),
    KEY idx_keycode_refs_brand_code (brand, ref_code),
    CONSTRAINT fk_keycode_refs_profile FOREIGN KEY (keycode_profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
);
```

Regla:

- Validar en Laravel que cada perfil tenga al menos una referencia.
- Validar en Laravel que solo una referencia quede como primaria.

### 7.3 Codigos de corte

Equivale a `CodeEntry[]`.

```sql
CREATE TABLE keycode_codes (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    keycode_profile_id BIGINT UNSIGNED NOT NULL,
    codigo             VARCHAR(80) NOT NULL,
    bitting            JSON NOT NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,

    UNIQUE KEY uq_keycode_codes_profile_codigo (keycode_profile_id, codigo),
    KEY idx_keycode_codes_codigo (codigo),
    CONSTRAINT fk_keycode_codes_profile FOREIGN KEY (keycode_profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
);
```

Reglas:

- `bitting` debe ser array de strings.
- La longitud debe coincidir con `bitting_length` o con la suma de ejes.
- Importacion JSON de series debe usar transacciones y `upsert`.

## 8. Asignaciones por vehiculo

Esta es la tabla central que conecta vehiculos con keycode, alarmas e immo.
Equivale a `ToolAssignment`.

```sql
CREATE TABLE tool_assignments (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid             CHAR(36) NOT NULL,
    vehicle_make_id  BIGINT UNSIGNED NOT NULL,
    vehicle_model_id BIGINT UNSIGNED NOT NULL,
    year_start       SMALLINT UNSIGNED NOT NULL,
    year_end         SMALLINT UNSIGNED NOT NULL,
    created_by       BIGINT UNSIGNED NULL,
    created_at       TIMESTAMP NULL,
    updated_at       TIMESTAMP NULL,
    deleted_at       TIMESTAMP NULL,

    UNIQUE KEY uq_tool_assignments_uuid (uuid),
    KEY idx_tool_assignments_lookup (vehicle_make_id, vehicle_model_id, year_start, year_end),
    KEY idx_tool_assignments_model_years (vehicle_model_id, year_start, year_end),
    CONSTRAINT fk_tool_assignments_make FOREIGN KEY (vehicle_make_id) REFERENCES vehicle_makes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tool_assignments_model FOREIGN KEY (vehicle_model_id) REFERENCES vehicle_models(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tool_assignments_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_tool_assignments_year_range CHECK (year_start <= year_end)
);
```

Consulta principal de taller:

```sql
WHERE vehicle_make_id = ?
  AND vehicle_model_id = ?
  AND ? BETWEEN year_start AND year_end
```

### 8.1 Herramientas activas por asignacion

Aunque se puede derivar por pivotes, esta tabla conserva la funcion actual
`tools: string[]` sin ambiguedad.

```sql
CREATE TABLE tool_assignment_tools (
    tool_assignment_id BIGINT UNSIGNED NOT NULL,
    tool_id            ENUM('keycode', 'immo', 'alarmas') NOT NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,

    PRIMARY KEY (tool_assignment_id, tool_id),
    KEY idx_tool_assignment_tools_tool (tool_id),
    CONSTRAINT fk_tat_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE
);
```

### 8.2 Visibilidad por taller

Conserva `ToolAssignment.workshops`. Si se decide que todas las asignaciones son
globales para talleres con herramienta habilitada, esta tabla puede quedar vacia.

```sql
CREATE TABLE tool_assignment_workshops (
    tool_assignment_id BIGINT UNSIGNED NOT NULL,
    workshop_id        BIGINT UNSIGNED NOT NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,

    PRIMARY KEY (tool_assignment_id, workshop_id),
    CONSTRAINT fk_taw_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_taw_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
```

### 8.3 Keycode asignado

Equivale a `keycodeProfileIds` y `lockSelections`.

```sql
CREATE TABLE tool_assignment_keycode_profiles (
    tool_assignment_id BIGINT UNSIGNED NOT NULL,
    keycode_profile_id BIGINT UNSIGNED NOT NULL,
    lock_selections    JSON NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,

    PRIMARY KEY (tool_assignment_id, keycode_profile_id),
    CONSTRAINT fk_takp_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_takp_profile FOREIGN KEY (keycode_profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
);
```

`lock_selections` conserva este mapa:

```json
{
  "ignicion": [true, false, true],
  "puerta": [false, true]
}
```

Llaves validas: `ignicion`, `puerta`, `guantera`, `maletero`, `compuerta`, `gas`.

## 9. Alarmas

Las alarmas vienen de `diagramas_pro` y se consumen como documento tecnico
completo. Para no perder ningun campo importado, la version canonica guarda el
payload interno completo como JSON casteado por Laravel.

### 9.1 Perfiles de alarma

Equivale a `AlarmaProfile`.

```sql
CREATE TABLE alarma_perfiles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid            CHAR(36) NOT NULL,
    nombre          VARCHAR(180) NOT NULL,
    marca           VARCHAR(120) NULL,
    modelo          VARCHAR(160) NULL,
    variante        VARCHAR(160) NULL,
    year_range      VARCHAR(80) NULL,
    schema_version  VARCHAR(20) NULL,
    data_values     JSON NOT NULL,
    vehicle_images  JSON NULL,
    source_checksum CHAR(64) NULL,
    created_by      BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP NULL,
    updated_at      TIMESTAMP NULL,
    deleted_at      TIMESTAMP NULL,

    UNIQUE KEY uq_alarma_perfiles_uuid (uuid),
    KEY idx_alarma_perfiles_vehicle (marca, modelo),
    KEY idx_alarma_perfiles_checksum (source_checksum),
    CONSTRAINT fk_alarma_perfiles_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

JSON preservado:

- `data_values`: `AlarmaDataValue[]`.
- Cada `data_value` incluye `details`, `imageUrl`, `yearImages` y `notes`.
- `vehicle_images`: `AlarmaVehicleImage[]`.

Reglas:

- Importar `data.json` desde SuperAdmin.
- Validar `schema_version` cuando exista. Version documentada actual: `7.3`.
- Guardar checksum del JSON para detectar reimportaciones.
- Si se importa el mismo checksum, avisar que ya existe.
- Si mismo vehiculo pero distinto checksum, permitir actualizar con confirmacion.

### 9.2 Asignacion de alarmas

Equivale a `ToolAssignment.alarmaProfileIds`.

```sql
CREATE TABLE alarma_asignaciones (
    tool_assignment_id BIGINT UNSIGNED NOT NULL,
    alarma_perfil_id   BIGINT UNSIGNED NOT NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,

    PRIMARY KEY (tool_assignment_id, alarma_perfil_id),
    CONSTRAINT fk_aa_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_aa_perfil FOREIGN KEY (alarma_perfil_id) REFERENCES alarma_perfiles(id) ON DELETE CASCADE
);
```

## 10. Immo

### 10.1 Catalogo Immo

Equivale a `ImmoCatalogItem`.

```sql
CREATE TABLE immo_catalog_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid          CHAR(36) NOT NULL,
    label         VARCHAR(120) NOT NULL,
    category      ENUM('equipo', 'transponder') NOT NULL,
    image_file_id BIGINT UNSIGNED NULL,
    sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
    created_by    BIGINT UNSIGNED NULL,
    created_at    TIMESTAMP NULL,
    updated_at    TIMESTAMP NULL,
    deleted_at    TIMESTAMP NULL,

    UNIQUE KEY uq_immo_catalog_uuid (uuid),
    UNIQUE KEY uq_immo_catalog_category_label (category, label),
    KEY idx_immo_catalog_category_order (category, sort_order),
    CONSTRAINT fk_immo_catalog_image FOREIGN KEY (image_file_id) REFERENCES tool_files(id) ON DELETE SET NULL,
    CONSTRAINT fk_immo_catalog_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 10.2 Perfiles Immo

Equivale a `ImmoProfile`.

```sql
CREATE TABLE immo_profiles (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid               CHAR(36) NOT NULL,
    marca              VARCHAR(120) NULL,
    fcc_id             VARCHAR(120) NULL,
    frecuencia         VARCHAR(80) NULL,
    bateria            VARCHAR(80) NULL,
    main_image_file_id BIGINT UNSIGNED NULL,
    generacion_remoto  JSON NOT NULL,
    created_by         BIGINT UNSIGNED NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL,
    deleted_at         TIMESTAMP NULL,

    UNIQUE KEY uq_immo_profiles_uuid (uuid),
    KEY idx_immo_profiles_marca (marca),
    KEY idx_immo_profiles_fcc (fcc_id),
    CONSTRAINT fk_immo_profiles_image FOREIGN KEY (main_image_file_id) REFERENCES tool_files(id) ON DELETE SET NULL,
    CONSTRAINT fk_immo_profiles_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

JSON preservado:

- `generacion_remoto`: `ImmoGenField[]` con `{ id, label, value }`.

Regla:

- Validar que al menos `marca` o `fcc_id` venga informado.

### 10.3 Detalle Immo por vehiculo

Equivale a `ImmoAssignmentDetail`.

```sql
CREATE TABLE immo_assignment_details (
    id                         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid                       CHAR(36) NOT NULL,
    tool_assignment_id          BIGINT UNSIGNED NOT NULL,
    immo_profile_id             BIGINT UNSIGNED NOT NULL,
    transponder                 VARCHAR(120) NULL,
    programacion_manual         TINYINT(1) NOT NULL DEFAULT 0,
    programacion_obd            TINYINT(1) NOT NULL DEFAULT 0,
    procedimiento_programacion  TEXT NULL,
    created_at                  TIMESTAMP NULL,
    updated_at                  TIMESTAMP NULL,

    UNIQUE KEY uq_immo_assignment_uuid (uuid),
    UNIQUE KEY uq_immo_assignment_profile (tool_assignment_id, immo_profile_id),
    KEY idx_immo_assignment_profile_id (immo_profile_id),
    CONSTRAINT fk_immo_ad_assignment FOREIGN KEY (tool_assignment_id) REFERENCES tool_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_immo_ad_profile FOREIGN KEY (immo_profile_id) REFERENCES immo_profiles(id) ON DELETE CASCADE
);
```

### 10.4 Equipos e insumos usados en la asignacion

Normaliza:

- `generadoConIds`
- `equiposRemotoIds`
- `equiposTransponderIds`

```sql
CREATE TABLE immo_assignment_catalog_items (
    immo_assignment_detail_id BIGINT UNSIGNED NOT NULL,
    immo_catalog_item_id      BIGINT UNSIGNED NOT NULL,
    role                      ENUM('generado_con', 'equipo_remoto', 'equipo_transponder') NOT NULL,
    created_at                TIMESTAMP NULL,
    updated_at                TIMESTAMP NULL,

    PRIMARY KEY (immo_assignment_detail_id, immo_catalog_item_id, role),
    KEY idx_iaci_catalog_role (immo_catalog_item_id, role),
    CONSTRAINT fk_iaci_detail FOREIGN KEY (immo_assignment_detail_id) REFERENCES immo_assignment_details(id) ON DELETE CASCADE,
    CONSTRAINT fk_iaci_catalog FOREIGN KEY (immo_catalog_item_id) REFERENCES immo_catalog_items(id) ON DELETE CASCADE
);
```

## 11. Indices criticos para rendimiento

Vehiculos:

- `vehicle_makes.name_norm`
- `vehicle_models(make_id, name_norm)`
- `vehicle_years(model_id, year)`

Asignaciones:

- `tool_assignments(vehicle_make_id, vehicle_model_id, year_start, year_end)`
- `tool_assignment_tools(tool_id)`
- pivotes por clave primaria compuesta.

Busqueda tecnica:

- `keycode_codes.codigo`
- `keycode_references(brand, ref_code)`
- `immo_profiles.fcc_id`
- `alarma_perfiles(marca, modelo)`

No recomendado:

- Descargar todas las marcas/modelos/anos al iniciar.
- Filtrar toda la base vehicular en el navegador.
- Guardar imagenes en base64 dentro de JSON.

## 12. Relaciones Laravel esperadas

```php
// VehicleMake
public function models() { return $this->hasMany(VehicleModel::class, 'make_id'); }

// VehicleModel
public function make() { return $this->belongsTo(VehicleMake::class, 'make_id'); }
public function years() { return $this->hasMany(VehicleYear::class, 'model_id'); }

// ToolAssignment
public function make() { return $this->belongsTo(VehicleMake::class, 'vehicle_make_id'); }
public function model() { return $this->belongsTo(VehicleModel::class, 'vehicle_model_id'); }
public function keycodeProfiles() { return $this->belongsToMany(KeycodeProfile::class, 'tool_assignment_keycode_profiles')->withPivot('lock_selections'); }
public function alarmaPerfiles() { return $this->belongsToMany(AlarmaPerfil::class, 'alarma_asignaciones'); }
public function immoDetails() { return $this->hasMany(ImmoAssignmentDetail::class); }

// ImmoAssignmentDetail
public function profile() { return $this->belongsTo(ImmoProfile::class, 'immo_profile_id'); }
public function catalogItems() { return $this->belongsToMany(ImmoCatalogItem::class, 'immo_assignment_catalog_items')->withPivot('role'); }
```

Casts recomendados:

```php
protected $casts = [
    'bitting_depth_mapping' => 'array',
    'bitting_axes' => 'array',
    'visual_config' => 'array',
    'decoder_config' => 'array',
    'bitting' => 'array',
    'lock_selections' => 'array',
    'data_values' => 'array',
    'vehicle_images' => 'array',
    'generacion_remoto' => 'array',
    'programacion_manual' => 'boolean',
    'programacion_obd' => 'boolean',
];
```

## 13. Endpoints minimos por modulo

```text
GET    /api/v1/workshops/{uuid}/tools
PUT    /api/v1/workshops/{uuid}/tools

GET    /api/v1/vehicles/makes
POST   /api/v1/vehicles/makes
PUT    /api/v1/vehicles/makes/{uuid}
DELETE /api/v1/vehicles/makes/{uuid}
GET    /api/v1/vehicles/makes/{uuid}/models
POST   /api/v1/vehicles/makes/{uuid}/models
GET    /api/v1/vehicles/models/{uuid}/years
POST   /api/v1/vehicles/import-json

GET    /api/v1/keycode/profiles
POST   /api/v1/keycode/profiles
GET    /api/v1/keycode/profiles/{uuid}
PUT    /api/v1/keycode/profiles/{uuid}
DELETE /api/v1/keycode/profiles/{uuid}
POST   /api/v1/keycode/profiles/{uuid}/image
POST   /api/v1/keycode/profiles/import-json

GET    /api/v1/tool-assignments
POST   /api/v1/tool-assignments
GET    /api/v1/tool-assignments/{uuid}
PUT    /api/v1/tool-assignments/{uuid}
DELETE /api/v1/tool-assignments/{uuid}

GET    /api/v1/alarmas/perfiles
POST   /api/v1/alarmas/perfiles
GET    /api/v1/alarmas/perfiles/{uuid}
PUT    /api/v1/alarmas/perfiles/{uuid}
DELETE /api/v1/alarmas/perfiles/{uuid}
POST   /api/v1/alarmas/import-json

GET    /api/v1/immo/catalog
POST   /api/v1/immo/catalog
PUT    /api/v1/immo/catalog/{uuid}
DELETE /api/v1/immo/catalog/{uuid}
GET    /api/v1/immo/profiles
POST   /api/v1/immo/profiles
GET    /api/v1/immo/profiles/{uuid}
PUT    /api/v1/immo/profiles/{uuid}
DELETE /api/v1/immo/profiles/{uuid}

GET    /api/v1/taller/vehicles
GET    /api/v1/taller/keycode?make_uuid=&model_uuid=&year=
GET    /api/v1/taller/alarmas?make_uuid=&model_uuid=&year=
GET    /api/v1/taller/immo?make_uuid=&model_uuid=&year=
```

## 14. Orden recomendado de migraciones

1. `tool_files`
2. `workshop_tools`
3. `vehicle_makes`
4. `vehicle_models`
5. `vehicle_years`
6. `vehicle_import_batches`
7. `keycode_profiles`
8. `keycode_references`
9. `keycode_codes`
10. `tool_assignments`
11. `tool_assignment_tools`
12. `tool_assignment_workshops`
13. `tool_assignment_keycode_profiles`
14. `alarma_perfiles`
15. `alarma_asignaciones`
16. `immo_catalog_items`
17. `immo_profiles`
18. `immo_assignment_details`
19. `immo_assignment_catalog_items`

## 15. Checklist para no perder funciones

- [ ] Importar JSON vehicular completo y elegir categoria antes de confirmar.
- [ ] Avisar si marca/modelos/anos ya existen.
- [ ] Actualizar categoria de marca existente solo con confirmacion.
- [ ] No consumir `temp_db/auto-list/*.json` en produccion.
- [ ] Consultar vehiculos incrementalmente por marca, modelo y ano.
- [ ] Mantener `keycodeProfileIds` como relacion many-to-many.
- [ ] Mantener `lockSelections` por perfil keycode asignado.
- [ ] Mantener todas las configuraciones visuales y decoder de keycode.
- [ ] Mantener importacion masiva de codigos keycode.
- [ ] Mantener perfiles de alarma completos, incluyendo `details`, imagenes por ano y notas.
- [ ] Mantener asignacion de multiples perfiles de alarma por vehiculo.
- [ ] Mantener catalogo immo ordenable y separable por `equipo`/`transponder`.
- [ ] Mantener campos dinamicos `generacionRemoto` de immo.
- [ ] Mantener detalle immo por asignacion: transponder, equipos, programacion manual/OBD y procedimiento.
- [ ] Validar permisos por `workshop_tools` antes de responder endpoints de taller.
