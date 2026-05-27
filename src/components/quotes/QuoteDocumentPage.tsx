/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useMemo } from "react";
import type { BusinessSettings } from "@/hooks/useBusinessSettings";
import type { QuoteDocSettings } from "@/hooks/useQuoteDocSettings";
import { autoAccentInk, darken } from "@/hooks/useQuoteDocSettings";
import type { Quote } from "@/hooks/useQuotes";
import { cn } from "@/lib/utils";
import { buildLayoutData, getQuoteTemplate } from "./templates";
import "@/styles/quote-doc.css";

interface QuoteDocumentPageProps {
  quote: Quote;
  biz: BusinessSettings | null;
  settings: QuoteDocSettings;
  zoom?: number;
  className?: string;
}

export const QuoteDocumentPage = forwardRef<HTMLDivElement, QuoteDocumentPageProps>(
  ({ quote, biz, settings, zoom = 1, className }, ref) => {
    const data = useMemo(
      () => buildLayoutData(quote, biz, settings),
      [quote, biz, settings],
    );

    const pageStyle = useMemo(() => ({
      "--ink": settings.ink,
      "--ink-2": darken(settings.ink, 0.35),
      "--accent": settings.accent,
      "--accent-ink": settings.accentInk || autoAccentInk(settings.accent),
      "--header": settings.header,
      "--header-ink": settings.headerInk,
      "--table-head": settings.tableHead,
      "--table-head-ink": settings.tableHeadInk,
      "--paper": settings.paper,
      "--muted": settings.muted,
      "--soft": settings.soft,
      "--rule": settings.rule,
      "--logo-size": `${settings.logoSize}px`,
      zoom,
    } as React.CSSProperties), [settings, zoom]);

    const template = getQuoteTemplate(settings.layout);
    const Layout = template.Component;

    return (
      <div
        ref={ref}
        className={cn("page qd-page-screen", settings.bgUrl && "has-bg-image", className)}
        style={pageStyle}
      >
        {settings.bgUrl && (
          <div
            className="bg-image"
            style={{
              backgroundImage: `url(${settings.bgUrl})`,
              opacity: settings.bgOpacity,
              mixBlendMode: settings.bgBlend as React.CSSProperties["mixBlendMode"],
            }}
          />
        )}
        <div className="page-inner">
          <Layout {...data} />
        </div>
      </div>
    );
  },
);

QuoteDocumentPage.displayName = "QuoteDocumentPage";

export function createSampleQuote(): Quote {
  return {
    id: "preview",
    workshop_id: "preview",
    quote_number: "C-250526-001",
    customer_name: "Cliente de ejemplo",
    customer_phone: "+502 5555 1234",
    customer_email: "cliente@ejemplo.com",
    customer_address: "Zona 10, Ciudad de Guatemala",
    description: "Instalacion de cerradura inteligente y ajuste de puerta principal.",
    status: "pending",
    subtotal: 1425,
    discount: 75,
    total: 1350,
    validity_days: 15,
    valid_until: "2026-06-09",
    notes: "",
    policies: "",
    created_at: "2026-05-25T10:30:00.000000Z",
    updated_at: "2026-05-25T10:30:00.000000Z",
    quote_items: [
      { id: "1", quote_id: "preview", description: "Cerradura inteligente", quantity: 1, unit_price: 950, subtotal: 950, sort_order: 0 },
      { id: "2", quote_id: "preview", description: "Instalacion y ajuste", quantity: 1, unit_price: 475, subtotal: 475, sort_order: 1 },
    ],
  } as Quote;
}
