# Architecture rules
- Scope creation-form styling with `m3e-form` on dialog content so field, tab and summary presentation stays consistent without restyling sign-in or tool controls.
- Use `ModuleHeader` for module page and full-screen tool app bars so title, context, navigation and actions share one responsive two-row structure; keep dialog and sign-in headings independent.
- Use the dedicated `header-surface` token for shared large hero surfaces and opaque card surfaces for their fields; keep primary/accent tokens independent so surface changes never recolor actions or navigation.
- Define expressive silhouettes centrally in `MaterialShape`; retain legacy shape-name aliases when replacing a shared silhouette so existing consumers keep their dimensions and motion.
- For partially tucked photos, use MaterialShape's bottom-only clip on a full-size child layer so the upper image remains exposed and the lower edge follows the same silhouette.
- Use `primary-text` for brand-colored text via Tailwind textColor and `primary` for filled surfaces; preserve nested foreground/light variants and use `primary-fill` for currentColor silhouettes so their content stays visible.
- Reserve `accent` (selection color: safety orange in the default Acero palette) for active selection only (navigation, tabs, filter chips); use `secondary`/`muted` for tonal buttons, hovers and menu highlights, and `success`/`info`/`warning` tones for statuses.
- Notify only through Sonner (`toast` from `sonner` or the `use-toast` adapter, which forwards to it) so every notification appears as the bottom M3 snackbar above the bottom navigation; never mount another toaster or use native `alert()`/`confirm()`.
