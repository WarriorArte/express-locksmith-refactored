import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Image as ImageIcon, RotateCcw, ZoomIn, 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, 
  ArrowLeftRight, Crosshair, Settings2, ShieldAlert, X, ArrowLeft, ArrowUpDown, Lock, LockOpen
} from 'lucide-react';

// --- COMPONENTE: DESLIZADOR VERTICAL ---
const ControlDeslizanteVertical = ({ etiqueta, onChangeDelta, icono: Icono }) => {
  const lastY = useRef(null);

  const handleStart = (e) => {
    e.stopPropagation();
    lastY.current = e.touches ? e.touches[0].clientY : e.clientY;
  };
  
  const handleMove = (e) => {
    e.stopPropagation();
    if (lastY.current === null) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Al deslizar hacia arriba (menor Y), el delta es positivo
    const delta = lastY.current - currentY; 
    onChangeDelta(delta);
    lastY.current = currentY;
  };
  
  const handleEnd = (e) => {
    e.stopPropagation();
    lastY.current = null;
  };

  return (
    <div 
      className="flex flex-col items-center w-[54px] sm:w-[60px] bg-slate-800/90 backdrop-blur-md p-1.5 sm:p-2 rounded-[1.25rem] touch-none select-none cursor-ns-resize border border-slate-700/50 shadow-xl h-[150px] sm:h-[180px] pointer-events-auto"
      onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd} onTouchCancel={handleEnd}
    >
      <div className="flex flex-col items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 shrink-0">
         <Icono size={16} className="text-teal-400"/>
      </div>
      <div className="w-full flex-1 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center shadow-inner">
         <div 
           className="absolute inset-0 opacity-20"
           style={{
             backgroundImage: 'linear-gradient(180deg, transparent 45%, rgba(255,255,255,0.8) 50%, transparent 55%)',
             backgroundSize: '100% 14px'
           }}
         ></div>
         <ArrowUpDown size={14} className="text-amber-500 opacity-90 relative z-10" />
      </div>
    </div>
  );
};

// --- BASE DE DATOS DE PLANTILLAS (PRESETS) ---
const PRESETS = {
  'estandar_un_hombro': { lado: 'izq', ancho: 598, profs: [600, 550, 500, 450], dists: [390, 640, 890, 1140, 1390] },
  'estandar_doble_hombro': { ancho: 830, profs: [830, 760, 690, 620], dists: [250, 460, 670, 880, 1090, 1300, 1510, 1720] },
  'estandar_doble_punta': { ancho: 820, profs: [820, 760, 700, 640], dists: [2240, 2010, 1780, 1550, 1320, 1090, 860, 630] },
  'dos_ejes_exterior_punta': { ancho: 895, profs: [790, 754, 718, 682, 646, 610], dists: [1840, 1535, 1230, 925, 620, 380] },
  'dos_ejes_interior_punta': { ancho: 780, profs: [125, 205, 285], dists: [1510, 1270, 1030, 790, 550] },
  'pista_canal_hombro': { lado: 'izq', ancho: 820, profs: [380, 320, 260, 200], dists: [300, 600, 900, 1200, 1500, 1800, 2100, 2400] },
  '1_eje_lateral_punta': { lado: 'der', ancho: 570, profs: [400, 340, 280, 220, 160], dists: [2475, 2180, 1885, 1590, 1295, 1000, 760, 520] }
};

