# Cerrajero Pro Express — Design System

> **What this is.** A reusable design system for **Cerrajero Pro Express**, a multi-tenant SaaS for locksmith shops in Spanish-speaking markets. This folder gives a design agent everything it needs to build branded interfaces, prototypes and slides without inventing new conventions.
>
> **What's new here.** The system in this project is a **redesign-aligned** snapshot of the source product. It keeps every existing module's *position and function* — Dashboard, Inventario, Cotizaciones, Clientes, Servicios, Ventas, Garantías, Herramientas, Configuración — but layers in three new patterns the source codebase only hinted at:
> 1. **Hero page headers** with dot-matrix dark surfaces (the only place gradients are allowed)
> 2. **Attractive mobile-first dashboards** built around a "primary stat" hero card + status rail
> 3. **A consolidated mobile shell**: bottom nav with center FAB + "Más" sheet, sized for one-handed counter use

---

## Sources used

This design system was built by reading:

- **GitHub:** [`WarriorArte/express-locksmith-refactored`](https://github.com/WarriorArte/express-locksmith-refactored) (private). Specifically: `DESIGN.md`, `PRODUCT.md`, `src/index.css`, `tailwind.config.ts`, `src/pages/Dashboard.tsx`, `src/pages/Inventario.tsx`, `src/pages/Auth.tsx`, and every component under `src/components/{layout,dashboard,products,services,sales,quotes,customers}`. The reader is encouraged to open this repo to deepen any work built against this system.
- **PWA icons / favicon** copied from `public/` (see `assets/`).

> The original `DESIGN.md` and `PRODUCT.md` are the **canonical specification**. This folder is a runnable, designer-friendly distillation of them. If the two disagree, the upstream repo wins.

---

## Product context

| Field | Value |
|---|---|
| Product | **Cerrajero Pro Express** (a.k.a. "Cerrajería Express") |
| Tagline (internal) | *A precision instrument for the counter* |
| Domain | Business-management SaaS for **locksmith shops** |
| Market | Spanish-speaking (the entire UI is in Spanish) |
| Users | Locksmith owners and 2-5 person crews; some are not tech-savvy |
| Operational shape | Multi-tenant — many shops, each with its own workshop ID |
| Reference vibe | **Linear** — dense, keyboard-first, dark-mode-native, no wasted chrome |

**Modules (preserved by the redesign):**

```
Dashboard ─ Inventario ─ Cotizaciones ─ Clientes ─ Servicios ─ Ventas ─ Garantías ─ Herramientas ─ Configuración
```

On mobile the bottom nav surfaces **Inicio · Servicios · [+] · Inventario · Más**, with quick-create dialogs behind the green FAB.

---

## Index — what is in this folder

| Path | Purpose |
|---|---|
| `README.md` | You are here. Brand, content, visual, iconography fundamentals. |
| `SKILL.md` | Agent-Skill front-matter so this folder can be loaded into Claude Code. |
| `colors_and_type.css` | Single source of truth for color & type tokens. Import this in any HTML you build. |
| `assets/` | Logos, PWA icons, generic placeholders copied from the source repo. |
| `preview/` | One-card-per-token specimens that populate the Design System tab. |
| `ui_kits/app/` | High-fidelity recreation of the redesigned product. Open `ui_kits/app/index.html`. |
| `ui_kits/app/*.jsx` | Modular React components — `Sidebar`, `BottomNav`, `HeroHeader`, `StatHero`, `ServiceStatusBar`, etc. |

---

## CONTENT FUNDAMENTALS

The product is **in Spanish**, written for working locksmith owners — not for buyers in a sales funnel. Copy is **functional, neutral, and short**. It treats the user as a professional who already knows their domain.

### Voice & tone

- **Functional first, friendly second.** Labels name the thing. Empty states are short. Never apologetic, never marketing-y.
- **Spanish, neutral register.** Uses `tú`/implicit "you", not `usted`, but avoids slang and contractions. Verbs are infinitive on buttons (`Iniciar sesión`, `Agregar producto`, `Ver todos`).
- **No I-voice.** The product never talks about itself in first person.
- **No emoji.** Confirmed by `DESIGN.md` ("Don't use emoji in UI copy"). State is communicated with shape, color and **text**, never emoji.
- **No marketing exclamations.** No "¡Bienvenido a tu nuevo dashboard!" — just `Bienvenido, [Nombre]`.

### Casing

| Surface | Casing | Example |
|---|---|---|
| Page titles (`<h1>`) | Sentence case, Spanish | *Panel Principal*, *Inventario*, *Cotizaciones por Vencer* |
| Section headings | Sentence case | *Estado de Servicios*, *Actividad Reciente*, *Stock Bajo* |
| Buttons | Verb + noun, sentence case | *Iniciar sesión*, *Agregar producto*, *Ver todos*, *Crear cotización* |
| Form labels | Sentence case, terse | *Código del taller*, *Correo electrónico*, *Contraseña* |
| Status pills (Servicios) | Capitalized single words | *Pendiente · En Curso · Finalizado · Entregado · Cancelado* |
| Metadata chips | lowercase or single words | *stock bajo · en stock · 12 días* |
| `.t-label` | **lowercase** per DESIGN.md | *ventas del mes* |

> **The Tight-Heading Rule** (DESIGN.md): all headings carry `letter-spacing: -0.02em`. Wide-tracked headings read as consumer software and are wrong here.

### Concrete copy patterns (verbatim from the codebase)

- **Greeting:** `Bienvenido, [Nombre]` — full stop, no exclamation
- **Stat labels:** `Ventas del Mes` · `Servicios Hoy` · `Cotizaciones`
- **Empty states (full sentence):** `No hay actividad reciente` · `Inventario en niveles óptimos` · `No hay cotizaciones próximas a vencer`
- **Inventory subtitle pattern:** `12 productos · 4 servicios · 2 alertas` (interpunct separator, terms not abbreviated)
- **Action buttons on records:** `Vender` / `Usar` (services), `Editar`, `Eliminar`, `Ver todos`
- **Login error:** `El código de cerrajería no existe o no tienes acceso`
- **Destructive confirm:** `¿Eliminar producto?` → `Esta acción no se puede deshacer.`
- **Mobile FAB sheet header:** `Crear nuevo` (followed by a 2-col grid of icon tiles)

### Numbers & money

- **Currency**: configurable per workshop (`currency_symbol`), defaults to `$`. Always **prefixed** without space: `$1.250.000`. Thousand-separator follows Spanish locale.
- **Counts**: never zero-padded. Singular/plural is respected: `1 producto requiere atención`, `3 productos requieren atención`.

---

## VISUAL FOUNDATIONS

Inherits everything from `DESIGN.md`. The redesign **adds** the hero-header pattern and the mobile-first dashboard composition without breaking any existing rule.

### Color

**One signal color (neon green), on a palette of near-neutrals.**

| Token | Hex | Role |
|---|---|---|
| `--primary` | `#00E5A0` | Primary CTAs, active nav, focus rings, success. *Never as a wash.* |
| `--primary-hover` | `#00C98C` | Hover/pressed of primary |
| `--accent` | `#9898D0` | Info badges, secondary data-viz |
| `--destructive` | `#FF4D6A` | Destructive, error |
| `--warning` | `#FFB830` | Pending, overdue |
| `--bg` (light) | `#F7F8FA` | Body ground plane (carries dot-matrix) |
| `--card` (light) | `#FFFFFF` | Card surface (must be opaque) |
| `--surface-2` | `#F0F1F5` | Nested tiles, inputs, chips |
| `--fg` | `#0D0D12` | Primary text |
| `--fg-muted` | `#5A5A72` | Metadata |
| `--border` | `#E4E4E7` | 1px hairline dividers |
| `--sidebar-void` | `#131318` | The dark rail (light + dark mode) |
| `--abyss` | `#0A0A0F` | Dark theme body |

> **The One-Signal Rule:** the neon green appears on at most **10–15%** of any given screen.
> **The Dark-Rail Anchor Rule:** the sidebar is dark in *both* themes — never inverted.

### Type

- **DM Sans only.** Weights `400 / 500 / 600 / 700 / 800`. No monospace face.
- Four-level hierarchy + the new **Hero** treatment introduced by the redesign:
  - `.t-hero` — 800, `clamp(2rem, 6vw, 3rem)`, `-0.03em` — page-level title sitting on a dark hero surface (Dashboard, Auth)
  - `.t-display` — 800, `clamp(1.75rem, 4vw, 2.25rem)`, `-0.02em` — standard page title
  - `.t-headline` — 700, 1.5rem, `-0.02em`
  - `.t-title` — 600, 1.125rem, `-0.01em`
  - `.t-body` — 400, 0.875rem
  - `.t-label` — 600, 0.75rem, **lowercase**

### Spacing

`4 · 8 · 16 · 24 · 32 · 48` — exposed as `--space-xs/sm/md/lg/xl/2xl`. Card body padding is **16px** default, **12px** for compact list cards. Min tap target **44px**. Mobile gutters **20px**, desktop **24px**.

### Radii

**One radius, everywhere: `0.4rem` (~6.4px).** Set via `--radius`. The only exceptions are:
- `--radius-pill` (`9999px`) — pills/badges
- `--radius-lg` (`16px`) — *only* on the new Hero surface, and on mobile sheet/quick-tile chrome (the source codebase already uses `rounded-2xl` here)
- `--radius-xl` (`20px`) — the floating FAB

Never go softer than `--radius-lg`.

### Backgrounds

- **Ground plane:** light cream (`#F7F8FA`) or near-black (`#0A0A0F`) **with a dot-matrix texture** — `radial-gradient(circle, fg/8% 1px, transparent 1px) 22px 22px`. Calibration-sheet / security-terminal mood, not decoration. Cards over it **must be opaque** to block it.
- **Hero surfaces:** `var(--gradient-hero)` — `linear-gradient(135deg, #131318 0%, #1E1E26 100%)` — and the dot-matrix is layered on top. This is the **only** allowed gradient surface in product UI.
- **No full-bleed photography. No repeating patterns other than the dots. No glassmorphism** beyond a single legacy `.glass` class that is frozen at zero new uses.

### Borders

`1px` (cards, dividers) or `1.5px` (buttons, inputs). Color is always `--border` in light mode. **Never a colored left-stripe on cards** (POS-system anti-reference) — when an item carries state, prefer a chip or a full background tint.

### Shadows — *load-bearing, not atmospheric*

| Token | Use |
|---|---|
| `--shadow-sm` | Card at rest |
| `--shadow-md` | Card on hover |
| `--shadow-lg` | Sheets, drawers, dropdown menus |
| `--shadow-xl` | Modals/dialogs at the top of the z-stack |
| `--shadow-glow` | The neon-green focus aura — **primary only** |
| `--shadow-gold` | Heavier primary glow for FAB and hero stat |

> **The Flat-By-Default Rule:** surfaces start flat; shadows appear in response to state or stacking.
> **The Glow-Is-Primary Rule:** `--shadow-glow` and `--shadow-gold` are *only* allowed on green-primary elements.

### Cards

- **Surface:** opaque `--card`, **1px** `--border`, **`--radius`** (0.4rem).
- **Shadow:** `--shadow-sm` at rest; lift to `--shadow-md` on hover.
- **Padding:** `16px` (`p-4` / `p-5` in the source).
- **No nested cards.** A second `--card` inside a `--card` is always wrong; use a `--surface-2` tile.

### Animation

- **Defaults:** `var(--ease-out)` (`cubic-bezier(0.4,0,0.2,1)`) at `200ms`. Used for hover, transform, color.
- **Sheet exits:** `var(--ease-sheet)` (`cubic-bezier(0.22,1,0.36,1)`) at `360ms` — natural deceleration for the bottom sheet.
- **Press feedback:** `transform: scale(0.95–0.98)` on FAB, hero CTA, and mobile list rows. *No bounces.*
- **Entry:** `fade-in` (0.4s), `slide-up` (translateY 16px, 0.4s). Library is **framer-motion**, scope `LazyMotion / domAnimation`. No spring overshoot.
- **No marquee, no shimmer-as-decoration** — only the `shimmer` keyframe loading skeleton, which is reserved for waiting states.

### Hover & press states

- **Buttons:** `:hover` shifts to a darker family member (`--primary-hover`), or to `bg/80` for secondary; **no scale** on hover.
- **Interactive cards/list rows on mobile:** `active:scale(0.98)` + `active:bg-muted/50`. No hover state needed — primary input is touch.
- **Sidebar nav:** inactive items at 80% opacity; hover lifts to 100% on `--sidebar-accent` background.
- **Active nav item:** full green fill — **the only place** green is used as a background on a non-button.

### Layout rules

- **Sidebar:** fixed-width 256px (expanded) or 72px (collapsed) on `lg+`. Dark in *both* themes.
- **Bottom nav (mobile):** fixed at `bottom: 0`, height 72px, safe-area padded. Three nav buttons + center FAB + Más.
- **Page body:** `pt-10` mobile (clears the avatar in PageHeader), `pt-2` desktop. Horizontal gutter `px-5` mobile, `px-6` desktop. **Always** `pb-24` on mobile to clear the bottom nav.
- **Content max-width:** `2xl: 1400px` via the Tailwind `container` config.

### Use of transparency & blur

- **Allowed:** popover backdrops (light `backdrop-blur-md` at 80% bg), the legacy `.glass` utility (do not extend), and overlays on product card actions (`bg-foreground/60` reveal).
- **Disallowed:** translucent cards, blurred cards-over-cards, frosted backgrounds anywhere outside the legacy `.glass` utility.

### Imagery

- **Iconography only.** No photography in product chrome.
- When product cards have user-uploaded images, they sit on a `--surface-2` placeholder; the image is `object-cover`, no filters, no overlays.
- A muted `<Package />` glyph at 50% opacity is the fallback empty.

---

## ICONOGRAPHY

The codebase uses **`lucide-react`** as the single icon font. Stroke-only, 2px stroke, 24px nominal — but rendered at `w-4` / `w-5` / `w-[18px]` depending on density.

| Where | Common icons (lucide names) |
|---|---|
| Sidebar nav | `LayoutDashboard, Package, FileText, Users, Wrench, ShoppingCart, Shield, Construction, Settings, Key, Building2, LogOut, ChevronLeft, ChevronRight` |
| Dashboard | `TrendingUp, AlertTriangle, Clock, User, Calendar` |
| Bottom nav | `Home, Wrench, Package, Grid3x3, Plus` |
| State | `AlertTriangle` (warning), `Loader2` (loading), `Eye/EyeOff` (password) |
| Forms | `Mail, Lock, Building2, Plus, MoreVertical, Search, Filter, Palette, Edit, Trash2, ArrowUpDown` |

**Rules:**
- **Stroke icons only** — never fill-style, never duotone, never custom-drawn SVG. The `lucide` look (Feather-derived, geometric-humanist) is the brand.
- **Icon size matches text weight.** With `.t-title` use `w-5`; with `.t-body` use `w-4`; in pills use `w-3.5`.
- **Icon color** is `--fg-muted` at rest, `--primary` when the action is the primary action, `--destructive` for destructive items.
- **No emoji in UI copy.** No Unicode glyphs as icons (no `→`, `✓`, `★`). The source codebase uses `↑`/`↓` for trend deltas inside the `StatCard` only — that single Unicode pair is the only documented exception, scoped to the trend chip.
- **No icon-only navigation rails** with more than 8 items. (Anti-reference from DESIGN.md.)

> **CDN substitution.** This design system links `lucide` from CDN in the UI kit (it can't ship the npm package). When working in the real codebase, prefer the `lucide-react` package which the project already depends on.

### Logos / brand marks

The brand mark in the product UI is the **lucide `Key`** glyph inside a green rounded tile — see `assets/icon-512.png` for the PWA app icon and `assets/favicon.ico` for the favicon. The PWA icon currently shows a yellow key on a blue background and **does not match the redesign palette**; treat it as legacy and prefer the in-product Key-on-green tile rendered in code. *Flag for the user: please supply an updated PWA icon in neon-green.*

---

## Font substitution disclosure

**DM Sans** is used everywhere. The source repo pulls it via the `@fontsource/dm-sans` npm package; this folder pulls the same family from **Google Fonts** at the top of `colors_and_type.css`. The metrics are identical (same family). No substitution flagged.

---

## Things to keep iterating on

- **PWA icon** (`assets/icon-512.png`) is legacy yellow/blue. Need a new green-on-dark mark.
- **Real-product screenshots** beyond what's in the UI kit (e.g. Cotizaciones print templates `banner/classic/hero`) are not recreated here — see `src/components/quotes/templates/` in the source repo.
- The `superadmin` dashboard is intentionally out of scope for this kit (it has its own information density model).

---
