// Helper para adaptar dinámicamente las guías horizontales al bisel de la punta
export function calcularX2Guia(y: number, topY: number, botY: number, endX: number, bisel: number): number {
  if (y < topY) return endX - bisel;
  if (y <= topY + bisel) return endX - bisel + (y - topY);
  if (y < botY - bisel) return endX;
  if (y <= botY) return endX - (y - (botY - bisel));
  return endX - bisel;
}

// Helper para siluetas de pista con hombro dinámico
export function generarSiluetaCanal(
  shoulderWidth: number,
  shoulderDrop: number,
  baseYTop: number,
  baseYBottom: number,
  keyEndX: number,
  b: number
): string {
  const tY = baseYTop - shoulderDrop,
    bY = baseYBottom + shoulderDrop;
  return `M 0,${tY} L ${shoulderWidth},${tY} L ${shoulderWidth},${baseYTop} L ${keyEndX - b},${baseYTop} L ${keyEndX},${baseYTop + b} L ${keyEndX},${baseYBottom - b} L ${keyEndX - b},${baseYBottom} L ${shoulderWidth},${baseYBottom} L ${shoulderWidth},${bY} L 0,${bY}`;
}
