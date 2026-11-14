import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ProcedureSteps, parseProcedure } from "@/components/herramientas/ProcedureSteps";

describe("imágenes en el procedimiento", () => {
  it("una imagen sola en su línea es de párrafo y se une al paso anterior", () => {
    const blocks = parseProcedure("- Conecta el equipo\n![](https://x.com/a.png)\n- Lee el PIN");
    const steps = blocks[0] as { kind: "steps"; items: { images?: string[] }[] };
    expect(steps.items[0].images).toEqual(["https://x.com/a.png"]);
    expect(steps.items).toHaveLength(2);
  });
  it("una imagen entre palabras se muestra pequeña en línea y no como nota", () => {
    const html = renderToString(<ProcedureSteps text={"- Pulsa ![](https://x.com/b.png) dos veces"} />);
    expect(html).toMatch(/<img[^>]*inline-block/);
    expect(html).not.toContain("![]");
    expect(html).not.toContain("<aside");
  });
});
