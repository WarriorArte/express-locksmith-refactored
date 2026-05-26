import type { QuoteLayoutId, QuoteTemplateDefinition } from "./types";

const modules = import.meta.glob<{ default: QuoteTemplateDefinition }>("./*/index.tsx", {
  eager: true,
});

export const QUOTE_TEMPLATES = Object.values(modules)
  .map(module => module.default)
  .filter(Boolean)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));

export const DEFAULT_QUOTE_TEMPLATE_ID = "bold";

export function getQuoteTemplate(id: QuoteLayoutId | null | undefined) {
  return (
    QUOTE_TEMPLATES.find(template => template.id === id) ||
    QUOTE_TEMPLATES.find(template => template.id === DEFAULT_QUOTE_TEMPLATE_ID) ||
    QUOTE_TEMPLATES[0]
  );
}

export type { LayoutData, QuoteLayoutId, QuoteTemplateDefinition, QuoteTemplateThumbProps } from "./types";
export { buildLayoutData } from "./shared";
