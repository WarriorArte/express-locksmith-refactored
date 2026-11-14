import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { SpecRow } from "@/design-system/detail/DetailScreen";

describe("SpecRow copiable", () => {
  it("muestra el ícono de copiar cuando copyable está activo", () => {
    const html = renderToString(<SpecRow label="Keydiy ID" value="12345" copyable />);
    expect(html).toContain('aria-label="Copiar Keydiy ID 12345"');
    expect(html).toContain("12345");
  });

  it("no muestra ícono de copiar por defecto", () => {
    const html = renderToString(<SpecRow label="Batería" value="CR2032" />);
    expect(html).not.toContain("Copiar");
  });

  it("no ofrece copiar un valor vacío", () => {
    const html = renderToString(<SpecRow label="Xhorse ID" value="   " copyable />);
    expect(html).not.toContain("Copiar");
  });
});
