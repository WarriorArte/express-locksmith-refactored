import type { ConfiguracionVisualLlave } from '@/types';
import { generarSiluetaCanal, calcularX2Guia } from './helpers';

interface Props {
  config: ConfiguracionVisualLlave;
  cortesPrimarios: number[];
  cortesSecundarios: number[];
  inputSide?: 'top' | 'bottom' | 'both' | 'none';
  inputMargin?: number;
  children?: React.ReactNode;
}

export function LlaveDobleEjeInterior({ config, cortesPrimarios, cortesSecundarios, inputSide = 'none', inputMargin: inputMarginProp, children }: Props) {
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
  const anclaYPorcentaje = config.anclaYPorcentaje ?? 50;
  const separacionBase = config.separacionBase ?? 20;
  const pSup = config.profSup ?? 4.0;
  const pInf = config.profInf ?? 4.0;
  const aSup = config.anchoSup ?? 11;
  const aInf = config.anchoInf ?? 11;

  const sanear = (arr: number[]) => arr.map(c => {
    const n = Number(c);
    return (isNaN(n) || n < 1) ? 1 : (n > maxDepth ? maxDepth : n);
  });

  const safeSup = sanear(cortesPrimarios);
  const safeInf = sanear(cortesSecundarios);

  const sMinY = baseYTop + ((maxDepth - 1) * pSup);
  const sMaxY = baseYBottom - separacionBase - ((maxDepth - 1) * pInf);
  const posYBase = sMinY + (Math.max(0, sMaxY - sMinY) * (anclaYPorcentaje / 100));

  const maxLen = Math.max(safeSup.length, safeInf.length);
  const totalDist = (maxLen > 0 ? maxLen - 1 : 0) * espaciado;
  const spcSup = safeSup.length > 1 ? totalDist / (safeSup.length - 1) : espaciado;
  const spcInf = safeInf.length > 1 ? totalDist / (safeInf.length - 1) : espaciado;

  const topPts: { x: number; y: number }[] = [];
  const bottomPts: { x: number; y: number }[] = [];

  safeSup.forEach((cv, i) => {
    const yS = posYBase - ((cv - 1) * pSup);
    const w = Math.max(1, Math.min(aSup, spcSup - 2));
    const cx = startX + i * spcSup;
    topPts.push({ x: cx - w / 2, y: yS }, { x: cx + w / 2, y: yS });
  });
  safeInf.forEach((cv, i) => {
    const yI = posYBase + separacionBase + ((cv - 1) * pInf);
    const w = Math.max(1, Math.min(aInf, spcInf - 2));
    const cx = startX + i * spcInf;
    bottomPts.push({ x: cx - w / 2, y: yI }, { x: cx + w / 2, y: yI });
  });

  const lastXTop = topPts.length > 0 ? topPts[topPts.length - 1].x : startX;
  const lastXInf = bottomPts.length > 0 ? bottomPts[bottomPts.length - 1].x : startX;
  const keyEndX = Math.max(lastXTop, lastXInf) + longitudRampaPunta;

  let trackPath = topPts.length > 0 ? `M ${topPts[0].x},${topPts[0].y} ` : `M ${startX},${posYBase} `;
  if (topPts.length > 0) for (let i = 1; i < topPts.length; i++) trackPath += `L ${topPts[i].x},${topPts[i].y} `;

  trackPath += `L ${keyEndX - biselPunta},${baseYTop} L ${keyEndX},${baseYTop + biselPunta} L ${keyEndX},${baseYBottom - biselPunta} L ${keyEndX - biselPunta},${baseYBottom} `;

  if (bottomPts.length > 0) {
    trackPath += `L ${lastXInf},${bottomPts[bottomPts.length - 1].y} `;
    for (let i = bottomPts.length - 2; i >= 0; i--) trackPath += `L ${bottomPts[i].x},${bottomPts[i].y} `;
  } else trackPath += `L ${startX},${posYBase + separacionBase} `;

  const sYT = topPts.length > 0 ? topPts[0].y : posYBase;
  const sYI = bottomPts.length > 0 ? bottomPts[0].y : posYBase + separacionBase;
  const sX = topPts.length > 0 ? topPts[0].x : startX;
  const rad = Math.max(1, Math.abs(sYI - sYT) / 2);
  trackPath += `A ${rad},${rad} 0 0 1 ${sX},${sYT} Z`;

  const outlinePath = generarSiluetaCanal(shoulderWidth, shoulderDrop, baseYTop, baseYBottom, keyEndX, biselPunta);

  const guiasY = [...new Set(
    Array.from({ length: maxDepth }).flatMap((_, i) => [posYBase - i * pSup, posYBase + separacionBase + i * pInf])
  )];
  const guias = guiasY.map(y => ({ y, x2: calcularX2Guia(y, baseYTop, baseYBottom, keyEndX, biselPunta) }));

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
