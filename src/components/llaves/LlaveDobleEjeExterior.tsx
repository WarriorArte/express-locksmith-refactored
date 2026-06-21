import type { ConfiguracionVisualLlave } from '@/types';

interface Props {
  config: ConfiguracionVisualLlave;
  cortesSup: number[];
  cortesInf: number[];
  inputSide?: 'top' | 'bottom' | 'both' | 'none';
  inputMargin?: number;
  children?: React.ReactNode;
}

export function LlaveDobleEjeExterior({ config, cortesSup, cortesInf, inputSide = 'none', inputMargin: inputMarginProp, children }: Props) {
  const shoulderWidth = 35;
  const shoulderDrop = config.shoulderDrop ?? 12;
  const startX = shoulderWidth + config.distanciaHombro;
  const baseYTop = 75;
  const baseYBottom = baseYTop + config.grosorLlave;
  const centerY = baseYTop + config.grosorLlave / 2;

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const spacing = config.spacing;
  const depthStep = config.depthStep || 5;
  const valleyWidth = config.valleyWidth || 11;
  const crestWidth = config.crestWidth || 11;
  const biselPunta = config.biselPunta || 8;

  const maxLen = Math.max(cortesSup.length, cortesInf.length);
  const totalDist = (maxLen > 0 ? maxLen - 1 : 0) * spacing;

  const guiasY = [...new Set(
    Array.from({ length: config.maxDepth }).flatMap((_, i) => [
      baseYTop + i * depthStep,
      baseYBottom - i * depthStep
    ])
  )];

  const getProfile = (arr: number[]) => {
    const pts: { x: number; d: number }[] = [];
    const maxD = (config.maxDepth - 1) * depthStep;
    if (arr.length === 0) return pts;
    const localSpacing = arr.length > 1 ? totalDist / (arr.length - 1) : spacing;

    arr.forEach((cv, i) => {
      const cx = startX + i * localSpacing;
      const d = (cv - 1) * depthStep;
      const currentWidth = maxD > 0 ? crestWidth + (d / maxD) * (valleyWidth - crestWidth) : crestWidth;
      const safeWidth = Math.min(currentWidth, localSpacing);
      const leftX = cx - safeWidth / 2;
      const rightX = cx + safeWidth / 2;

      if (i === 0) {
        pts.push({ x: Math.max(shoulderWidth, leftX - (localSpacing - (crestWidth / 2 + safeWidth / 2))), d: 0 });
      }
      pts.push({ x: leftX, d }, { x: rightX, d });
    });
    return pts;
  };

  const pSup = getProfile(cortesSup);
  const pInf = getProfile(cortesInf);

  let d = `M 0,${topEdgeY} L ${shoulderWidth},${topEdgeY} L ${shoulderWidth},${baseYTop} `;

  if (pSup.length > 0) {
    if (pSup[0].x > shoulderWidth) d += `L ${pSup[0].x},${baseYTop} `;
    pSup.forEach(p => (d += `L ${p.x},${baseYTop + p.d} `));
  }

  const tipStartX = Math.max(
    pSup.length > 0 ? pSup[pSup.length - 1].x : shoulderWidth,
    pInf.length > 0 ? pInf[pInf.length - 1].x : shoulderWidth
  );
  const lastPSup = pSup.length > 0 ? pSup[pSup.length - 1] : { x: shoulderWidth, d: 0 };
  if (lastPSup.x < tipStartX) d += `L ${tipStartX},${baseYTop + lastPSup.d} `;

  const finalEndX = tipStartX + Math.max(10, config.distanciaPunta || 25);
  d += `L ${finalEndX},${centerY - 4} L ${finalEndX},${centerY + 4} `;

  const lastPInf = pInf.length > 0 ? pInf[pInf.length - 1] : { x: shoulderWidth, d: 0 };
  d += `L ${tipStartX},${baseYBottom - lastPInf.d} `;

  if (pInf.length > 0) {
    for (let i = pInf.length - 1; i >= 0; i--) d += `L ${pInf[i].x},${baseYBottom - pInf[i].d} `;
    if (pInf[0].x > shoulderWidth) d += `L ${shoulderWidth},${baseYBottom} `;
  } else {
    d += `L ${shoulderWidth},${baseYBottom} `;
  }

  d += `L ${shoulderWidth},${botEdgeY} L 0,${botEdgeY} `;

  const outlinePath = `M 0,${topEdgeY} L ${finalEndX - biselPunta},${topEdgeY} L ${finalEndX},${topEdgeY + biselPunta} L ${finalEndX},${botEdgeY - biselPunta} L ${finalEndX - biselPunta},${botEdgeY} L 0,${botEdgeY}`;

  const pad = 4;
  const svgWidth = finalEndX + pad;
  const inputMargin = inputMarginProp ?? 34;
  const noInputMargin = 6;
  const topMargin = (inputSide === 'top' || inputSide === 'both') ? inputMargin : noInputMargin;
  const bottomMargin = (inputSide === 'bottom' || inputSide === 'both') ? inputMargin : noInputMargin;
  const viewTop = topEdgeY - topMargin;
  const viewBottom = botEdgeY + bottomMargin;
  const svgHeight = viewBottom - viewTop;

  return (
    <svg width={svgWidth + pad} height={svgHeight} viewBox={`-${pad} ${viewTop} ${svgWidth + pad} ${svgHeight}`} className="drop-shadow-sm max-w-full" xmlns="http://www.w3.org/2000/svg">
      {guiasY.map((y, i) => (
        <line key={`guia-${i}`} x1={0} y1={y} x2={svgWidth} y2={y} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {children}
    </svg>
  );
}
