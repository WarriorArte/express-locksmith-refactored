import type { ConfiguracionVisualLlave } from '@/types';
import { generarSiluetaCanal, calcularX2Guia } from './helpers';

interface Props {
  config: ConfiguracionVisualLlave;
  cortes: number[];
  inputSide?: 'top' | 'bottom' | 'both' | 'none';
  inputMargin?: number;
  children?: React.ReactNode;
}

export function LlavePistaSemiCanal({ config, cortes, inputSide = 'none', inputMargin: inputMarginProp, children }: Props) {
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
  const anclaYPorcentaje = config.anclaYPorcentaje ?? 40;
  const separacionBase = config.separacionBase ?? 28;
  const profActiva = config.profundidadActiva ?? 4.0;
  const anchoActivo = config.anchoPlanoActivo ?? 11;
  const dinamismoActivo = config.dinamismoActivo ?? 3.0;

  const safeCortes = cortes.map(c => {
    const n = Number(c);
    return (isNaN(n) || n < 1) ? 1 : (n > maxDepth ? maxDepth : n);
  });

  let sMinY = orientacion === 'inferior' ? baseYTop + ((maxDepth - 1) * profActiva) : baseYTop + separacionBase;
  let sMaxY = orientacion === 'inferior' ? baseYBottom - separacionBase : baseYBottom - ((maxDepth - 1) * profActiva);
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

  const keyEndX = aPts[aPts.length - 1].x + longitudRampaPunta;
  let trackPath = "";

  if (orientacion === 'inferior') {
    const fX = aPts[0].x, fY = posYBase + separacionBase, rad = Math.max(1, Math.abs(fY - aPts[0].y) / 2);
    trackPath = `M ${fX},${aPts[0].y} `;
    for (let i = 1; i < aPts.length; i++) trackPath += `L ${aPts[i].x},${aPts[i].y} `;
    trackPath += `L ${keyEndX - biselPunta},${baseYTop} L ${keyEndX},${baseYTop + biselPunta} L ${keyEndX},${baseYBottom - biselPunta} L ${keyEndX - biselPunta},${baseYBottom} `;
    trackPath += `L ${aPts[aPts.length - 1].x},${fY} L ${fX},${fY} A ${rad},${rad} 0 0 1 ${fX},${aPts[0].y} Z`;
  } else {
    const fX = aPts[0].x, fY = posYBase - separacionBase, rad = Math.max(1, Math.abs(aPts[0].y - fY) / 2);
    trackPath = `M ${fX},${fY} L ${aPts[aPts.length - 1].x},${fY} `;
    trackPath += `L ${keyEndX - biselPunta},${baseYTop} L ${keyEndX},${baseYTop + biselPunta} L ${keyEndX},${baseYBottom - biselPunta} L ${keyEndX - biselPunta},${baseYBottom} `;
    trackPath += `L ${aPts[aPts.length - 1].x},${aPts[aPts.length - 1].y} `;
    for (let i = aPts.length - 2; i >= 0; i--) trackPath += `L ${aPts[i].x},${aPts[i].y} `;
    trackPath += `A ${rad},${rad} 0 0 1 ${fX},${fY} Z`;
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
