# Esquema de Archivos diagramas_pro (data.json)

> Documentación del formato de datos v7.3 utilizado por los archivos `data.json` del sistema
> `diagramas_pro`. Este es el formato que se importa al módulo de **Auto Alarmas**.

---

## Qué es diagramas_pro

`diagramas_pro` es un sistema externo de diagramas de instalación eléctrica automotriz.
Cada vehículo (marca + modelo + variante + rango de años) tiene su propio archivo `data.json`
con todos los puntos de conexión eléctrica documentados.

Estructura de carpetas del sistema externo:
```
diagramas_pro/
└── diagramas_optimized/
    └── {Marca}/
        └── {Modelo} ({Variante}) {Año_inicio}-{Año_fin}/
            ├── data.json          ← archivo principal
            └── (las imágenes están en _images/ compartida)
    └── _images/
        ├── SHARED-*.webp          ← imágenes compartidas entre modelos
        └── {SKU}-*.webp           ← imágenes específicas
```

---

## Estructura de data.json (schema_version 7.3)

### Nivel raíz

```json
{
  "schema_version": "7.3",
  "brand": "Toyota",
  "base_model": "4Runner",
  "variant": "Smart Key",
  "year_range": "2010-2019",
  "years": ["2010", "2011", ..., "2019"],
  "sources": [
    "diagramas_offline\\2010\\Toyota\\4Runner (Smart Key)",
    ...
  ],
  "vehicle_images": [ ... ],
  "dataValues": [ ... ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `schema_version` | string | Versión del esquema. Actual: `"7.3"` |
| `brand` | string | Marca del vehículo (e.g. `"Toyota"`) |
| `base_model` | string | Modelo base (e.g. `"4Runner"`) |
| `variant` | string | Variante del sistema (e.g. `"Smart Key"`, `"Standard"`) |
| `year_range` | string | Rango legible (e.g. `"2010-2019"`) |
| `years` | string[] | Lista de años cubiertos |
| `sources` | string[] | Rutas de las fuentes originales (solo referencia) |
| `vehicle_images` | VehicleImage[] | Imágenes del vehículo y logo |
| `dataValues` | DataValue[] | Puntos de conexión eléctrica |

---

### vehicle_images[]

```json
{
  "sku": "SHARED-logo-aa5f23b7",
  "file": "../../_images/SHARED-logo-aa5f23b7.webp",
  "hash": "aa5f23b7...",
  "years": ["2010", ..., "2019"],
  "kind": "logo"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sku` | string | Identificador único de la imagen |
| `file` | string | Ruta relativa desde `data.json` hacia la imagen |
| `hash` | string | Hash SHA-256 del archivo de imagen |
| `years` | string[] | Años para los que aplica esta imagen |
| `kind` | `"logo"` \| `"vehicle"` | Tipo de imagen |

**Notas:**
- `kind: "logo"` → logotipo de la marca, aplica a todos los años
- `kind: "vehicle"` → foto del vehículo, puede variar por año (facelift)
- Puede haber múltiples entradas `kind: "vehicle"` con diferentes rangos de años

---

### dataValues[] — Punto de conexión

```json
{
  "id": "12-volts-01",
  "title": "12 Volts",
  "details": [ ... ],
  "images": [ ... ],
  "button": {
    "text": "Ver imagen",
    "onclick": "../../_images/SHARED-12-volts-dd9b8c59.webp"
  },
  "notes": [ ... ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del punto (kebab-case) |
| `title` | string | Nombre del punto de conexión |
| `details` | Detail[] | Campos de información (cable, polaridad, ubicación, etc.) |
| `images` | Image[] | Imágenes de referencia |
| `button` | Button? | Botón de acción (legado; usar `images[]`) |
| `notes` | Note[]? | Notas de variación o cobertura |

---

### details[] — Campo de detalle

```json
{
  "label": "Cable",
  "value": "Pink (30A)",
  "year_values": [
    {
      "years": ["2010", "2011"],
      "value": "Red"
    },
    {
      "years": ["2012", ..., "2019"],
      "value": "Blue"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `label` | string | Etiqueta del campo (e.g. `"Cable"`, `"Polaridad"`, `"Ubicación"`) |
| `value` | string | Valor genérico / valor por defecto |
| `year_values` | YearValue[]? | Overrides por año específico |

**Etiquetas estándar en uso:**
- `"Cable"` — color y descripción del cable
- `"Polaridad"` — `"+"`, `"-"`, `"Data"`, `"AC"`, `"Cut"`, `"Reverse"`
- `"Ubicación"` — ubicación física del punto en el vehículo

**year_values[]:**
```json
{
  "years": ["2014", "2015", "2016"],
  "value": "Blue (alternate location)"
}
```
Cuando un año del vehículo seleccionado esté en `years[]`, se usa ese `value` en lugar del valor general.

---

### images[] — Imagen de referencia

```json
{
  "sku": "SHARED-12-volts-dd9b8c59",
  "file": "../../_images/SHARED-12-volts-dd9b8c59.webp",
  "hash": "dd9b8c59...",
  "years": ["2010", ..., "2019"]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sku` | string | Identificador único |
| `file` | string | Ruta relativa a la imagen |
| `hash` | string | Hash del archivo |
| `years` | string[] | Años para los que aplica esta imagen |

Un punto puede tener **múltiples imágenes** para diferentes rangos de años (la imagen del conector cambió entre generaciones).

---

### notes[] — Nota de variación o cobertura

#### Tipo `image_variation`
```json
{
  "type": "image_variation",
  "title": "Revisar imagen",
  "text": "Imagen diferente por año; confirmar el detalle en la foto."
}
```
Indica que hay imágenes distintas por año y el técnico debe verificar cuál corresponde.

#### Tipo `coverage`
```json
{
  "type": "coverage",
  "title": "Estos Datos",
  "documented": ["2010", "2011", "2012", "2013"],
  "probable": ["2014", "2015", "2016"],
  "text": "Aplican a: 2010 al 2013\nTambién puede funcionar en: 2014 al 2019"
}
```
Indica que los datos están confirmados para los años en `documented[]` pero solo son probables para `probable[]`.

---

## Sistema de categorías automático

El `AlarmasWorkspace` categoriza automáticamente los puntos de datos según el `title`:

| Categoría | Keywords que detecta |
|-----------|---------------------|
| Alimentación | `12 volt`, `ground`, `starter`, `ignition`, `accessory` |
| Smart Key | `pts`, `slp` |
| CAN / OBD | `can bus`, `obd`, `rx data`, `tx data`, `immo data` |
| Cerraduras | `power lock`, `power unlock`, `lock motor`, `driver unlock`, `passenger unlock` |
| Puertas | `door trigger`, `trunk/hatch`, `hood pin`, `trunk release` |
| Alarma | `factory alarm`, `disarm no unlock`, `security light` |
| Luces | `parking light`, `headlight`, `turn signal`, `hazard`, `reverse light`, `autolights`, `dome light` |
| Audio | `radio`, `speaker`, `tweeter`, `amplifier` |
| Sensores | `speed sense`, `tachometer`, `brake wire`, `fuel pump`, `parking brake` |
| Confort | `heated seat`, `defroster`, `wiper`, `window`, `sun roof` |
| Otros | (todo lo que no encaja arriba) |

---

## Mapeo data.json → AlarmaProfile (TypeScript)

| data.json | AlarmaProfile / AlarmaDataValue |
|-----------|--------------------------------|
| `brand` | `marca` |
| `base_model` | `modelo` |
| `variant` | `variante` |
| `year_range` | `yearRange` |
| `vehicle_images[]` | `vehicleImages: AlarmaVehicleImage[]` |
| `dataValues[].id` | `AlarmaDataValue.id` |
| `dataValues[].title` | `AlarmaDataValue.title` |
| `dataValues[].details[]` | `AlarmaDataValue.details: AlarmaDetalle[]` |
| `details[].label` | `AlarmaDetalle.label` |
| `details[].value` | `AlarmaDetalle.value` |
| `details[].year_values[]` | `AlarmaDetalle.yearValues: AlarmaYearValue[]` |
| `dataValues[].images[]` | `AlarmaDataValue.yearImages: AlarmaYearImage[]` |
| `dataValues[].notes[]` | `AlarmaDataValue.notes: AlarmaNote[]` |
| `notes[].type` | `AlarmaNote.type` (`image_variation` \| `coverage`) |
| `notes[].documented` | `AlarmaNote.documented` |
| `notes[].probable` | `AlarmaNote.probable` |

---

## Sistema de imágenes (useImageFolder)

Las imágenes en `data.json` se referencian con rutas relativas como:
```
../../_images/SHARED-12-volts-dd9b8c59.webp
```

El hook `useImageFolder` permite al usuario seleccionar la carpeta base del sistema `diagramas_pro`
en su dispositivo. Una vez seleccionada, `getImageByFile(file)` resuelve la ruta completa.

```typescript
// Uso en componentes:
const { folderName } = useImageFolder();
const imageUrl = getImageByFile("../../_images/SHARED-xxx.webp");
// → string (data URL) | null (si la carpeta no está seleccionada)
```

**Flujo de configuración:**
1. SuperAdmin abre `AlarmasManager` → botón "Seleccionar carpeta de imágenes"
2. Navega hasta la raíz de `diagramas_optimized/` (o donde estén los `_images/`)
3. El navegador otorga permisos de lectura de ese directorio
4. A partir de ahí, todas las imágenes se resuelven automáticamente

---

## Cómo importar un data.json al sistema

Ver `docs/MODULO_ALARMAS.md` para el proceso completo de importación.

Resumen:
1. Abrir `AlarmasManager` como SuperAdmin
2. Click en "Importar data.json"  
3. Seleccionar el archivo `data.json` del vehículo
4. El sistema convierte el JSON al formato `AlarmaProfile` internamente
5. Asignar el perfil creado a un vehículo en `AssignmentManager`
