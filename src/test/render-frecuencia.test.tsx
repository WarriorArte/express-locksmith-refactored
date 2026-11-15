import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ImmoProfileEditor, emptyProfile } from "@/components/herramientas/ImmoManager";

describe("campo de frecuencia", () => {
  it("lleva MHz impreso dentro del campo, junto al número", () => {
    const html = renderToString(
      <ImmoProfileEditor
        draft={{ ...emptyProfile(), frecuencia: "313" }}
        onChange={() => {}}
        onImagesChange={() => {}}
        isUploadingImage={false}
        uploadFile={undefined as never}
        galleryOpen={false}
        setGalleryOpen={() => {}}
        workshopCode="W1"
      />,
    );
    expect(html).toContain('value="313"');
    // la unidad aparece pegada al campo, no como texto suelto del formulario
    const afterField = html.slice(html.indexOf('value="313"'), html.indexOf('value="313"') + 400);
    expect(afterField).toContain("MHz");
  });
});
