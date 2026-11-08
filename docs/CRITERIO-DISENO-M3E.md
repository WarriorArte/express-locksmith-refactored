# Criterio de diseño M3 Expressive (Android)

> Guía de trabajo **módulo por módulo**. Nació del rediseño de **Immo Info** (`src/components/herramientas/ImmoWorkspace.tsx`), que es la pantalla de referencia.
>
> Cómo usarla en cada sesión:
> 1. Abrir este archivo y tomar el **primer módulo pendiente** de la sección 6.
> 2. Leer el módulo completo antes de tocarlo.
> 3. Aplicar las reglas de las secciones 2–4 usando las piezas de la sección 3 (no copiar código de Immo).
> 4. Verificar con la lista de la sección 5.
> 5. Marcar el módulo como hecho en la sección 6, con fecha y notas.
>
> Contexto ampliado: `docs/AUDITORIA-UI-MATERIAL-EXPRESSIVE.md`.

---

## 1. La idea en cinco frases

1. **Cada pantalla tiene un protagonista**: el dato que el cerrajero vino a buscar (FCC ID, código de llave, color de cable, total). Va grande, arriba y se copia con un toque.
2. **Las capas se separan con color, no con bordes**: contenedores tonales de 28 px sobre el fondo, nunca una caja con borde dentro de otra caja con borde.
3. **El texto se lee sin esfuerzo**: mínimo 12 px, títulos en `text-foreground`, el gris solo para texto de apoyo. Nada de etiquetas de 9–11 px en negrita gris.
4. **El contenido tiene la forma de lo que es**: un procedimiento son pasos numerados, un método es un chip con ícono, una lista de equipos es un carrusel de fotos.
5. **Se siente Android**: barra superior que se contrae al desplazar, onda al tocar, formas orgánicas M3E en pocos sitios con significado.

---

## 2. Anatomía de una pantalla de detalle

```
┌──────────────────────────────────────────┐
│ ←  Toyota Corolla                  (A)  │  encabezado compacto compartido
│    2018 · Toyota                        │  segunda fila; ambas se truncan
│ ╭──────────── primary-light ──────────╮  │
│ │      (forma cookie)  + foto         │  │  DetailHero: el protagonista
│ │  FCC ID                             │  │
│ │  HYQ12BDM                      ⧉    │  │  CopyableValue (32 px, toque = copiar)
│ │  [Frecuencia 315]  [Batería CR2032] │  │  SpecTile ×2
│ ╰─────────────────────────────────────╯  │
│ ╭─ card ─────────────╮ ╭─ card ───────╮  │  DetailSection (2 columnas en md)
│ │ Generación         │ │ Transponder  │  │
│ │ Etiqueta    valor  │ │ ID46         │  │  SpecRow sin divisores
│ │ Se genera con      │ ╰──────────────╯  │
│ │ [▢][▢][▢] →        │                   │  ImageCarousel
│ ╰────────────────────╯                   │
│ ╭─ card ──────────────────────────────╮  │
│ │ Programación                        │  │
│ │ [⏚ Por OBD] [✋ Manual]             │  │  TonalChip
│ │ ① Conecta y alimenta                │  │  ProcedureSteps
│ │   Conecta el equipo al puerto…      │  │
│ ╰─────────────────────────────────────╯  │
│ ╭─ warning-light ─────────────────────╮  │
│ │ ✎ Notas                             │  │  DetailSection tone="warning"
│ ╰─────────────────────────────────────╯  │
└──────────────────────────────────────────┘
```

Orden de las secciones: **protagonista → datos de identificación → cómo se hace → advertencias/notas**. Las secciones vacías no se muestran (nada de “—” en una sección entera).

### Patrón “lista → hoja” (herramientas con muchos registros)

Cuando la herramienta muestra muchos puntos o códigos (Alarmas, Keycode): `DetailScreen` → `DetailHero` con el vehículo/perfil → `SearchBar` → `ChipRow` de filtros → lista `.m3-list`. Al tocar una fila se abre una hoja con el protagonista de ese registro. Referencia: `AlarmasWorkspace.tsx`.

### Patrón “herramienta interactiva” (pantalla completa sin scroll de página)

Para herramientas de trabajo (Keycode, decodificador): no se usa `DetailScreen`, porque el contenido debe caber en la pantalla. Se mantiene la misma gramática:
- Barra `ModuleHeader` con flecha atrás junto a dos filas: título y contexto; avatar y acciones conservados.
- El protagonista en 32 px (`CopyableValue` cuando ya hay resultado); la serie sin resultado va en el encabezado, sin título grande duplicado.
- Búsqueda en píldora de 56 px con íconos dentro.
- Superficies `rounded-[28px] bg-card` para la zona de trabajo.
- Teclas redondas `bg-muted`.
- Modos como `FilterChip onCard`.
- Acción principal como botón con texto.
- Resultados en `.m3-list`, agrupados con número en `MaterialShape`.

Referencia: `KeycodeWorkspace.tsx`.

### Variante dentro de una hoja (bottom sheet)

Los detalles que se abren como hoja (`ResponsiveDialog`: venta, servicio, cotización, garantía, producto) **no** usan `DetailScreen`, porque la hoja ya tiene su propio encabezado. Usan el resto de piezas: `DetailSection`, `SpecRow`, `TonalChip`, `CopyableValue` para el folio, y `ImageCarousel` para las fotos. Dentro de la hoja, `DetailSection` va con `className="bg-muted shadow-none"`, porque la hoja ya es `bg-card`.

---

## 3. Piezas disponibles

Todas en `src/design-system/` y `src/components/herramientas/`. **Importarlas, no copiarlas.**