const App = () => {
  // --- ESTADOS PRINCIPALES ---
  const [modoApp, setModoApp] = useState('taller'); 
  const [fase, setFase] = useState('captura'); 
  const [mostrarMenuCaptura, setMostrarMenuCaptura] = useState(false); 
  const [imagenUrl, setImagenUrl] = useState(null);
  const [haInteractuado, setHaInteractuado] = useState(false);
  const [desbloqueadoUnaVez, setDesbloqueadoUnaVez] = useState(false);
  const [bittingModal, setBittingModal] = useState(null);
  
  // --- CONFIGURACIÓN PARAMÉTRICA PROFESIONAL ---
  const [config, setConfig] = useState({
    tipoLlave: 'pista_canal', 
    ladoEstandarUn: 'izq', 
    alineacion: 'hombro', 
    anchoLlave: 820,
    profundidades: [380, 320, 260, 200], 
    distanciasCortes: [300, 600, 900, 1200, 1500, 1800, 2100, 2400], 
    distanciasCortesDer: [300, 600, 900, 1200, 1500, 1800, 2100, 2400], 
    escalaPixelMm: 0.20, 
    offsetYTope: 60,
  });

  const [profundidadesTexto, setProfundidadesTexto] = useState(config.profundidades.join(', '));
  const [distanciasTexto, setDistanciasTexto] = useState(config.distanciasCortes.join(', '));
  const [distanciasDerTexto, setDistanciasDerTexto] = useState(config.distanciasCortesDer.join(', '));
  const [imgTransform, setImgTransform] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });
  
  // --- ESTADOS DE LA CÁMARA DINÁMICA ---
  const [windowSize, setWindowSize] = useState({ 
    w: typeof window !== 'undefined' ? window.innerWidth : 390, 
    h: typeof window !== 'undefined' ? window.innerHeight : 844 
  });
  const [zoomPanStyle, setZoomPanStyle] = useState({ transform: 'translate(0px, 0px) scale(1)' });
  
  const canvasRef = useRef(null);
  
  const prevTipoLlaveRef = useRef(config.tipoLlave);
  const isDraggingImgRef = useRef(false);
  const activeTouchesRef = useRef(0);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startPinchDistRef = useRef(0);
  const startPinchAngleRef = useRef(0);
  const baseTransformRef = useRef({ scale: 1, rotate: 0, x: 0, y: 0 }); 

  const [cortes, setCortes] = useState([]);
  const [cursorActivo, setCursorActivo] = useState({ corteIndex: 0, lado: 'izq' });

  // Listener para tamaño de ventana (para matemáticas precisas)
  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reiniciar cortes al cambiar de tipo de llave
  useEffect(() => {
    const isDosEjes = config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior';
    const maxLen = isDosEjes 
      ? Math.max(config.distanciasCortes.length, config.distanciasCortesDer.length)
      : config.distanciasCortes.length;
      
    const tipoChanged = prevTipoLlaveRef.current !== config.tipoLlave;
    prevTipoLlaveRef.current = config.tipoLlave;
    setCortes(prev =>
      Array.from({ length: maxLen }).map((_, i) =>
        (!tipoChanged && prev[i]) ? { ...prev[i] } : { izq: 0, der: 0 }
      )
    );
    
    const isUnLado = config.tipoLlave === 'estandar_un' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral';
    const initialLado = isUnLado ? config.ladoEstandarUn : 'izq';
    setCursorActivo({ corteIndex: 0, lado: initialLado });
  }, [config.distanciasCortes.length, config.distanciasCortesDer.length, config.tipoLlave]);

  useEffect(() => {
    if (config.tipoLlave === 'estandar_un' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral') {
      setCursorActivo(prev => ({ ...prev, lado: config.ladoEstandarUn }));
    }
  }, [config.ladoEstandarUn, config.tipoLlave]);

  // --- EL CEREBRO DE LA CÁMARA (NUEVO) ---
  // Calcula dinámicamente la posición del punto activo y mueve el wrapper
  useEffect(() => {
    if (fase !== 'ajuste') {
      setZoomPanStyle({ transform: 'translate(0px, 0px) scale(1)' });
      return;
    }

    const isDosEjes = config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior';
    const isInterior = config.tipoLlave === 'dos_ejes_interior' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral';
    
    const maxDistIzq = Math.max(...config.distanciasCortes, 0);
    const maxDistDer = isDosEjes ? Math.max(...config.distanciasCortesDer, 0) : maxDistIzq;
    const maxDist = Math.max(maxDistIzq, maxDistDer);
    
    const gridHeight = maxDist * config.escalaPixelMm;
    const baseMargin = (config.offsetYTope || 60) + 12;
    const downshift = config.alineacion === 'punta' ? 40 : 30;
    const marginTop = baseMargin + downshift;
    const marginBottom = baseMargin - downshift;
    const totalSvgHeight = gridHeight + marginTop + marginBottom;
    
    // El centro interno del SVG
    const centerX = 360 / 2;
    const centerY = totalSvgHeight / 2;

    const idx = cursorActivo.corteIndex;
    const lado = cursorActivo.lado;
    
    // Profundidad actual
    const corte = cortes[idx] || { izq: 0, der: 0 };
    const profIndex = Math.min(corte[lado] || 0, config.profundidades.length - 1);
    const profVal = config.profundidades[profIndex] || 0;
    
    // Calcular X objetivo
    const distCentro = isInterior
        ? ((config.anchoLlave / 2) - profVal) * config.escalaPixelMm
        : (profVal - (config.anchoLlave / 2)) * config.escalaPixelMm;
    const targetX = lado === 'izq' ? centerX - distCentro : centerX + distCentro;

    // Calcular Y objetivo
    const distMm = lado === 'izq' 
        ? (config.distanciasCortes[idx] || 0) 
        : (isDosEjes ? (config.distanciasCortesDer[idx] || 0) : (config.distanciasCortes[idx] || 0));
    const refY = config.alineacion === 'punta' ? marginTop : marginTop + gridHeight;
    const targetY = config.alineacion === 'punta' ? refY + (distMm * config.escalaPixelMm) : refY - (distMm * config.escalaPixelMm);

    // Distancia desde el centro del SVG puro
    const dxSvg = targetX - centerX;
    const dySvg = targetY - centerY;

    // EL SECRETO: Calculamos en base al Canvas recortado superiormente
    const canvasW = windowSize.w;
    const canvasH = fase === 'captura' ? windowSize.h : windowSize.h - 200; // Alto real del visor superior

    const svgRatio = 360 / totalSvgHeight;
    const screenRatio = canvasW / canvasH;
    
    let scaleFactor = 1;
    if (screenRatio < svgRatio) {
        scaleFactor = canvasW / 360; // El ancho es el límite
    } else {
        scaleFactor = canvasH / totalSvgHeight; // El alto es el límite
    }

    const dxScreen = dxSvg * scaleFactor;
    const dyScreen = dySvg * scaleFactor;

    const zoomLevel = 1.8; 
    
    // Compensa para centrar en pantalla completa (ignorando la franja de cruceta).
    const centerYOffset = (windowSize.h - canvasH) / 2;

    setZoomPanStyle({
      transform: `translate(${-dxScreen * zoomLevel}px, ${(-dyScreen * zoomLevel) + centerYOffset}px) scale(${zoomLevel})`
    });

  }, [fase, cursorActivo, cortes, config, windowSize]);

  // --- LÓGICA DE AUTOCOMPLETADO (PRESETS) ---
  const aplicarPreset = (nuevoTipo, nuevaAlineacion) => {
    const key = `${nuevoTipo}_${nuevaAlineacion}`;
    const preset = PRESETS[key];
    
    if (preset) {
      setConfig(prev => ({
        ...prev,
        tipoLlave: nuevoTipo,
        alineacion: nuevaAlineacion,
        ladoEstandarUn: preset.lado || prev.ladoEstandarUn,
        anchoLlave: preset.ancho,
        profundidades: preset.profs,
        distanciasCortes: preset.dists,
        distanciasCortesDer: preset.dists
      }));
      setProfundidadesTexto(preset.profs.join(', '));
      setDistanciasTexto(preset.dists.join(', '));
      setDistanciasDerTexto(preset.dists.join(', '));
    } else {
      setConfig(prev => ({
        ...prev,
        tipoLlave: nuevoTipo,
        alineacion: nuevaAlineacion
      }));
    }
  };

  // --- BLOQUEO DE SCROLL NATIVO ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventNativeScroll = (e) => {
      if (fase === 'alineacion') e.preventDefault();
    };
    canvas.addEventListener('touchmove', preventNativeScroll, { passive: false });
    return () => canvas.removeEventListener('touchmove', preventNativeScroll);
  }, [fase]);

  // --- SISTEMA DE NAVEGACIÓN ---
  const faseRef = useRef(fase);
  const modoAppRef = useRef(modoApp);
  const menuCapturaRef = useRef(mostrarMenuCaptura);

  useEffect(() => {
    faseRef.current = fase;
    modoAppRef.current = modoApp;
    menuCapturaRef.current = mostrarMenuCaptura;
  }, [fase, modoApp, mostrarMenuCaptura]);

  useEffect(() => {
    window.history.pushState({ trampaGestos: true }, '');

    const handlePopState = () => {
      const faseAct = faseRef.current;
      const modoAct = modoAppRef.current;
      const menuAct = menuCapturaRef.current;

      if (modoAct === 'superadmin') {
        window.history.pushState({ trampaGestos: true }, '');
        setModoApp('taller');
        return;
      }

      if (menuAct) {
        window.history.pushState({ trampaGestos: true }, '');
        setMostrarMenuCaptura(false);
        return;
      }

      if (faseAct === 'ajuste') {
        window.history.pushState({ trampaGestos: true }, '');
        setFase('alineacion');
      } else if (faseAct === 'alineacion') {
        window.history.pushState({ trampaGestos: true }, '');
        setFase('captura');
        setImagenUrl(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const avanzarA = (nuevaFase) => {
    if (nuevaFase === 'alineacion') setHaInteractuado(false);
    setFase(nuevaFase);
  };

  const retrocederConBoton = () => window.history.back(); 

  const alternarBloqueoVista = () => {
    if (fase === 'alineacion') {
      setDesbloqueadoUnaVez(true);
      avanzarA('ajuste');
      return;
    }
    if (fase === 'ajuste') {
      avanzarA('alineacion');
    }
  };

  const construirBitting = () => {
    const isDosEjes = config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior';
    const nivelEn = (index, lado) => {
      const corte = cortes[index] || { izq: 0, der: 0 };
      const rawIndex = corte[lado] || 0;
      const profIndex = Math.max(0, Math.min(rawIndex, config.profundidades.length - 1));
      return String(profIndex + 1);
    };

    if (isDosEjes) {
      const ejeA = Array.from({ length: config.distanciasCortes.length }, (_, i) => nivelEn(i, 'izq')).join('');
      const ejeB = Array.from({ length: config.distanciasCortesDer.length }, (_, i) => nivelEn(i, 'der')).join('');
      return `bitting:\n\neje a: ${ejeA}\neje b: ${ejeB}`;
    }

    const ladoUnico = config.tipoLlave === 'estandar_un' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral'
      ? config.ladoEstandarUn
      : 'izq';
    const secuencia = Array.from({ length: config.distanciasCortes.length }, (_, i) => nivelEn(i, ladoUnico)).join('');
    return `bitting:\n${secuencia}`;
  };

  const confirmarFinal = () => {
    setBittingModal(construirBitting());
  };

  const handleCargaImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagenUrl(url);
      setHaInteractuado(false);
      avanzarA('alineacion');
      setMostrarMenuCaptura(false); 
      setImgTransform({ x: 0, y: 0, scale: 1, rotate: 0 });
    }
  };

  // --- MATEMÁTICAS GESTOS (Anclaje Central) ---
  const getDistance = (touches) => Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
  const getAngle = (touches) => Math.atan2(touches[1].clientY - touches[0].clientY, touches[1].clientX - touches[0].clientX) * (180 / Math.PI);

  const iniciarGestos = (e) => {
    if (fase !== 'alineacion' || modoApp !== 'taller') return;
    if (e.target?.closest?.('button, input, textarea, select, label')) return;
    if (!haInteractuado) setHaInteractuado(true);

    if (e.touches && e.touches.length >= 2) {
      isDraggingImgRef.current = false;
      activeTouchesRef.current = 2;
      startPinchDistRef.current = getDistance(e.touches);
      startPinchAngleRef.current = getAngle(e.touches);
      setImgTransform(prev => {
        baseTransformRef.current = { scale: prev.scale, rotate: prev.rotate, x: prev.x, y: prev.y };
        return prev;
      });
    } else if (!e.touches || e.touches.length === 1) {
      activeTouchesRef.current = 1;
      isDraggingImgRef.current = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startPosRef.current = { x: clientX, y: clientY };
    }
  };

  const moverGestos = (e) => {
    if (fase !== 'alineacion' || modoApp !== 'taller') return;
    if (e.touches && e.touches.length >= 2 && activeTouchesRef.current === 2) {
      const scaleDiff = getDistance(e.touches) / startPinchDistRef.current;
      const angleDiff = getAngle(e.touches) - startPinchAngleRef.current;
      
      const newScale = Math.max(0.1, baseTransformRef.current.scale * scaleDiff);
      const factor = newScale / baseTransformRef.current.scale;
      
      const rad = angleDiff * (Math.PI / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      const baseX = baseTransformRef.current.x * factor;
      const baseY = baseTransformRef.current.y * factor;
      const newX = baseX * cos - baseY * sin;
      const newY = baseX * sin + baseY * cos;

      setImgTransform(prev => ({ 
        ...prev, scale: newScale, rotate: baseTransformRef.current.rotate + angleDiff, x: newX, y: newY
      }));
    } else if (isDraggingImgRef.current && (activeTouchesRef.current === 1 || !e.touches)) {
      if (e.touches && e.touches.length === 0) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - startPosRef.current.x;
      const deltaY = clientY - startPosRef.current.y;
      setImgTransform(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      startPosRef.current = { x: clientX, y: clientY };
    }
  };

  const finalizarGestos = (e) => {
    if (e.touches && e.touches.length > 0) {
      activeTouchesRef.current = e.touches.length;
      isDraggingImgRef.current = true;
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      isDraggingImgRef.current = false;
      activeTouchesRef.current = 0;
    }
  };

  // --- CONTROLES Y LÓGICA DE LECTURA ---
  const moverDpad = (tipo, valor) => {
    if (!haInteractuado) setHaInteractuado(true);
    setImgTransform(prev => {
      const nuevo = { ...prev };
      if (tipo === 'x') nuevo.x += valor;
      if (tipo === 'y') nuevo.y += valor;
      return nuevo;
    });
  };

  const handleZoomDelta = (deltaY) => {
    if (!haInteractuado) setHaInteractuado(true);
    setImgTransform(prev => {
      const newScale = Math.max(0.1, prev.scale + (deltaY * 0.0008));
      const factor = newScale / prev.scale;
      return { ...prev, scale: newScale, x: prev.x * factor, y: prev.y * factor };
    });
  };
  
  const handleRotateDelta = (deltaY) => {
    if (!haInteractuado) setHaInteractuado(true);
    setImgTransform(prev => {
      const deltaTheta = (deltaY * 0.03);
      const rad = deltaTheta * (Math.PI / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return { 
        ...prev, rotate: prev.rotate + deltaTheta,
        x: prev.x * cos - prev.y * sin, y: prev.x * sin + prev.y * cos
      };
    });
  };

  const getMaxIndex = (lado) => {
    const isDosEjes = config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior';
    if (lado === 'izq' || !isDosEjes) return config.distanciasCortes.length - 1;
    return config.distanciasCortesDer.length - 1;
  };

  const moverCursor = (cambio) => {
    setCursorActivo(prev => {
      let nuevoIndex = prev.corteIndex + cambio;
      const maxIdx = getMaxIndex(prev.lado);
      if (nuevoIndex < 0) nuevoIndex = 0;
      if (nuevoIndex > maxIdx) nuevoIndex = maxIdx;
      return { ...prev, corteIndex: nuevoIndex };
    });
  };

  const alternarLado = () => {
    setCursorActivo(prev => {
      const nuevoLado = prev.lado === 'izq' ? 'der' : 'izq';
      const maxIdx = getMaxIndex(nuevoLado);
      
      if (config.tipoLlave === 'estandar_un' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral') {
        setConfig(c => ({...c, ladoEstandarUn: nuevoLado}));
      }
      
      return { lado: nuevoLado, corteIndex: Math.min(prev.corteIndex, maxIdx) };
    });
  };

  const ajustarProfundidad = (direccionVisual) => {
    setCortes(prev => {
      const nuevos = [...prev];
      const { corteIndex, lado } = cursorActivo;
      
      if (!nuevos[corteIndex]) nuevos[corteIndex] = { izq: 0, der: 0 };
      const corteActualizado = { ...nuevos[corteIndex] };
      const currentIndex = corteActualizado[lado];
      
      const isInterior = config.tipoLlave === 'dos_ejes_interior' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral';
      
      const getX = (idx) => {
         if (idx < 0 || idx >= config.profundidades.length) return null;
         const prof = config.profundidades[idx];
         const distCentro = isInterior 
           ? ((config.anchoLlave / 2) - prof) 
           : (prof - (config.anchoLlave / 2));
         return lado === 'izq' ? -distCentro : distCentro;
      };

      const xCurrent = getX(currentIndex);
      const xNext = getX(currentIndex + 1);
      const xPrev = getX(currentIndex - 1);

      let nuevoIndex = currentIndex;

      if (direccionVisual === 'der') {
         if (xNext !== null && xNext > xCurrent) nuevoIndex = currentIndex + 1;
         else if (xPrev !== null && xPrev > xCurrent) nuevoIndex = currentIndex - 1;
      } 
      else if (direccionVisual === 'izq') {
         if (xNext !== null && xNext < xCurrent) nuevoIndex = currentIndex + 1;
         else if (xPrev !== null && xPrev < xCurrent) nuevoIndex = currentIndex - 1;
      }
      
      corteActualizado[lado] = nuevoIndex;
      
      if (config.tipoLlave === 'estandar_doble') {
        const otroLado = lado === 'izq' ? 'der' : 'izq';
        corteActualizado[otroLado] = nuevoIndex;
      }
      
      nuevos[corteIndex] = corteActualizado;
      return nuevos;
    });
  };

  const guardarConfiguracionesTexto = () => {
    const profs = profundidadesTexto.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    const dists = distanciasTexto.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    const distsDer = distanciasDerTexto.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    
    setConfig(prev => ({ 
      ...prev, 
      profundidades: profs.length > 0 ? profs : prev.profundidades,
      distanciasCortes: dists.length > 0 ? dists : prev.distanciasCortes,
      distanciasCortesDer: distsDer.length > 0 ? distsDer : prev.distanciasCortesDer
    }));

    if (profs.length === 0) setProfundidadesTexto(config.profundidades.join(', '));
    if (dists.length === 0) setDistanciasTexto(config.distanciasCortes.join(', '));
    if (distsDer.length === 0) setDistanciasDerTexto(config.distanciasCortesDer.join(', '));
    
    setModoApp('taller');
  };

  // --- SVG GRILLA (COLORES SATURADOS Y LIMPIOS, CERO CONTORNOS) ---
  const renderizarGrilla = () => {
    const width = 360; 
    const isDosEjes = config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior';
    const isInterior = config.tipoLlave === 'dos_ejes_interior' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral';
    const isUnLado = config.tipoLlave === 'estandar_un' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral';
    const sideUnLado = config.ladoEstandarUn;
    
    const maxDistIzq = Math.max(...config.distanciasCortes, 0);
    const maxDistDer = isDosEjes ? Math.max(...config.distanciasCortesDer, 0) : maxDistIzq;
    const maxDist = Math.max(maxDistIzq, maxDistDer);
    
    const gridHeight = maxDist * config.escalaPixelMm;
    const baseMargin = (config.offsetYTope || 60) + 12;
    const downshift = config.alineacion === 'punta' ? 40 : 30;
    const marginTop = baseMargin + downshift;
    const marginBottom = baseMargin - downshift;
    const height = gridHeight + marginTop + marginBottom;
    const centerX = width / 2;

    const refY = config.alineacion === 'punta' ? marginTop : marginTop + gridHeight;
    const lineYTop = marginTop;
    const lineYBottom = marginTop + gridHeight;
    const maxProfDist = (config.anchoLlave / 2) * config.escalaPixelMm;

    const maxCortesLen = isDosEjes 
      ? Math.max(config.distanciasCortes.length, config.distanciasCortesDer.length)
      : config.distanciasCortes.length;

    return (
      <svg 
        width="100%" height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 pointer-events-none z-20"
      >
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* LÍNEA DE REFERENCIA SÚPER RESALTADA */}
        <rect x={centerX - (config.anchoLlave/2 * config.escalaPixelMm) - 40} y={refY - 1.5} width={(config.anchoLlave * config.escalaPixelMm) + 80} height="3" fill="#ff0000" rx="1" />
        
        {/* PASTILLA ANIMADA DE INSTRUCCIÓN */}
        <g style={{ opacity: haInteractuado ? 0 : 1, transition: 'opacity 0.4s ease-out' }}>
            <rect x={centerX - 80} y={refY - 34} width="160" height="20" fill="#ff0000" rx="10" />
            <text x={centerX} y={refY - 20} fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1">
              ALINEAR {config.alineacion.toUpperCase()} AQUÍ
            </text>
        </g>

        {/* GUÍAS DE ANCHO TOTAL */}
        <line x1={centerX - (config.anchoLlave/2 * config.escalaPixelMm)} y1={lineYTop} x2={centerX - (config.anchoLlave/2 * config.escalaPixelMm)} y2={lineYBottom} stroke="#FF9900" strokeWidth="2" />
        <line x1={centerX + (config.anchoLlave/2 * config.escalaPixelMm)} y1={lineYTop} x2={centerX + (config.anchoLlave/2 * config.escalaPixelMm)} y2={lineYBottom} stroke="#FF9900" strokeWidth="2" />

        {isDosEjes && (
          <>
            <text x={centerX - maxProfDist - 20} y={lineYTop - 18} fill="rgba(245, 158, 11, 0.9)" fontSize="10" fontWeight="900" textAnchor="end" letterSpacing="1">
              EJE A
            </text>
            <text x={centerX + maxProfDist + 20} y={lineYTop - 18} fill="rgba(245, 158, 11, 0.9)" fontSize="10" fontWeight="900" textAnchor="start" letterSpacing="1">
              EJE B
            </text>
          </>
        )}

        {/* GUÍAS DE PROFUNDIDAD (Grosor intermedio de 0.65) */}
        {config.profundidades.map((prof, i) => {
          const distanciaDesdeCentro = isInterior
            ? ((config.anchoLlave / 2) - prof) * config.escalaPixelMm
            : (prof - (config.anchoLlave / 2)) * config.escalaPixelMm;
          const xIzq = centerX - distanciaDesdeCentro;
          const xDer = centerX + distanciaDesdeCentro;
          
          const showGuiaIzq = !isUnLado || sideUnLado === 'izq';
          const showGuiaDer = !isUnLado || sideUnLado === 'der';

          return (
            <g key={`guia-${i}`}>
              {showGuiaIzq && (
                <>
                  <line x1={xIzq} y1={lineYTop} x2={xIzq} y2={lineYBottom} stroke="rgba(0, 229, 255, 0.45)" strokeWidth="0.65" />
                  <text x={xIzq} y={lineYTop - 8} fill="rgba(0, 229, 255, 0.7)" fontSize="9" textAnchor="middle">{i + 1}</text>
                </>
              )}
              {showGuiaDer && (
                <>
                  <line x1={xDer} y1={lineYTop} x2={xDer} y2={lineYBottom} stroke="rgba(0, 229, 255, 0.45)" strokeWidth="0.65" />
                  <text x={xDer} y={lineYTop - 8} fill="rgba(0, 229, 255, 0.7)" fontSize="9" textAnchor="middle">{i + 1}</text>
                </>
              )}
            </g>
          );
        })}

        {/* PUNTOS DE CORTE */}
        {Array.from({ length: maxCortesLen }).map((_, i) => {
          
          let hasIzq = i < config.distanciasCortes.length;
          let hasDer = isDosEjes ? i < config.distanciasCortesDer.length : hasIzq;

          if (isUnLado) {
            hasIzq = sideUnLado === 'izq' && i < config.distanciasCortes.length;
            hasDer = sideUnLado === 'der' && i < config.distanciasCortes.length;
          }

          const distIzqMm = hasIzq ? config.distanciasCortes[i] : 0;
          const distDerMm = hasDer ? (isDosEjes ? config.distanciasCortesDer[i] : config.distanciasCortes[i]) : 0;

          const cutYIzq = config.alineacion === 'punta' ? refY + (distIzqMm * config.escalaPixelMm) : refY - (distIzqMm * config.escalaPixelMm);
          const cutYDer = config.alineacion === 'punta' ? refY + (distDerMm * config.escalaPixelMm) : refY - (distDerMm * config.escalaPixelMm);
          
          const isRowActiveIzq = fase === 'ajuste' && cursorActivo.corteIndex === i && cursorActivo.lado === 'izq';
          const isRowActiveDer = fase === 'ajuste' && cursorActivo.corteIndex === i && cursorActivo.lado === 'der';
          
          const corte = cortes[i] || { izq: 0, der: 0 };
          const profIzqIndex = Math.min(corte.izq, config.profundidades.length - 1);
          const profDerIndex = Math.min(corte.der, config.profundidades.length - 1);

          const distCentroIzq = isInterior
            ? ((config.anchoLlave / 2) - config.profundidades[profIzqIndex]) * config.escalaPixelMm
            : (config.profundidades[profIzqIndex] - (config.anchoLlave / 2)) * config.escalaPixelMm;
          const distCentroDer = isInterior
            ? ((config.anchoLlave / 2) - config.profundidades[profDerIndex]) * config.escalaPixelMm
            : (config.profundidades[profDerIndex] - (config.anchoLlave / 2)) * config.escalaPixelMm;

          const xPuntoIzq = centerX - distCentroIzq;
          const xPuntoDer = centerX + distCentroDer;

          // Hacemos que la línea horizontal empiece desde el extremo opuesto para cubrir TODO el ancho de la llave.
          const startX_Izq = centerX + maxProfDist;
          const startX_Der = centerX - maxProfDist;

          return (
            <g key={`corte-${i}`}>
              {/* LADO IZQUIERDO */}
              {hasIzq && (
                <>
                  <line x1={startX_Izq} y1={cutYIzq} x2={centerX - maxProfDist - 15} y2={cutYIzq} stroke={isRowActiveIzq ? "#39FF14" : "rgba(0, 229, 255, 0.4)"} strokeWidth={isRowActiveIzq ? "2" : "1"} />
                  <text x={centerX - maxProfDist - 25} y={cutYIzq + 4} fill={isRowActiveIzq ? "#39FF14" : "rgba(0, 229, 255, 0.4)"} fontSize="10" textAnchor="end" fontWeight="bold">{i + 1}</text>
                  {fase !== 'captura' && (
                    <>
                      <circle cx={xPuntoIzq} cy={cutYIzq} r={isRowActiveIzq ? 4 : 2.5} fill={isRowActiveIzq ? "#f59e0b" : "#00E5FF"} filter={isRowActiveIzq ? "url(#neon-glow)" : ""} />
                      {isRowActiveIzq && <circle cx={xPuntoIzq} cy={cutYIzq} r={8} fill="none" stroke="#f59e0b" strokeWidth="1" className="animate-ping" style={{ transformOrigin: `${xPuntoIzq}px ${cutYIzq}px` }} />}
                    </>
                  )}
                </>
              )}

              {/* LADO DERECHO */}
              {hasDer && (
                <>
                  <line x1={startX_Der} y1={cutYDer} x2={centerX + maxProfDist + 15} y2={cutYDer} stroke={isRowActiveDer ? "#39FF14" : "rgba(0, 229, 255, 0.4)"} strokeWidth={isRowActiveDer ? "2" : "1"} />
                  <text x={centerX + maxProfDist + 25} y={cutYDer + 4} fill={isRowActiveDer ? "#39FF14" : "rgba(0, 229, 255, 0.4)"} fontSize="10" textAnchor="start" fontWeight="bold">{i + 1}</text>
                  {fase !== 'captura' && (
                    <>
                      <circle cx={xPuntoDer} cy={cutYDer} r={isRowActiveDer ? 4 : 2.5} fill={isRowActiveDer ? "#f59e0b" : "#00E5FF"} filter={isRowActiveDer ? "url(#neon-glow)" : ""} />
                      {isRowActiveDer && <circle cx={xPuntoDer} cy={cutYDer} r={8} fill="none" stroke="#f59e0b" strokeWidth="1" className="animate-ping" style={{ transformOrigin: `${xPuntoDer}px ${cutYDer}px` }} />}
                    </>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const isConfigUnLado = config.tipoLlave === 'estandar_un' || config.tipoLlave === 'pista_canal' || config.tipoLlave === '1_eje_lateral';

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#020617] text-slate-100 font-sans overflow-hidden select-none touch-none relative">
      
      {/* --- MODO SUPERADMIN --- */}
      {modoApp === 'superadmin' && (
        <div className="absolute inset-0 z-50 bg-[#0f172a] overflow-y-auto pointer-events-auto p-6 pb-24">
          <div className="mt-8 mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-teal-400 uppercase tracking-widest flex items-center gap-3"><Settings2 size={28} /> Configuración</h2>
              <p className="text-slate-400 text-sm mt-1">Parámetros avanzados de máquina.</p>
            </div>
            <button onClick={() => setModoApp('taller')} className="p-3 bg-slate-800 rounded-full text-slate-400 active:scale-90"><X size={24} /></button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50 grid grid-cols-2 gap-4">
              <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 pb-2 mb-1">Propiedades Básicas</div>
              
              <div className={isConfigUnLado ? "col-span-2 sm:col-span-1" : "col-span-1"}>
                <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Tipo de Llave</label>
                <select value={config.tipoLlave} onChange={e => aplicarPreset(e.target.value, config.alineacion)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-teal-500 appearance-none text-xs">
                  <option value="estandar_doble">Estándar Doble Lado</option>
                  <option value="estandar_un">Estándar Un Lado</option>
                  <option value="dos_ejes_exterior">Dos Ejes Exterior</option>
                  <option value="dos_ejes_interior">Dos Ejes Interior</option>
                  <option value="pista_canal">Pista Canal</option>
                  <option value="1_eje_lateral">1 Eje Lateral</option>
                </select>
              </div>

              <div className={isConfigUnLado ? "col-span-2 sm:col-span-1" : "col-span-1"}>
                <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Alineación</label>
                <select 
                  value={config.alineacion} 
                  onChange={e => aplicarPreset(config.tipoLlave, e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-teal-500 appearance-none text-xs"
                >
                  <option value="punta">Punta</option>
                  <option value="hombro">Hombro</option>
                </select>
              </div>

              {isConfigUnLado && (
                <div className="col-span-2">
                  <label className="block text-[10px] text-amber-400 mb-2 uppercase tracking-wider font-bold">Lado Activo de Corte</label>
                  <select value={config.ladoEstandarUn} onChange={e => {
                      setConfig({...config, ladoEstandarUn: e.target.value});
                      setCursorActivo(prev => ({...prev, lado: e.target.value}));
                    }} className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-3 text-amber-100 outline-none focus:border-amber-500 appearance-none text-xs">
                    <option value="izq">Lado Izquierdo</option>
                    <option value="der">Lado Derecho</option>
                  </select>
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Ancho Total de Llave (unidades)</label>
                <input type="number" value={config.anchoLlave} onChange={e => setConfig({...config, anchoLlave: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-teal-500 text-center font-mono" />
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50">
              <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Profundidades</label>
              <input type="text" value={profundidadesTexto} onChange={e => setProfundidadesTexto(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-teal-500 font-mono text-center tracking-widest text-xs" />
            </div>

            {/* Menú Inteligente */}
            {config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior' ? (
              <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50 grid grid-cols-2 gap-3">
                <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Distancias de Cortes</div>
                <div>
                  <label className="block text-[9px] text-slate-500 mb-2 text-center">Eje A (Izquierdo)</label>
                  <textarea value={distanciasTexto} onChange={e => setDistanciasTexto(e.target.value)} rows="3" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-white outline-none focus:border-teal-500 font-mono text-center tracking-widest text-[10px] resize-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 mb-2 text-center">Eje B (Derecho)</label>
                  <textarea value={distanciasDerTexto} onChange={e => setDistanciasDerTexto(e.target.value)} rows="3" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-white outline-none focus:border-teal-500 font-mono text-center tracking-widest text-[10px] resize-none" />
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50">
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Distancias de Cortes a la Referencia</label>
                <textarea value={distanciasTexto} onChange={e => setDistanciasTexto(e.target.value)} rows="3" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-teal-500 font-mono text-center tracking-widest text-xs resize-none" />
              </div>
            )}

            <button onClick={guardarConfiguracionesTexto} className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 py-4 rounded-2xl font-black tracking-widest uppercase flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.3)] mt-6">
              <Check size={20} /> Guardar Parámetros
            </button>
          </div>
        </div>
      )}

      {/* --- MODO TALLER --- */}
      {modoApp === 'taller' && (
        <>
          {/* ======================= VISOR SUPERIOR (WORKSPACE) ======================= */}
          {/* SE ELIMINARON bg-black Y overflow-hidden SEGÚN DESCUBRIMIENTO DEL USUARIO */}
          <div className={`absolute top-0 left-0 right-0 ${fase === 'captura' ? 'bottom-0' : 'bottom-[200px]'} z-0`}>
              
              {/* LIENZO INTERACTIVO (Arrastrar y Soltar) */}
              <div 
                ref={canvasRef} 
                className="absolute inset-0 cursor-move touch-none"
                onMouseDown={iniciarGestos} onMouseMove={moverGestos} onMouseUp={finalizarGestos} onMouseLeave={finalizarGestos}
                onTouchStart={iniciarGestos} onTouchMove={moverGestos} onTouchEnd={finalizarGestos} onTouchCancel={finalizarGestos}
              >
                
                {/* --- WORKSPACE ESCALABLE (IMAGEN + GRILLA) --- */}
                {/* Este contenedor ejecuta el paneo automático de la cámara */}
                <div 
                  className="absolute inset-0 z-10 pointer-events-none origin-center transition-transform duration-500 ease-out"
                  style={zoomPanStyle}
                >
                    {imagenUrl && (
                      <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                        <img 
                          src={imagenUrl} alt="Llave" 
                          className="pointer-events-none"
                          style={{
                            transform: `translate(${imgTransform.x}px, ${imgTransform.y}px) scale(${imgTransform.scale}) rotate(${imgTransform.rotate}deg)`,
                            transition: activeTouchesRef.current > 0 ? 'none' : 'transform 0.1s ease-out',
                            opacity: fase === 'ajuste' ? 0.6 : 1 
                          }}
                          draggable="false"
                        />
                      </div>
                    )}
                    
                    {fase !== 'captura' && renderizarGrilla()}
                </div>
              </div>

              {/* --- CAPA SEGURA DE INTERFAZ DENTRO DEL VISOR --- */}
              <div className="absolute inset-0 pointer-events-none z-20">
                
                {/* Botones Flotantes Superiores */}
                {fase !== 'ajuste' && (
                  <button onClick={() => setModoApp('superadmin')} className="absolute top-4 right-4 z-40 p-3 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full shadow-lg text-slate-400 hover:text-white active:scale-95 pointer-events-auto">
                    <ShieldAlert size={20} />
                  </button>
                )}

                {(fase === 'alineacion' || fase === 'ajuste') && (
                  <button onClick={retrocederConBoton} className="absolute top-4 left-4 z-40 p-3 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full shadow-lg text-slate-300 hover:text-white active:scale-95 pointer-events-auto">
                    <ArrowLeft size={20} />
                  </button>
                )}

                {/* PANELES LATERALES ANCLADOS (ahora se centran en relación al Visor, no a toda la pantalla) */}
                
                {/* FASE 2: Drags a altura de cruceta, FABs al centro derecho */}
                {fase === 'alineacion' && (
                  <>
                    <div className="absolute left-3 sm:left-5 top-[calc(100%+100px)] -translate-y-1/2 z-[70] flex flex-col gap-4 pointer-events-none items-center">
                      <ControlDeslizanteVertical etiqueta="Zoom" icono={ZoomIn} onChangeDelta={handleZoomDelta} />
                    </div>

                    <div className="absolute right-3 sm:right-5 top-[calc(100%+100px)] -translate-y-1/2 z-[70] flex flex-col gap-4 pointer-events-none items-center">
                      <ControlDeslizanteVertical etiqueta="Rotar" icono={RotateCcw} onChangeDelta={handleRotateDelta} />
                    </div>

                    <div className="absolute right-3 sm:right-5 top-[60%] -translate-y-1/2 flex flex-col gap-3 pointer-events-none items-center">
                      <button onClick={alternarBloqueoVista} className="w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-amber-500 rounded-[1.25rem] shadow-[0_4px_15px_rgba(245,158,11,0.4)] flex justify-center items-center active:scale-90 transition-transform pointer-events-auto shrink-0">
                        <Lock size={26} strokeWidth={2.8} className="text-slate-900" />
                      </button>
                      {desbloqueadoUnaVez && (
                        <button onClick={confirmarFinal} className="w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-teal-500 rounded-[1.25rem] shadow-[0_4px_15px_rgba(20,184,166,0.4)] flex justify-center items-center active:scale-90 transition-transform pointer-events-auto shrink-0">
                          <Check size={28} strokeWidth={3} className="text-slate-900" />
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* FASE 3: Info en altura de cruceta (uno por lado), FABs al centro derecho */}
                {fase === 'ajuste' && (
                  <>
                    <div className="absolute left-3 sm:left-5 top-[calc(100%+100px)] -translate-y-1/2 z-[70] flex flex-col gap-4 pointer-events-none items-center">
                      <div className="flex flex-col items-center justify-center w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-slate-800/90 backdrop-blur-md rounded-[1.25rem] border border-slate-700/50 shadow-xl pointer-events-auto">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Corte</span>
                        <span className="text-xl font-black text-white leading-none">{cursorActivo.corteIndex + 1}</span>
                      </div>
                    </div>

                    <div className="absolute right-3 sm:right-5 top-[calc(100%+100px)] -translate-y-1/2 z-[70] flex flex-col gap-4 pointer-events-none items-center">
                      <div className="flex flex-col items-center justify-center w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-slate-800/90 backdrop-blur-md rounded-[1.25rem] border border-slate-700/50 shadow-xl pointer-events-auto">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Nivel</span>
                        <span className="text-xl font-black text-amber-400 leading-none">{(cortes[cursorActivo.corteIndex]?.[cursorActivo.lado] || 0) + 1}</span>
                      </div>
                    </div>

                    <div className="absolute right-3 sm:right-5 top-[60%] -translate-y-1/2 flex flex-col gap-3 pointer-events-none items-center">
                      {(config.tipoLlave === 'dos_ejes_exterior' || config.tipoLlave === 'dos_ejes_interior' || config.tipoLlave === 'estandar_doble') && (
                        <button onClick={alternarLado} className="relative w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-amber-500 rounded-[1.25rem] shadow-[0_4px_15px_rgba(245,158,11,0.4)] flex justify-center items-center active:scale-90 transition-transform pointer-events-auto shrink-0">
                          <ArrowLeftRight size={18} className="text-slate-900" />
                          <span className="absolute bottom-1 text-[8px] font-black tracking-widest text-slate-900 uppercase">
                            {cursorActivo.lado === 'izq' ? 'IZQ' : 'DER'}
                          </span>
                        </button>
                      )}

                      <button onClick={alternarBloqueoVista} className="w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-amber-500 rounded-[1.25rem] shadow-[0_4px_15px_rgba(245,158,11,0.4)] flex justify-center items-center active:scale-90 transition-transform pointer-events-auto shrink-0">
                        <LockOpen size={26} strokeWidth={2.8} className="text-slate-900" />
                      </button>

                      {desbloqueadoUnaVez && (
                        <button onClick={confirmarFinal} className="w-[54px] sm:w-[60px] h-[54px] sm:h-[60px] bg-teal-500 rounded-[1.25rem] shadow-[0_4px_15px_rgba(20,184,166,0.4)] flex justify-center items-center active:scale-90 transition-transform pointer-events-auto shrink-0">
                          <Check size={28} strokeWidth={3} className="text-slate-900" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
          </div>

          {/* ======================= TABLERO INFERIOR (ZONA DE CONTROLES EXCLUSIVA) ======================= */}
          {fase !== 'captura' && (
            <div
              className="absolute bottom-0 left-0 w-full h-[200px] z-50 pointer-events-none flex items-center justify-center"
            >
                
              {/* CRUCETA CENTRADA - SIN FONDO EN LA FILA */}
              {fase === 'alineacion' && (
                <div className="grid grid-cols-3 gap-2 w-[160px] h-[160px] pointer-events-none">
                  <div /><button onClick={() => moverDpad('y', -1)} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-teal-500 transition-colors shadow-lg border border-slate-700/50"><ChevronUp size={28}/></button><div />
                  <button onClick={() => moverDpad('x', -1)} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-teal-500 transition-colors shadow-lg border border-slate-700/50"><ChevronLeft size={28}/></button>
                  <div className="pointer-events-auto flex items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-inner"><Crosshair size={22} className="text-slate-400"/></div>
                  <button onClick={() => moverDpad('x', 1)} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-teal-500 transition-colors shadow-lg border border-slate-700/50"><ChevronRight size={28}/></button>
                  <div /><button onClick={() => moverDpad('y', 1)} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-teal-500 transition-colors shadow-lg border border-slate-700/50"><ChevronDown size={28}/></button><div />
                </div>
              )}

              {fase === 'ajuste' && (
                <div className="grid grid-cols-3 gap-2 w-[160px] h-[160px] pointer-events-none">
                  <div /><button onClick={() => moverCursor(1)} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-teal-500 transition-colors shadow-lg border border-slate-700/50"><ChevronUp size={28}/></button><div />
                  <button onClick={() => ajustarProfundidad('izq')} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-amber-500 transition-colors shadow-lg border border-slate-700/50"><ChevronLeft size={28}/></button>
                  <div className="pointer-events-auto flex items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-inner"><Crosshair size={22} className="text-slate-400"/></div>
                  <button onClick={() => ajustarProfundidad('der')} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-amber-500 transition-colors shadow-lg border border-slate-700/50"><ChevronRight size={28}/></button>
                  <div /><button onClick={() => moverCursor(-1)} className="pointer-events-auto flex items-center justify-center bg-slate-800/90 backdrop-blur-md rounded-2xl text-white active:bg-teal-500 transition-colors shadow-lg border border-slate-700/50"><ChevronDown size={28}/></button><div />
                </div>
              )}

            </div>
          )}

          {/* ======================= PANTALLA DE CAPTURA INICIAL ======================= */}
          {fase === 'captura' && (
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-auto">
                <button onClick={() => setMostrarMenuCaptura(true)} className="flex flex-col items-center justify-center w-52 h-52 bg-slate-900/80 border border-slate-700/50 rounded-[2rem] cursor-pointer active:scale-95 transition-all shadow-2xl">
                  <div className="flex gap-3 mb-3 text-teal-400"><Camera size={32} /><ImageIcon size={32} /></div>
                  <span className="font-black tracking-widest text-white uppercase text-base mb-1 text-center">Cargar<br/>Imagen</span>
                </button>

                {mostrarMenuCaptura && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-6">
                    <div className="bg-slate-900 border border-slate-700 p-5 rounded-3xl flex flex-col gap-3 w-full max-w-xs shadow-2xl">
                      <h3 className="text-center text-slate-400 font-bold uppercase tracking-widest mb-1 text-[10px]">Origen de imagen</h3>
                      <label className="flex items-center justify-center gap-3 bg-teal-600 text-white p-3.5 rounded-2xl cursor-pointer active:scale-95 transition-transform"><Camera size={18} /><span className="font-bold tracking-wider text-sm">Tomar Foto</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCargaImagen} /></label>
                      <label className="flex items-center justify-center gap-3 bg-slate-800 border border-slate-600 text-slate-200 p-3.5 rounded-2xl cursor-pointer active:scale-95 transition-transform"><ImageIcon size={18} /><span className="font-bold tracking-wider text-sm">Abrir Galería</span><input type="file" accept="image/*" className="hidden" onChange={handleCargaImagen} /></label>
                      <button onClick={() => setMostrarMenuCaptura(false)} className="mt-1 text-slate-500 font-bold text-xs tracking-widest uppercase py-2">Cancelar</button>
                    </div>
                  </div>
                )}
             </div>
          )}
        </>
      )}

      {bittingModal && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl flex flex-col gap-4 w-full max-w-xs shadow-2xl">
            <h3 className="text-center text-teal-400 font-black uppercase tracking-widest text-sm">Resultado</h3>
            <pre className="bg-slate-800 rounded-xl p-4 text-amber-400 font-mono text-sm tracking-widest text-center whitespace-pre-wrap">{bittingModal}</pre>
            <button
              onClick={() => navigator.clipboard?.writeText(bittingModal)}
              className="flex items-center justify-center gap-2 bg-teal-500 text-slate-900 py-3 rounded-2xl font-black tracking-widest uppercase"
            >
              <Check size={18} /> Copiar
            </button>
            <button onClick={() => setBittingModal(null)} className="text-slate-500 font-bold text-xs tracking-widest uppercase py-2 text-center">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;