/**
 * Convierte un nivel entre su numero de bitting y su posicion fisica.
 * La operacion es simetrica, por lo que sirve en ambos sentidos.
 */
export function translateDepth(depth: number, maxDepth: number, inverted = false): number {
  const safeMax = Math.max(1, Math.trunc(maxDepth));
  const safeDepth = Math.max(1, Math.min(Math.trunc(depth), safeMax));
  return inverted ? safeMax + 1 - safeDepth : safeDepth;
}