| Pieza | Archivo | Para qué |
|---|---|---|
| `ModuleHeader` | `design-system/layout/ModuleHeader.tsx` | Encabezado uniforme para todos los módulos: flecha + título de 18 px y contexto de 12 px en dos filas truncadas; acciones y avatar a la derecha. La flecha vuelve al inicio por defecto; los detalles proporcionan su regreso propio. |
| `DetailScreen` | `design-system/detail/DetailScreen.tsx` | Pantalla de detalle completa: scroll y `ModuleHeader` fijo con título + `meta` truncados; fondo al desplazar. Prop `actions` para botones extra en la barra. |
| `DetailHero` | ídem | Bloque protagonista `primary-light`, 28 px. En `md` pone foto a la izquierda y datos a la derecha. |
| `DetailSection` | ídem | Contenedor de sección. `tone`: `default` (card), `warning`, `destructive`. `icon` y `action` opcionales. |
| `SubHeading` | ídem | Subtítulo dentro de una sección (14 px, `muted-foreground`). |
| `SpecRow` | ídem | Fila etiqueta ↔ valor sin divisores. Agrupar en `<div className="-my-1.5">`. |
| `SpecTile` | ídem | Dato corto con ícono dentro del hero. Muestra “—” si viene vacío. |
| `TonalChip` | ídem | Chip de 8 px con ícono. `tone`: `primary` (por defecto, marca), `success`, `info`, `warning`, `neutral`, `destructive`; `accent` (color de selección) **solo** para selección activa. Estados: pendiente `warning`, en curso `info`, completado/aceptado `success`, entregado `primary` (mapa `statusTone` en `detail-view/types.ts`). |
| `CopyableValue` | ídem | Código protagonista en 32 px, en una línea, que se copia con un toque (vibración + aviso). `copiedMessage` cambia el texto del aviso. |
| `ImageCarousel` | ídem | Carrusel de `{id, label, image}`; las fotos se amplían. `fallbackIcon` para los que no tienen foto. |
| `SearchBar` | ídem | Barra de búsqueda M3 (píldora de 56 px) con botón para borrar. |
| `FilterChip` + `ChipRow` | ídem | Chips de filtro (seleccionado = `accent` + check, `count` opcional) en una fila con scroll horizontal que sangra al borde. `onCard` cuando el chip va dentro de una superficie `bg-card`. También sirven como interruptores de modo (“±1”, “Secuencia”). |
| `WireSwatch` | `components/herramientas/WireSwatch.tsx` | Muestra del color real de un cable (“WHITE/black”, “Rojo/Negro”, “Lt. Blue”): `dot` para listas, `cable` para el hero. `parseWireColors` devuelve null si no reconoce el color. |
| `NativeSelectField` | `design-system/pickers.tsx` | Campo M3 grande (64 px, etiqueta + valor + flecha) con un `<select>` **nativo** invisible encima: al tocarlo se abre la lista del sistema. `surface="onHero"` dentro del hero, `card` sobre el fondo. **Usarlo para toda lista desplegable de opciones.** |
| `NativeSelect` | `components/ui/native-select.tsx` | `<select>` nativo con el mismo aspecto que `<Input>` (48 px, borde 1.5 px, flecha). **Para listas desplegables dentro de formularios** (funciona dentro de `FormControl`). Sustituye a `Select` de shadcn. |
| `NativeSelectButton` | `design-system/pickers.tsx` | Botón compacto de filtro (40 px, ícono; `showLabel` muestra la opción elegida) con `<select>` nativo encima. Para filtros en barras de búsqueda. |
| `EmptyState` | `design-system/feedback/EmptyState.tsx` | Estado vacío de cualquier módulo: ícono sobre forma cookie, título, una línea de ayuda y acción opcional (`{ label, onClick }`, omitir con filtros activos). |
| `AuthBrand` / `AuthField` | `design-system/auth.tsx` | Pantallas de acceso: marca sobre `cookie9` que gira + título de un color; campo tonal de 56 px con ícono, etiqueta accesible, error enlazado (`aria-describedby`) y botón de mostrar contraseña de 40 px. |
| `ease-spring` / `ease-emphasized` | `tailwind.config.ts` | Curvas de animación M3E (resorte con leve rebote / estándar enfatizada). **No usar** `ease-[cubic-bezier(...)]`: Tailwind las descarta por ambigüedad con `tailwindcss-animate`. |
| `MaterialShape` | `design-system/shapes/MaterialShape.tsx` | Formas M3E: `cookie9`, `cookie6`, `clover4`, `sunny`, `softBurst`. `spin` para giro lento. Se pinta con `text-*`. |
| `ProcedureSteps` | `components/herramientas/ProcedureSteps.tsx` | Convierte el texto de un procedimiento (`- paso`, `1. paso`, `Título: cuerpo`) en pasos numerados. El primer punto que termina en “:” pasa a ser una nota. |
| `FormattedText` | `components/herramientas/RichTextField.tsx` | Texto libre con **negrita**, *cursiva* y viñetas (para notas). |
| `spawnRipple` | `lib/ripple.ts` | Onda al tocar en cualquier elemento propio (`onPointerDown={spawnRipple}` + `relative overflow-hidden`). `Button` ya la trae. |
| `.m3-list` / `.m3-list-item` | `index.css` | Lista segmentada estilo Android 16 (filas separadas 2 px, extremos redondeados). |
| `MobileListCard` | `components/shared/MobileListCard.tsx` | Fila de lista de dos líneas para usar dentro de `.m3-list`. |

Si un módulo necesita una pieza que no existe y que otro módulo también usará, **se crea en `design-system/` y se agrega a esta tabla**.

---

## 4. Reglas

### 4.1 Prohibido (señales de “hecho con IA”)

| No | En su lugar |
|---|---|
| `border border-border` en tarjetas o en cajas internas | Contenedor tonal (`DetailSection`, `bg-muted`, `bg-background/70`) |
| Caja con borde dentro de caja con borde | Un solo nivel de contenedor; subdividir con `SubHeading` y espacio |
| Etiqueta `text-[9px]`–`text-[11px]` en negrita gris como título | `SubHeading` (14 px) o título de `DetailSection` (18 px) |
| Línea horizontal decorativa junto al título (`flex-1 h-px bg-border`) | Nada: el espacio separa |
| Cuadrito de ícono con `bg-primary/10` junto a cada título | Sin ícono, o ícono suelto en color, o `MaterialShape` si tiene significado |
| Badge “✓ Característica” | `TonalChip` con un ícono que represente la característica |
| Viñetas para algo que es una secuencia | `ProcedureSteps` |
| Colores Tailwind fijos (`emerald-*`, `amber-*`, `gray-*`, `red-*`) | Tokens: `accent`, `warning-light`, `destructive-light`, `muted` |
| `uppercase`, `tracking-wide*`, `font-mono` | Nada / `tabular-nums` para cifras y códigos |
| Fuentes que cambian de tamaño con el scroll | Barra de `DetailScreen` (cambia el fondo y el título, no el tamaño del texto) |
| `initial={{ opacity: 0, y: 20 }}` de 80 ms en cada bloque | Sin animación de entrada; movimiento solo con significado |
| `active:scale-*` al tocar | Ripple (`spawnRipple` o `Button`) |
| Spinner `Loader2` grande en el centro | Esqueleto con la forma del contenido |
| Emojis (`📅`, `⚠`, `✓`) en la interfaz | Íconos de lucide |
| Listas desplegables propias (hojas con opciones, `Select` de shadcn/Radix, menús) para elegir un valor de una lista | `NativeSelectField`: selector **nativo** del sistema (preferencia del usuario) |

