import type { ComponentType } from "react";
import type { BusinessSettings } from "@/hooks/useBusinessSettings";
import type { QuoteDocSettings } from "@/hooks/useQuoteDocSettings";
import type { Quote } from "@/hooks/useQuotes";

export type QuoteLayoutId = string;

export type LayoutData = {
  company: {
    name: string;
    initial: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    slogan: string;
    logoUrl: string;
  };
  client: {
    name: string;
    contact: string;
    quoteNumber: string;
    date: string;
    validUntil: string;
  };
  items: Array<{ id: string | number; title: string; sub: string; qty: number; price: number }>;
  payment: { account: string; name: string; bank: string };
  notes: string;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  description?: string | null;
};

export type QuoteTemplateThumbProps = {
  accent: string;
  ink: string;
};

export type QuoteTemplateDefinition = {
  id: QuoteLayoutId;
  name: string;
  order?: number;
  Component: ComponentType<LayoutData>;
  Thumb: ComponentType<QuoteTemplateThumbProps>;
};

export type BuildLayoutDataArgs = {
  quote: Quote;
  biz: BusinessSettings | null;
  settings: QuoteDocSettings;
};
