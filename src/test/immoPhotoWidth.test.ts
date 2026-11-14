import { describe, expect, it } from "vitest";
import { immoPhotoWidth } from "@/components/herramientas/ImmoWorkspace";

describe("immoPhotoWidth", () => {
  it("keeps tall photos at the narrow size that tucks into the star", () => {
    expect(immoPhotoWidth(1.8)).toBe(128);
  });
  it("grows short photos, capped below the full star width", () => {
    expect(immoPhotoWidth(0.9)).toBe(148);
  });
  it("gives medium photos an intermediate size", () => {
    expect(immoPhotoWidth(1.35)).toBe(137);
  });
});
