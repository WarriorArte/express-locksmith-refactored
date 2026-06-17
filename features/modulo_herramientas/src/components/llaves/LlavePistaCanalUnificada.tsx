import type { ConfiguracionVisualLlave } from '@/types';
import { generarSiluetaCanal, calcularX2Guia } from './helpers';

interface Props {
  config: ConfiguracionVisualLlave;
  cortes: number[];
  inputSide?: 'top' | 'bottom' | 'both' | 'none';
  inputMargin?: number;
  children?: React.ReactNode;
}

export function LlavePistaCanalUnificada({ config, cortes, inputSide = 'none', inputMargin: inputMarginProp, children }: Props) {
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
  const profSup = config.profSup ?? 4.0;
  const profInf = config.profInf ?? 4.0;
  const anchoSup = config.anchoSup ?? 11;
  const anchoInf = config.anchoInf ?? 11;
  const dinamismoSup = config.dinamismoSup ?? 3.0;
  const dinamismoInf = config.dinamismoInf ?? 3.0;

  const safeCortes = cortes.map(c => {
    const n = Number(c);
    return (isNaN(n) || n < 1) ? 1 : (n > maxDepth ? maxDepth : n);
  });

  const maxSalto = (maxDepth - 1) * Math.max(profSup, profInf);
  let sMinY = orientacion === 'inferior' ? baseYTop + maxSalto : baseYTop + separacionBase;
  let sMaxY = orientacion === 'inferior' ? baseYBottom - separacionBase : baseYBottom - maxSalto;
  if (sMaxY < sMinY) sMaxY = sMinY;
  const posYBase = sMinY + ((sMaxY - sMinY) * (anclaYPorcentaje / 100));

  const midP = (maxDepth + 1) / 2;
  const topPts: { x: number; y: number }[] = [];
  const bottomPts: { x: number; y: number }[] = [];
  const centers = safeCortes.map((_, i) => startX + i * espaciado);

  safeCortes.forEach((cv, i) => {
    let yS: number, yI: number, aS: number, aI: number;
    if (orientacion === 'inferior') {
      yS = posYBase - ((cv - 1) * profSup);
      aS = anchoSup + (cv - midP) * dinamismoSup;
      yI = (posYBase + separacionBase) - ((cv - 1) * profInf);
      aI = anchoInf - (cv - midP) * dinamismoInf;
    } else {
      yI = posYBase + ((cv - 1) * profInf);
      aI = anchoInf + (cv - midP) * dinamismoInf;
      yS = (posYBase - separacionBase) + ((cv - 1) * profSup);
      aS = anchoSup - (cv - midP) * dinamismoSup;
    }
    const safeWS = Math.max(1, Math.min(aS, espaciado - 2));
    const safeWI = Math.max(1, Math.min(aI, espaciado - 2));
    topPts.push({ x: centers[i] - safeWS / 2, y: yS }, { x: centers[i] + safeWS / 2, y: yS });
    bottomPts.push({ x: centers[i] - safeWI / 2, y: yI }, { x: centers[i] + safeWI / 2, y: yI });
  });

  let trackPath = `M ${topPts[0].x},${topPts[0].y} `;
  for (let i = 1; i < topPts.length; i++) trackPath += `L ${topPts[i].x},${topPts[i].y} `;

  const keyEndX = Math.max(topPts[topPts.length - 1].x, bottomPts[bottomPts.length - 1].x) + longitudRampaPunta;
  trackPath += `L ${keyEndX - biselPunta},${baseYTop} L ${keyEndX},${baseYTop + biselPunta} L ${keyEndX},${baseYBottom - biselPunta} L ${keyEndX - biselPunta},${baseYBottom} L ${bottomPts[bottomPts.length - 1].x},${bottomPts[bottomPts.length - 1].y} `;
  for (let i = bottomPts.length - 2; i >= 0; i--) trackPath += `L ${bottomPts[i].x},${bottomPts[i].y} `;
  trackPath += `A ${Math.max(1, Math.abs(bottomPts[0].y - topPts[0].y) / 2)},${Math.max(1, Math.abs(bottomPts[0].y - topPts[0].y) / 2)} 0 0 1 ${topPts[0].x},${topPts[0].y} Z`;

  const outlinePath = generarSiluetaCanal(shoulderWidth, shoulderDrop, baseYTop, baseYBottom, keyEndX, biselPunta);

  const guiasYRaw = Array.from({ length: maxDepth }).map((_, i) =>
    orientacion === 'inferior' ? posYBase - i * profSup : posYBase + i * profInf
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
      <path d={trackPath} fill="none" stroke="#2563eb" strokeWidth="3.0" strokeLinejoin="round" strokeLinecap="round" />
      {children}
    </svg>
  );
}
