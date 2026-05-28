# UI Kit · App

A click-thru recreation of the redesigned **Cerrajero Pro Express** product. Built to read as the real product at first glance, not as a storybook.

## Run

Open `index.html`. It is a static React+Babel app — no build step. Everything resolves via CDN.

## What is here

| File | Purpose |
|---|---|
| `index.html` | Entry — wires up CDN scripts and JSX files |
| `styles.css` | All product CSS for the kit (imports `../../colors_and_type.css`) |
| `data.js` | Mock data for the dashboard, inventory and services |
| `Layout.jsx` | `Icon`, `Sidebar`, `Topbar`, `HeroHeader`, `BottomNav`, `Sheet`, `QuickActionsSheet`, `MoreSheet` |
| `Auth.jsx` | `AuthScreen` — workshop-code login |
| `Dashboard.jsx` | `DashboardScreen` — hero header + stat rail + service status bar + low stock + upcoming quotes + recent activity |
| `Inventario.jsx` | `InventarioScreen` + `InventoryCard` — mobile-first 2-up grid |
| `Servicios.jsx` | `ServiciosScreen` — filter chips + service list with status pills |
| `Placeholder.jsx` | Hero-headed empty state for Clientes / Cotizaciones / Ventas / Garantías / Herramientas / Configuración |
| `App.jsx` | Routing + shell wiring |

## What's modelled

- **Auth flow.** A signed-out state surfaces the login card. "Iniciar sesión" routes back to the Dashboard.
- **Module navigation.** Desktop sidebar + mobile bottom nav + mobile "Más" sheet expose every module from the source app: Dashboard, Inventario, Cotizaciones, Clientes, Servicios, Ventas, Garantías, Herramientas, Configuración.
- **Mobile-first.** Resize to ~390px — the bottom nav appears, the sidebar disappears, the hero header reflows, the dashboard stat rail collapses to a 2-up grid with the primary stat full-bleed.
- **The FAB is contextual.** On the dashboard, the green `+` opens a "Crear nuevo" quick-action sheet. On Inventario / Cotizaciones / etc, the FAB becomes a direct "create this kind of thing" button — the same pattern the source codebase implements.
- **The Hero header.** Every page tops with a dark dot-matrix gradient card. This is the redesign's signature; it replaces the source's plain `PageHeader` row.

## What's intentionally simplified

- No real data fetching, no React Query, no router. Routes are state, dialogs are state.
- The placeholder modules show the redesign treatment (hero header + empty state) without recreating each module's table / form. Use them as the visual reference when fleshing those out.
- Toast feedback for actions is a simple custom flash, not the source's Sonner toaster.
