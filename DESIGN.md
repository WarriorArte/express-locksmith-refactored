---
name: Cerrajero Pro Express
description: Business management platform for locksmith shops. A precision instrument for the counter.
colors:
  neon-signal: "#00E5A0"
  neon-signal-deep: "#00C98C"
  ink-near-black: "#0D0D12"
  surface-pale: "#F7F8FA"
  surface-card: "#FFFFFF"
  surface-tile: "#F0F1F5"
  muted-ink: "#5A5A72"
  divider-faint: "#E4E4E7"
  purple-iris: "#6F67B0"
  signal-crimson: "#FF4D6A"
  amber-caution: "#FFB830"
  sidebar-void: "#131318"
  abyss: "#0A0A0F"
  void-card: "#141419"
  moonlight: "#F0F0F8"
typography:
  display:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  base: "0.4rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.neon-signal}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.neon-signal-deep}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-tile}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.signal-crimson}"
    textColor: "#FFFFFF"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.surface-tile}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.base}"
    padding: "12px 14px"
    height: "46px"
  badge-primary:
    backgroundColor: "{colors.neon-signal}"
    textColor: "{colors.ink-near-black}"
    rounded: "9999px"
    padding: "2px 10px"
---

# Design System: Cerrajero Pro Express

## 1. Overview

**Creative North Star: "The Precision Instrument"**

This is a tool built to a tight tolerance. Every element has a job: nothing decorates, nothing gestures at personality without delivering function. The dot-matrix grid on the body surface is the one allowed flourish, and it earns its place by evoking something between a calibration sheet and a security terminal. The neon green accent is the activation signal: it fires on interactive targets and success states, not backgrounds, not text, not decoration.

The system supports both light and dark themes with equal seriousness. Neither is the default by sentiment. Light mode is used in a well-lit shop during the day; the nearly-black sidebar rail anchors the navigation against the pale surface. Dark mode is used when ambient light is low or when the user prefers it. The neon green reads clearly in both contexts.

This system explicitly rejects: the generic SaaS white-and-blue corporate look; dated desktop-software aesthetics with chrome-heavy modals and XP-era table styling; consumer-grade friendliness with oversized buttons, emoji, and hand-holding copy; complex enterprise UI with icon-only navigation rails packed with twenty items; and POS system aesthetics with garish color bands and receipt-printer legacy patterns.

**Key Characteristics:**
- Single accent color (neon green) used at most 10-15% of any screen surface
- Structural shadow system: depth communicates hierarchy, not mood
- Flat border radius (0.4rem) across all components; tight and resolved, not aggressively rounded
- DM Sans at high weight contrast: 800 for display, 400 for body
- Dark sidebar rail in both themes; content area adapts to light/dark independently
- Dot-matrix body texture as the only ambient decoration

## 2. Colors: The Signal Palette

One neon accent on a palette of near-neutrals. Everything else clears the way for it.

### Primary
- **Neon Signal** (`#00E5A0`): The primary interactive accent. Used on primary buttons, active navigation states, focus rings, success confirmations, and the status "active" pill. Never used as a background tint on large surfaces. Its rarity is the point.
- **Neon Signal Deep** (`#00C98C`): Hover and pressed state of the primary. Slightly darker, same family. The user sees it for milliseconds; it must feel like a confident response.

### Secondary
- **Purple Iris** (`#6F67B0`): Info and accent role. Used for info badges, compact category fills, and secondary data-viz coloring when green is already in use on the same screen. It is dark enough to support white text at AA contrast.

### Tertiary
- **Signal Crimson** (`#FF4D6A`): Destructive actions, error states, delete confirmations. Never used as an ambient tint; only on badges, alert backgrounds at low opacity, and the destructive button variant.
- **Amber Caution** (`#FFB830`): Warning states, overdue indicators, pending-action badges. Same containment rule as crimson: state-bearing only, not decorative.