### 4.2 Medidas

Los formularios de alta y edición (servicio, venta, cotización, producto y cliente) usan `m3e-form`: superficie opaca, campos neutros de 48 px con esquinas de 16 px y texto de 16 px, foco visible sin saltos de borde, pestañas sobre superficie neutra y selección coral. Resúmenes con cifras principales en `primary-text`, sin líneas decorativas. Mantener encabezados independientes, botones de acción celestes y selectores nativos; no cambiar validaciones, cálculos ni guardado. Comprobación visual de piezas compartidas en claro/oscuro a 393/1280 px; revisión completa con sesión externa pendiente.

| Elemento | Valor |
|---|---|
| Radio de sección / hero | 28 px (`rounded-[28px]`) |
| Radio de tile interno / foto de carrusel | 16 px (`rounded-2xl`) / 20 px |
| Radio de chip | 8 px (`rounded-lg`) |
| Padding de sección | 20 px (`p-5`) |
| Espacio entre secciones | 12 px (`space-y-3`) |
| Título de pantalla | 18 px semibold, una fila; contexto 12 px en la segunda fila |
| Título de sección | 18 px semibold |
| Subtítulo / etiqueta | 14 px medium `muted-foreground` |
| Cuerpo | 15 px, `leading-relaxed` |
| Dato protagonista | 32 px bold `tabular-nums` |
| Texto mínimo | 12 px |
| Área táctil mínima | 44 px |
| Espacio sobre el encabezado (móvil) | `pt-app-top` = área segura + 12 px |

Los carruseles de imágenes y perfiles mantienen el espacio interior de la sección (20 px a cada lado), incluso después de desplazar o ajustar a una tarjeta; no usar márgenes negativos para llevarlos al borde exterior.

### 4.3 Color

- **Distribución del color:** el encabezado destacado (`header-surface`) lleva el tono de marca con más presencia; la información protagonista usa `bg-secondary` neutro y los accesos rápidos `bg-card`. Evitar bloques pastel repetidos. `accent` (color de selección) solo para selección activa; no colorear los accesos con él. Acciones principales y burbujas de creación en `primary`. El gris industrial en encabezados y la combinación violeta + ámbar siguen descartados; celeste + coral fue retirada (2026-11-07).
- **Fondo de pantalla:** neutral frío casi blanco en claro y casi negro en oscuro; el encabezado tonal se separa claramente de las tarjetas neutras.
- **Paleta base (elegida por el usuario, 2026-11-07): Acero y naranja.** Marca azul acero `hsl(208 38% 40%)` (texto de marca `hsl(208 45% 32%)`), selección naranja de seguridad `hsl(24 95% 53%)`, encabezados acero claro `hsl(208 22% 78%)`, fondo `hsl(210 14% 96%)`; `info` verde azulado y `warning` amarillo para no chocar con marca y selección. Vive en `:root`/`.dark` de `index.css`. Paletas alternativas seleccionables en Configuración → Sistema → Colores: **Latón y grafito**, **Petróleo y latón**, **Cobre y carbón** (`data-palette`). Toda paleta nueva debe pasar contraste AA en claro y oscuro.
- **Secciones:** `bg-card` + `shadow-sm` sobre el fondo de la pantalla.
- **Dentro del hero:** `bg-card text-card-foreground` para campos y tiles; superficies opacas para contraste consistente en ambos temas.
- **Advertencias y notas:** `bg-warning-light`. Errores o “no hacer”: `bg-destructive-light`.
- **Chips:** `primary` para la opción principal (p. ej. “Por OBD”) y `warning` para la alternativa manual o de riesgo; `accent` solo si el chip indica selección.
- **Formas M3E** sobre el hero: `text-background/60`. Detrás de números: `text-primary-light`.

### 4.4 Formas M3E: cuándo sí

- **Forma preferida:** la estrella original `cookie9`, de nueve lóbulos suaves, para el FAB y las formas compartidas; no sustituirla por Gem ni por Sunny. Conservar dimensiones, contenido y animaciones. No afecta las burbujas redondas de notificación ni de creación.
- Detrás de la **foto principal** del objeto (llavero, llave, módulo): `cookie9` con `spin`.
- La foto del remoto se escala por **ancho**, no por alto. Sobresale libremente por arriba de la estrella, y abajo se recorta siguiendo su contorno, como parcialmente metida en una bolsa. Usar una sola foto, sin degradado, y el recorte inferior de `MaterialShape` sobre una capa del tamaño completo de la forma para que los contornos coincidan.
- Detrás de **números de paso**: `cookie9`.
- Detrás del **avatar** de un cliente (pendiente): `cookie6`.
- **No** detrás de íconos decorativos ni en todas las tarjetas. Máximo dos usos por pantalla.

### 4.5 Contenido

- Títulos en lenguaje del taller: “Equipo para el remoto”, no “Este remoto se programa con”.
- Una etiqueta por control; sin descripciones salvo en acciones destructivas.
- Lo que no ayuda a decidir en la lista se va al detalle (auditoría, sección 9).

---

## 5. Lista de verificación por módulo

