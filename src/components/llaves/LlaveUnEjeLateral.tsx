import type { ConfiguracionVisualLlave } from '@/types';
import { generarSiluetaCanal, calcularX2Guia } from './helpers';

interface Props {
  config: ConfiguracionVisualLlave;
  cortes: number[];
  inputSide?: 'top' | 'bottom' | 'both' | 'none';
  inputMargin?: number;
  children?: React.ReactNode;
}

export function LlaveUnEjeLateral({ config, cortes, inputSide = 'none', inputMargin: inputMarginProp, children }: Props) {
  const orientacion = config.orientacion || 'inferior';
  const shoulderWidth = 35;
  const shoulderDrop = config.shoulderDrop ?? 12;
  const startX = shoulderWidth + config.distanciaHombro;

  const baseYTop = 60;
  const baseYBottom = baseYTop + config.grosorLlave;

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const maxDepth = config.maxDepth;
  const espaciado = config.spacing;
  const biselPunta = config.biselPunta ?? 8;
  const longitudRampaPunta = config.distanciaPunta;
  const anclaYPorcentaje = config.anclaYPorcentaje ?? 100;
  const profActiva = config.profundidadActiva ?? 4.0;
  const anchoActivo = config.anchoPlanoActivo ?? 11;
  const dinamismoActivo = config.dinamismoActivo ?? 3.0;

  const safeCortes = cortes.map(c => {
    const n = Number(c);
    return (isNaN(n) || n < 1) ? 1 : (n > maxDepth ? maxDepth : n);
  });

  let sMinY = orientacion === 'inferior' ? baseYTop + ((maxDepth - 1) * profActiva) + 5 : baseYTop + 5;
  let sMaxY = orientacion === 'inferior' ? baseYBottom - 5 : baseYBottom - ((maxDepth - 1) * profActiva) - 5;
  if (sMaxY < sMinY) sMaxY = sMinY;
  const posYBase = sMinY + ((sMaxY - sMinY) * (anclaYPorcentaje / 100));

  const midP = (maxDepth + 1) / 2;
  const aPts: { x: number; y: number }[] = [];
  const centers = safeCortes.map((_, i) => startX + i * espaciado);

  safeCortes.forEach((cv, i) => {
    const d = (cv - 1) * profActiva;
    const aC = anchoActivo + (cv - midP) * dinamismoActivo;
    const sW = Math.max(1, Math.min(aC, espaciado - 2));
    const y = orientacion === 'inferior' ? posYBase - d : posYBase + d;
    aPts.push({ x: centers[i] - sW / 2, y }, { x: centers[i] + sW / 2, y });
  });

  const keyEndX = centers[centers.length - 1] + Math.max(1, Math.min(anchoActivo + (safeCortes[safeCortes.length - 1] - midP) * dinamismoActivo, espaciado - 2)) / 2 + longitudRampaPunta;
  let trackPath = "";

  if (orientacion === 'inferior') {
    const fX = aPts[0].x, fY = baseYBottom, biselEntrada = Math.abs(fY - aPts[0].y);
    const startXEntrada = Math.max(shoulderWidth, fX - biselEntrada);
    trackPath += `M ${startXEntrada},${fY} L ${fX},${aPts[0].y} `;
    for (let i = 1; i < aPts.length; i++) trackPath += `L ${aPts[i].x},${aPts[i].y} `;
    trackPath += `L ${keyEndX - longitudRampaPunta},${aPts[aPts.length - 1].y} L ${keyEndX - biselPunta},${baseYTop} `;
  } else {
    const fX = aPts[0].x, fY = baseYTop, biselEntrada = Math.abs(aPts[0].y - fY);
    const startXEntrada = Math.max(shoulderWidth, fX - biselEntrada);
    trackPath += `M ${startXEntrada},${fY} L ${fX},${aPts[0].y} `;
    for (let i = 1; i < aPts.length; i++) trackPath += `L ${aPts[i].x},${aPts[i].y} `;
    trackPath += `L ${keyEndX - longitudRampaPunta},${aPts[aPts.length - 1].y} L ${keyEndX - biselPunta},${baseYBottom} `;
  }

  const outlinePath = generarSiluetaCanal(shoulderWidth, shoulderDrop, baseYTop, baseYBottom, keyEndX, biselPunta);

  const guiasYRaw = Array.from({ length: maxDepth }).map((_, i) =>
    orientacion === 'inferior' ? posYBase - i * profActiva : posYBase + i * profActiva
  );
  const guias = guiasYRaw.map(y => ({ y, x2: calcularX2Guia(y, baseYTop, baseYBottom, keyEndX, biselPunta) }));

  const pad = 4;
  const svgWidth = keyEndX + pad;
  const inputMarginVal = inputMarginProp ?? 34;
  const noInputMargin = 6;
  const topMargin = (inputSide === 'top' || inputSide === 'both') ? inputMarginVal : noInputMargin;
  const bottomMargin = (inputSide === 'bottom' || inputSide === 'both') ? inputMarginVal : noInputMargin;
  const viewTop = topEdgeY - topMargin;
  const viewBottom = botEdgeY + bottomMargin;
  const svgHeight = viewBottom - viewTop;

  return (
    <svg width={svgWidth + pad} height={svgHeight} viewBox={`-${pad} ${viewTop} ${svgWidth + pad} ${svgHeight}`} className="drop-shadow-sm max-w-full" xmlns="http://www.w3.org/2000/svg">
      {guias.map((g, i) => (
        <line key={`guia-${i}`} x1={0} y1={g.y} x2={g.x2} y2={g.y} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={trackPath} fill="none" stroke="currentColor" strokeWidth="3.0" strokeLinejoin="round" strokeLinecap="round" />
      {children}
    </svg>
  );
}
