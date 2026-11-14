/**
 * Tamaño de las imágenes de párrafo en procedimientos y notas.
 *
 * Se guarda como fragmento al final de la URL, ![](url#x2), para que el resto del
 * parser (pasos, notas entre corchetes) trate la imagen igual que siempre.
 * x1 (más baja) … x4 (más alta); sin fragmento = tamaño automático.
 */

export const IMAGE_SIZES = ["x1", "x2", "x3", "x4"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Altura fija por tamaño; el ancho sale de la proporción de la foto. */
export const IMAGE_SIZE_CLASS: Record<ImageSize, string> = {
  x1: "h-24",
  x2: "h-48",
  x3: "h-72",
  x4: "h-96",
};

/** Separa la URL real y el tamaño elegido: "a.png#x2" → { url: "a.png", size: "x2" }. */
export function splitImageSize(spec: string): { url: string; size: ImageSize | null } {
  const m = /^(.*)#(x[1-4])$/.exec(spec);
  return m ? { url: m[1], size: m[2] as ImageSize } : { url: spec, size: null };
}

/** Aplica (o quita, con null) el tamaño a una URL de imagen. */
export function withImageSize(url: string, size: ImageSize | null): string {
  const base = splitImageSize(url).url;
  return size ? `${base}#${size}` : base;
}