### Neutral
- **Surface Pale** (`#F7F8FA`): Light theme body background. The dot-matrix texture overlays this; the texture dots use the foreground color at 8% opacity.
- **Surface Card** (`#FFFFFF`): Light theme card and popover background. Sits above the pale body surface; shadow provides the separation.
- **Surface Tile** (`#F0F1F5`): Nested surfaces inside cards, input backgrounds, chip backgrounds. The third layer in the light theme stack.
- **Ink Near-Black** (`#0D0D12`): Primary text color in light mode. Also the text color on neon-green surfaces (high contrast on the bright accent).
- **Muted Ink** (`#5A5A72`): Secondary text, placeholder text, supporting labels, metadata. Never used for primary information.
- **Divider Faint** (`#E4E4E7`): Borders, dividers, and input strokes at 1px. Present but not loud.
- **Sidebar Void** (`#131318`): The dark navigation rail. Used in both light and dark themes as the sidebar background, creating a persistent dark anchor regardless of content theme.
- **Abyss** (`#0A0A0F`): Dark theme body background.
- **Void Card** (`#141419`): Dark theme card surface.
- **Moonlight** (`#F0F0F8`): Dark theme primary text.

### Named Rules
**The One-Signal Rule.** The neon green accent appears on at most 10-15% of any given screen. It marks interactive targets and positive outcomes. When everything is green, nothing is.

**The Dark-Rail Anchor Rule.** The sidebar is always dark, in both themes. It is not a light-on-dark or dark-on-light surprise: it is a permanent structural element. Do not invert or theme it with content-area palette changes.

## 3. Typography

**Display/Body Font:** DM Sans (400, 500, 600, 700, 800 weights)
**Label/Mono:** DM Sans 600 for labels; no dedicated monospace face in current stack.

**Character:** DM Sans is geometric-humanist: clean enough to feel modern, warm enough to avoid the coldness of pure geometric sans. At 800 weight for display it has genuine authority. At 400 for body it reads quickly in data-dense contexts without fatigue.

### Hierarchy
- **Display** (800, clamp(1.75rem, 4vw, 2.25rem), line-height 1.1, tracking -0.02em): Page-level titles, modal headings, the top of any primary view. Tight, heavy, resolved.
- **Headline** (700, 1.5rem, line-height 1.2, tracking -0.02em): Section headings, dialog headers, the title of a detail sheet.
- **Title** (600, 1.125rem, line-height 1.3, tracking -0.01em): Table column names used as headings, card subtitles, sidebar section labels.
- **Body** (400, 0.875rem, line-height 1.5): Table cells, form values, description text. Maximum line length 65-75ch.
- **Label** (600, 0.75rem, line-height 1.4, tracking +0.01em): Form field labels, status pills, badge text, metadata chips. All lowercase unless the design explicitly calls for uppercase.

### Named Rules
**The Weight-Contrast Rule.** Minimum 1.4× weight contrast between adjacent hierarchy levels. Display (800) to Headline (700) is tight; compensate with size. Headline (700) to Body (400) is sufficient. Never use two adjacent levels at the same weight.

**The Tight-Heading Rule.** All headings use -0.02em letter-spacing. Wide-set headings at high weight are a consumer-app signal, not a tool signal.

## 4. Elevation

This system uses structural shadows: shadows are load-bearing, not atmospheric. A surface that casts a shadow is above the surface beneath it in the visual stack. A surface without a shadow is on the ground plane.

The dot-matrix body texture is not a shadow effect; it is a surface property of the ground plane. It must be blocked by opaque card backgrounds, not layered through.

