import React, { useState, useRef } from 'react';

export default function GeneradorLlaves() {
  const [tipoLlave, setTipoLlave] = useState('1_eje_lateral');

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">Generador de Cortes de Llaves</h1>
        
        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex justify-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex-wrap gap-y-2">
          {Object.entries({
            'doble_lado': 'Estándar Doble Lado',
            'estandar_1_lado': 'Estándar 1 Lado',
            '2_ejes_exterior': '2 Ejes Exterior',
            '2_ejes_internos': '2 Ejes Internos',
            'pista_canal': 'Pista Canal (Láser)',
            'pista_semi_canal': 'Pista Semi Canal',
            '1_eje_lateral': '1 Eje Lateral'
          }).map(([key, name]) => (
            <button key={key} onClick={() => setTipoLlave(key)}
              className={`px-4 py-2 rounded-md font-bold transition-colors text-sm ${tipoLlave === key ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            > {name} </button>
          ))}
        </div>
      </div>

      {tipoLlave === 'doble_lado' && <LlaveSimetricaDobleLado />}
      {tipoLlave === 'estandar_1_lado' && <LlaveEstandarUnLado />}
      {tipoLlave === '2_ejes_exterior' && <LlaveDobleEjeExterior />}
      {tipoLlave === '2_ejes_internos' && <LlaveDobleEjeInterior />}
      {tipoLlave === 'pista_canal' && <LlavePistaCanalUnificada />}
      {tipoLlave === 'pista_semi_canal' && <LlavePistaSemiCanal />}
      {tipoLlave === '1_eje_lateral' && <LlaveUnEjeLateral />}
    </div>
  );
}

// =====================================================================
// HOOKS Y HELPERS 
// =====================================================================
function useCortes(initial, maxDepth, minLen = 2) {
  const [cortes, setCortes] = useState(initial);
  const handleChange = (index, value) => {
    const nuevos = [...cortes];
    if (value === '') nuevos[index] = '';
    else {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 1 && num <= maxDepth) nuevos[index] = num;
    }
    setCortes(nuevos);
  };
  const add = () => { if (cortes.length < 20) setCortes([...cortes, 1]); };
  const sub = () => { if (cortes.length > minLen) setCortes(cortes.slice(0, -1)); };
  const safe = cortes.map(c => { const n = parseInt(c); return (isNaN(n) || n < 1) ? 1 : (n > maxDepth ? maxDepth : n); });
  return { cortes, safeCortes: safe, handleChange, add, sub };
}

function calcularX2Guia(y, topY, botY, endX, bisel) {
  if (y < topY) return endX - bisel;
  if (y <= topY + bisel) return endX - bisel + (y - topY);
  if (y < botY - bisel) return endX;
  if (y <= botY) return endX - (y - (botY - bisel));
  return endX - bisel;
}

function generarSiluetaCanal(shoulderWidth, shoulderDrop, baseYTop, baseYBottom, keyEndX, b) {
  const tY = baseYTop - shoulderDrop, bY = baseYBottom + shoulderDrop;
  return `M 0,${tY} L ${shoulderWidth},${tY} L ${shoulderWidth},${baseYTop} L ${keyEndX - b},${baseYTop} L ${keyEndX},${baseYTop + b} L ${keyEndX},${baseYBottom - b} L ${keyEndX - b},${baseYBottom} L ${shoulderWidth},${baseYBottom} L ${shoulderWidth},${bY} L 0,${bY}`;
}

const LayoutGenerador = ({ titulo, subtitulo, headerExtra, controles, children, svgWidth, svgRef, onDownload, guias = [] }) => (
  <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-in fade-in duration-500">
    <div className="flex justify-between items-center mb-6">
      <div><h2 className="text-xl font-bold text-gray-800">{titulo}</h2><p className="text-sm text-gray-500">{subtitulo}</p></div>
      {headerExtra}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 bg-gray-50 p-5 rounded-lg border border-gray-200 h-fit max-h-[85vh] overflow-y-auto">
        {controles}
        <button onClick={onDownload} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 px-4 rounded shadow-md flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Descargar SVG
        </button>
      </div>
      <div className="lg:col-span-3 flex flex-col justify-center items-center bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 overflow-x-auto min-h-[300px]">
        <svg ref={svgRef} width={svgWidth} height="300" viewBox={`0 0 ${svgWidth} 300`} className="drop-shadow-sm max-w-full" xmlns="http://www.w3.org/2000/svg">
          {guias.map((g, i) => (
            <line key={`guia-${i}`} x1={g.x1 !== undefined ? g.x1 : 0} y1={g.y} x2={g.x2 !== undefined ? g.x2 : (svgWidth - 20)} y2={g.y} stroke="#e5e7eb" strokeWidth="1" />
          ))}
          {children}
        </svg>
      </div>
    </div>
  </div>
);

// =====================================================================
// GENERADORES (COMPLETOS)
// =====================================================================

function LlaveSimetricaDobleLado() {
  const [maxDepth, setMaxDepth] = useState(5);
  const c = useCortes([4, 3, 3, 4, 3, 4, 2, 3, 1, 2], maxDepth, 2);

  const [distanciaHombro, setDistanciaHombro] = useState(30); 
  const [distanciaPunta, setDistanciaPunta] = useState(15);
  const [spacing, setSpacing] = useState(18);           
  const [depthStep, setDepthStep] = useState(5);         
  const [grosorLlave, setGrosorLlave] = useState(60);    
  const [valleyWidth, setValleyWidth] = useState(11);    
  const [crestWidth, setCrestWidth] = useState(11);      
  const [shoulderDrop, setShoulderDrop] = useState(12);
  
  const shoulderWidth = 35;  
  const startX = shoulderWidth + distanciaHombro;
  const baseYTop = 65;       
  const baseYBottom = baseYTop + grosorLlave;   
  const centerY = baseYTop + grosorLlave / 2;        
  const svgRef = useRef(null);

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const profile = (() => {
    const maxD = (maxDepth - 1) * depthStep; 
    const pts = [];
    c.safeCortes.forEach((cv, i) => {
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

  const { d, svgWidth } = (() => {
    let path = `M 0,${topEdgeY} L ${shoulderWidth},${topEdgeY} L ${shoulderWidth},${baseYTop} `;
    
    if (profile[0].x > shoulderWidth) path += `L ${profile[0].x},${baseYTop} `;
    profile.forEach(p => path += `L ${p.x},${baseYTop + p.d} `);

    const tipStartX = profile[profile.length - 1].x;
    const finalEndX = tipStartX + Math.max(10, distanciaPunta);
    
    path += `L ${finalEndX},${centerY - 4} L ${finalEndX},${centerY + 4} L ${tipStartX},${baseYBottom - profile[profile.length - 1].d} `;
    for (let i = profile.length - 1; i >= 0; i--) path += `L ${profile[i].x},${baseYBottom - profile[i].d} `;

    if (profile[0].x > shoulderWidth) path += `L ${shoulderWidth},${baseYBottom} `;
    path += `L ${shoulderWidth},${botEdgeY} L 0,${botEdgeY} `;
    return { d: path, svgWidth: finalEndX + 20 };
  })();

  const guias = [...new Set(Array.from({length: maxDepth}).flatMap((_, i) => [baseYTop + i * depthStep, baseYBottom - i * depthStep]))].map(y => ({ y, x1: 0, x2: svgWidth - 20 }));

  return (
    <LayoutGenerador titulo="Estándar Doble Lado" subtitulo="Perfil dentado tipo serrucho simétrico ajustable." 
      svgRef={svgRef} svgWidth={svgWidth} onDownload={() => descargarSVG(svgRef, 'estandar_doble_lado')} 
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Cortes" count={c.cortes.length} onAdd={c.add} onSub={c.sub} />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={40} max={100} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={spacing} setter={setSpacing} min={14} max={30} step={1} />
          <ControlRango label="Extensión de la Punta" valor={distanciaPunta} setter={setDistanciaPunta} min={0} max={50} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Perfil de Corte">
          <ControlRango label="Escalón de Profundidad" valor={depthStep} setter={setDepthStep} min={1} max={10} step={1} />
          <ControlRango label="Ancho del Corte (Fondo)" valor={valleyWidth} setter={setValleyWidth} min={2} max={25} step={1} />
          <ControlRango label="Ancho Separación (Cresta)" valor={crestWidth} setter={setCrestWidth} min={2} max={25} step={1} />
        </SeccionControles>
      </>}
    >
      <path d={d} fill="none" stroke="#32a832" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {c.cortes.map((cv, i) => <InputCorte key={i} x={startX + i * spacing - 9} y={topEdgeY - 32} corte={cv} onChange={(v) => c.handleChange(i, v)} idPrefix="simDoble" index={i} total={c.cortes.length} maxDepth={maxDepth} />)}
    </LayoutGenerador>
  );
}

function LlaveDobleEjeExterior() {
  const [maxDepth, setMaxDepth] = useState(5);
  const cs = useCortes([4, 3, 2, 4, 3, 4, 2, 1], maxDepth, 1);
  const ci = useCortes([1, 2, 3, 2, 1, 3, 4, 3], maxDepth, 1);

  const [distanciaHombro, setDistanciaHombro] = useState(30);
  const [distanciaPunta, setDistanciaPunta] = useState(25);
  const [spacing, setSpacing] = useState(18);           
  const [depthStep, setDepthStep] = useState(5);         
  const [grosorLlave, setGrosorLlave] = useState(60);    
  const [valleyWidth, setValleyWidth] = useState(11);    
  const [crestWidth, setCrestWidth] = useState(11);      
  const [biselPunta, setBiselPunta] = useState(8);
  const [shoulderDrop, setShoulderDrop] = useState(12);

  const shoulderWidth = 35;   
  const startX = shoulderWidth + distanciaHombro;
  const baseYTop = 75, baseYBottom = baseYTop + grosorLlave, centerY = baseYTop + grosorLlave / 2;        
  const svgRef = useRef(null);

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const maxLen = Math.max(cs.cortes.length, ci.cortes.length);
  const totalDist = (maxLen > 0 ? maxLen - 1 : 0) * spacing;

  const getProfile = (arr) => {
    const pts = [], maxD = (maxDepth - 1) * depthStep; 
    if (arr.length === 0) return pts;
    const localSpacing = arr.length > 1 ? totalDist / (arr.length - 1) : spacing;

    arr.forEach((cv, i) => {
      const cx = startX + i * localSpacing, d = (cv - 1) * depthStep; 
      const currentWidth = maxD > 0 ? crestWidth + (d / maxD) * (valleyWidth - crestWidth) : crestWidth;
      const safeWidth = Math.min(currentWidth, localSpacing);
      const leftX = cx - safeWidth / 2, rightX = cx + safeWidth / 2;
      if (i === 0) pts.push({ x: Math.max(shoulderWidth, leftX - (localSpacing - (crestWidth / 2 + safeWidth / 2))), d: 0 });
      pts.push({ x: leftX, d }, { x: rightX, d });
    });
    return pts;
  };

  const pSup = getProfile(cs.safeCortes), pInf = getProfile(ci.safeCortes);
  
  let d = `M 0,${topEdgeY} L ${shoulderWidth},${topEdgeY} L ${shoulderWidth},${baseYTop} `;
  if (pSup.length > 0) {
    if (pSup[0].x > shoulderWidth) d += `L ${pSup[0].x},${baseYTop} `;
    pSup.forEach(p => d += `L ${p.x},${baseYTop + p.d} `);
  }

  const tipStartX = Math.max(pSup.length > 0 ? pSup[pSup.length - 1].x : shoulderWidth, pInf.length > 0 ? pInf[pInf.length - 1].x : shoulderWidth);
  const lastPSup = pSup.length > 0 ? pSup[pSup.length - 1] : {x: shoulderWidth, d: 0};
  if (lastPSup.x < tipStartX) d += `L ${tipStartX},${baseYTop + lastPSup.d} `;
  
  const finalEndX = tipStartX + Math.max(10, distanciaPunta);  
  d += `L ${finalEndX},${centerY - 4} L ${finalEndX},${centerY + 4} `;
  
  const lastPInf = pInf.length > 0 ? pInf[pInf.length - 1] : {x: shoulderWidth, d: 0};
  d += `L ${tipStartX},${baseYBottom - lastPInf.d} `;

  if (pInf.length > 0) {
    for (let i = pInf.length - 1; i >= 0; i--) d += `L ${pInf[i].x},${baseYBottom - pInf[i].d} `;
    if (pInf[0].x > shoulderWidth) d += `L ${shoulderWidth},${baseYBottom} `;
  } else d += `L ${shoulderWidth},${baseYBottom} `;
  
  d += `L ${shoulderWidth},${botEdgeY} L 0,${botEdgeY} `;
  
  const outlinePath = `M 0,${topEdgeY} L ${finalEndX - biselPunta},${topEdgeY} L ${finalEndX},${topEdgeY + biselPunta} L ${finalEndX},${botEdgeY - biselPunta} L ${finalEndX - biselPunta},${botEdgeY} L 0,${botEdgeY}`;
  
  const guias = [...new Set(Array.from({length: maxDepth}).flatMap((_, i) => [baseYTop + i * depthStep, baseYBottom - i * depthStep]))].map(y => {
    return { y, x1: 0, x2: calcularX2Guia(y, topEdgeY, botEdgeY, finalEndX, biselPunta) };
  });

  return (
    <LayoutGenerador titulo="2 Ejes Exterior" subtitulo="Perfil asimétrico. La silueta gris representa el metal virgen (molde ancho)."
      svgRef={svgRef} svgWidth={finalEndX + 20} onDownload={() => descargarSVG(svgRef, '2_ejes_exterior')}
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Superior" count={cs.cortes.length} onAdd={cs.add} onSub={cs.sub} color="indigo" />
          <ControlArreglo nombre="Inferior" count={ci.cortes.length} onAdd={ci.add} onSub={ci.sub} color="green" />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={40} max={100} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={spacing} setter={setSpacing} min={14} max={30} step={1} />
          <ControlRango label="Extensión de la Punta" valor={distanciaPunta} setter={setDistanciaPunta} min={10} max={50} step={1} />
          <ControlRango label="Inclinación Punta (Bisel)" valor={biselPunta} setter={setBiselPunta} min={0} max={30} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Perfil de Corte">
          <ControlRango label="Escalón de Profundidad" valor={depthStep} setter={setDepthStep} min={1} max={10} step={1} />
          <ControlRango label="Ancho del Corte (Fondo)" valor={valleyWidth} setter={setValleyWidth} min={2} max={25} step={1} />
          <ControlRango label="Ancho Separación (Cresta)" valor={crestWidth} setter={setCrestWidth} min={2} max={25} step={1} />
        </SeccionControles>
      </>}
    >
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={d} fill="none" stroke="#32a832" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {cs.cortes.map((cv, i) => <InputCorte key={`sup-${i}`} x={(startX + i * (cs.cortes.length > 1 ? totalDist / (cs.cortes.length - 1) : spacing)) - 9} y={topEdgeY - 32} corte={cv} color="indigo" onChange={(v) => cs.handleChange(i, v)} idPrefix="extSup" index={i} total={cs.cortes.length} maxDepth={maxDepth} nextPrefix="extInf" prevPrefix="extInf" prevTotal={ci.cortes.length} />)}
      {ci.cortes.map((cv, i) => <InputCorte key={`inf-${i}`} x={(startX + i * (ci.cortes.length > 1 ? totalDist / (ci.cortes.length - 1) : spacing)) - 9} y={botEdgeY + 8} corte={cv} color="green" onChange={(v) => ci.handleChange(i, v)} idPrefix="extInf" index={i} total={ci.cortes.length} maxDepth={maxDepth} nextPrefix="extSup" prevPrefix="extSup" prevTotal={cs.cortes.length} />)}
    </LayoutGenerador>
  );
}

function LlavePistaCanalUnificada() {
  const [orientacion, setOrientacion] = useState('inferior'); 
  const [maxDepth, setMaxDepth] = useState(5);
  const c = useCortes([4, 3, 2, 1, 3, 3, 4, 2], maxDepth, 2);

  const [distanciaHombro, setDistanciaHombro] = useState(20);
  const [espaciado, setEspaciado] = useState(24);         
  const [anclaYPorcentaje, setAnclaYPorcentaje] = useState(40); 
  const [separacionBase, setSeparacionBase] = useState(28); 
  const [grosorLlave, setGrosorLlave] = useState(75);     
  const [biselPunta, setBiselPunta] = useState(8);
  const [longitudRampaPunta, setLongitudRampaPunta] = useState(40);
  const [shoulderDrop, setShoulderDrop] = useState(12);

  const shoulderWidth = 35;
  const startX = shoulderWidth + distanciaHombro; 

  const [anchoSup, setAnchoSup] = useState(11), [dinamismoSup, setDinamismoSup] = useState(3.0), [profSup, setProfSup] = useState(4.0); 
  const [anchoInf, setAnchoInf] = useState(11), [dinamismoInf, setDinamismoInf] = useState(3.0), [profInf, setProfInf] = useState(4.0); 

  const baseYTop = 60, baseYBottom = baseYTop + grosorLlave; 
  const maxSalto = (maxDepth - 1) * Math.max(profSup, profInf);
  
  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  let sMinY = orientacion === 'inferior' ? baseYTop + maxSalto : baseYTop + separacionBase;
  let sMaxY = orientacion === 'inferior' ? baseYBottom - separacionBase : baseYBottom - maxSalto;
  if (sMaxY < sMinY) sMaxY = sMinY;
  const posYBase = sMinY + ((sMaxY - sMinY) * (anclaYPorcentaje / 100));
  
  const svgRef = useRef(null);
  
  const midP = (maxDepth + 1) / 2;
  const topPts = [], bottomPts = [], centers = c.safeCortes.map((_, i) => startX + i * espaciado);

  c.safeCortes.forEach((cv, i) => {
    let yS, yI, aS, aI;
    if (orientacion === 'inferior') {
      yS = posYBase - ((cv - 1) * profSup); aS = anchoSup + (cv - midP) * dinamismoSup; 
      yI = (posYBase + separacionBase) - ((cv - 1) * profInf); aI = anchoInf - (cv - midP) * dinamismoInf; 
    } else {
      yI = posYBase + ((cv - 1) * profInf); aI = anchoInf + (cv - midP) * dinamismoInf; 
      yS = (posYBase - separacionBase) + ((cv - 1) * profSup); aS = anchoSup - (cv - midP) * dinamismoSup; 
    }
    const safeWS = Math.max(1, Math.min(aS, espaciado - 2)), safeWI = Math.max(1, Math.min(aI, espaciado - 2));
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

  const guiasYRaw = Array.from({length: maxDepth}).map((_, i) => orientacion === 'inferior' ? posYBase - i * profSup : posYBase + i * profInf);
  const guias = guiasYRaw.map(y => ({ y, x1: 0, x2: calcularX2Guia(y, baseYTop, baseYBottom, keyEndX, biselPunta) }));

  return (
    <LayoutGenerador titulo="Pista Canal (Generador Maestro)" subtitulo="Controla dinámicamente canales interiores o exteriores con un solo motor."
      headerExtra={
        <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-bold border border-gray-200">
          <button onClick={() => {setOrientacion('inferior'); setAnclaYPorcentaje(40)}} className={`px-4 py-1.5 rounded-md transition-all ${orientacion === 'inferior' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>Cortes Hacia Arriba</button>
          <button onClick={() => {setOrientacion('superior'); setAnclaYPorcentaje(100)}} className={`px-4 py-1.5 rounded-md transition-all ${orientacion === 'superior' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>Cortes Hacia Abajo</button>
        </div>
      }
      svgRef={svgRef} svgWidth={keyEndX + 20} onDownload={() => descargarSVG(svgRef, `pista_canal_unificada_${orientacion}`)}
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Cortes" count={c.cortes.length} onAdd={c.add} onSub={c.sub} />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={40} max={130} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={espaciado} setter={setEspaciado} min={14} max={50} step={1} />
          <ControlRango label="Extensión de la Punta" valor={longitudRampaPunta} setter={setLongitudRampaPunta} min={15} max={80} step={1} />
          <ControlRango label="Inclinación Punta (Bisel)" valor={biselPunta} setter={setBiselPunta} min={0} max={30} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Forma de la Pista">
          <ControlRango label="Posición Vertical (Eje Y)" valor={anclaYPorcentaje} setter={setAnclaYPorcentaje} min={0} max={100} step={1} tooltip="0% = Arriba, 100% = Abajo" />
          <ControlRango label="Separación Central (Pistas)" valor={separacionBase} setter={setSeparacionBase} min={5} max={60} step={1} />
        </SeccionControles>
        <div className="space-y-4">
          <div className="space-y-3 bg-white p-3 rounded shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-green-800 text-center uppercase">Borde Sup. {orientacion === 'inferior' ? '(Activo)' : '(Inverso)'}</h3>
            <ControlRango label="Escalón de Profundidad" valor={profSup} setter={setProfSup} min={1} max={10} step={0.5} color="green" />
            <ControlRango label="Ancho del Corte (Fondo)" valor={anchoSup} setter={setAnchoSup} min={0} max={35} step={1} color="green" />
            <ControlRango label="Ajuste Dinámico de Ancho" valor={dinamismoSup} setter={setDinamismoSup} min={0} max={10} step={0.5} color="green" />
          </div>
          <div className="space-y-3 bg-white p-3 rounded shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-green-800 text-center uppercase">Borde Inf. {orientacion === 'superior' ? '(Activo)' : '(Inverso)'}</h3>
            <ControlRango label="Escalón de Profundidad" valor={profInf} setter={setProfInf} min={1} max={10} step={0.5} color="green" />
            <ControlRango label="Ancho del Corte (Fondo)" valor={anchoInf} setter={setAnchoInf} min={0} max={35} step={1} color="green" />
            <ControlRango label="Ajuste Dinámico de Ancho" valor={dinamismoInf} setter={setDinamismoInf} min={0} max={10} step={0.5} color="green" />
          </div>
        </div>
      </>}
    >
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={trackPath} fill="none" stroke="#32a832" strokeWidth="3.0" strokeLinejoin="round" strokeLinecap="round" />
      {c.cortes.map((cv, i) => <InputCorte key={i} x={centers[i] - 9} y={orientacion === 'inferior' ? botEdgeY + 8 : topEdgeY - 32} corte={cv} onChange={(v) => c.handleChange(i, v)} idPrefix="pistaUnif" index={i} total={c.cortes.length} maxDepth={maxDepth} />)}
    </LayoutGenerador>
  );
}

function LlavePistaSemiCanal() {
  const [orientacion, setOrientacion] = useState('inferior'); 
  const [maxDepth, setMaxDepth] = useState(5);
  const c = useCortes([4, 3, 2, 1, 3, 3, 4, 2], maxDepth, 2);

  const [distanciaHombro, setDistanciaHombro] = useState(20);
  const [espaciado, setEspaciado] = useState(24);         
  const [anclaYPorcentaje, setAnclaYPorcentaje] = useState(40); 
  const [separacionBase, setSeparacionBase] = useState(28); 
  const [grosorLlave, setGrosorLlave] = useState(75);     
  const [biselPunta, setBiselPunta] = useState(8);
  const [longitudRampaPunta, setLongitudRampaPunta] = useState(40);
  const [shoulderDrop, setShoulderDrop] = useState(12);

  const shoulderWidth = 35;
  const startX = shoulderWidth + distanciaHombro;

  const [anchoActivo, setAnchoActivo] = useState(11), [dinamismoActivo, setDinamismoActivo] = useState(3.0), [profActiva, setProfActiva] = useState(4.0); 
      
  const baseYTop = 60, baseYBottom = baseYTop + grosorLlave; 

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  let sMinY = orientacion === 'inferior' ? baseYTop + ((maxDepth - 1) * profActiva) : baseYTop + separacionBase;
  let sMaxY = orientacion === 'inferior' ? baseYBottom - separacionBase : baseYBottom - ((maxDepth - 1) * profActiva);
  if (sMaxY < sMinY) sMaxY = sMinY;
  const posYBase = sMinY + ((sMaxY - sMinY) * (anclaYPorcentaje / 100));
  
  const svgRef = useRef(null);

  const midP = (maxDepth + 1) / 2;
  const aPts = [], centers = c.safeCortes.map((_, i) => startX + i * espaciado);

  c.safeCortes.forEach((cv, i) => {
    const d = (cv - 1) * profActiva, aC = anchoActivo + (cv - midP) * dinamismoActivo; 
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

  const guiasYRaw = Array.from({length: maxDepth}).map((_, i) => orientacion === 'inferior' ? posYBase - i * profActiva : posYBase + i * profActiva);
  const guias = guiasYRaw.map(y => ({ y, x1: 0, x2: calcularX2Guia(y, baseYTop, baseYBottom, keyEndX, biselPunta) }));

  return (
    <LayoutGenerador titulo="Pista Semi Canal" subtitulo="Canal asimétrico: un lado activo y un lado totalmente recto. Inicio de corte redondo."
      headerExtra={
        <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-bold border border-gray-200">
          <button onClick={() => {setOrientacion('inferior'); setAnclaYPorcentaje(40)}} className={`px-4 py-1.5 rounded-md transition-all ${orientacion === 'inferior' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>Cortes Hacia Arriba</button>
          <button onClick={() => {setOrientacion('superior'); setAnclaYPorcentaje(100)}} className={`px-4 py-1.5 rounded-md transition-all ${orientacion === 'superior' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>Cortes Hacia Abajo</button>
        </div>
      }
      svgRef={svgRef} svgWidth={keyEndX + 20} onDownload={() => descargarSVG(svgRef, `pista_semi_canal_${orientacion}`)}
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Cortes" count={c.cortes.length} onAdd={c.add} onSub={c.sub} />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={40} max={130} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={espaciado} setter={setEspaciado} min={14} max={50} step={1} />
          <ControlRango label="Extensión de la Punta" valor={longitudRampaPunta} setter={setLongitudRampaPunta} min={15} max={80} step={1} />
          <ControlRango label="Inclinación Punta (Bisel)" valor={biselPunta} setter={setBiselPunta} min={0} max={30} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Forma de la Pista">
          <ControlRango label="Posición Vertical (Eje Y)" valor={anclaYPorcentaje} setter={setAnclaYPorcentaje} min={0} max={100} step={1} />
          <ControlRango label="Separación Central (Pistas)" valor={separacionBase} setter={setSeparacionBase} min={5} max={60} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Perfil de Corte (Lado Activo)">
          <ControlRango label="Escalón de Profundidad" valor={profActiva} setter={setProfActiva} min={1} max={10} step={0.5} />
          <ControlRango label="Ancho del Corte (Fondo)" valor={anchoActivo} setter={setAnchoActivo} min={0} max={35} step={1} />
          <ControlRango label="Ajuste Dinámico de Ancho" valor={dinamismoActivo} setter={setDinamismoActivo} min={0} max={10} step={0.5} />
        </SeccionControles>
      </>}
    >
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={trackPath} fill="none" stroke="#32a832" strokeWidth="3.0" strokeLinejoin="round" strokeLinecap="round" />
      {c.cortes.map((cv, i) => <InputCorte key={i} x={centers[i] - 9} y={orientacion === 'inferior' ? botEdgeY + 8 : topEdgeY - 32} corte={cv} onChange={(v) => c.handleChange(i, v)} idPrefix="pistaSemi" index={i} total={c.cortes.length} maxDepth={maxDepth} />)}
    </LayoutGenerador>
  );
}

function LlaveDobleEjeInterior() {
  const [maxDepth, setMaxDepth] = useState(5);
  const cs = useCortes([4, 3, 2, 4, 3, 4, 2, 1], maxDepth, 1);
  const ci = useCortes([1, 2, 3, 2, 1, 3, 4, 3], maxDepth, 1);

  const [distanciaHombro, setDistanciaHombro] = useState(20);
  const [espaciado, setEspaciado] = useState(24);         
  const [anclaYPorcentaje, setAnclaYPorcentaje] = useState(50); 
  const [separacionBase, setSeparacionBase] = useState(20); 
  const [grosorLlave, setGrosorLlave] = useState(75);     
  const [biselPunta, setBiselPunta] = useState(8);
  const [longitudRampaPunta, setLongitudRampaPunta] = useState(40);
  const [shoulderDrop, setShoulderDrop] = useState(12);

  const shoulderWidth = 35;
  const startX = shoulderWidth + distanciaHombro;

  const [aSup, setASup] = useState(11), [pSup, setPSup] = useState(4.0); 
  const [aInf, setAInf] = useState(11), [pInf, setPInf] = useState(4.0); 

  const baseYTop = 60, baseYBottom = baseYTop + grosorLlave; 

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const sMinY = baseYTop + ((maxDepth - 1) * pSup);        
  const sMaxY = baseYBottom - separacionBase - ((maxDepth - 1) * pInf);    
  const posYBase = sMinY + (Math.max(0, sMaxY - sMinY) * (anclaYPorcentaje / 100));
  
  const svgRef = useRef(null);

  const maxLen = Math.max(cs.safeCortes.length, ci.safeCortes.length);
  const totalDist = (maxLen > 0 ? maxLen - 1 : 0) * espaciado;
  const spcSup = cs.safeCortes.length > 1 ? totalDist / (cs.safeCortes.length - 1) : espaciado;
  const spcInf = ci.safeCortes.length > 1 ? totalDist / (ci.safeCortes.length - 1) : espaciado;

  const topPts = [], bottomPts = [];
  cs.safeCortes.forEach((cv, i) => {
    const yS = posYBase - ((cv - 1) * pSup), w = Math.max(1, Math.min(aSup, spcSup - 2)), cx = startX + i * spcSup;
    topPts.push({ x: cx - w / 2, y: yS }, { x: cx + w / 2, y: yS });
  });
  ci.safeCortes.forEach((cv, i) => {
    const yI = posYBase + separacionBase + ((cv - 1) * pInf), w = Math.max(1, Math.min(aInf, spcInf - 2)), cx = startX + i * spcInf;
    bottomPts.push({ x: cx - w / 2, y: yI }, { x: cx + w / 2, y: yI });
  });

  const lastXTop = topPts.length > 0 ? topPts[topPts.length - 1].x : startX, lastXInf = bottomPts.length > 0 ? bottomPts[bottomPts.length - 1].x : startX;
  const keyEndX = Math.max(lastXTop, lastXInf) + longitudRampaPunta; 
  
  let trackPath = topPts.length > 0 ? `M ${topPts[0].x},${topPts[0].y} ` : `M ${startX},${posYBase} `;
  if (topPts.length > 0) for (let i = 1; i < topPts.length; i++) trackPath += `L ${topPts[i].x},${topPts[i].y} `;
  
  trackPath += `L ${keyEndX - biselPunta},${baseYTop} L ${keyEndX},${baseYTop + biselPunta} L ${keyEndX},${baseYBottom - biselPunta} L ${keyEndX - biselPunta},${baseYBottom} `;
  
  if (bottomPts.length > 0) {
    trackPath += `L ${lastXInf},${bottomPts[bottomPts.length - 1].y} `;
    for (let i = bottomPts.length - 2; i >= 0; i--) trackPath += `L ${bottomPts[i].x},${bottomPts[i].y} `;
  } else trackPath += `L ${startX},${posYBase + separacionBase} `;
  
  const sYT = topPts.length > 0 ? topPts[0].y : posYBase, sYI = bottomPts.length > 0 ? bottomPts[0].y : posYBase + separacionBase, sX = topPts.length > 0 ? topPts[0].x : startX;
  const rad = Math.max(1, Math.abs(sYI - sYT) / 2);
  trackPath += `A ${rad},${rad} 0 0 1 ${sX},${sYT} Z`;

  const outlinePath = generarSiluetaCanal(shoulderWidth, shoulderDrop, baseYTop, baseYBottom, keyEndX, biselPunta);

  const guias = [...new Set(Array.from({length: maxDepth}).flatMap((_, i) => [posYBase - i * pSup, posYBase + separacionBase + i * pInf]))].map(y => {
    return { y, x1: 0, x2: calcularX2Guia(y, baseYTop, baseYBottom, keyEndX, biselPunta) };
  });

  return (
    <LayoutGenerador titulo="2 Ejes Internos (Regata Doble)" subtitulo="Pista canal con paredes independientes controladas por dos series de cortes."
      svgRef={svgRef} svgWidth={keyEndX + 20} onDownload={() => descargarSVG(svgRef, '2_ejes_internos')}
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Superior" count={cs.cortes.length} onAdd={cs.add} onSub={cs.sub} color="indigo" />
          <ControlArreglo nombre="Inferior" count={ci.cortes.length} onAdd={ci.add} onSub={ci.sub} color="green" />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={40} max={130} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={espaciado} setter={setEspaciado} min={14} max={50} step={1} />
          <ControlRango label="Extensión de la Punta" valor={longitudRampaPunta} setter={setLongitudRampaPunta} min={15} max={80} step={1} />
          <ControlRango label="Inclinación Punta (Bisel)" valor={biselPunta} setter={setBiselPunta} min={0} max={30} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Forma de la Pista">
          <ControlRango label="Posición Vertical (Eje Y)" valor={anclaYPorcentaje} setter={setAnclaYPorcentaje} min={0} max={100} step={1} />
          <ControlRango label="Separación Central (Pistas)" valor={separacionBase} setter={setSeparacionBase} min={5} max={60} step={1} />
        </SeccionControles>
        <div className="space-y-4">
          <div className="space-y-3 bg-white p-3 rounded shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-indigo-800 text-center uppercase">Eje Superior</h3>
            <ControlRango label="Escalón de Profundidad" valor={pSup} setter={setPSup} min={1} max={10} step={0.5} color="indigo" />
            <ControlRango label="Ancho del Corte (Fondo)" valor={aSup} setter={setASup} min={0} max={35} step={1} color="indigo" />
          </div>
          <div className="space-y-3 bg-white p-3 rounded shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-green-800 text-center uppercase">Eje Inferior</h3>
            <ControlRango label="Escalón de Profundidad" valor={pInf} setter={setPInf} min={1} max={10} step={0.5} color="green" />
            <ControlRango label="Ancho del Corte (Fondo)" valor={aInf} setter={setAInf} min={0} max={35} step={1} color="green" />
          </div>
        </div>
      </>}
    >
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={trackPath} fill="none" stroke="#32a832" strokeWidth="3.0" strokeLinejoin="round" strokeLinecap="round" />
      {cs.cortes.map((cv, i) => <InputCorte key={`sup-${i}`} x={(startX + i * spcSup) - 9} y={topEdgeY - 32} corte={cv} color="indigo" onChange={(v) => cs.handleChange(i, v)} idPrefix="intSup" index={i} total={cs.cortes.length} maxDepth={maxDepth} nextPrefix="intInf" prevPrefix="intInf" prevTotal={ci.cortes.length} />)}
      {ci.cortes.map((cv, i) => <InputCorte key={`inf-${i}`} x={(startX + i * spcInf) - 9} y={botEdgeY + 8} corte={cv} color="green" onChange={(v) => ci.handleChange(i, v)} idPrefix="intInf" index={i} total={ci.cortes.length} maxDepth={maxDepth} nextPrefix="intSup" prevPrefix="intSup" prevTotal={cs.cortes.length} />)}
    </LayoutGenerador>
  );
}

function LlaveUnEjeLateral() {
  const [orientacion, setOrientacion] = useState('inferior'); 
  const [maxDepth, setMaxDepth] = useState(5);
  const c = useCortes([4, 3, 2, 1, 3, 3, 4, 2], maxDepth, 2);

  const [distanciaHombro, setDistanciaHombro] = useState(30); 
  const [espaciado, setEspaciado] = useState(24);         
  const [anclaYPorcentaje, setAnclaYPorcentaje] = useState(100); 
  const [grosorLlave, setGrosorLlave] = useState(75);     
  const [biselPunta, setBiselPunta] = useState(8);
  const [longitudRampaPunta, setLongitudRampaPunta] = useState(40);
  const [shoulderDrop, setShoulderDrop] = useState(12);

  const shoulderWidth = 35;
  const startX = shoulderWidth + distanciaHombro;

  const [anchoActivo, setAnchoActivo] = useState(11), [dinamismoActivo, setDinamismoActivo] = useState(3.0), [profActiva, setProfActiva] = useState(4.0); 
      
  const baseYTop = 60, baseYBottom = baseYTop + grosorLlave; 

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  let sMinY = orientacion === 'inferior' ? baseYTop + ((maxDepth - 1) * profActiva) + 5 : baseYTop + 5;
  let sMaxY = orientacion === 'inferior' ? baseYBottom - 5 : baseYBottom - ((maxDepth - 1) * profActiva) - 5;
  if (sMaxY < sMinY) sMaxY = sMinY;
  const posYBase = sMinY + ((sMaxY - sMinY) * (anclaYPorcentaje / 100));
  
  const svgRef = useRef(null);

  const midP = (maxDepth + 1) / 2;
  const aPts = [], centers = c.safeCortes.map((_, i) => startX + i * espaciado);

  c.safeCortes.forEach((cv, i) => {
    const d = (cv - 1) * profActiva, aC = anchoActivo + (cv - midP) * dinamismoActivo; 
    const sW = Math.max(1, Math.min(aC, espaciado - 2));
    const y = orientacion === 'inferior' ? posYBase - d : posYBase + d;
    aPts.push({ x: centers[i] - sW / 2, y }, { x: centers[i] + sW / 2, y });
  });

  const keyEndX = centers[centers.length - 1] + Math.max(1, Math.min(anchoActivo + (c.safeCortes[c.safeCortes.length - 1] - midP) * dinamismoActivo, espaciado - 2)) / 2 + longitudRampaPunta;
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

  const guiasYRaw = Array.from({length: maxDepth}).map((_, i) => orientacion === 'inferior' ? posYBase - i * profActiva : posYBase + i * profActiva);
  const guias = guiasYRaw.map(y => ({ y, x1: 0, x2: calcularX2Guia(y, baseYTop, baseYBottom, keyEndX, biselPunta) }));

  return (
    <LayoutGenerador titulo="1 Eje Lateral" subtitulo="Pista abierta de un solo lado. Inmersión recta biselada y salida por la punta."
      headerExtra={
        <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-bold border border-gray-200">
          <button onClick={() => {setOrientacion('inferior'); setAnclaYPorcentaje(100)}} className={`px-4 py-1.5 rounded-md transition-all ${orientacion === 'inferior' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>Cortes Hacia Arriba</button>
          <button onClick={() => {setOrientacion('superior'); setAnclaYPorcentaje(0)}} className={`px-4 py-1.5 rounded-md transition-all ${orientacion === 'superior' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>Cortes Hacia Abajo</button>
        </div>
      }
      svgRef={svgRef} svgWidth={keyEndX + 20} onDownload={() => descargarSVG(svgRef, `1_eje_lateral_${orientacion}`)}
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Cortes" count={c.cortes.length} onAdd={c.add} onSub={c.sub} />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={40} max={130} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={espaciado} setter={setEspaciado} min={14} max={50} step={1} />
          <ControlRango label="Extensión de la Punta" valor={longitudRampaPunta} setter={setLongitudRampaPunta} min={15} max={80} step={1} />
          <ControlRango label="Inclinación Punta (Bisel)" valor={biselPunta} setter={setBiselPunta} min={0} max={30} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Forma de la Pista">
          <ControlRango label="Posición Vertical (Eje Y)" valor={anclaYPorcentaje} setter={setAnclaYPorcentaje} min={0} max={100} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Perfil de Corte (Lado Activo)">
          <ControlRango label="Escalón de Profundidad" valor={profActiva} setter={setProfActiva} min={1} max={10} step={0.5} />
          <ControlRango label="Ancho del Corte (Fondo)" valor={anchoActivo} setter={setAnchoActivo} min={0} max={35} step={1} />
          <ControlRango label="Ajuste Dinámico de Ancho" valor={dinamismoActivo} setter={setDinamismoActivo} min={0} max={10} step={0.5} />
        </SeccionControles>
      </>}
    >
      <path d={outlinePath} fill="none" stroke="#b6c2cf" strokeWidth="2.5" />
      <path d={trackPath} fill="none" stroke="#32a832" strokeWidth="3.0" strokeLinejoin="round" strokeLinecap="round" />
      {c.cortes.map((cv, i) => <InputCorte key={i} x={centers[i] - 9} y={orientacion === 'inferior' ? botEdgeY + 8 : topEdgeY - 32} corte={cv} onChange={(v) => c.handleChange(i, v)} idPrefix="ejeLat" index={i} total={c.cortes.length} maxDepth={maxDepth} />)}
    </LayoutGenerador>
  );
}

function LlaveEstandarUnLado() {
  const [maxDepth, setMaxDepth] = useState(5);
  const c = useCortes([4, 3, 2, 4, 1, 3], maxDepth, 2);

  const [distanciaHombro, setDistanciaHombro] = useState(30); 
  const [distanciaPunta, setDistanciaPunta] = useState(15);
  const [spacing, setSpacing] = useState(20);           
  const [depthStep, setDepthStep] = useState(6);         
  const [grosorLlave, setGrosorLlave] = useState(50);    
  const [valleyWidth, setValleyWidth] = useState(12);    
  const [crestWidth, setCrestWidth] = useState(12);      
  const [shoulderDrop, setShoulderDrop] = useState(12);
  
  const shoulderWidth = 35;   
  const startX = shoulderWidth + distanciaHombro;
  const baseYTop = 60, baseYBottom = baseYTop + grosorLlave;        
  const svgRef = useRef(null);

  const topEdgeY = baseYTop - shoulderDrop;
  const botEdgeY = baseYBottom + shoulderDrop;

  const profile = (() => {
    const pts = [], maxD = (maxDepth - 1) * depthStep; 
    c.safeCortes.forEach((cv, i) => {
      const cx = startX + i * spacing, d = (cv - 1) * depthStep; 
      const currentWidth = maxD > 0 ? crestWidth + (d / maxD) * (valleyWidth - crestWidth) : crestWidth;
      const safeWidth = Math.min(currentWidth, spacing);
      const leftX = cx - safeWidth / 2, rightX = cx + safeWidth / 2;
      if (i === 0) pts.push({ x: Math.max(shoulderWidth, leftX - (spacing - (crestWidth / 2 + safeWidth / 2))), d: 0 });
      pts.push({ x: leftX, d }, { x: rightX, d });
    });
    return pts;
  })();

  const { d, svgWidth } = (() => {
    let path = `M 0,${topEdgeY} L ${shoulderWidth},${topEdgeY} L ${shoulderWidth},${baseYTop} `;
    
    if (profile[0].x > shoulderWidth) path += `L ${profile[0].x},${baseYTop} `;
    profile.forEach(p => path += `L ${p.x},${baseYTop + p.d} `);

    const tipStartX = profile[profile.length - 1].x; 
    const finalEndX = tipStartX + Math.max(15, distanciaPunta); 
    
    path += `L ${finalEndX},${baseYTop + grosorLlave / 2 + 8} L ${finalEndX - 15},${baseYBottom} L ${shoulderWidth},${baseYBottom} `;
    path += `L ${shoulderWidth},${botEdgeY} L 0,${botEdgeY} `;
    
    return { d: path, svgWidth: finalEndX + 20 };
  })();

  const guias = Array.from({length: maxDepth}).map((_, i) => {
    return { y: baseYTop + i * depthStep, x1: 0, x2: svgWidth - 20 };
  });

  return (
    <LayoutGenerador titulo="Estándar 1 Lado" subtitulo="Perfil dentado tradicional de un solo lado con base plana." 
      svgRef={svgRef} svgWidth={svgWidth} onDownload={() => descargarSVG(svgRef, 'estandar_un_lado')} 
      guias={guias}
      controles={<>
        <SeccionControles titulo="Longitud (Cortes)">
          <ControlArreglo nombre="Cortes" count={c.cortes.length} onAdd={c.add} onSub={c.sub} />
        </SeccionControles>
        <SeccionControles titulo="Estructura Base">
          <ControlRango label="Grosor de la Llave" valor={grosorLlave} setter={setGrosorLlave} min={30} max={100} step={1} />
          <ControlRango label="Altura del Hombro" valor={shoulderDrop} setter={setShoulderDrop} min={0} max={30} step={1} />
          <LimitadorMax valor={maxDepth} setter={setMaxDepth} />
        </SeccionControles>
        <SeccionControles titulo="Posicionamiento">
          <ControlRango label="Distancia al 1er Corte" valor={distanciaHombro} setter={setDistanciaHombro} min={10} max={60} step={1} />
          <ControlRango label="Distancia entre Cortes" valor={spacing} setter={setSpacing} min={14} max={40} step={1} />
          <ControlRango label="Extensión de la Punta" valor={distanciaPunta} setter={setDistanciaPunta} min={0} max={50} step={1} />
        </SeccionControles>
        <SeccionControles titulo="Perfil de Corte">
          <ControlRango label="Escalón de Profundidad" valor={depthStep} setter={setDepthStep} min={1} max={15} step={1} />
          <ControlRango label="Ancho del Corte (Fondo)" valor={valleyWidth} setter={setValleyWidth} min={2} max={30} step={1} />
          <ControlRango label="Ancho Separación (Cresta)" valor={crestWidth} setter={setCrestWidth} min={2} max={30} step={1} />
        </SeccionControles>
      </>}
    >
      <path d={d} fill="none" stroke="#32a832" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {c.cortes.map((cv, i) => <InputCorte key={i} x={startX + i * spacing - 9} y={topEdgeY - 32} corte={cv} onChange={(v) => c.handleChange(i, v)} idPrefix="stdUnLado" index={i} total={c.cortes.length} maxDepth={maxDepth} />)}
    </LayoutGenerador>
  );
}

// =====================================================================
// PEQUEÑOS COMPONENTES REUTILIZABLES (UI)
// =====================================================================
const SeccionControles = ({ titulo, children }) => (
  <div className="mb-4">
    <div className="bg-gray-200 p-1.5 rounded text-center text-xs font-bold text-gray-700 tracking-wider mb-3 uppercase">{titulo}</div>
    <div className="space-y-3">{children}</div>
  </div>
);

const LimitadorMax = ({ valor, setter }) => (
  <div>
    <label className="text-xs text-gray-600 block mb-1">Niveles de Profundidad (Máx)</label>
    <input type="number" min="1" max="12" value={valor} onChange={(e) => setter(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2" />
  </div>
);

const ControlRango = ({ label, valor, setter, min, max, step, color = 'gray', tooltip }) => (
  <div>
    <label className="text-xs text-gray-600 flex justify-between mb-1" title={tooltip}>
      <span>{label}</span><span className="font-bold">{valor}{step % 1 !== 0 ? '' : 'px'}</span>
    </label>
    <input type="range" min={min} max={max} step={step} value={valor} onChange={(e) => setter(Number(e.target.value))} className={`w-full accent-${color}-600`} />
  </div>
);

const ControlArreglo = ({ nombre, count, onAdd, onSub, color = 'gray' }) => (
  <div className="flex items-center justify-between mt-1">
    <span className={`text-xs font-bold text-${color}-700`}>{nombre} ({count})</span>
    <div className="flex gap-1 w-20">
      <button onClick={onSub} disabled={count <= 1} className="flex-1 bg-red-100 text-red-600 font-bold py-1 rounded disabled:opacity-50 hover:bg-red-200">-</button>
      <button onClick={onAdd} disabled={count >= 20} className="flex-1 bg-green-100 text-green-600 font-bold py-1 rounded disabled:opacity-50 hover:bg-green-200">+</button>
    </div>
  </div>
);

const InputCorte = ({ x, y, corte, onChange, color = 'gray', idPrefix = 'corte', index = 0, total = 1, maxDepth = 5, nextPrefix, prevPrefix, prevTotal }) => {
  const nPrefix = nextPrefix || idPrefix;
  const pPrefix = prevPrefix || idPrefix;
  const pTotal = prevTotal || total;

  const handleChange = (e) => {
    // La acción real ocurre en onKeyDown para evitar conflictos de react/teclado
  };

  const handleKeyDown = (e) => {
    if (['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        onChange(''); 
        if (index > 0) { 
          const prev = document.getElementById(`${idPrefix}-${index - 1}`);
          if (prev) { prev.focus(); prev.select(); }
        } else {
          const prev = document.getElementById(`${pPrefix}-${pTotal - 1}`);
          if (prev) { prev.focus(); prev.select(); }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) {
          const prev = document.getElementById(`${idPrefix}-${index - 1}`);
          if (prev) { prev.focus(); prev.select(); }
        } else {
          const prev = document.getElementById(`${pPrefix}-${pTotal - 1}`);
          if (prev) { prev.focus(); prev.select(); }
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (index < total - 1) {
          const next = document.getElementById(`${idPrefix}-${index + 1}`);
          if (next) { next.focus(); next.select(); }
        } else {
          const next = document.getElementById(`${nPrefix}-0`);
          if (next) { next.focus(); next.select(); }
        }
      }
      return;
    }

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const currentVal = e.target.value;
    let newValStr;

    if (e.target.selectionStart === 0 && e.target.selectionEnd === currentVal.length) {
      newValStr = e.key;
    } else {
      newValStr = currentVal + e.key;
    }

    const num = parseInt(newValStr);

    if (!isNaN(num) && num >= 1 && num <= maxDepth) {
      onChange(newValStr);
      
      const maxDigits = maxDepth.toString().length;
      if (newValStr.length >= maxDigits) {
        setTimeout(() => {
          if (index < total - 1) {
            const next = document.getElementById(`${idPrefix}-${index + 1}`);
            if (next) next.select();
          } else {
            const next = document.getElementById(`${nPrefix}-0`);
            if (next) next.select();
          }
        }, 10);
      }
    }
  };

  return (
    <foreignObject x={x} y={y} width="18" height="24">
      <input 
        id={`${idPrefix}-${index}`}
        type="text" 
        maxLength="2" 
        value={corte} 
        onFocus={(e) => e.target.select()} 
        onChange={handleChange} 
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={`w-full h-6 text-xs p-0 text-center font-bold text-${color}-700 bg-${color}-50 border border-${color}-300 rounded focus:bg-white outline-none shadow-sm`} 
      />
    </foreignObject>
  );
};

const descargarSVG = (ref, nombre) => {
  if (!ref.current) return;
  const clone = ref.current.cloneNode(true);
  const objects = clone.getElementsByTagName("foreignObject");
  while (objects[0]) objects[0].parentNode.removeChild(objects[0]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
  link.download = `${nombre}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};