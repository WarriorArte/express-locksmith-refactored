import type { ConfiguracionVisualLlave } from '@/types';

interface Props {
  config: ConfiguracionVisualLlave;
  cortes: number[];
  inputSide?: 'top' | 'bottom' | 'both' | 'none';
  inputMargin?: number;
  children?: React.ReactNode;
}

export function LlaveSimetricaDobleLado({ config, cortes, inputSide = 'none', inputMargin: inputMarginProp, children }: Props) {
  const shoulderWidth = 35;
  const shoulderDrop = config.shoulderDrop ?? 12;
  const startX = shoulderWidth + config.distanciaHombro;
  const baseYTop = 65;
  const baseYBottom = baseYTop + config.grosorLlave;
  const centerY = baseYTop + config.grosorLlave / 2;

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const maxDepth = config.maxDepth;
  const spacing = config.spacing;
  const depthStep = config.depthStep ?? 5;
  const valleyWidth = config.valleyWidth ?? 11;
  const crestWidth = config.crestWidth ?? 11;
  const distanciaPunta = config.distanciaPunta;

  const safeCortes = cortes.map(c => {
    const n = Number(c);
    return (isNaN(n) || n < 1) ? 1 : (n > maxDepth ? maxDepth : n);
  });

  const guiasY = [...new Set(
    Array.from({ length: maxDepth }).flatMap((_, i) => [baseYTop + i * depthStep, baseYBottom - i * depthStep])
  )];

  const profile = (() => {
    const maxD = (maxDepth - 1) * depthStep;
    const pts: { x: number; d: number }[] = [];
    safeCortes.forEach((cv, i) => {
      const cx = startX + i * spacing;
      const d = (cv - 1) * depthStep;
      const currentWidth = maxD > 0 ? crestWidth + (d / maxD) * (valleyWidth - crestWidth) : crestWidth;
      const safeWidth = Math.min(currentWidth, spacing);
      const leftX = cx - safeWidth / 2, rightX = cx + safeWidth / 2;
      if (i === 0) pts.push({ x: Math.max(shoulderWidth, leftX - (spacing - (crestWidth / 2 + safeWidth / 2))), d: 0 });
      pts.push({ x: leftX, d }, { x: rightX, d });
    });
    return pts;
  })();

  const { d: pathD, svgWidth } = (() => {
    let path = `M 0,${topEdgeY} L ${shoulderWidth},${topEdgeY} L ${shoulderWidth},${baseYTop} `;

    if (profile[0].x > shoulderWidth) path += `L ${profile[0].x},${baseYTop} `;
    profile.forEach(p => (path += `L ${p.x},${baseYTop + p.d} `));

    const tipStartX = profile[profile.length - 1].x;
    const finalEndX = tipStartX + Math.max(10, distanciaPunta);

    path += `L ${finalEndX},${centerY - 4} L ${finalEndX},${centerY + 4} L ${tipStartX},${baseYBottom - profile[profile.length - 1].d} `;
    for (let i = profile.length - 1; i >= 0; i--) path += `L ${profile[i].x},${baseYBottom - profile[i].d} `;

    if (profile[0].x > shoulderWidth) path += `L ${shoulderWidth},${baseYBottom} `;
    path += `L ${shoulderWidth},${botEdgeY} L 0,${botEdgeY} `;
    const pad = 4;
    return { d: path, svgWidth: finalEndX + pad };
  })();

  const pad = 4;
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
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {children}
    </svg>
  );
}
