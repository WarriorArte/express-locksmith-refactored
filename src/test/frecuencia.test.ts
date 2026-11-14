import { describe, expect, it } from "vitest";
import { formatFrecuencia, getFrecuenciaMHz } from "@/lib/immo";

describe("frecuencia", () => {
  it("imprime MHz aunque solo se haya tecleado el número", () => {
    expect(formatFrecuencia({ frecuencia: "313", modulacion: "" })).toBe("313 MHz");
    expect(formatFrecuencia({ frecuencia: "315", modulacion: "" })).toBe("315 MHz");
  });
  it("no repite la unidad si alguien la escribió a mano", () => {
    expect(formatFrecuencia({ frecuencia: "313 MHz", modulacion: "" })).toBe("313 MHz");
    expect(formatFrecuencia({ frecuencia: "315mhz", modulacion: "" })).toBe("315 MHz");
  });
  it("pone la modulación después de la unidad", () => {
    expect(formatFrecuencia({ frecuencia: "315", modulacion: "ASK" })).toBe("315 MHz · ASK");
  });
  it("muestra solo la modulación si no hay frecuencia", () => {
    expect(formatFrecuencia({ frecuencia: "", modulacion: "FSK" })).toBe("FSK");
    expect(formatFrecuencia({ frecuencia: "", modulacion: "" })).toBe("");
  });
  it("guarda el número sin la unidad", () => {
    expect(getFrecuenciaMHz("433 MHz")).toBe("433");
    expect(getFrecuenciaMHz("313")).toBe("313");
    expect(getFrecuenciaMHz("")).toBe("");
  });
});
