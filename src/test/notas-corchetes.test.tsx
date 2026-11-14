import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { FormattedText } from "@/components/herramientas/RichTextField";
import { parseProcedure } from "@/components/herramientas/ProcedureSteps";

const AVISO = "rounded-2xl";

describe("notas entre corchetes", () => {
  it("muestra la nota entre corchetes como aviso, sin los corchetes", () => {
    const html = renderToString(<FormattedText text="[Verificar la batería antes de entregar]" />);
    expect(html).toContain("Verificar la batería antes de entregar");
    expect(html).not.toContain("[Verificar");
    expect(html).toContain(AVISO);
  });

  it("deja el texto normal fuera del aviso", () => {
    const html = renderToString(<FormattedText text="Usar Philips ID46" />);
    expect(html).not.toContain(AVISO);
  });

  it("une una nota que abarca varias líneas", () => {
    const nota = ["[Nota larga", "que sigue en la segunda línea]"].join("\n");
    const html = renderToString(<FormattedText text={nota} />);
    expect(html).toContain("Nota larga que sigue en la segunda línea");
    expect(html).toContain(AVISO);
  });

  it("convierte una línea entre corchetes del procedimiento en aviso, no en paso", () => {
    const blocks = parseProcedure("- [No forzar la llave]\n- Insertar la llave\n- Girar");
    expect(blocks[0]).toEqual({ kind: "note", text: "No forzar la llave" });
    expect(blocks[1].kind).toBe("steps");
  });

  it("ya no convierte en aviso el primer paso que termina en dos puntos", () => {
    const blocks = parseProcedure("- El procedimiento puede variar según el equipo:\n- Insertar la llave");
    expect(blocks.some((b) => b.kind === "note")).toBe(false);
  });
});
