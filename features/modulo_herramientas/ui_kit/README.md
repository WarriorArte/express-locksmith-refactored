# Cerrajería Express — App UI Kit

A high-fidelity, click-through prototype of the Cerrajería Express management app.

## Coverage
- Auth / Login screen
- Dashboard (stats, activity, quick actions)
- Servicios (service orders list + detail)
- Inventario (product list + add form)

## Usage
Open `index.html` for the full interactive prototype.

Individual JSX components:
- `Sidebar.jsx` — collapsible desktop sidebar + mobile drawer
- `PageHeader.jsx` — dark hero gradient page header
- `StatCard.jsx` — 4-variant KPI stat card
- `Dashboard.jsx` — full dashboard screen
- `Auth.jsx` — login screen with workshop code
- `Servicios.jsx` — services list screen
- `Inventario.jsx` — inventory screen

## Design notes
- Font: DM Sans (Google Fonts)
- Icons: Lucide (CDN)
- All colors from `colors_and_type.css`
- Radius: `border-radius: 20px` on cards (rounded-2xl)
- Sidebar: 256px expanded, dark navy bg
- Mobile: bottom nav with gold FAB
