# Cerrajeria Express design-system adapter

This folder is the production-facing adapter for `features/nuevo diseño/ui_kits/app`.

Goal:
- Keep route pages and feature components responsible for data, auth, mutations, navigation and dialogs.
- Keep this folder responsible for visual composition, spacing, typography and UI-kit fidelity.
- When `features/nuevo diseño` changes, copy or translate the relevant visual component here, then wire it with props from the existing page/container.

Structure:
- `layout/` contains shell and page-level visual primitives such as `HeroHeader`.
- `dashboard/` contains dashboard-only presentational pieces.

Rules:
- No API hooks, auth hooks, router hooks or mutations in this folder.
- Accept data and callbacks through props.
- Use the existing Tailwind tokens and classes from `src/index.css`.
- Prefer direct imports from the concrete file instead of barrel imports.
- Keep UI-kit naming close to the source kit so future diffs are easy to compare.

Current mapping:
- `features/nuevo diseño/ui_kits/app/Layout.jsx` -> `layout/HeroHeader.tsx`
- `features/nuevo diseño/ui_kits/app/Dashboard.jsx` -> `dashboard/DashboardHero.tsx`, `DashboardMetricTile.tsx`, `DashboardSkeleton.tsx`, `ServiceStatusPanel.tsx`
