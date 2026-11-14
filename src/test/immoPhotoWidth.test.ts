import { describe, expect, it } from "vitest";
import { immoPhotoLayout } from "@/components/herramientas/ImmoWorkspace";

describe("immoPhotoLayout", () => {
  it("short photos sit lower so the bottom still tucks into the star", () => {
    expect(immoPhotoLayout(1.2)).toEqual({ width: 64, top: 20 });
  });
  it("medium photos end just past the star's lower edge", () => {
    expect(immoPhotoLayout(1.36)).toEqual({ width: 64, top: 15 });
  });
  it("tall photos stay narrow and stick out at most 4% above", () => {
    expect(immoPhotoLayout(2.2)).toEqual({ width: 54, top: -4 });
  });
});
