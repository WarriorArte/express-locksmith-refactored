# Auditoría UI: lo que hace que la app se vea genérica y cómo llevarla a Material 3 Expressive

> Fecha: 2026-11-06 · Rama: `deving` · Alcance: `src/` completo (tokens, primitivos de `components/ui`, layout, páginas, módulo Vehículos/Herramientas, diálogos).
>
> Cómo leerlo: la sección 1 es el diagnóstico. La 2 explica la causa de fondo. La 3 enumera los hallazgos con evidencia y corrección. La 4 resuelve la pantalla de la captura. La 5 propone los tokens nuevos. La 6 es el plan por fases.

---

## 1. Diagnóstico en una página

La app no se ve “hecha con IA” por un solo detalle. Se ve así porque **todo usa la misma receta**: una caja blanca con borde de 1 px, esquinas de 16 px, sombra suave, un ícono dentro de un cuadrito con tinte del color primario, una etiqueta diminuta en gris y un texto en negrita. Esa receta se repite en el dashboard, las listas, los detalles, los formularios y el módulo de Vehículos. Ninguna pantalla tiene un elemento que solo podría existir en una app de cerrajería.

Números que lo confirman (solo archivos `.tsx` de `src/`):

| Patrón | Apariciones | Archivos |
|---|---:|---:|
| `border border-…` explícito (además del borde que ya traen Card, Input, Select, Popover) | 162 | 36 |
| `rounded-sm/lg/xl/2xl/3xl` (todos valen **lo mismo**, ver 2.1) | 366 | 91 |
| Texto de 8–11 px (`text-[8px]` … `text-[11px]`) | 273 | 45 |
| `uppercase` (anulado por un parche CSS global) | 142 | 39 |
| `tracking-wide/wider/widest` (también anulado por parche) | 119 | 32 |
| `bg-muted/20–50` como “fondo de sub-caja” | 97 | 38 |
| `bg-primary/5` o `/10` (tinte primario en cuadritos de ícono) | 48 | 24 |
| Spinner `Loader2` | 102 | 33 |
| Colores Tailwind fijos (`emerald`, `amber`, `gray`, `red`…) fuera del tema | ~130 | 17 |
| Animación de entrada `initial={{ opacity: 0, y: … }}` | 44 | 23 |
| Resplandor `shadow-[0_0_…]` en botones | 17 | — |
| Bloque hero copiado y pegado (`ce-hero ce-hero-mobile-bleed`) | 6 copias | 6 |

Material 3 Expressive va en dirección contraria a esa receta. Separa capas con **color tonal** en lugar de bordes. Usa **varias formas** (esquinas pequeñas, grandes, píldoras y formas orgánicas) para marcar jerarquía. Usa **tipografía grande y con peso variable** como elemento gráfico. Y anima con **resortes** (springs), no con fundidos genéricos.

---

## 2. Causa de fondo: los tokens no permiten variedad

Antes de tocar pantallas hay que corregir cuatro cosas en la base. Si no, cada corrección local se pierde.

### 2.1 Todas las esquinas son iguales (crítico)