- [ ] Se leyó el módulo completo antes de cambiarlo.
- [ ] Se identificó el **protagonista** y está en el hero o arriba del todo.
- [ ] Usa piezas de `design-system/` (no hay copias locales de `Section`, `SpecRow`, carruseles…).
- [ ] `grep` en el archivo sin resultados para: `border border-`, `text-[9px]`, `text-[10px]`, `uppercase`, `tracking-wide`, `emerald-`, `amber-`, `bg-primary/10` (como caja de ícono), `h-px bg-border`.
- [ ] Ninguna caja con borde dentro de otra.
- [ ] Procedimientos con `ProcedureSteps`; métodos y tipos con `TonalChip`.
- [ ] Las secciones vacías no se muestran.
- [ ] Se conserva toda la funcionalidad: visor de imágenes, filtros, búsqueda, navegación atrás, datos.
- [ ] `npx tsc -p tsconfig.app.json --noEmit` sin errores y `npx eslint <archivos>` limpio.
- [ ] `npx vite build` correcto.
- [ ] Revisado en el móvil (o anotado que falta revisarlo).
- [ ] Marcado en la sección 6.

---

## 6. Módulos

Orden sugerido: primero lo que más usa el cerrajero en el teléfono.

### 6.1 Herramientas (vista del taller)

| # | Módulo | Archivo(s) | Protagonista | Estado |
|---|---|---|---|---|
| 1 | Immo Info | `herramientas/ImmoWorkspace.tsx` | FCC ID + foto del llavero | ✅ 2026-11-06 · pantalla de referencia |
| 2 | Alarmas | `herramientas/AlarmasWorkspace.tsx` | Color del cable (muestra real + nombre + polaridad) | ✅ 2026-11-06 |
| 3 | Keycode | `herramientas/KeycodeWorkspace.tsx` | Código encontrado (copiable) | ✅ 2026-11-06 · el dibujo `components/llaves/*` no se tocó |
| 4 | Selector de vehículo | `herramientas/HerramientasModule.tsx` (vista de taller), `WorkshopToolView.tsx` | El vehículo elegido como título | ✅ 2026-11-06 |
| 5 | Decodificador por foto | `herramientas/KeyPhotoDecoder.tsx` | Resultado del código | ⏸ Pospuesto por el usuario (2026-11-06): no tocar hasta que lo pida |

### 6.2 Detalles del taller (hojas)

| # | Módulo | Archivo(s) | Protagonista | Estado |
|---|---|---|---|---|
| 6 | Detalle compartido (venta, servicio, cotización) | `shared/DetailViewDialog.tsx`, `shared/detail-view/*`, `shared/DialogActionBar.tsx` | Total + estado | ✅ 2026-11-06 |
| 7 | Detalle de servicio | `services/ServiceDetailSheet.tsx` (se abre desde el historial del cliente; la página Servicios usa el detalle compartido) | Estado + siguiente paso | ✅ 2026-11-06 |
| 8 | Detalle de producto | `products/ProductDetailSheet.tsx` | Foto + precio de venta + stock | ✅ 2026-11-06 |
| 9 | Detalle de garantía | `warranties/WarrantyDetailDialog.tsx` | Días restantes (anillo de progreso) | ✅ 2026-11-06 |
| 10 | Historial de cliente | `customers/CustomerServicesDialog.tsx`, `CustomerAvatar.tsx` | Cliente (avatar en `cookie6`) + etiquetas + servicios/compras | ✅ 2026-11-06 |

### 6.3 Pantallas principales y formularios

| # | Módulo | Archivo(s) | Protagonista | Estado |
|---|---|---|---|---|
| 11 | Inicio (Dashboard) | `pages/Dashboard.tsx`, `components/dashboard/VehicleHomeExtras.tsx`, `hooks/useVehicleHome.ts` | La herramienta de vehículos | ✅ 2026-11-06 · decisión del usuario: el inicio es la herramienta de vehículos |
| 12 | Inventario (cuadrícula) | `pages/Inventario.tsx`, `products/ProductTile.tsx` | Foto + precio + stock | ✅ 2026-11-06 · pendiente: tabla de la vista lista en escritorio |
| 13a | Formularios: piezas comunes + cliente | `shared/CreationDialogHeader.tsx`, `ui/label.tsx`, `ui/icon-tabs.tsx`, `ui/native-select.tsx`, `ui/button.tsx` (proto-ghost), `customers/CustomerFormDialog.tsx` | — | ✅ 2026-11-06 |
| 13b | Formularios: servicio, venta, cotización, producto | `ServiceFormDialog`, `SaleFormDialog`, `QuoteFormDialog`, `ProductFormDialog`, `ServiceProductsEditor`, `CustomerSelect`, `ProductSelect` | — | ✅ 2026-11-06 |
| 14 | Configuración | `pages/Configuracion.tsx`, `components/settings/*` | — (lista `.m3-list` estilo Ajustes de Android) | ✅ 2026-11-06 |
| 15 | Acceso | `pages/Auth.tsx`, `pages/SuperAdminAuth.tsx`, `design-system/auth.tsx` | Logo en forma M3E | ✅ 2026-11-06 |

### 6.4 SuperAdmin — fuera del rediseño

> **Decisión del usuario (2026-11-06):** la interfaz de SuperAdmin no se rediseña. Solo la usa una persona (el administrador) y nadie más la ve. No tocar estos archivos salvo que el usuario lo pida.

| # | Módulo | Archivo(s) | Estado |
|---|---|---|---|
| 16 | Editor de Keycode | `herramientas/KeycodeManager.tsx` (2540 líneas) | — No se rediseña |
| 17 | Editor de Immo | `herramientas/ImmoManager.tsx`, `ImmoSuppliesManager.tsx` | — No se rediseña |
| 18 | Editor de Alarmas | `herramientas/AlarmasManager.tsx` | — No se rediseña |
| 19 | Base de vehículos | `herramientas/VehicleDatabaseManager.tsx` | — No se rediseña |
| 20 | Asignaciones | `herramientas/AssignmentManager.tsx`, `WorkshopAssignmentManager.tsx` | — No se rediseña |
| 21 | Pestañas de SuperAdmin | `components/superadmin/tabs/*`, `pages/SuperAdmin*.tsx` | — No se rediseña |

---

## 7. Registro de sesiones