### Shadow Vocabulary
- **Ambient Low** (`0 1px 3px 0 hsl(240 16% 6% / 0.04)`): The faintest presence. Used on default card-elevated surfaces at rest to separate card from body.
- **Ambient Mid** (`0 4px 6px -1px hsl(240 16% 6% / 0.06), 0 2px 4px -2px hsl(240 16% 6% / 0.04)`): Hover state for interactive cards, showing responsiveness without drama.
- **Structural** (`0 10px 24px -8px hsl(240 16% 6% / 0.10)`): Sheets, drawers, and dropdown menus when they open over content.
- **Heavy Lift** (`0 20px 32px -8px hsl(240 16% 6% / 0.14)`): Modals and dialogs at the top of the z-stack.
- **Neon Glow** (`0 0 24px hsl(159 100% 45% / 0.30)`): Primary action elements only. The green focus aura. Used on primary buttons and primary card variants, not on regular interactive elements.
- **Dark overrides:** Dark theme shadows increase opacity significantly (40-60%) because the low-contrast background absorbs them.

### Named Rules
**The Flat-By-Default Rule.** Surfaces start flat. Shadows appear as responses to state (hover) or position (dialogs above cards above body). Never add a shadow to make something "look nicer."

**The Glow-Is-Primary Rule.** The neon glow shadow (`shadow-glow`, `shadow-gold`) is reserved for elements styled with the primary accent. It must not appear on neutral surfaces, secondary buttons, or informational cards.

## 5. Components

### Buttons
Firm but not sharp. The 0.4rem radius rounds the corners just enough to signal a modern tool without going soft.

- **Shape:** Gently curved (0.4rem radius). Height 40px default, 44px large variant. 1.5px border at 60% border-color opacity is always present, even on filled variants.
- **Primary:** Neon Signal green (`#00E5A0`) background, Ink Near-Black text, 0.4rem radius, px-4 py-2. Hover: Neon Signal Deep (`#00C98C`). Focus: 2px ring in primary color, 2px offset.
- **Secondary:** Surface Tile (`#F0F1F5`) background, Ink Near-Black text. Hover: 80% opacity. Ghost variant: transparent with muted-ink text, no background fill on rest state.
- **Destructive:** Signal Crimson (`#FF4D6A`) background, white text. Same shape as primary.
- **Proto variant:** Same as primary but with `box-shadow: 0 2px 10px hsl(159 100% 45% / 0.20)` and `active:scale(0.98)` press feedback. Used for high-emphasis CTAs.
- **Disabled:** 50% opacity, pointer-events none. No color change.

### Inputs / Fields
- **Style:** Surface Tile (`#F0F1F5`) background, 1.5px border in Divider Faint, 0.4rem radius, height 46px. Text: 0.875rem, weight 500.
- **Focus:** Border shifts to Neon Signal green (`#00E5A0`). No glow on inputs; only border color changes. Ring is removed (focus-visible ring set to 0).
- **Placeholder:** Muted Ink (`#5A5A72`) at normal weight (400) to visually distinguish from filled values (500).
- **Disabled:** 60% opacity, muted background, no-cursor.
- **Error:** Border shifts to Signal Crimson. Error message in Signal Crimson below the field.

### Badges / Status Pills
- **Badge (rounded):** Full pill shape (border-radius 9999px), text-xs (0.75rem), font-semibold (600). Primary variant: green background, ink text. Secondary: Surface Tile. Destructive: crimson. Outline: transparent bg, foreground text.
- **Status pill (flat):** Inline-flex, 0.4rem radius, text-[11px] font-bold, gap-1.5 between dot indicator and label. Used inside tables for service/sale status. Padding: px-2.5 py-0.5.

### Cards / Containers
- **Corner Style:** 0.4rem radius throughout. Consistent; no variation by card type.
- **Background:** Surface Card (`#FFFFFF`) in light mode, Void Card (`#141419`) in dark. The card surface must be opaque to block the dot-matrix body texture from showing through.
- **Shadow Strategy:** Card-elevated class uses Ambient Low at rest; Ambient Mid on hover. The shadow lifts the card off the body surface. Nested tiles (surface-tile class) inside a card have no shadow; they are differentiated by background color alone.
- **Border:** 1px Divider Faint border on all cards. Not a styling choice; it is the last line of contrast when shadows are not available (print, high-contrast mode).
- **Internal Padding:** 16px (md) default for card bodies. 12px (sm) for compact list cards.