[tailwind.config.ts:94-102](../tailwind.config.ts#L94-L102) asigna `var(--radius)` (= `1rem`) a `sm`, `md`, `lg`, `xl`, `2xl` y `3xl`. En consecuencia:

- `rounded-sm` en un checkbox, un tooltip o un popover mide 16 px, igual que una tarjeta.
- Los 366 usos de `rounded-*` en el código **no generan jerarquía**: todo tiene la misma curva.
- Para salir de ahí, el código fue acumulando valores arbitrarios (`rounded-[12px]` ×14, `rounded-[14px]` ×13, `rounded-[1.25rem]` ×8, `rounded-[18px]`, `rounded-[13px]`…). Es un sistema de formas improvisado.

**Corrección:** definir la escala de formas de M3 (ver 5.2) y que cada clase tenga un valor distinto.

### 2.2 Los colores de estado colapsan en uno solo (crítico)

En [src/index.css:26-66](../src/index.css#L26-L66), `--primary`, `--success`, `--info` y `--ring` tienen el **mismo tono (199°)**. En modo oscuro también son idénticos (`199 90% 72%`). Resultado: “completado”, “informativo”, “activo” y “botón principal” se ven iguales. La app compensa con verdes fijos (`bg-emerald-100`, `text-emerald-600`) que no respetan el tema.

Además, los comentarios dicen “Neon Green” pero el valor es celeste, y `--accent` dice “cool slate gray” pero es celeste claro. Son restos de un diseño anterior.

**Corrección:** generar un esquema tonal M3 completo (primary, secondary, tertiary, error, más los contenedores de cada uno) a partir de un color semilla. Asignar success y warning a tonos propios: verde 145° y ámbar 40° con sus `-container`.

### 2.3 Parches globales que esconden el problema

[src/index.css:446-452](../src/index.css#L446-L452) contiene:

```css
.uppercase { text-transform: none; }
.tracking-wide, .tracking-wider, .tracking-widest, [class*="tracking-[0."] { letter-spacing: 0.005em !important; }
.font-mono { … }
```

Y en [tailwind.config.ts:26](../tailwind.config.ts#L26) `mono` apunta a Figtree.

El parche evitó reescribir 260 clases, pero el código sigue “pensando” en el estilo anterior: etiquetas de 9–10 px, en negrita y gris, que antes eran MAYÚSCULAS ESPACIADAS y ahora son simplemente texto diminuto. Ahí está el “Procedimiento de programación del remoto” de la captura: **9 px, bold, `muted-foreground/70`**. Es casi ilegible y no aporta jerarquía.

**Corrección:** eliminar el parche, borrar `uppercase`/`tracking-*`/`font-mono` del JSX y sustituir esas etiquetas por los roles tipográficos `label-large` o `title-small` (ver 5.3).

### 2.4 `DESIGN.md` describe otra app

[DESIGN.md](../DESIGN.md) dice: DM Sans, radio 0.4rem, sidebar siempre oscuro, textura de puntos, “neon green”. Nada de eso es cierto hoy (Outfit + Figtree, radio 1rem, sidebar claro, sin textura). Cualquier persona o agente que lo siga produce UI inconsistente.

**Corrección:** reescribirlo cuando se apliquen los tokens de la sección 5.

---

## 3. Hallazgos por categoría

Severidad: **A** = se nota en todas las pantallas · **B** = se nota en varias · **C** = detalle.

### 3.1 Bordes en todo (A)

| Dónde | Qué pasa |
|---|---|
| [components/ui/card.tsx:6](../src/components/ui/card.tsx#L6) | `Card` trae `border border-border` por defecto. |
| [src/index.css:221-229](../src/index.css#L221-L229) | `.card-elevated` = borde + sombra + `transition: all`. Se usa 40 veces. |
| [components/ui/input.tsx](../src/components/ui/input.tsx), `textarea.tsx`, `select.tsx` | Borde de 1.5 px en `--input` (gris medio, 62 % de luminosidad), más visible que el propio texto de ayuda. |
| `popover`, `dropdown-menu`, `select` (contenido), `tooltip` | `rounded-sm border bg-popover`: menús con borde, el estilo por defecto de shadcn. |
| [MobileListCard.tsx:77](../src/components/shared/MobileListCard.tsx#L77) | Separador `border-t` dentro de una tarjeta que ya tiene borde. |
| [ImmoWorkspace.tsx:393-410](../src/components/herramientas/ImmoWorkspace.tsx#L393-L410) | Tres niveles de borde anidados: tarjeta con borde → caja gris con borde → chip con borde. |
| Tablas (`Servicios`, `Ventas`, `Inventario`…) | Encabezado `bg-muted/30` con `border-b` y `divide-y`: tabla genérica de admin. |

**Corrección (M3):**
- Tarjetas **sin borde**. Se separan del fondo con el color de contenedor: `surface` → `surface-container-low` → `surface-container` → `surface-container-high`. Usar borde solo en la variante `outlined`, cuando la tarjeta está sobre un fondo del mismo tono.
- Inputs con estilo **filled** de M3: fondo `surface-container-highest`, sin borde perimetral, línea inferior de 1 px que pasa a 2 px en `primary` al enfocarse, esquinas superiores de 4 px. O bien **outlined** con borde `outline-variant`, pero no ambos según el lugar.
- Menús y popovers: sin borde, `surface-container` + elevación 2, esquinas de 16 px (`shape-large` en menús de M3E).
- Una sola capa de contraste por nivel. Si el padre es `surface-container`, el hijo es `surface-container-high`, sin borde.

### 3.2 Una sola forma para todo (A)

Ver 2.1. Además:
- Botones, chips, badges, filtros, el FAB y el avatar son todos píldora o cuadrado de 16 px. No hay contraste de forma.
- El cuadrito de ícono (`w-8..10 h-8..10 rounded-* bg-primary/10 text-primary`) aparece en 15 archivos: dashboard, actividad reciente, encabezado de diálogos, detalle y tabla de servicios. Es la firma más reconocible de “plantilla”.

**Corrección (M3 Expressive):**
- Escala de formas con contraste: chips de 8 px, tarjetas de 16–24 px, sheets de 28 px, botones en píldora que **cambian de forma al presionar** (píldora → 12 px, el *shape morph* de los botones M3E).
- Usar las formas de la librería M3 Expressive (cookie, clover, soft-burst, pill, arch) en **pocos sitios con significado**:
  - Avatar del cliente (`CustomerAvatar`) dentro de una forma *cookie-9*.
  - Ícono del tipo de servicio (llave, auto, casa) en una forma *soft-burst* que gira lentamente mientras el servicio está “en curso”.
  - Indicador del tab activo en la barra inferior.
- Quitar el cuadrito tintado de los encabezados de diálogo ([CreationDialogHeader.tsx](../src/components/shared/CreationDialogHeader.tsx)) y de la actividad reciente. Si el ícono aporta, ponerlo grande y sin caja, o en forma orgánica con el color `tertiary-container`.

### 3.3 Etiquetas diminutas y grises (A)

- 273 textos de 8–11 px. `text-[10px]` solo aparece 152 veces.
- Patrón repetido: `text-[10px] font-bold uppercase tracking-wider text-muted-foreground` como título de sección ([DetailViewDialog.tsx:89-159](../src/components/shared/DetailViewDialog.tsx#L89-L159), `DetailViewItems`, `DetailViewTotals`, `DetailViewCustomer`, `CreationDialogHeader`, `DashboardMetricTile`, `StatsLayout`).
- [ImmoWorkspace.tsx:15-23](../src/components/herramientas/ImmoWorkspace.tsx#L15-L23) `SectionLabel`: 9 px + ícono de 12 px + línea horizontal que llena el espacio. Es el “divisor con etiqueta” típico de las plantillas generadas.
- Hay 664 usos de `text-muted-foreground`, así que el gris es el color dominante del texto.

**Corrección:**
- Mínimo **12 px** para cualquier texto (`label-small` de M3). Lo normal en etiquetas es 14 px (`label-large`).
- Los títulos de sección pasan a `title-medium` (16 px, peso 500–600) en color `on-surface`, **sin línea divisoria**. La separación la da el espacio (24 px) o el cambio de contenedor.
- `on-surface-variant` (gris) solo para texto de apoyo, nunca para títulos.

### 3.4 Tipografía sin carácter (B)

- Outfit y Figtree son buenas fuentes, pero se usan como cualquier sans: un solo tamaño de título por página (`clamp(1.55rem…2.15rem)`), y el resto entre 11 y 15 px.
- No hay números grandes protagonistas. El total de una venta, el precio de un servicio o el código de una llave tienen el mismo peso que una etiqueta.
- `DashboardMetricTile` muestra el número en 22 px. En M3E un KPI es `display-medium` (45 px) o mayor.

**Corrección (M3 Expressive “emphasized type”):**
- Usar una fuente variable con eje de peso y ancho, por ejemplo **Roboto Flex** o **Google Sans Flex**. Así se pueden usar pesos enfáticos (`display-large-emphasized`, peso 600–700) y en cifras el ancho condensado.
- Momentos tipográficos propios del oficio:
  - **Código de llave / serie** (Keycode): mostrarlo enorme, en `display-medium`, con cifras tabulares, como si estuviera grabado en metal. Hoy se ve como un badge.
  - **Totales** en detalle y ticket: `headline-large`, alineados a la derecha.
  - **Folio** del servicio: `title-large` sin gris al 50 %. Hoy está en `font-mono text-[10px] text-muted-foreground/50`, casi invisible ([MobileListCard.tsx:65](../src/components/shared/MobileListCard.tsx#L65)).

### 3.5 Color plano: el celeste lo hace todo (B)

- Una sola familia de color (celeste 199°) para primary, success, info, accent, ring y sidebar.
- El hero de cada página es `primary-light` plano. En las 6 páginas se ve el mismo bloque celeste.
- Verdes y ámbar fijos: `bg-emerald-100 text-emerald-800 border-emerald-200` en [ImmoWorkspace.tsx:413](../src/components/herramientas/ImmoWorkspace.tsx#L413), `bg-emerald-50` en [DetailViewTotals.tsx:48](../src/components/shared/detail-view/DetailViewTotals.tsx#L48), 33 `text-amber-*`, 13 `text-gray-*`.

**Corrección:**
- Esquema M3 completo con **tres roles de acento**: `primary` (celeste, acciones), `secondary` (azul grisáceo, filtros y chips), `tertiary` (un tono cálido, por ejemplo latón o ámbar `#C08A2E`, que remite a llaves y cerraduras) para los momentos destacados: código de llave, “programación OBD”, servicio urgente.
- Estados con sus propios contenedores: `success-container`, `warning-container`, `error-container`. Prohibir colores Tailwind fijos con una regla de ESLint (`no-restricted-syntax` sobre `/(emerald|amber|gray|red)-\d/`).
- El hero de cada sección con color propio de su contenedor: Servicios en `primary-container`, Inventario en `secondary-container`, Vehículos en `tertiary-container`. Así cada sección se reconoce sin leer el título.

### 3.6 Movimiento genérico (B)

- 44 animaciones `initial={{ opacity: 0, y: 20 }}` con `duration: 0.08` (13 casos). Duran 80 ms, no se perciben y solo cuestan render.
- `.card-elevated` usa `transition: all 0.2s ease`.
- `active:scale-[0.97]` en todos los botones: es el tic estándar de cualquier plantilla.
- `animate-pulse` en el punto de estado y en los skeletons.

**Corrección (M3 Expressive motion):**
- Definir dos familias de resorte y usarlas en framer-motion:
  - *Spatial* (posición, tamaño, forma): `{ type: "spring", stiffness: 380, damping: 30 }` (rápido) y `{ stiffness: 200, damping: 24 }` (por defecto).
  - *Effects* (color, opacidad): resorte sin rebote, `{ stiffness: 1400, damping: 80 }`.
- Animaciones con sentido: el botón cambia de forma al presionar, el sheet sube con rebote leve, la tarjeta de lista se expande al detalle (*shared element*, `layoutId`) en lugar de abrir un diálogo sin relación visual.
- Eliminar las animaciones de entrada de 80 ms.
- Cambiar `Loader2` (102 usos) por el **loading indicator** de M3E (forma que se transforma de polígono a círculo) en cargas de pantalla completa, y por skeletons con la forma real del contenido en listas.

### 3.7 Componentes shadcn sin personalizar (B)

| Componente | Estado actual | Corrección M3E |
|---|---|---|
| `Checkbox` | 16 px, `rounded-sm` (en realidad 16 px, así que es un círculo), borde primary | 18 px, esquina 2 px, área táctil de 40 px, check animado con trazo. |
| `Switch` | shadcn por defecto | Switch M3: pista de 52×32, *thumb* que crece de 16 a 24 px al activarse con ícono de check. |
| `Badge` | píldora shadcn | Separar en **Chip** (assist/filter/input, 32 px de alto, esquina 8 px) y **Badge** (solo contadores). |
| `Tabs` / `IconTabs` | subrayado de 2 px | *Primary tabs* con indicador de 3 px y esquinas superiores redondeadas, o **button group conectado** de M3E para 2–4 opciones. |
| `Select` / menús | lista con borde | Menú M3E: `surface-container`, ítem seleccionado con fondo `secondary-container` y forma de píldora. |
| `Dialog` overlay | `bg-black/80` | Scrim al 32 %. 80 % es demasiado oscuro y se ve “web”. |
| `Table` | genérica | En móvil, listas M3 (one/two/three-line). En escritorio, tabla sin rayas con fila seleccionada en `secondary-container`. |
| `Skeleton` | `rounded-sm bg-muted animate-pulse` | Shimmer con la forma real de la tarjeta. |

### 3.8 Estructura de pantalla repetida (B)

- Las 6 páginas principales repiten el mismo bloque hero (eyebrow + título + subtítulo + avatar + buscador). Está copiado y pegado, no es un componente; [HeroHeader.tsx](../src/design-system/layout/HeroHeader.tsx) existe pero no todas lo usan.
- El dashboard móvil es una cuadrícula 3×N de cuadrados idénticos con ícono y texto ([Dashboard.tsx:70](../src/pages/Dashboard.tsx#L70)), y rellena huecos con cuadrados vacíos al 30 % de opacidad ([Dashboard.tsx:85](../src/pages/Dashboard.tsx#L85)). Es el lanzador genérico de las plantillas.
- El sidebar de escritorio es también una cuadrícula 2×N de cuadros.
- Los estados vacíos son todos iguales: ícono gris de 48 px + título + texto + botón ([Servicios.tsx:531](../src/pages/Servicios.tsx#L531) y 40 casos más).

**Corrección:**
- Un solo componente `PageHeader` con variantes, en lugar de 6 copias.
- **Dashboard móvil:** sustituir la cuadrícula de cuadrados por contenido real:
  1. Una tarjeta grande “En curso ahora” con el servicio activo (cliente, vehículo, forma *soft-burst* animada).
  2. Un carrusel M3 de servicios pendientes de hoy.
  3. Accesos rápidos como **button group** horizontal (Venta · Servicio · Cotización).
  4. El resto de secciones viven en la barra inferior y el menú, no en una cuadrícula.
- **Sidebar escritorio:** *navigation rail* de M3E (ícono + etiqueta, indicador en píldora) que se expande a *drawer*. La cuadrícula 2×N desaparece.
- **Estados vacíos** ilustrados y específicos del oficio. Por ejemplo, la silueta de una llave sin cortes con “Aún no hay códigos para esta serie”. Pocas ilustraciones, hechas en SVG con las formas M3 y el color tertiary.

### 3.9 Resplandores, vidrio y restos del diseño anterior (C)

- 17 `shadow-[0_0_16..32px_hsl(var(--primary)/0.3..0.4)]` en botones (Auth, Servicios, Configuración). Ya se anulan en modo oscuro con un selector `[class*="shadow-[0_0_"]` ([index.css:430](../src/index.css#L430)), otro parche.
- `.glass`, `.gradient-text`, `.sidebar-nav-item`, `.status-pill`, `--shadow-gold`, `--gradient-*`: utilidades heredadas que ya no tienen función.
- 20 `backdrop-blur` en 8 archivos.

**Corrección:** eliminar los resplandores (M3 no los usa; el énfasis lo da el color de contenedor y la elevación tonal), borrar las utilidades heredadas y el selector de anulación, y dejar `backdrop-blur` solo en la barra inferior si se mantiene flotante.

### 3.10 Contenido y microcopy (C)

- Emojis y símbolos en la interfaz: `📅 Programar servicio` ([ServiceFormDialog.tsx:802](../src/components/services/ServiceFormDialog.tsx#L802)), `⚠` en errores de KeycodeManager, `✅`/`✓` en logs de Backup y Mantenimiento, `'✓'` como texto de un checkbox hecho a mano (AssignmentManager, KeycodeWorkspace).
- “Tu taller en la palma de tu mano.”: frase de marketing genérica.
- Badges de check del tipo “✓ Programación OBD” (ver sección 4).
- Textos del contenido con viñetas que empiezan en **negrita + dos puntos** (“**Conecta y alimenta:** …”). Es el formato típico de las respuestas de un LLM. No es un problema de código, pero el renderizador ([RichTextField / FormattedText](../src/components/herramientas/RichTextField.tsx)) puede convertirlas en pasos numerados con estilo propio (ver 4).

**Corrección:** usar íconos (lucide o Material Symbols) en lugar de emojis, y textos directos (“3 servicios hoy · 1 en curso”).

### 3.11 Demasiado texto en la navegación y los menús de opciones (A)

Referencias visuales que compartiste (apps de bienestar y productividad, 2026-11-06): en todas, la navegación es **solo ícono** con un indicador de píldora en el tab activo. Los accesos son **ícono grande + una palabra** (“Breathe”, “Journal”). Las acciones secundarias son botones redondos sin texto (+, ⌘, ✕). Los títulos son de **una o dos palabras grandes** (“My plan”, “Your Toolkit”). El texto aparece donde está el contenido, no en los controles.

La app hace lo contrario: cada control lleva título, descripción, etiqueta de sección y a veces un chip.

#### Inventario de texto por superficie

| Superficie | Texto visible hoy | Problema |
|---|---|---|
| **Barra inferior** ([BottomNav.tsx](../src/components/layout/BottomNav.tsx)) | 4 etiquetas de 11 px bajo cada ícono, y el tab activo repite el ícono en la muesca | La muesca ya identifica el tab activo. Las etiquetas de 11 px en gris son las que hacen ver la barra “cargada”. |
| **Hoja “Crear nuevo”** (FAB) | Ícono en caja + “Crear nuevo” + “Elige qué vas a registrar en el taller.” + 5 tarjetas de 136 px con “Nuevo Servicio”, “Nueva Venta”, “Nueva Cotización”… | El título y la descripción repiten lo que ya dice el botón +. “Nuevo/Nueva” se repite 5 veces. |
| **Menú de cuenta** ([AccountMenu.tsx](../src/components/layout/AccountMenu.tsx)) | ~24 textos: nombre del taller, “Más opciones · navegación”, código del taller, 2 tiles con título + descripción, 3 encabezados de sección (OPERACIÓN, CATÁLOGO, CUENTA), 6 filas con título + descripción + chevron, “Cerrar sesión” + “Volver a la pantalla de acceso” | Cada fila tiene descripción (“Propuestas y conversión a venta”, “Caja del día y facturas”…) que nadie necesita después del primer día. “Más opciones · navegación” no significa nada para el usuario. |
| **Dashboard móvil** ([Dashboard.tsx:62-86](../src/pages/Dashboard.tsx#L62-L86)) | Cuadrícula 3×3 de cuadros con ícono + nombre de sección | Duplica la barra inferior y el menú de cuenta: la misma sección aparece en tres sitios. |
| **Sidebar escritorio** ([Sidebar.tsx](../src/components/layout/Sidebar.tsx)) | Nombre del taller + “Sistema de Gestión” + cuadrícula 2×N con etiquetas de 10 px | “Sistema de Gestión” es relleno. |
| **Hero de cada página** | Eyebrow + título + subtítulo con cifras (“Servicios” / “En el taller” / “3 servicios hoy · 1 en curso”) | Tres líneas para decir dónde estás. El eyebrow repite el nombre del tab que ya está activo. |

#### Errores de contenido detectados de paso

- **Notificaciones falsas:** el tile muestra “4 sin leer” y un badge “4” fijos en el código ([AccountMenu.tsx](../src/components/layout/AccountMenu.tsx)), y lleva a Configuración.
- **Código de taller inventado:** si no hay taller, muestra `ELE-2024`.
- **Nombre inconsistente para la misma ruta `/herramientas`:** la barra inferior y el sidebar dicen “Vehículos”, el hero dice “Herramientas · Selección de vehículo” y el menú de cuenta dice “Herramientas — Inventario del taller”. Esa última descripción es incorrecta: el inventario está en `/inventario`.

#### Corrección propuesta

1. **Barra inferior:** quitar las etiquetas de los tabs inactivos y conservar la muesca animada (fue restaurada a propósito en `4882e3e`). El tab activo puede mostrar su etiqueta dentro de la muesca o debajo, en 12 px. Mantener `aria-label` en cada tab.
2. **Hoja “Crear nuevo”:** quitar la caja del ícono y la descripción. Título corto (“Crear”) y una fila de 5 botones circulares con **una palabra**: Servicio · Venta · Cotización · Cliente · Producto (el patrón “Quiet moments” de la referencia). Altura de hoja aproximadamente a la mitad.
3. **Menú de cuenta:** convertirlo en
   - Cabecera: avatar + nombre de la persona + taller (dos líneas, sin “Más opciones · navegación”).
   - Una cuadrícula de 4 columnas con ícono + una palabra: Cotizaciones · Ventas · Garantías · Clientes (y Configuración).
   - “Cerrar sesión” como botón de texto al final, sin descripción ni caja de ícono.
   - Sin encabezados de sección ni descripciones por fila. Quitar el tile de notificaciones hasta que exista la función real.
   - Pasa de unos 24 textos a unos 9.
4. **Dashboard móvil:** eliminar la cuadrícula de secciones (ya están en la barra y el menú) y usar el espacio para contenido real (ver 3.8).
5. **Hero:** una sola línea de título grande (“Servicios”, “Inventario”, “Vehículos”) más una línea de datos. Eliminar el eyebrow en las páginas raíz; mantenerlo solo como botón “← volver” en las pantallas de detalle.
6. **Un nombre por sección:** decidir entre “Vehículos” y “Herramientas” y usarlo en barra, sidebar, hero y menú.
7. **Regla general:** una etiqueta por control, sin descripción, salvo en acciones destructivas o poco frecuentes (Respaldo, Mantenimiento), donde la descripción evita errores.

---

## 4. Caso de la captura: “Procedimiento de programación del remoto”

Archivo: [ImmoWorkspace.tsx:389-430](../src/components/herramientas/ImmoWorkspace.tsx#L389-L430)

### Qué la delata

1. `SectionLabel` de 9 px con línea horizontal de relleno.
2. Una tarjeta con borde (`rounded-xl border border-border bg-card`)…
3. …que contiene un subtítulo de 9 px gris al 70 %…
4. …que contiene otra caja con borde (`rounded-lg bg-muted/40 border border-border/70`)…
5. …que contiene una píldora con borde y check (`bg-primary/10 border-primary/20` + `<Check/>`), el badge “✓ Feature” más típico de las plantillas.
6. El procedimiento se muestra como texto corrido con viñetas, aunque es una **secuencia de pasos**.
7. “Programación Manual” usa `emerald` fijo y “OBD” usa `primary`. Son dos lenguajes visuales para el mismo tipo de dato.

### Cómo debería verse (M3 Expressive)

```
┌─────────────────────────────────────────────┐  ← surface-container-low, radio 28, sin borde
│  Programación del remoto          (title-L) │
│                                             │
│  ╭──────────╮ ╭──────────╮                  │  ← chips de método (no badges):
│  │ ⌁ OBD    │ │ ✋ Manual │                  │     tertiary-container / secondary-container,
│  ╰──────────╯ ╰──────────╯                  │     radio 8, ícono propio, 32 px de alto
│                                             │
│  ①  Conecta y alimenta                      │  ← pasos numerados: número en forma
│      Conecta el equipo al puerto OBD…       │     "cookie" con primary-container,
│                                             │     título title-small + cuerpo body-medium
│  ②  Selecciona marca y modelo               │
│      …                                      │
│                                             │
│  ⓘ El procedimiento puede variar según el   │  ← nota en surface-container-high,
│    equipo que uses.                         │     radio 16, ícono info
└─────────────────────────────────────────────┘
```

Cambios concretos:

- Quitar `SectionLabel`. El título de sección es `text-base font-semibold text-foreground` (title-medium) sin línea.
- Un solo contenedor: `rounded-[28px] bg-surface-container-low p-5`, sin bordes internos.
- Los “badges” pasan a ser **chips de método** con íconos propios (conector OBD, mano). Tienen un color por método y vienen de un mapa único en el tema, no de clases sueltas.
- `FormattedText`: detectar los patrones `- **Título:** texto` y `1. texto` y renderizarlos como **lista de pasos** (`<ol>` con contador en forma orgánica). La advertencia inicial (“El procedimiento puede ser ligeramente diferente…”) pasa a ser una nota informativa al final.
- Mismo tratamiento en “Detalles de Programación”, “Se genera con” y “Notas generales” (esta última con `warning-container`, sin borde).

---

## 5. Tokens propuestos

### 5.1 Color (esquema tonal M3)

Generar con **Material Theme Builder** (semilla `#00AEE6`, color custom tertiary `#C08A2E`) y exportar como variables CSS. Roles mínimos:

```
--primary / --on-primary / --primary-container / --on-primary-container
--secondary / … / --secondary-container / --on-secondary-container
--tertiary / … / --tertiary-container / --on-tertiary-container
--error / … / --error-container / --on-error-container
--success-container / --on-success-container      (custom, 145°)
--warning-container / --on-warning-container      (custom, 40°)
--surface, --surface-dim, --surface-bright
--surface-container-lowest / -low / (base) / -high / -highest
--on-surface, --on-surface-variant
--outline, --outline-variant
```

Mapear los nombres shadcn actuales a estos roles durante la transición (`--card` → `surface-container-low`, `--muted` → `surface-container-high`, `--border` → `outline-variant`, `--input` → `outline`) para no romper los componentes de golpe.

### 5.2 Formas

```ts
// tailwind.config.ts → theme.extend.borderRadius
none: "0",
xs:   "4px",    // inputs filled (esquinas superiores), tooltips
sm:   "8px",    // chips, checkbox contenedor
md:   "12px",   // botones presionados (morph), tarjetas compactas
lg:   "16px",   // tarjetas, menús
xl:   "28px",   // sheets, diálogos, hero, contenedores grandes
"2xl":"32px",   // tarjeta destacada del dashboard
full: "9999px", // botones en reposo, FAB, indicadores
```

Formas orgánicas: exportar como SVG/`clip-path` 4–5 formas de la librería M3 Expressive (cookie-9, clover-4, soft-burst, pill, arch) en `src/design-system/shapes/` y crear un componente `<Shape name="cookie9">`.

### 5.3 Tipografía

| Rol | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| display-large-emph | 57/64 | 700 | Código de llave, total de venta |
| display-medium | 45/52 | 500 | KPI del dashboard |
| headline-large | 32/40 | 600 | Título de página |
| headline-small | 24/32 | 600 | Título de diálogo/sheet |
| title-large | 22/28 | 500 | Folio, nombre de cliente |
| title-medium | 16/24 | 600 | Títulos de sección |
| body-large | 16/24 | 400 | Texto de formularios |
| body-medium | 14/20 | 400 | Texto general |
| label-large | 14/20 | 500 | Botones, chips |
| label-small | 12/16 | 500 | **Mínimo absoluto** |

Crear utilidades `.text-display-l`, `.text-title-m`, etc. y prohibir `text-[Npx]` con ESLint.

### 5.4 Movimiento

```ts
// src/design-system/motion.ts
export const spring = {
  fastSpatial:    { type: "spring", stiffness: 1400, damping: 67 },
  defaultSpatial: { type: "spring", stiffness: 700,  damping: 48 },
  slowSpatial:    { type: "spring", stiffness: 300,  damping: 30 },
  fastEffects:    { type: "spring", stiffness: 3800, damping: 123, bounce: 0 },
  defaultEffects: { type: "spring", stiffness: 1600, damping: 80,  bounce: 0 },
};
```

(Valores basados en los tokens de movimiento expresivo de M3. Ajustarlos a ojo en el dispositivo.)

### 5.5 Elevación

M3 usa elevación **tonal**: un nivel más alto significa un contenedor más claro (o más oscuro en modo claro). La sombra queda solo para elementos flotantes (FAB, menús, barra inferior). Reducir `--shadow-*` a dos niveles y quitar `shadow-md` de las tarjetas del dashboard.

---

## 6. Plan por fases

| Fase | Trabajo | Archivos clave | Impacto |
|---|---|---|---|
| **0. Limpieza** | Quitar parches (`.uppercase`, `tracking`, `font-mono`, anulación de `shadow-[0_0_`), utilidades heredadas, resplandores y emojis. Reescribir `DESIGN.md`. | `index.css`, `tailwind.config.ts`, `DESIGN.md` | Bajo riesgo, deja el terreno limpio |
| **1. Tokens** | Esquema de color M3, escala de formas real, roles tipográficos, `motion.ts`. Mapear nombres shadcn a los nuevos roles. | `index.css`, `tailwind.config.ts`, `src/design-system/` | Cambia toda la app de golpe |
| **2. Primitivos** | `Card` sin borde (variantes `filled`/`elevated`/`outlined`), inputs `filled`, `Chip` nuevo, `Switch`, `Checkbox`, menús, `Tabs` y button group, scrim, loading indicator, skeleton con forma. | `src/components/ui/*` | Alto, sin tocar páginas |
| **3. Reemplazos masivos** | Borrar `border border-border` redundantes, `text-[9-11px]` → roles, `bg-muted/NN` → `surface-container-*`, colores Tailwind fijos → tokens, quitar cuadritos de ícono tintados. | 36–45 archivos (ver tabla de la sección 1) | Alto, mecánico |
| **3b. Navegación con menos texto** | Sección 3.11: barra sin etiquetas inactivas, hoja “Crear” compacta, menú de cuenta en cuadrícula, quitar notificaciones falsas, unificar “Vehículos/Herramientas”. | `BottomNav`, `AccountMenu`, `Dashboard`, `Sidebar` | Alto y rápido; se puede hacer antes que la fase 1 |
| **4. Pantallas firma** | Detalle Immo con pasos (sección 4), código de llave grande, dashboard móvil nuevo, navigation rail, `PageHeader` único, hero con color por sección. | `ImmoWorkspace`, `KeycodeWorkspace`, `Dashboard`, `Sidebar`, páginas | Lo que hace la app reconocible |
| **5. Movimiento** | Springs, *shape morph* en botones, transición lista → detalle con `layoutId`, eliminar fades de 80 ms. | `framer-motion` en 23 archivos | Pulido |
| **6. Guardas** | Reglas ESLint contra `text-[Npx]`, colores Tailwind fijos, `rounded-[…]` arbitrario y `border border-border` en tarjetas. | `eslint.config.js` | Evita que vuelva a pasar |

---

## 7. Checklist rápido para cualquier pantalla nueva

- [ ] ¿Hay algún borde que se pueda reemplazar por un cambio de contenedor tonal?
- [ ] ¿Hay algún texto de menos de 12 px?
- [ ] ¿El título de sección es gris o tiene una línea divisoria? → `title-medium` en `on-surface`, sin línea.
- [ ] ¿Hay un ícono dentro de un cuadrito con `bg-primary/10`? → quitarlo o usar una forma con significado.
- [ ] ¿Hay más de un nivel de caja anidada con borde?
- [ ] ¿Se usan colores Tailwind fijos (`emerald`, `amber`, `gray`…)?
- [ ] ¿La cifra o el código más importante de la pantalla es lo más grande de la pantalla?
- [ ] ¿La animación usa un resorte del sistema, o un `opacity/y` genérico?
- [ ] ¿Esta pantalla tiene **algo** que solo tendría sentido en una app de cerrajería?

---

## 8. Objetivo: que se sienta como una app nativa de Android

Pedido del 2026-11-06: “que se vea lo más nativo posible a Android”. La referencia es Android 16 con Material 3 Expressive (Ajustes, Gmail, Archivos de Google). Una app web nunca será idéntica, pero estas son las señales que un usuario de Android reconoce sin pensarlo.

| Señal nativa | Cómo se ve en Android | Estado en la app |
|---|---|---|
| **Onda al tocar (ripple)** | Todo lo tocable responde con una onda desde el dedo, no encogiéndose | ✅ Hecho: `src/lib/ripple.ts` en `Button`, filas de lista, menú de cuenta y hoja “Crear”. Se quitó `active:scale` de los botones. |
| **Listas segmentadas** | Grupos de filas separadas 2 px, esquinas grandes solo arriba y abajo del grupo (Ajustes de Android 16) | ✅ Hecho: `.m3-list` / `.m3-list-item` en Servicios, Ventas, Cotizaciones, Garantías y Clientes. |
| **Fila de lista de dos líneas** | Título de 16 sp, línea de apoyo de 14 sp, valor a la derecha, 72 dp de alto | ✅ Hecho: `MobileListCard` reescrito. |
| **Switch M3** | Pista de 52×32; el círculo crece de 16 a 24 al activarse | ✅ Hecho: `components/ui/switch.tsx`. |
| **Checkbox M3** | 18 dp, esquina de 2 dp, borde de 2 dp | ✅ Hecho: `components/ui/checkbox.tsx`. |
| **Scrim de diálogos** | Oscurecimiento ligero (≈32 %) | ✅ Hecho: de 80 % a 40 %. |
| **Menús sin borde** | Superficie elevada con sombra, sin línea perimetral | ✅ Hecho: dropdown, select, popover y tooltip. |
| **Título de la barra superior = nombre de la sección** | “Servicios”, “Inventario”… en grande, sin texto encima | ✅ Hecho en todas las páginas raíz. |
| **Navegación inferior con íconos** | Solo íconos; el activo muestra su nombre | ✅ Hecho: barra flotante M3 Expressive con el destino activo expandido (ícono + nombre) y FAB con forma cookie aparte (2026-11-06; sustituye a la muesca). |
| **Barra superior que se contrae al hacer scroll** | *Large top app bar*: el título grande pasa a barra pequeña al desplazar | ⏳ Pendiente. `ImmoWorkspace` ya lo hace; llevarlo a `HeroHeader` para todas las páginas. |
| **FAB extendido** | Botón “+ Servicio” abajo a la derecha que se encoge a “+” al hacer scroll | ⏳ Decisión pendiente: hoy el + está en el centro de la barra (muesca). Mantenerlo es válido; para más sensación nativa, FAB extendido por página. |
| **Snackbar** | Avisos abajo, sobre la barra de navegación, una línea + acción (“Deshacer”) | ⏳ Pendiente: `sonner` con `position="bottom-center"` y `offset` sobre la barra; acción “Deshacer” al eliminar. |
| **Vibración háptica** | Pulso corto al confirmar, al cambiar de tab y en pulsación larga | ⏳ Pendiente: `navigator.vibrate?.(10)` en acciones clave (en web solo Android la soporta). |
| **Pulsación larga = selección** | Mantener presionada una fila activa la selección múltiple | ⏳ Pendiente: sustituye al menú ⋮ por fila. |
| **Color de la barra de estado** | La barra del sistema toma el color de la barra superior | ⏳ Pendiente: `index.html` tiene `theme-color` fijo `#0A0A0F`; cambiarlo según el tema claro/oscuro. |
| **Tamaño de letra del sistema** | Respeta la escala de fuente del usuario | ⏳ Pendiente: sustituir `text-[Npx]` por `rem` (roles de la sección 5.3). |
| **Selectores de fecha y hora M3** | Calendario modal con cabecera grande | ⏳ Pendiente: revisar `DateFilterButton` y los formularios con fecha. |
| **Fuente** | Roboto / Google Sans Flex | ⏳ Opcional: hoy Outfit + Figtree (elección reciente). Para máxima sensación nativa, Roboto Flex. |
| **Gesto atrás** | Atrás cierra hojas y diálogos | ✅ Ya existía (historial en `dialog.tsx` y `responsive-dialog.tsx`). |

---

## 9. Qué sacar de la vista principal y dejar solo en el detalle

Principio Android: **la lista sirve para elegir, el detalle para leer**. Cada fila responde solo a “¿cuál es?” y “¿qué tan urgente es / cuánto cuesta?”. Lo demás se ve al tocarla.

### 9.1 Listas móviles

| Pantalla | Se queda en la lista | Pasa al detalle | Estado |
|---|---|---|---|
| **Servicios** | Descripción, estado, cliente, precio | **Folio**, dirección, tipo (ícono), estimado/final | ✅ Folio retirado de la fila |
| **Ventas** | Artículos, cliente, total | **Folio**, método de pago (hoy ocupa el lugar del estado) | ✅ Folio retirado · ⏳ cambiar el método de pago por fecha/hora |
| **Cotizaciones** | Concepto, estado, cliente, total, aviso “· 3d” solo si vence pronto | **Folio**, fecha de validez completa | ✅ Folio retirado |
| **Garantías** | Producto/servicio, estado, cliente, días | **Folio**, tipo “Venta/Servicio” | ✅ Ambos retirados |
| **Clientes** | Nombre, etiqueta (Frecuente, Con deuda…), teléfono | **Tipo Persona/Empresa**, total de compras | ✅ Ambos retirados; la ficha del cliente muestra compras y número de servicios |
| **Inventario (cuadrícula)** | Foto, nombre, precio, aviso “bajo” | Categoría, tipo de servicio, desglose de totales | ⏳ Pendiente |

### 9.2 Encabezados

| Antes | Ahora |
|---|---|
| “Servicios” / **En el taller** / 3 servicios hoy · 1 en curso | **Servicios** / 3 servicios hoy · 1 en curso |
| “Cotizaciones” / **Presupuestos al instante** / … | **Cotizaciones** / … |
| “Ventas” / **Registro de ventas** / … | **Ventas** / … |
| “Clientes” / **Tus clientes** / … | **Clientes** / … |
| “Garantías” / **Control de garantías** / … | **Garantías** / … |
| “Inventario” / **Productos y servicios** / … | **Inventario** / … |
| “Herramientas” / **Selección de vehículo** | **Vehículos** |
| **Configuración** / Administra tu negocio y personaliza la app | **Configuración** |

### 9.3 Navegación y menús

| Elemento | Antes | Ahora |
|---|---|---|
| Barra inferior | Ícono + nombre en los 4 tabs | Solo ícono; el nombre aparece en el tab activo |
| Hoja “Crear” | Ícono en caja + “Crear nuevo” + descripción + 5 tarjetas de 136 px con “Nuevo/Nueva …” | “Crear” + 5 botones redondos de una palabra |
| Menú de cuenta | ~24 textos (descripción por fila, 3 encabezados, “Más opciones · navegación”, código de taller, notificaciones falsas) | Persona y taller, 6 accesos de una palabra, “Cerrar sesión”. Respeta las funciones activas del taller. |
| Sidebar de escritorio | “Sistema de Gestión” bajo el nombre del taller | Solo el nombre del taller |
| Nombre de `/herramientas` | Vehículos / Herramientas / “Inventario del taller” | **Vehículos** en todas partes |

### 9.4 Pendientes de “vista principal → detalle”

1. ~~**Dashboard móvil**~~ ✅ 2026-11-06: el inicio pasó a ser la herramienta de vehículos, con accesos rápidos y el resumen del día debajo (ver `docs/CRITERIO-DISENO-M3E.md`, módulo 11). La cuadrícula de accesos se mantiene solo para talleres sin herramientas de vehículos.
2. **Tablas de escritorio:** quitar la columna del ícono de tipo y la dirección bajo la descripción; ambas están en el detalle.
3. **Menú ⋮ por fila (escritorio):** tiene de 6 a 8 opciones por fila. Dejar solo el siguiente paso del estado (Iniciar → Completar → Entregar) y mover editar, imágenes y eliminar al detalle.
4. **Detalle de Immo** (sección 4): pasos numerados, chips de método, sin cajas anidadas.

---

## 10. Registro de cambios aplicados (2026-11-06, rama `deving`)

**Base**
- `tailwind.config.ts`: escala de formas real (4 / 8 / 12 / 16 / 20 / 24 / 28 px) en lugar de todo a 16 px; quitadas las sombras `glow` y `gold`.
- `src/index.css`: eliminados los parches globales (`.uppercase`, `tracking-*`, `font-mono`) y la anulación de resplandores en modo oscuro. También `.card-primary`, `.glass`, `.gradient-text`, `.status-pill`, `--gradient-*`, `--shadow-glow/gold` y el punto rojo falso del avatar. `.card-elevated` queda sin borde. Nuevas `.m3-list`, `.m3-list-item` y `.m3-ripple`. Comentarios de color corregidos.
- Limpieza en 58 archivos `.tsx` (sin tocar plantillas de cotización, ticket ni dibujos de llaves): 132 `uppercase`, 126 `tracking-*` y 16 resplandores eliminados; 60 `font-mono` → `tabular-nums`; 162 textos de 8–10 px → 11 px.

**Componentes**
- `Button`: ripple, sin encogerse al tocar. `Card`: sin borde. `Checkbox` y `Switch`: estilo M3. `Input`, `Textarea` y `Select`: esquina de 8 px. Menús y tooltips sin borde. Scrim al 40 %.
- `MobileListCard`: fila de dos líneas, sin folio, con ripple.

**Pantallas**
- `BottomNav`, `AccountMenu`, `HeroHeader`/`PageHeader` y las 8 páginas raíz, según la sección 9.
- Eliminadas las notificaciones falsas (“4 sin leer”) y el código de taller inventado (`ELE-2024`).

**Immo Info rediseñado** (`ImmoWorkspace.tsx`, sección 4 aplicada)
- Barra superior estilo Android: flecha atrás como botón, y fondo + título que aparecen al desplazar. Sustituye al hero que encogía las fuentes con el scroll.
- Título grande con el vehículo; año y marca en una línea debajo.
- Llavero sobre una forma *cookie* de M3 Expressive (nuevo `src/design-system/shapes/MaterialShape.tsx`) que gira lento; desactivado con `prefers-reduced-motion`.
- **FCC ID** como dato protagonista (32 px), copiable con un toque: vibración corta + aviso “FCC ID copiado”.
- Frecuencia y batería en dos tiles tonales con ícono.
- Secciones en contenedores de 28 px sin bordes: Generación del remoto (filas etiqueta/valor sin divisores + carrusel “Se genera con”), Transponder (tipo en grande), Programación y Notas (contenedor `warning-light`).
- Métodos de programación como chips con ícono propio (“Por OBD” con enchufe, “Manual” con mano) en lugar de “✓ Programación OBD”.
- El procedimiento se muestra como **pasos numerados** sobre forma *cookie* (nuevo `ProcedureSteps.tsx`): “Título: cuerpo” se separa en título y texto, y un primer punto que termina en “:” pasa a ser una nota informativa. El texto guardado no cambia.
- Eliminados `SectionLabel` (9 px + línea), las cajas anidadas con borde y los colores `emerald` fijos.

**Pendiente con el mismo tratamiento:** `KeycodeWorkspace` y `AlarmasWorkspace` usan el mismo estilo anterior (etiquetas pequeñas, cajas con borde) y deberían rediseñarse igual.

**Siguiente paso recomendado:** fase 1 (esquema de color M3 con success/warning propios) y barra superior que se contrae al hacer scroll.