| Fecha | Módulo(s) | Notas |
|---|---|---|
| 2026-11-07 | Herramientas del vehículo: pestañas + cuadrícula | Captura del usuario: con Keycode, Immo Info y Alarmas apiladas como secciones con carrusel, la última quedaba cortada bajo la barra. **El usuario pidió conservar las miniaturas** (son de mucha ayuda). Ahora: grupo de botones M3 Expressive (una píldora de 48 px por herramienta con su ícono y número de perfiles; la elegida en `accent` = selección; se desplaza si hay más herramientas) y debajo una cuadrícula de 2 columnas con las miniaturas de esa herramienta, cada una con su proporción (llave apaisada a 2 columnas, llavero 4:5, alarma cuadrada). La pestaña elegida se conserva al volver de un workspace. Se quitaron las secciones apiladas, el carrusel y el contador aparte. |
| 2026-11-07 | Inicio: carga sin falso vacío | Al abrir la app se veía un instante “Aún no hay vehículos configurados para tus herramientas.”, porque mientras llegaban los datos la lista de asignaciones estaba vacía. `useToolAssignments` ahora expone `loading`; mientras cargan asignaciones o permisos del taller, la pantalla de vehículos muestra los chips y los campos Año/Marca/Modelo vacíos, desactivados y con “Cargando…”; los mensajes de “sin herramientas” / “sin vehículos” solo aparecen cuando la carga terminó. **Regla:** un estado vacío nunca debe mostrarse mientras los datos están cargando; mostrar la estructura vacía o un esqueleto. |
| 2026-11-07 | Diálogos y notificaciones estándar | **Notificaciones:** convivían dos sistemas (toast de shadcn arriba en ~36 archivos y Sonner abajo en 11), por eso salían en sitios distintos. Ahora hay **uno solo**: `hooks/use-toast.ts` conserva la API `toast({ title, description, variant })` pero redirige a Sonner (snackbar M3 abajo al centro, sobre la barra inferior, superficie inversa, vibración conservada; `destructive` → `toast.error`). Se eliminaron `components/ui/toaster.tsx` y `toast.tsx`; Sonner usa el `useTheme` propio (antes `next-themes`, no montado); acción del snackbar en `primary-light` legible sobre fondo oscuro; íconos de error/éxito con color. El aviso de actualización sube por encima de la barra inferior (antes la tapaba). **Diálogos:** contenedor de escritorio de `responsive-dialog` y `Dialog` básico → 28 px, `bg-popover`, sin borde (antes borde + fondo de página + esquinas de 8 px); confirmaciones (`AlertDialog`) con botones en fila alineados a la derecha (M3) en vez de apilados a todo el ancho; botones de cerrar (X) con área táctil de 40 px. La captura de “¿Anular garantía?” era anterior al ajuste de la auditoría. **Regla:** notificar siempre con `toast` (de `use-toast` o `sonner`); no montar otros sistemas ni usar `alert()`/`confirm()`. |
| 2026-11-07 | Auditoría de todos los módulos (móvil) | Barrido de patrones prohibidos en todo lo que ve el taller (sin SuperAdmin, decodificador ni plantillas de impresión): las páginas principales ya estaban limpias; lo pendiente estaba en diálogos secundarios. **Base de diálogos:** título por defecto 24 px negrita alineado a la izquierda y descripción 15 px en `responsive-dialog`, `dialog` y `alert-dialog`; el diálogo de confirmación pasa a tarjeta M3 (28 px, sin borde, con margen lateral; antes ocupaba todo el ancho sin esquinas en el teléfono) y su “Cancelar” es tonal. **Diálogos:** Convertir cotización (opciones tonales con anillo de selección; **bug:** total con “$” fijo → moneda del negocio), Ajustes de garantías (unidades con `NativeSelect`, categorías en `.m3-list` con punto de color), Categorías (lista segmentada, botones de 44 px con etiqueta), Historial y Movimiento de inventario (filas tonales, cantidad sin badge), Fotos del servicio (sin bordes, botones tonales), Galería (selección con anillo, sin bordes). **Imágenes:** `ImageUploader` con botones de 40–44 px y nombre accesible (antes ~28 px, vidrio y borde blanco); visor de fotos: **bug** el botón cerrar ponía la X roja sobre fondo rojo al pasar el cursor. Sin vidrio en el aviso de actualización ni en la vista previa de cotización. Se conservan a propósito: contorno de muestras de color, vistas previas de tema y borde punteado de “suelta aquí” del cargador. |
| 2026-11-07 | Alineación entre módulos | Al cambiar de Inventario a Ventas la tarjeta bajaba: Ventas, Cotizaciones y Garantías envolvían el contenido en `mt-6` (24 px extra). Se quitó; los seis módulos siguen la misma secuencia: encabezado (`pt-app-top` … `pb-4`) → contenido sin margen superior. Botón “Nueva” de escritorio unificado (sin estilo a mano). **Regla:** no añadir márgenes superiores propios al contenido de un módulo. |
| 2026-11-07 | Estado vacío común | Captura del usuario: Inventario tenía el estado vacío M3E y Ventas el antiguo (ícono suelto de 48 px en `card-elevated`). Nuevo `EmptyState` (`design-system/feedback/EmptyState.tsx`: tarjeta de 28 px, ícono sobre `cookie9`, título, ayuda y acción opcional) usado en Inventario, Servicios, Ventas, Cotizaciones, Clientes y Garantías. Se quitó el “+” solo-móvil de Ventas (duplicaba el FAB). Textos de Servicios con tildes. |
| 2026-11-07 | Espacio superior en móvil | Los encabezados quedaban ~60 px por debajo del borde: cada pantalla añadía `pt-10` (40 px, pensado para una barra de estado translúcida que ya no se usa: `apple-mobile-web-app-status-bar-style` es `black`, el contenido empieza bajo la barra del sistema) más el relleno del encabezado. Nueva medida única `--app-top-gap` = `env(safe-area-inset-top) + 12px` y utilidad `.pt-app-top`, aplicada a las 8 páginas, inicio, Configuración, `DetailScreen` y Keycode; la franja del inicio (`dashboard-surface`) y el hero antiguo (`ce-hero-mobile-bleed`) se extienden hasta el borde con ese mismo valor. Escritorio sin cambios (`lg:pt-*` sigue ganando). **Regla:** usar `pt-app-top` para el inicio de cualquier pantalla móvil; no `pt-10`/`pt-11`. |
| 2026-11-07 | Paleta base: Acero y naranja | **Decisión del usuario:** se elimina Celeste y coral y Acero y naranja pasa a ser la paleta por defecto (sus valores van a `:root`/`.dark`; sin atributo). Nueva alternativa **Cobre y carbón** (marca cobre `hsl(18 62% 42%)`, selección carbón, `warning` amarillo para no confundirse con el cobre; contraste AA verificado). Alternativas: Latón y grafito, Petróleo y latón, Cobre y carbón. Quien tuviera guardada la paleta celeste vuelve a la base automáticamente. |
| 2026-11-07 | Keycode: color del trazo | El trazo de la llave usaba siempre el color guardado por SuperAdmin (`strokeColorLight/Dark`, por defecto `#00AEE6` fijo), que ignoraba el tema y la paleta. `KeycodeWorkspace` ya no pasa `strokeColor`: el dibujo usa su valor por defecto `hsl(var(--primary))` y sigue al modo claro/oscuro y a la paleta elegida. Del ajuste de SuperAdmin solo se conserva el grosor. El selector de color del editor de SuperAdmin ahora solo afecta a su propia vista previa. |
| 2026-11-07 | Paletas industriales + pulido móvil | **Prueba de colores en la app real:** Configuración → Sistema → Colores (`PalettePicker`, guardado en el teléfono vía `useTheme`). Tres paletas industriales además de la actual (celeste + coral): **Latón y grafito** (marca latón, selección grafito, “pendiente” pasa a naranja para no confundirse con el latón), **Acero y naranja** (marca azul acero, selección naranja de seguridad; `info` pasa a verde azulado y `warning` a amarillo para no chocar), **Petróleo y latón** (marca petróleo, selección latón). Solo redefinen tokens con `<html data-palette>` en `index.css`; versión clara y oscura; contraste AA verificado (texto de marca, texto sobre botones y selección, encabezado y texto secundario). Al elegir una, dejarla como base y retirar el selector. **Pulido móvil:** campos base (`Input`, `Textarea`, `NativeSelect`) a 16 px y buscador `UnifiedSearchInput` de 13 px → píldora M3 de 48 px y 16 px con botón borrar (en iPhone, menos de 16 px provoca zoom automático al tocar); controles junto al buscador a 48 px sobre `bg-card`; filtro de estado de Servicios con lista nativa (`NativeSelectButton`); filtros activos (estado, categoría, fecha) en `accent` = selección; filtro de fecha sin vidrio esmerilado ni encogerse al tocar; se quitaron los “+” solo-móvil de Servicios, Clientes y Cotizaciones (duplicaban el FAB de la barra, que ya abre el formulario de cada pantalla); botón de duración de Garantías tonal en vez de relleno. |
| 2026-11-07 | Coral solo en selección | Revisión de los cambios del usuario (paleta celeste + coral, `header-surface`, `primary-text`/`primary-fill`, `ModuleHeader`, `m3e-form`, `ShortcutTile`, `AppLoader`). Al pasar `accent` a coral, varias piezas que lo usaban sin ser selección quedaron coral, contra la regla “coral solo para selección activa”: botón `secondary` → `bg-secondary` (tonal neutro); hover de `ghost`/`outline` y resaltado de menús (`dropdown-menu`, `select`, `command`, cierre de diálogo) → `bg-muted`; chips de estado → `success`/`info`/`primary` (antes `accent`); insignias de ícono (Dashboard, aviso de actualización, subir imagen) y tecla “?” de Keycode → `bg-secondary`; accesos del menú de cuenta → `ShortcutTile`. “Programado” usa un **punto hueco** celeste (`bg-primary-light ring-2 ring-inset ring-primary`) para no confundirse con “Entregado” (celeste sólido), igual en Servicios, detalle de servicio, ficha de cliente e inicio. El coral queda en: barra inferior activa, `IconTabs`, `FilterChip`, filtro de categoría activo y plantilla elegida en Cotización. |
| 2026-11-06 | Barra inferior | **Decisión del usuario:** barra flotante M3 Expressive + FAB aparte (sustituye a la muesca animada). Píldora flotante de 64 px a 12 px de los bordes; el destino activo se expande (`grow-[2.6]`) en una píldora `accent` con ícono + nombre y los demás muestran solo el ícono; el `+` es un FAB de 64 px con forma `cookie9` que gira 45° al pulsarlo. Animación por CSS (flex-grow, max-width) con `ease-spring`, porque `LazyMotion` usa `domAnimation` (sin animaciones `layout`). Se eliminó todo el cálculo de la muesca (ResizeObserver, path SVG). **Bug de configuración corregido:** las curvas `ease-[cubic-bezier(...)]` no se generaban (ambiguas con `tailwindcss-animate`), así que el interruptor M3 animaba con la curva por defecto; ahora existen `ease-spring` y `ease-emphasized` en `tailwind.config.ts`. |
| 2026-11-06 | Acceso | Taller y SuperAdmin comparten `AuthBrand`/`AuthField`. Logo: cuadrado celeste → llave (o escudo) sobre forma cookie que gira lento. Título de un solo color (“Cerrajería **Express**” tenía “Express” en celeste, contra la regla de títulos de un color); se quitó la frase “Gestión inteligente de tu taller”. Campos sin borde, 56 px, con `aria-label` (antes solo placeholder), errores enlazados al campo; botón de mostrar contraseña de 16 px → 40 px con etiqueta. Código del taller con `autoCapitalize` en mayúsculas. Sin animación de entrada. |
| 2026-11-06 | Configuración | Móvil: tarjeta de perfil `primary` lleno con cuadrito → contenedor `primary-light` con iniciales en `cookie6`; pestañas hechas a mano (11 px + línea) → `IconTabs`; País y Tamaño de papel con `NativeSelect` (país muestra bandera, nombre y moneda en la opción); “Copiar” código del taller ahora avisa (vibración + toast); “Incluir logo” como fila con interruptor; Sistema como `.m3-list` estilo Ajustes (Modo oscuro, Respaldo, Mantenimiento) y Cerrar sesión como píldora `destructive-light`. **Se quitó la fila “Notificaciones”, que no hacía nada al tocarla.** Escritorio: País, papel y rol con `NativeSelect`; lista de usuarios en `.m3-list` con iniciales en `cookie6`. `UserManagement`, `UpdateCheckCard`, `QuoteDocSettingsPanel` (plantillas y paletas con anillo de selección en vez de bordes de 2 px, títulos de sección 16 px, se quitó “Cambiar color” repetido bajo cada color) y `MaintenanceManager` (ámbar fijo → `warning-light`, módulos como tarjetas tonales, selector de taller nativo) sin bordes ni etiquetas de 11 px. Se quitaron los emojis ✓/✅/⚠️ de los registros de Respaldo y Mantenimiento. |
| 2026-11-06 | Formularios (parte 2) | Todas las listas desplegables de formularios con `NativeSelect` (tipo de servicio, plantilla de inventario, unidad de garantía, método de pago, tipo de servicio de inventario y **categoría**; esta última era un buscador propio y ahora es lista nativa con el punto de color de la categoría al lado). Opciones on/off (Programar servicio, Aplicar garantía, “no consume productos”) pasan de checkbox en caja con borde a **fila con interruptor** en `bg-muted` de 28 px; se quitó el emoji 📅. Resúmenes de costos en `bg-muted` de 28 px, total en 20 px, sin líneas divisorias ni verde fijo. Producto: “¿Qué deseas crear?” con dos botones grandes con forma cookie (sin “4 pasos” ni cuadritos de ícono) y encabezado sin cuadrito. `ServiceProductsEditor`: cada línea en `bg-muted` de 20 px, botón agregar relleno de 48 px. `CustomerSelect`/`ProductSelect` con forma de campo (48 px, esquina 8 px); **conservan su buscador** porque las listas de clientes/productos pueden ser largas. **Bugs corregidos:** en Servicio → Imágenes el botón de quitar foto solo aparecía con el cursor (inaccesible en el teléfono); en Cotización el subtotal y el total mostraban “$” fijo en lugar de la moneda del negocio. |
| 2026-11-06 | Formularios (parte 1) | Piezas comunes que mejoran **todos** los formularios: `Label` pasa de 11 px negrita gris a 14 px medium en `foreground`; `CreationDialogHeader` sin cuadrito de ícono, título 24 px y descripción solo para lectores de pantalla (menos texto); `IconTabs` al estilo M3 (ícono activo en píldora `accent`, etiqueta 12 px, sin línea divisoria); variante de botón `proto-ghost` (Cancelar) tonal sin borde; nuevo `NativeSelect` para formularios. Formulario de cliente: tipo con lista nativa y las 5 etiquetas como filas con interruptor en `.m3-list` (antes cajitas con borde en cuadrícula de 5 columnas). |
| 2026-11-06 | Inventario | Nuevo `ProductTile` (móvil y escritorio): foto limpia sin el velo negro `bg-black/40`, chip “Stock bajo” sobre la foto, nombre en 15 px (antes 11 px blanco sobre la foto), precio en 18 px, stock en palabras (“3 en tienda · 2 en bodega”, antes “T:3 · B:2”) y botón tonal Vender/Usar. En escritorio el menú ⋯ aparece al pasar el cursor. Encabezado: los botones con `bg-white/[.09]` (solo se veían en modo oscuro) pasan a tonales redondos; el filtro de categoría usa `NativeSelectButton` (lista nativa) y se marca en `accent` si hay filtro activo; se quitó el “+” móvil (lo hace el + de la barra). Esqueleto con la forma de la tarjeta, estado vacío con forma cookie, contador “N artículos” en lugar del título “Resultados”, lista móvil como `.m3-list`. Sin animaciones escalonadas de entrada. Pendiente: tabla de la vista lista en escritorio. |
| 2026-11-06 | Inicio = herramienta de vehículos | **Decisión del usuario:** como es lo más usado, el inicio (`/`) muestra el selector de vehículo (`HerramientasModule` con la prop `homeContent`). Debajo, mientras no hay vehículo elegido, `VehicleHomeExtras`: accesos rápidos de una palabra (Venta, Servicio, Cotización, Cliente) que abren los formularios de alta, y el resumen del día en `.m3-list` (En curso ahora, Pendientes de hoy con hora, Cotizaciones por vencer). El servicio se abre en solo lectura (el estado se avanza en Servicios, donde está la lógica de inventario al completar); las cotizaciones llevan a /cotizaciones. `useVehicleHome()` decide: taller con alguna herramienta de vehículos y no SuperAdmin; si no, queda el panel clásico. Barra inferior: **Vehículos (inicio) · Servicios · (+) · Inventario · Ventas**. Sidebar: “Dashboard” pasa a “Vehículos” y desaparece la entrada duplicada `/herramientas`. Menú de cuenta: sin Vehículos (ya es el inicio). La ruta `/herramientas` sigue existiendo. |
| 2026-11-06 | Historial de cliente | `CustomerAvatar` pasó de cuadrado con iniciales a iniciales sobre `MaterialShape cookie6` (color según tipo; rojo claro si “no trabajar”); también se ve en la página Clientes de escritorio. Ficha: nombre en el título y Persona/Empresa debajo; hero con avatar de 80 px, tiles Servicios y Compras, chips No volver a trabajar / Con deuda / Frecuente / Cerrajero externo y el **motivo de no trabajar** (antes no se mostraba). El hero se vuelve `destructive-light` si el cliente está marcado. Contacto con `DetailViewCustomer` (también el **teléfono secundario** y las **notas**, que antes no aparecían). Servicios como `.m3-list` de `MobileListCard` (descripción, estado, fecha, precio) con esqueleto al cargar. Pie: Editar; Eliminar cliente en ⋯. Lista móvil de Clientes: se quitó el total de compras de la fila (auditoría 9.1). El módulo 11 (Dashboard) se salta hasta que el usuario apruebe un diseño. |
| 2026-11-06 | Detalle de garantía | Encabezado “Garantía” + código · tipo (antes el código aparecía dos veces). Hero con color según estado (`primary-light` vigente, `warning-light` por vencer, `muted` vencida, `destructive-light` anulada) y **anillo de progreso** (`DaysRing`, local al archivo) con los días restantes en 32 px; se vacía hacia el vencimiento. Al lado: estado en 28 px, “Vence / Venció / Anulada el …” y chip de días de cobertura. Si está anulada, sección `destructive` con el motivo. Secciones: Producto/Servicio con referencia, Cliente (`DetailViewCustomer`, llamar y escribir con un toque) y Vigencia. Pie: Ticket visible; **Anular garantía en ⋯**. |
| 2026-11-06 | Detalle de producto | Título = nombre; debajo, la categoría con un punto de su color (antes era un chip con el color a pleno) o “Servicio · tipo”. Hero: foto ampliable sobre `bg-background/70` (sin foto: forma cookie con ícono), precio sugerido / del servicio en 36 px, chip “Stock bajo · quedan N” (warning) o “N en stock”, y tiles Tienda / Bodega / Mínimo. Secciones `bg-muted`: Descripción, Precios (o Costos del servicio), Instrucciones / Requisitos, Notas internas. Pie: Editar, Movimientos, Historial visibles; **Eliminar pasó al menú ⋯** para no quedar junto a Editar. Se quitó el morado fijo `#6F67B0` de los servicios. |
| 2026-11-06 | Detalle de servicio | Título = descripción del servicio; folio · tipo debajo. Hero: estado en 28 px con punto de color, “Programado para / Iniciado / Registrado” + fecha, tiles Total y Saldo (o Precio estimado/final), y el **siguiente paso** (Iniciar → Completar → Entregar) como botón de 56 px dentro del hero. Reutiliza `DetailViewCustomer` (ahora la dirección abre Google Maps en otra pestaña, también en el detalle compartido), `DetailViewImages` y `DetailViewItems`. Pie con `DialogActionBar`: Editar y Fotos visibles; Cancelar servicio y Eliminar en ⋯. **Bugs corregidos:** “Agregar imágenes” aparecía dos veces en el menú, y si solo había “Eliminar” el menú no se mostraba. |
| 2026-11-06 | Detalle compartido | Encabezado de la hoja: tipo (“Venta”) + folio · fecha, sin cuadrito de ícono. Hero `primary-light`: total en 36 px + chips de estado (tono según `statusTone` en `detail-view/types.ts`) y forma de pago + tiles de anticipo/saldo o “Válida hasta”. Secciones `bg-muted`: Cliente (teléfono y correo se tocan para llamar o escribir: `tel:`/`mailto:`), Descripción + Solución, Fotos en cuadrícula, Productos/Conceptos (“2 × $150” + subtotal) y Desglose (solo si hay mano de obra o descuento). Sin verdes fijos, sin etiquetas de 11 px. **`DialogActionBar`** (pie de acciones de varios diálogos) pasó de botones con borde a píldoras tonales: `default` = `bg-muted`, `primary` = relleno, `destructive`/`warning` = contenedor claro; afecta también al detalle de producto, garantía, historial de cliente y ticket. |
| 2026-11-06 | Selector de vehículo | Tres `Select` con borde → `NativeSelectField` ×3 sobre el hero (selector nativo del sistema; se probó primero una hoja con buscador y el usuario prefirió el nativo). Chips de tipo con `FilterChip`. Con el vehículo elegido, el hero muestra “Marca Modelo” como título y el año, con “Cambiar modelo” (vuelve a mostrar los campos) / “Otro vehículo”. Herramientas en `DetailSection` (Keycode, Immo Info, Alarmas) con `ToolTile` (imagen sobre `bg-muted` 20 px). Estado vacío con forma cookie + auto. **Bug corregido:** las miniaturas de Alarmas usaban el nombre del archivo como URL y nunca cargaban; ahora se resuelven con `getImageByFile`. La vista SuperAdmin del mismo archivo no se tocó (módulos 16–21). |
| 2026-11-06 | Keycode | Solo interfaz; la lógica de búsqueda (código, cortes, ±1, secuencia, Master/Valet, decodificador) quedó igual. Barra Android + código encontrado como `CopyableValue`. La búsqueda es una píldora con íconos Info y Cámara dentro. Llave y teclado en superficies de 28 px. Teclas redondas. Modos “±1” y “Secuencia” como chips. Botón “Buscar” con texto. Resultados en `.m3-list` agrupados por “Llave N” con número en forma cookie. Master/Valet como etiquetas tonales sin colores fijos. Info de la serie con `DetailSection`/`SpecRow` y cortes por cerradura con check. Hoja “Leer llave con foto” con Cámara/Galería. Estados sin perfil y cargando con `DetailScreen` y esqueleto. Pendiente revisar en el móvil que llave + teclado sigan cabiendo sin scroll. |
| 2026-11-06 | Alarmas | Desplegable + modo Buscar/Explorar → `SearchBar` + chips de categoría + lista `.m3-list` con muestra de color del cable. Al tocar un punto se abre una hoja: cable protagonista (`WireSwatch` + color en 28 px + chip de polaridad), Datos, advertencias en `warning`, Diagrama ampliable y notas “Aplica a”. Nuevas piezas: `SearchBar`, `FilterChip`, `ChipRow`, `WireSwatch`. Hojas inferiores de toda la app con esquinas de 28 px. Pendiente revisar en el móvil. |
| 2026-11-06 | Immo Info | Pantalla de referencia. Se extrajeron `DetailScreen`, `DetailHero`, `DetailSection`, `SubHeading`, `SpecRow`, `SpecTile`, `TonalChip`, `CopyableValue` e `ImageCarousel` a `design-system/detail/DetailScreen.tsx`. |
| 2026-11-07 | Auditoría final (parte 1) | Colores: `success` verde propio (145°) e `info` azul (210°), ya no iguales al celeste de marca. 83 textos de 8–11 px → 12 px. Cajas con borde → fondos tonales en Dashboard (StatCard, métricas, stock bajo), aviso de actualización, subir imagen, contador numérico, vista previa de cotización. **Bug:** el botón de fecha usaba `bg-white/[.09]` y era invisible en modo claro. Avisos estilo snackbar abajo sobre la barra inferior, con vibración corta. Barra superior compacta que aparece al desplazar en todas las páginas con `HeroHeader`. Ventas móvil: fecha/hora en lugar del método de pago. |