### Navigation (Sidebar)
- **Style:** Dark rail (`#131318` background) in both themes. Fixed-width on desktop; collapsible to icon-only. Text: Moonlight at 80% opacity for inactive items.
- **Default item:** flex gap-3 px-4 py-3, text-sm, 0.4rem radius. No background.
- **Hover:** Surface Tile background in the dark rail context (`--sidebar-accent`). Text at full opacity.
- **Active:** Neon Signal green background, Ink Near-Black text, font-medium. This is the only place the full green accent appears as a background fill on a non-button element.
- **Mobile:** Bottom navigation bar with icon + label pattern. 4 primary routes surfaced. Touch target minimum 44px.

### Detail Sheet (Signature Component)
The bottom-sheet that slides up on mobile (and renders as a right-side panel or dialog on desktop) to show a full record: sale, quote, service, or customer. Enters with `sheetUpV2` animation (300ms, ease-out), exits with `sheetDownV2` (360ms, cubic-bezier(0.22, 1, 0.36, 1) for natural deceleration). Contains: type badge, status badge, customer info section, line items table, totals, and a fixed-bottom action bar.

## 6. Do's and Don'ts

### Do:
- **Do** use the neon green (`#00E5A0`) exclusively on primary buttons, active nav items, success states, and focus rings. Nothing else.
- **Do** use structural shadows to communicate hierarchy: body < card < sheet < modal. Each layer adds one shadow level.
- **Do** keep all border radii at 0.4rem. A single radius across the system is part of the precision-instrument identity.
- **Do** use DM Sans 800 for all page-level headings with -0.02em letter-spacing and tight line-height (1.1-1.2).
- **Do** make the sidebar dark in both light and dark themes. It is a permanent structural anchor.
- **Do** use Surface Tile (`#F0F1F5`) for input backgrounds and nested sub-surfaces inside cards. Three distinct layers: body, card, tile.
- **Do** apply the dot-matrix body texture only on the ground plane. Card backgrounds must be opaque to block it.
- **Do** ensure all tap targets are at minimum 44px in height or width on mobile. The app is used at a counter, often in a hurry.
- **Do** use table layouts for multi-record data. Cards are for single-record summaries only.

### Don't:
- **Don't** use the neon green as a large background fill, section tint, or decorative band. The generic SaaS white/blue/rounded corporate look, and especially the "startup color splash" aesthetic, are explicitly rejected.
- **Don't** use gradient text (`background-clip: text` with a gradient). The `.gradient-text` utility exists in the codebase as legacy; do not extend it. Replace with a solid single color.
- **Don't** expand the `.glass` glassmorphism pattern to new components. It exists as a legacy utility; it is decorative by nature and prohibited for new UI.
- **Don't** add a second accent color family to compete with neon green. Purple Iris (`#6F67B0`) is a secondary role for info/variety only, never for emphasis.
- **Don't** use three-panel layouts, icon-only sidebar variants with more than 8 items, or nested navigation trees. Complex enterprise UI is an explicit anti-reference.
- **Don't** use oversized buttons (height > 56px), emoji in UI copy, or excessive rounded corners (radius > 0.75rem). Consumer-grade friendliness and POS system aesthetics are explicitly rejected.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on cards or list items. Use background tints or full borders instead.
- **Don't** stack cards inside cards. Surface Tile (`#F0F1F5`) backgrounds create the nested layer; a second card border inside the first is always wrong.
- **Don't** rely on color alone to communicate state (e.g., red-only for error). Always pair color with a label, icon, or text change. Some users have reduced color sensitivity.
- **Don't** design screens that look like a dated desktop application: heavy modal chrome, XP-era table borders at every cell, or toolbar bands with text-icon pairs in a Windows-style layout.
