---
name: cerrajero-pro-express-design
description: Use this skill to generate well-branded interfaces and assets for Cerrajero Pro Express (a Spanish-language multi-tenant SaaS for locksmith shops), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of `assets/`, import the tokens from `colors_and_type.css`, and create static HTML files for the user to view. For React-based artifacts, the working UI kit in `ui_kits/app/` is a click-thru reference with the exact components used in the redesign (`Sidebar`, `Topbar`, `HeroHeader`, `BottomNav`, `Sheet`, `StatCard`, `ServiceStatusBar`, `LowStockCard`, `UpcomingQuotesCard`, `ActivityCard`, `InventoryCard`, `AuthScreen`). Copy and adapt them.

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand. The canonical specs are `DESIGN.md` and `PRODUCT.md` in the source GitHub repository ([`WarriorArte/express-locksmith-refactored`](https://github.com/WarriorArte/express-locksmith-refactored)) — this folder is a faithful, agent-friendly distillation of them.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions (audience, mobile-first or desktop, single page or flow, dark or light theme), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Core invariants to never break:
- One signal color (neon green `#00E5A0`) used on ≤ 15% of any surface.
- Dark sidebar rail (`#131318`) in BOTH light and dark themes.
- DM Sans only. `-0.02em` letter-spacing on all headings.
- 0.4rem default radius. Larger radii only for the Hero card (`16px`) and the FAB (`20px`).
- Dot-matrix body texture (22px grid, fg@8%) is the only allowed ambient flourish.
- No emoji. No custom SVG icons — use `lucide` only.
- Spanish copy, sentence case, infinitive verbs on buttons.
