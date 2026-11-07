# Architecture rules
- Use `ModuleHeader` for module page and full-screen tool app bars so title, context, navigation and actions share one responsive two-row structure; keep dialog and sign-in headings independent.
- Use the dedicated `header-surface` token for shared large hero surfaces and opaque card surfaces for their fields; keep primary/accent tokens independent so surface changes never recolor actions or navigation.
- Define expressive silhouettes centrally in `MaterialShape`; retain legacy shape-name aliases when replacing a shared silhouette so existing consumers keep their dimensions and motion.
- Use `primary-text` for brand-colored text via Tailwind textColor and `primary` for filled surfaces; separate tones preserve readable contrast when the brand fill is bright.