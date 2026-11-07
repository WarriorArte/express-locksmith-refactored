# Auditoría final del rediseño Material 3 Expressive + corrección de bugs

## Paso 0 — Conexión del preview
- Crear `.env` en la raíz con `VITE_PHP_API_BASE=https://keylune.com/api` para que el preview siga conectando a tu servidor.

## Lo que encontré (medido hoy, sin contar SuperAdmin, que queda fuera por tu decisión)

| Detalle del estilo anterior | Quedan |
|---|---:|
| Cajas con borde (`border border-…`) | 45 |
| Textos diminutos de 8–11 px | 83 |
| Mayúsculas forzadas / letras separadas | 15 |
| Colores fijos fuera del tema (verde, ámbar, gris) | 14 |
| Degradados | 8 |
| Cuadritos de ícono tintados | 3 |

Además, en los colores base "completado" e "informativo" usan el mismo celeste que el botón principal, así que no se distinguen (auditoría 2.2, sigue sin resolver).

## Fase 1 — Colores con significado
- Dar a "completado" un verde propio y suave, conservando el celeste como único color de marca. Rojo y ámbar se quedan para errores y avisos.
- Revisar contraste de textos en claro y oscuro (títulos más oscuros y pesados, texto secundario legible).

## Fase 2 — Limpieza pantalla por pantalla
Quitar los restos de la tabla anterior en todas las pantallas del taller: bordes → fondos tonales, textos de 11 px o menos → tamaños legibles, colores fijos → colores del tema, degradados fuera, sin mayúsculas forzadas.

## Fase 3 — Pendientes ya documentados en `docs/`
1. Barra superior que se encoge al desplazar en todas las páginas (como Immo Info).
2. Avisos (toasts) abajo, por encima de la barra inferior, con "Deshacer" al eliminar.
3. Vibración corta al confirmar acciones clave (solo Android).
4. Ventas: cambiar el método de pago de la fila por fecha/hora.
5. Inventario: categoría y desglose solo en el detalle; tabla de escritorio con el nuevo estilo.
6. Tablas de escritorio: quitar columna de ícono y dirección; menú ⋮ por fila con solo el siguiente paso (Iniciar → Completar → Entregar), el resto en el detalle.
7. Selectores de fecha con estilo M3 (`DateFilterButton` y formularios).
8. Revisar en móvil que la llave y el teclado de Keycode quepan sin scroll.

No se toca: barra de estado del teléfono (se queda negra como pediste), barra inferior (solo colores), SuperAdmin, decodificador por foto.

## Fase 4 — Bugs y verificación
- Revisar errores de consola/compilación y recorrer con sesión iniciada: Inicio/Vehículos, Servicios, Ventas, Cotizaciones (incluida impresión), Inventario, Clientes, Garantías, Configuración, en tamaño de teléfono (393 px) con capturas.
- Registrar cada módulo terminado en `docs/CRITERIO-DISENO-M3E.md`.

## Pregunta abierta
Si en `docs/` tienes una lista de bugs concretos fuera de estos dos archivos (o en otro lugar), dímela y la sumo; de lo contrario trabajo con lo documentado más lo que encuentre al recorrer la app.

## Detalles técnicos
- Tokens en `src/index.css` (`--success`, `--success-light`, `--info` con tono propio) y `tailwind.config.ts`.
- Reemplazos guiados por la lista de verificación de la sección 5 de `CRITERIO-DISENO-M3E.md`; excluye plantillas de cotización/ticket y dibujos `components/llaves/*`.
- Toaster `sonner` con `position="bottom-center"` y offset de la barra inferior.
- Barra que se contrae: llevar el comportamiento de `ImmoWorkspace` a `HeroHeader`/`PageHeader`.
