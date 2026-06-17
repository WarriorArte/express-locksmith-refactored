/**
  *  KeyPhotoDecoder
  *  ============================================================
  *  Decodificador  de  llaves  por  foto  (cámara  o  galería).
  *  Esta  es  una  adaptación  del  monolito  original  (temp/decfoto.jsx)  preservando
  *  INTACTAS  todas  las  matemáticas,  posiciones  y  lógica  de  cámara/zoom/pan.
  *  Lo  único  modificado  son  los  colores  →  tokens  del  design  system.
  *
  *  Modo  SuperAdmin  (modoApp='superadmin')  eliminado:  ahora  la  configuración  se
  *  recibe  como  prop  `initialConfig`  y  se  aplica  desde  el  editor  de  la  serie.
  */
import  {  useState,  useRef,  useEffect,  useMemo  }  from"react";
import  {
  Camera,  Image  as  ImageIcon,  RotateCcw,  ZoomIn,
  ChevronUp,  ChevronDown,  ChevronLeft,  ChevronRight,  Check,
  ArrowLeftRight,  Crosshair,  X,  ArrowLeft,  ArrowRight,  ArrowUpDown
}  from"lucide-react";
import  {  m  as  motion,  AnimatePresence  }  from"framer-motion";
import  type  {  LucideIcon  }  from"lucide-react";
import  type  {  DecoderConfig,  BittingConfig  }  from"@/types";

//  ---  COMPONENTE:  DESLIZADOR  VERTICAL  (intacto,  sólo  colores)  ---
const  ControlDeslizanteVertical  =  ({
  onChangeDelta,
  icono:  Icono,
}:  {
  onChangeDelta:  (delta:  number)  =>  void;
  icono:  LucideIcon;
})  =>  {
  const  lastY  =  useRef<number  |  null>(null);

  const  handleStart  =  (e:  React.MouseEvent  |  React.TouchEvent)  =>  {
  e.stopPropagation();
  lastY.current  ="touches"  in  e  ?  e.touches[0].clientY  :  e.clientY;
  };
  const  handleMove  =  (e:  React.MouseEvent  |  React.TouchEvent)  =>  {
  e.stopPropagation();
  if  (lastY.current  ===  null)  return;
  const  currentY  ="touches"  in  e  ?  e.touches[0].clientY  :  (e  as  React.MouseEvent).clientY;
  const  delta  =  lastY.current  -  currentY;
  onChangeDelta(delta);
  lastY.current  =  currentY;
  };
  const  handleEnd  =  (e:  React.MouseEvent  |  React.TouchEvent)  =>  {
  e.stopPropagation();
  lastY.current  =  null;
  };

  return  (
  <div
  className="flex  flex-col  items-center  w-[54px]  sm:w-[60px]  bg-foreground/90  backdrop-blur-md  p-1.5  sm:p-2  rounded-[1.25rem]  touch-none  select-none  cursor-ns-resize  border  border-slate-700/60  shadow-xl  h-[150px]  sm:h-[180px]  pointer-events-auto"
  onMouseDown={handleStart}  onMouseMove={handleMove}  onMouseUp={handleEnd}  onMouseLeave={handleEnd}
  onTouchStart={handleStart}  onTouchMove={handleMove}  onTouchEnd={handleEnd}  onTouchCancel={handleEnd}
  >
  <div  className="flex  flex-col  items-center  gap-1  text-[9px]  sm:text-[10px]  text-muted-foreground  font-bold  uppercase  tracking-wider  mb-2  shrink-0">
  <Icono  size={16}  className="text-primary"  />
  </div>
  <div  className="w-full  flex-1  bg-slate-900  rounded-lg  relative  overflow-hidden  flex  items-center  justify-center  shadow-inner  ring-1  ring-slate-700/50">
  <div
  className="absolute  inset-0  opacity-25"
  style={{
  backgroundImage:  'linear-gradient(180deg,  transparent  45%,  rgba(255,255,255,0.6)  50%,  transparent  55%)',
  backgroundSize:  '100%  14px',
  }}
  />
  <ArrowUpDown  size={14}  className="text-amber-400  opacity-95  relative  z-10"  />
  </div>
  </div>
  );
};

interface  KeyPhotoDecoderProps  {
  initialConfig:  DecoderConfig;
  bittingConfig:  BittingConfig;
  onClose:  ()  =>  void;
  onConfirm:  (bitting:  string[])  =>  void;
}

interface  CorteState  {  izq:  number;  der:  number;  }

export  function  KeyPhotoDecoder({  initialConfig,  bittingConfig,  onClose,  onConfirm  }:  KeyPhotoDecoderProps)  {
  const  [fase,  setFase]  =  useState<'captura'  |  'alineacion'  |  'ajuste'>('captura');
  const  [mostrarMenuCaptura,  setMostrarMenuCaptura]  =  useState(true);
  const  [imagenUrl,  setImagenUrl]  =  useState<string  |  null>(null);
  const  [haInteractuado,  setHaInteractuado]  =  useState(false);
  const  [desbloqueadoUnaVez,  setDesbloqueadoUnaVez]  =  useState(false);

  //  Configuración  paramétrica  (recibida  desde  la  serie,  solo  lectura  aquí)
  const  config  =  initialConfig;

  const  [imgTransform,  setImgTransform]  =  useState({  x:  0,  y:  0,  scale:  1,  rotate:  0  });

  const  [windowSize,  setWindowSize]  =  useState({
  w:  typeof  window  !==  'undefined'  ?  window.innerWidth  :  390,
  h:  typeof  window  !==  'undefined'  ?  window.innerHeight  :  844,
  });
  const  [zoomPanStyle,  setZoomPanStyle]  =  useState<React.CSSProperties>({  transform:  'translate(0px,  0px)  scale(1)'  });

  const  canvasRef  =  useRef<HTMLDivElement>(null);
  const  isDraggingImgRef  =  useRef(false);
  const  activeTouchesRef  =  useRef(0);
  const  startPosRef  =  useRef({  x:  0,  y:  0  });
  const  startPinchDistRef  =  useRef(0);
  const  startPinchAngleRef  =  useRef(0);
  const  baseTransformRef  =  useRef({  scale:  1,  rotate:  0,  x:  0,  y:  0  });

  //  Inicializar  cortes  según  la  longitud  del  decoder
  const  initialCortes  =  useMemo(()  =>  {
  const  isDosEjes  =  config.tipoLlave  ===  'dos_ejes_exterior'  ||  config.tipoLlave  ===  'dos_ejes_interior';
  const  maxLen  =  isDosEjes
  ?  Math.max(config.distanciasCortes.length,  config.distanciasCortesDer.length)
  :  config.distanciasCortes.length;
  return  Array.from({  length:  maxLen  },  ()  =>  ({  izq:  0,  der:  0  }  as  CorteState));
  },  [config.tipoLlave,  config.distanciasCortes.length,  config.distanciasCortesDer.length]);

  const  [cortes,  setCortes]  =  useState<CorteState[]>(initialCortes);

  const  isUnLado  =  config.tipoLlave  ===  'estandar_un'  ||  config.tipoLlave  ===  'pista_canal'  ||  config.tipoLlave  ===  '1_eje_lateral';
  const  initialLado  =  isUnLado  ?  config.ladoEstandarUn  :  'izq';
  const  [cursorActivo,  setCursorActivo]  =  useState<{  corteIndex:  number;  lado:  'izq'  |  'der'  }>({  corteIndex:  0,  lado:  initialLado  });

  //  Listener  para  tamaño  de  ventana  (matemáticas  precisas)
  useEffect(()  =>  {
  const  handleResize  =  ()  =>  setWindowSize({  w:  window.innerWidth,  h:  window.innerHeight  });
  window.addEventListener('resize',  handleResize);
  return  ()  =>  window.removeEventListener('resize',  handleResize);
  },  []);

  //  ---  EL  CEREBRO  DE  LA  CÁMARA  (intacto  del  monolito)  ---
  useEffect(()  =>  {
  if  (fase  !==  'ajuste')  {
  setZoomPanStyle({  transform:  'translate(0px,  0px)  scale(1)'  });
  return;
  }

  const  isDosEjes  =  config.tipoLlave  ===  'dos_ejes_exterior'  ||  config.tipoLlave  ===  'dos_ejes_interior';
  const  isInterior  =  config.tipoLlave  ===  'dos_ejes_interior'  ||  config.tipoLlave  ===  'pista_canal'  ||  config.tipoLlave  ===  '1_eje_lateral';

  const  maxDistIzq  =  Math.max(...config.distanciasCortes,  0);
  const  maxDistDer  =  isDosEjes  ?  Math.max(...config.distanciasCortesDer,  0)  :  maxDistIzq;
  const  maxDist  =  Math.max(maxDistIzq,  maxDistDer);

  const  gridHeight  =  maxDist  *  config.escalaPixelMm;
  const  baseMargin  =  72;
  const  downshift  =  config.alineacion  ===  'punta'  ?  40  :  30;
  const  marginTop  =  baseMargin  +  downshift;
  const  marginBottom  =  baseMargin  -  downshift;
  const  totalSvgHeight  =  gridHeight  +  marginTop  +  marginBottom;

  const  centerX  =  360  /  2;
  const  centerY  =  totalSvgHeight  /  2;

  const  idx  =  cursorActivo.corteIndex;
  const  lado  =  cursorActivo.lado;

  const  corte  =  cortes[idx]  ||  {  izq:  0,  der:  0  };
  const  profIndex  =  Math.min(corte[lado]  ||  0,  config.profundidades.length  -  1);
  const  profVal  =  config.profundidades[profIndex]  ||  0;

  const  distCentro  =  isInterior
  ?  ((config.anchoLlave  /  2)  -  profVal)  *  config.escalaPixelMm
  :  (profVal  -  (config.anchoLlave  /  2))  *  config.escalaPixelMm;
  const  targetX  =  lado  ===  'izq'  ?  centerX  -  distCentro  :  centerX  +  distCentro;

  const  distMm  =  lado  ===  'izq'
  ?  (config.distanciasCortes[idx]  ||  0)
  :  (isDosEjes  ?  (config.distanciasCortesDer[idx]  ||  0)  :  (config.distanciasCortes[idx]  ||  0));
  const  refY  =  config.alineacion  ===  'punta'  ?  marginTop  :  marginTop  +  gridHeight;
  const  targetY  =  config.alineacion  ===  'punta'  ?  refY  +  (distMm  *  config.escalaPixelMm)  :  refY  -  (distMm  *  config.escalaPixelMm);

  const  dxSvg  =  targetX  -  centerX;
  const  dySvg  =  targetY  -  centerY;

  const  canvasW  =  windowSize.w;
  const  canvasH  =  windowSize.h  -  200;

  const  svgRatio  =  360  /  totalSvgHeight;
  const  screenRatio  =  canvasW  /  canvasH;

  let  scaleFactor  =  1;
  if  (screenRatio  <  svgRatio)  scaleFactor  =  canvasW  /  360;
  else  scaleFactor  =  canvasH  /  totalSvgHeight;

  const  dxScreen  =  dxSvg  *  scaleFactor;
  const  dyScreen  =  dySvg  *  scaleFactor;

  const  zoomLevel  =  1.8;
  const  centerYOffset  =  (windowSize.h  -  canvasH)  /  2;

  setZoomPanStyle({
  transform:  `translate(${-dxScreen  *  zoomLevel}px,  ${(-dyScreen  *  zoomLevel)  +  centerYOffset}px)  scale(${zoomLevel})`,
  });
  },  [fase,  cursorActivo,  cortes,  config,  windowSize]);

  //  Bloqueo  de  scroll  nativo  durante  alineación
  useEffect(()  =>  {
  const  canvas  =  canvasRef.current;
  if  (!canvas)  return;
  const  preventNativeScroll  =  (e:  TouchEvent)  =>  {
  if  (fase  ===  'alineacion')  e.preventDefault();
  };
  canvas.addEventListener('touchmove',  preventNativeScroll,  {  passive:  false  });
  return  ()  =>  canvas.removeEventListener('touchmove',  preventNativeScroll);
  },  [fase]);

  const  avanzarA  =  (nuevaFase:  typeof  fase)  =>  {
  if  (nuevaFase  ===  'alineacion')  setHaInteractuado(false);
  setFase(nuevaFase);
  };

  const  retrocederConBoton  =  ()  =>  {
  if  (fase  ===  'ajuste')  {  avanzarA('alineacion');  return;  }
  if  (fase  ===  'alineacion')  {  onClose();  return;  }
  onClose();
  };

  const  alternarBloqueoVista  =  ()  =>  {
  if  (fase  ===  'alineacion')  {
  setDesbloqueadoUnaVez(true);
  avanzarA('ajuste');
  return;
  }
  if  (fase  ===  'ajuste')  avanzarA('alineacion');
  };

  const  construirBitting  =  ():  string[]  =>  {
  const  isDosEjes  =  config.tipoLlave  ===  'dos_ejes_exterior'  ||  config.tipoLlave  ===  'dos_ejes_interior';
  const  nivelEn  =  (index:  number,  lado:  'izq'  |  'der')  =>  {
  const  corte  =  cortes[index]  ||  {  izq:  0,  der:  0  };
  const  rawIndex  =  corte[lado]  ||  0;
  const  profIndex  =  Math.max(0,  Math.min(rawIndex,  config.profundidades.length  -  1));
  return  String(profIndex  +  1);
  };

  if  (isDosEjes)  {
  const  ejeA  =  Array.from({  length:  config.distanciasCortes.length  },  (_,  i)  =>  nivelEn(i,  'izq'));
  const  ejeB  =  Array.from({  length:  config.distanciasCortesDer.length  },  (_,  i)  =>  nivelEn(i,  'der'));
  return  [...ejeA,  ...ejeB];
  }

  const  ladoUnico  =  isUnLado  ?  config.ladoEstandarUn  :  'izq';
  return  Array.from({  length:  config.distanciasCortes.length  },  (_,  i)  =>  nivelEn(i,  ladoUnico));
  };

  const  confirmarFinal  =  ()  =>  {
  onConfirm(construirBitting());
  };

  const  handleCargaImagen  =  (e:  React.ChangeEvent<HTMLInputElement>)  =>  {
  const  file  =  e.target.files?.[0];
  if  (file)  {
  const  url  =  URL.createObjectURL(file);
  setImagenUrl(url);
  setHaInteractuado(false);
  avanzarA('alineacion');
  setMostrarMenuCaptura(false);
  setImgTransform({  x:  0,  y:  0,  scale:  1,  rotate:  0  });
  }
  };

  //  ---  MATEMÁTICAS  GESTOS  (intacto)  ---
  const  getDistance  =  (touches:  React.TouchList)  =>  Math.hypot(touches[1].clientX  -  touches[0].clientX,  touches[1].clientY  -  touches[0].clientY);
  const  getAngle  =  (touches:  React.TouchList)  =>  Math.atan2(touches[1].clientY  -  touches[0].clientY,  touches[1].clientX  -  touches[0].clientX)  *  (180  /  Math.PI);

  const  iniciarGestos  =  (e:  React.MouseEvent  |  React.TouchEvent)  =>  {
  if  (fase  !==  'alineacion')  return;
  const  target  =  (e.target  as  HTMLElement  |  null);
  if  (target?.closest?.('button,  input,  textarea,  select,  label'))  return;
  if  (!haInteractuado)  setHaInteractuado(true);

  const  touches  ="touches"  in  e  ?  e.touches  :  null;
  if  (touches  &&  touches.length  >=  2)  {
  isDraggingImgRef.current  =  false;
  activeTouchesRef.current  =  2;
  startPinchDistRef.current  =  getDistance(touches);
  startPinchAngleRef.current  =  getAngle(touches);
  setImgTransform(prev  =>  {
  baseTransformRef.current  =  {  scale:  prev.scale,  rotate:  prev.rotate,  x:  prev.x,  y:  prev.y  };
  return  prev;
  });
  }  else  if  (!touches  ||  touches.length  ===  1)  {
  activeTouchesRef.current  =  1;
  isDraggingImgRef.current  =  true;
  const  clientX  =  touches  ?  touches[0].clientX  :  (e  as  React.MouseEvent).clientX;
  const  clientY  =  touches  ?  touches[0].clientY  :  (e  as  React.MouseEvent).clientY;
  startPosRef.current  =  {  x:  clientX,  y:  clientY  };
  }
  };

  const  moverGestos  =  (e:  React.MouseEvent  |  React.TouchEvent)  =>  {
  if  (fase  !==  'alineacion')  return;
  const  touches  ="touches"  in  e  ?  e.touches  :  null;
  if  (touches  &&  touches.length  >=  2  &&  activeTouchesRef.current  ===  2)  {
  const  scaleDiff  =  getDistance(touches)  /  startPinchDistRef.current;
  const  angleDiff  =  getAngle(touches)  -  startPinchAngleRef.current;

  const  newScale  =  Math.max(0.1,  baseTransformRef.current.scale  *  scaleDiff);
  const  factor  =  newScale  /  baseTransformRef.current.scale;

  const  rad  =  angleDiff  *  (Math.PI  /  180);
  const  cos  =  Math.cos(rad);
  const  sin  =  Math.sin(rad);

  const  baseX  =  baseTransformRef.current.x  *  factor;
  const  baseY  =  baseTransformRef.current.y  *  factor;
  const  newX  =  baseX  *  cos  -  baseY  *  sin;
  const  newY  =  baseX  *  sin  +  baseY  *  cos;

  setImgTransform(prev  =>  ({
  ...prev,  scale:  newScale,  rotate:  baseTransformRef.current.rotate  +  angleDiff,  x:  newX,  y:  newY,
  }));
  }  else  if  (isDraggingImgRef.current  &&  (activeTouchesRef.current  ===  1  ||  !touches))  {
  if  (touches  &&  touches.length  ===  0)  return;
  const  clientX  =  touches  ?  touches[0].clientX  :  (e  as  React.MouseEvent).clientX;
  const  clientY  =  touches  ?  touches[0].clientY  :  (e  as  React.MouseEvent).clientY;
  const  deltaX  =  clientX  -  startPosRef.current.x;
  const  deltaY  =  clientY  -  startPosRef.current.y;
  setImgTransform(prev  =>  ({  ...prev,  x:  prev.x  +  deltaX,  y:  prev.y  +  deltaY  }));
  startPosRef.current  =  {  x:  clientX,  y:  clientY  };
  }
  };

  const  finalizarGestos  =  (e:  React.MouseEvent  |  React.TouchEvent)  =>  {
  const  touches  ="touches"  in  e  ?  e.touches  :  null;
  if  (touches  &&  touches.length  >  0)  {
  activeTouchesRef.current  =  touches.length;
  isDraggingImgRef.current  =  true;
  startPosRef.current  =  {  x:  touches[0].clientX,  y:  touches[0].clientY  };
  }  else  {
  isDraggingImgRef.current  =  false;
  activeTouchesRef.current  =  0;
  }
  };

  //  ---  CONTROLES  ---
  const  moverDpad  =  (tipo:  'x'  |  'y',  valor:  number)  =>  {
  if  (!haInteractuado)  setHaInteractuado(true);
  setImgTransform(prev  =>  {
  const  nuevo  =  {  ...prev  };
  if  (tipo  ===  'x')  nuevo.x  +=  valor;
  if  (tipo  ===  'y')  nuevo.y  +=  valor;
  return  nuevo;
  });
  };

  const  handleZoomDelta  =  (deltaY:  number)  =>  {
  if  (!haInteractuado)  setHaInteractuado(true);
  setImgTransform(prev  =>  {
  const  newScale  =  Math.max(0.1,  prev.scale  +  (deltaY  *  0.0008));
  const  factor  =  newScale  /  prev.scale;
  return  {  ...prev,  scale:  newScale,  x:  prev.x  *  factor,  y:  prev.y  *  factor  };
  });
  };

  const  handleRotateDelta  =  (deltaY:  number)  =>  {
  if  (!haInteractuado)  setHaInteractuado(true);
  setImgTransform(prev  =>  {
  const  deltaTheta  =  (deltaY  *  0.03);
  const  rad  =  deltaTheta  *  (Math.PI  /  180);
  const  cos  =  Math.cos(rad);
  const  sin  =  Math.sin(rad);
  return  {
  ...prev,  rotate:  prev.rotate  +  deltaTheta,
  x:  prev.x  *  cos  -  prev.y  *  sin,  y:  prev.x  *  sin  +  prev.y  *  cos,
  };
  });
  };

  const  getMaxIndex  =  (lado:  'izq'  |  'der')  =>  {
  const  isDosEjes  =  config.tipoLlave  ===  'dos_ejes_exterior'  ||  config.tipoLlave  ===  'dos_ejes_interior';
  if  (lado  ===  'izq'  ||  !isDosEjes)  return  config.distanciasCortes.length  -  1;
  return  config.distanciasCortesDer.length  -  1;
  };

  const  moverCursor  =  (cambio:  number)  =>  {
  setCursorActivo(prev  =>  {
  let  nuevoIndex  =  prev.corteIndex  +  cambio;
  const  maxIdx  =  getMaxIndex(prev.lado);
  if  (nuevoIndex  <  0)  nuevoIndex  =  0;
  if  (nuevoIndex  >  maxIdx)  nuevoIndex  =  maxIdx;
  return  {  ...prev,  corteIndex:  nuevoIndex  };
  });
  };

  const  alternarLado  =  ()  =>  {
  setCursorActivo(prev  =>  {
  const  nuevoLado:  'izq'  |  'der'  =  prev.lado  ===  'izq'  ?  'der'  :  'izq';
  const  maxIdx  =  getMaxIndex(nuevoLado);
  return  {  lado:  nuevoLado,  corteIndex:  Math.min(prev.corteIndex,  maxIdx)  };
  });
  };

  const  ajustarProfundidad  =  (direccionVisual:  'izq'  |  'der')  =>  {
  setCortes(prev  =>  {
  const  nuevos  =  [...prev];
  const  {  corteIndex,  lado  }  =  cursorActivo;
  if  (!nuevos[corteIndex])  nuevos[corteIndex]  =  {  izq:  0,  der:  0  };
  const  corteActualizado  =  {  ...nuevos[corteIndex]  };
  const  currentIndex  =  corteActualizado[lado];

  const  isInterior  =  config.tipoLlave  ===  'dos_ejes_interior'  ||  config.tipoLlave  ===  'pista_canal'  ||  config.tipoLlave  ===  '1_eje_lateral';

  const  getX  =  (idx:  number):  number  |  null  =>  {
  if  (idx  <  0  ||  idx  >=  config.profundidades.length)  return  null;
  const  prof  =  config.profundidades[idx];
  const  distCentro  =  isInterior
  ?  ((config.anchoLlave  /  2)  -  prof)
  :  (prof  -  (config.anchoLlave  /  2));
  return  lado  ===  'izq'  ?  -distCentro  :  distCentro;
  };

  const  xCurrent  =  getX(currentIndex);
  const  xNext  =  getX(currentIndex  +  1);
  const  xPrev  =  getX(currentIndex  -  1);

  let  nuevoIndex  =  currentIndex;
  if  (direccionVisual  ===  'der')  {
  if  (xNext  !==  null  &&  xCurrent  !==  null  &&  xNext  >  xCurrent)  nuevoIndex  =  currentIndex  +  1;
  else  if  (xPrev  !==  null  &&  xCurrent  !==  null  &&  xPrev  >  xCurrent)  nuevoIndex  =  currentIndex  -  1;
  }  else  if  (direccionVisual  ===  'izq')  {
  if  (xNext  !==  null  &&  xCurrent  !==  null  &&  xNext  <  xCurrent)  nuevoIndex  =  currentIndex  +  1;
  else  if  (xPrev  !==  null  &&  xCurrent  !==  null  &&  xPrev  <  xCurrent)  nuevoIndex  =  currentIndex  -  1;
  }

  corteActualizado[lado]  =  nuevoIndex;

  if  (config.tipoLlave  ===  'estandar_doble')  {
  const  otroLado:  'izq'  |  'der'  =  lado  ===  'izq'  ?  'der'  :  'izq';
  corteActualizado[otroLado]  =  nuevoIndex;
  }

  nuevos[corteIndex]  =  corteActualizado;
  return  nuevos;
  });
  };

  //  ---  SVG  GRILLA  (intacto,  sólo  colores  adaptados)  ---
  const  renderizarGrilla  =  ()  =>  {
  const  width  =  360;
  const  isDosEjes  =  config.tipoLlave  ===  'dos_ejes_exterior'  ||  config.tipoLlave  ===  'dos_ejes_interior';
  const  isInterior  =  config.tipoLlave  ===  'dos_ejes_interior'  ||  config.tipoLlave  ===  'pista_canal'  ||  config.tipoLlave  ===  '1_eje_lateral';
  const  isUnLadoLocal  =  config.tipoLlave  ===  'estandar_un'  ||  config.tipoLlave  ===  'pista_canal'  ||  config.tipoLlave  ===  '1_eje_lateral';
  const  sideUnLado  =  config.ladoEstandarUn;

  const  maxDistIzq  =  Math.max(...config.distanciasCortes,  0);
  const  maxDistDer  =  isDosEjes  ?  Math.max(...config.distanciasCortesDer,  0)  :  maxDistIzq;
  const  maxDist  =  Math.max(maxDistIzq,  maxDistDer);

  const  gridHeight  =  maxDist  *  config.escalaPixelMm;
  const  baseMargin  =  72;
  const  downshift  =  config.alineacion  ===  'punta'  ?  40  :  30;
  const  marginTop  =  baseMargin  +  downshift;
  const  marginBottom  =  baseMargin  -  downshift;
  const  height  =  gridHeight  +  marginTop  +  marginBottom;
  const  centerX  =  width  /  2;

  const  refY  =  config.alineacion  ===  'punta'  ?  marginTop  :  marginTop  +  gridHeight;
  const  lineYTop  =  marginTop;
  const  lineYBottom  =  marginTop  +  gridHeight;
  const  maxProfDist  =  (config.anchoLlave  /  2)  *  config.escalaPixelMm;

  const  maxCortesLen  =  isDosEjes
  ?  Math.max(config.distanciasCortes.length,  config.distanciasCortesDer.length)
  :  config.distanciasCortes.length;

  return  (
  <svg
  width="100%"  height="100%"
  viewBox={`0  0  ${width}  ${height}`}
  preserveAspectRatio="xMidYMid  meet"
  className="absolute  inset-0  pointer-events-none  z-20"
  >
  <defs>
  <filter  id="neon-glow-decoder"  x="-20%"  y="-20%"  width="140%"  height="140%">
  <feGaussianBlur  stdDeviation="3"  result="blur"  />
  <feComposite  in="SourceGraphic"  in2="blur"  operator="over"  />
  </filter>
  </defs>

  <rect  x={centerX  -  (config.anchoLlave  /  2  *  config.escalaPixelMm)  -  40}  y={refY  -  1.5}  width={(config.anchoLlave  *  config.escalaPixelMm)  +  80}  height="3"  fill="#ff0000"  rx="1"  />

  <g  style={{  opacity:  haInteractuado  ?  0  :  1,  transition:  'opacity  0.4s  ease-out'  }}>
  <rect  x={centerX  -  80}  y={refY  -  34}  width="160"  height="20"  fill="#ff0000"  rx="10"  />
  <text  x={centerX}  y={refY  -  20}  fill="#ffffff"  fontSize="10"  fontWeight="900"  textAnchor="middle"  letterSpacing="1">
  ALINEAR  {config.alineacion.toUpperCase()}  AQUÍ
  </text>
  </g>

  <line  x1={centerX  -  (config.anchoLlave  /  2  *  config.escalaPixelMm)}  y1={lineYTop}  x2={centerX  -  (config.anchoLlave  /  2  *  config.escalaPixelMm)}  y2={lineYBottom}  stroke="#FF9900"  strokeWidth="2"  />
  <line  x1={centerX  +  (config.anchoLlave  /  2  *  config.escalaPixelMm)}  y1={lineYTop}  x2={centerX  +  (config.anchoLlave  /  2  *  config.escalaPixelMm)}  y2={lineYBottom}  stroke="#FF9900"  strokeWidth="2"  />

  {isDosEjes  &&  (
  <>
  <text  x={centerX  -  maxProfDist  -  20}  y={lineYTop  -  18}  fill="rgba(245,  158,  11,  0.9)"  fontSize="10"  fontWeight="900"  textAnchor="end"  letterSpacing="1">EJE  A</text>
  <text  x={centerX  +  maxProfDist  +  20}  y={lineYTop  -  18}  fill="rgba(245,  158,  11,  0.9)"  fontSize="10"  fontWeight="900"  textAnchor="start"  letterSpacing="1">EJE  B</text>
  </>
  )}

  {config.profundidades.map((prof,  i)  =>  {
  const  distanciaDesdeCentro  =  isInterior
  ?  ((config.anchoLlave  /  2)  -  prof)  *  config.escalaPixelMm
  :  (prof  -  (config.anchoLlave  /  2))  *  config.escalaPixelMm;
  const  xIzq  =  centerX  -  distanciaDesdeCentro;
  const  xDer  =  centerX  +  distanciaDesdeCentro;

  const  showGuiaIzq  =  !isUnLadoLocal  ||  sideUnLado  ===  'izq';
  const  showGuiaDer  =  !isUnLadoLocal  ||  sideUnLado  ===  'der';

  return  (
  <g  key={`guia-${i}`}>
  {showGuiaIzq  &&  (
  <>
  <line  x1={xIzq}  y1={lineYTop}  x2={xIzq}  y2={lineYBottom}  stroke="rgba(0,  229,  255,  0.45)"  strokeWidth="0.65"  />
  <text  x={xIzq}  y={lineYTop  -  8}  fill="rgba(0,  229,  255,  0.7)"  fontSize="9"  textAnchor="middle">{i  +  1}</text>
  </>
  )}
  {showGuiaDer  &&  (
  <>
  <line  x1={xDer}  y1={lineYTop}  x2={xDer}  y2={lineYBottom}  stroke="rgba(0,  229,  255,  0.45)"  strokeWidth="0.65"  />
  <text  x={xDer}  y={lineYTop  -  8}  fill="rgba(0,  229,  255,  0.7)"  fontSize="9"  textAnchor="middle">{i  +  1}</text>
  </>
  )}
  </g>
  );
  })}

  {Array.from({  length:  maxCortesLen  }).map((_,  i)  =>  {
  let  hasIzq  =  i  <  config.distanciasCortes.length;
  let  hasDer  =  isDosEjes  ?  i  <  config.distanciasCortesDer.length  :  hasIzq;

  if  (isUnLadoLocal)  {
  hasIzq  =  sideUnLado  ===  'izq'  &&  i  <  config.distanciasCortes.length;
  hasDer  =  sideUnLado  ===  'der'  &&  i  <  config.distanciasCortes.length;
  }

  const  distIzqMm  =  hasIzq  ?  config.distanciasCortes[i]  :  0;
  const  distDerMm  =  hasDer  ?  (isDosEjes  ?  config.distanciasCortesDer[i]  :  config.distanciasCortes[i])  :  0;

  const  cutYIzq  =  config.alineacion  ===  'punta'  ?  refY  +  (distIzqMm  *  config.escalaPixelMm)  :  refY  -  (distIzqMm  *  config.escalaPixelMm);
  const  cutYDer  =  config.alineacion  ===  'punta'  ?  refY  +  (distDerMm  *  config.escalaPixelMm)  :  refY  -  (distDerMm  *  config.escalaPixelMm);

  const  isRowActiveIzq  =  fase  ===  'ajuste'  &&  cursorActivo.corteIndex  ===  i  &&  cursorActivo.lado  ===  'izq';
  const  isRowActiveDer  =  fase  ===  'ajuste'  &&  cursorActivo.corteIndex  ===  i  &&  cursorActivo.lado  ===  'der';

  const  corte  =  cortes[i]  ||  {  izq:  0,  der:  0  };
  const  profIzqIndex  =  Math.min(corte.izq,  config.profundidades.length  -  1);
  const  profDerIndex  =  Math.min(corte.der,  config.profundidades.length  -  1);

  const  distCentroIzq  =  isInterior
  ?  ((config.anchoLlave  /  2)  -  config.profundidades[profIzqIndex])  *  config.escalaPixelMm
  :  (config.profundidades[profIzqIndex]  -  (config.anchoLlave  /  2))  *  config.escalaPixelMm;
  const  distCentroDer  =  isInterior
  ?  ((config.anchoLlave  /  2)  -  config.profundidades[profDerIndex])  *  config.escalaPixelMm
  :  (config.profundidades[profDerIndex]  -  (config.anchoLlave  /  2))  *  config.escalaPixelMm;

  const  xPuntoIzq  =  centerX  -  distCentroIzq;
  const  xPuntoDer  =  centerX  +  distCentroDer;

  const  startX_Izq  =  centerX  +  maxProfDist;
  const  startX_Der  =  centerX  -  maxProfDist;

  return  (
  <g  key={`corte-${i}`}>
  {hasIzq  &&  (
  <>
  <line  x1={startX_Izq}  y1={cutYIzq}  x2={centerX  -  maxProfDist  -  15}  y2={cutYIzq}  stroke={isRowActiveIzq  ?"#39FF14"  :"rgba(0,  229,  255,  0.4)"}  strokeWidth={isRowActiveIzq  ?"2"  :"1"}  />
  <text  x={centerX  -  maxProfDist  -  25}  y={cutYIzq  +  4}  fill={isRowActiveIzq  ?"#39FF14"  :"rgba(0,  229,  255,  0.4)"}  fontSize="10"  textAnchor="end"  fontWeight="bold">{i  +  1}</text>
  {fase  !==  'captura'  &&  (
  <>
  <circle  cx={xPuntoIzq}  cy={cutYIzq}  r={isRowActiveIzq  ?  4  :  2.5}  fill={isRowActiveIzq  ?"#f59e0b"  :"#00E5FF"}  filter={isRowActiveIzq  ?"url(#neon-glow-decoder)"  :""}  />
  {isRowActiveIzq  &&  <circle  cx={xPuntoIzq}  cy={cutYIzq}  r={8}  fill="none"  stroke="#f59e0b"  strokeWidth="1"  className="animate-ping"  style={{  transformOrigin:  `${xPuntoIzq}px  ${cutYIzq}px`  }}  />}
  </>
  )}
  </>
  )}
  {hasDer  &&  (
  <>
  <line  x1={startX_Der}  y1={cutYDer}  x2={centerX  +  maxProfDist  +  15}  y2={cutYDer}  stroke={isRowActiveDer  ?"#39FF14"  :"rgba(0,  229,  255,  0.4)"}  strokeWidth={isRowActiveDer  ?"2"  :"1"}  />
  <text  x={centerX  +  maxProfDist  +  25}  y={cutYDer  +  4}  fill={isRowActiveDer  ?"#39FF14"  :"rgba(0,  229,  255,  0.4)"}  fontSize="10"  textAnchor="start"  fontWeight="bold">{i  +  1}</text>
  {fase  !==  'captura'  &&  (
  <>
  <circle  cx={xPuntoDer}  cy={cutYDer}  r={isRowActiveDer  ?  4  :  2.5}  fill={isRowActiveDer  ?"#f59e0b"  :"#00E5FF"}  filter={isRowActiveDer  ?"url(#neon-glow-decoder)"  :""}  />
  {isRowActiveDer  &&  <circle  cx={xPuntoDer}  cy={cutYDer}  r={8}  fill="none"  stroke="#f59e0b"  strokeWidth="1"  className="animate-ping"  style={{  transformOrigin:  `${xPuntoDer}px  ${cutYDer}px`  }}  />}
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

  const  showLadoToggle  =  config.tipoLlave  ===  'dos_ejes_exterior'  ||  config.tipoLlave  ===  'dos_ejes_interior'  ||  config.tipoLlave  ===  'estandar_doble';

  //  Fondo  oscuro  tipo"noche"  (estilo  monolito  original)  con  textura  sutil
  const  decoderBgStyle:  React.CSSProperties  =  {
  backgroundColor:  '#0f172a',
  backgroundImage:  `
  radial-gradient(circle  at  25%  30%,  rgba(255,255,255,0.04)  0px,  transparent  1px),
  radial-gradient(circle  at  75%  70%,  rgba(255,255,255,0.03)  0px,  transparent  1px),
  radial-gradient(circle  at  50%  50%,  rgba(255,255,255,0.02)  0px,  transparent  1px),
  linear-gradient(135deg,  #0f172a  0%,  #1e293b  100%)
  `,
  backgroundSize:  '3px  3px,  4px  4px,  5px  5px,  100%  100%',
  };

  return  (
  <motion.div
  initial={{  opacity:  0  }}
  animate={{  opacity:  1  }}
  exit={{  opacity:  0  }}
  style={decoderBgStyle}
  className="fixed  inset-0  z-[200]  flex  flex-col  h-[100dvh]  w-full  text-foreground  font-sans  overflow-hidden  select-none  touch-none"
  >
  {/*  =======================  VISOR  SUPERIOR  =======================  */}
  <div  className={`absolute  top-0  left-0  right-0  ${fase  ===  'captura'  ?  'bottom-0'  :  'bottom-[200px]'}  z-0`}>

  <div
  ref={canvasRef}
  className="absolute  inset-0  cursor-move  touch-none"
  onMouseDown={iniciarGestos}  onMouseMove={moverGestos}  onMouseUp={finalizarGestos}  onMouseLeave={finalizarGestos}
  onTouchStart={iniciarGestos}  onTouchMove={moverGestos}  onTouchEnd={finalizarGestos}  onTouchCancel={finalizarGestos}
  >
  <div
  className="absolute  inset-0  z-10  pointer-events-none  origin-center  transition-transform  duration-500  ease-out"
  style={zoomPanStyle}
  >
  {imagenUrl  &&  (
  <div  className="absolute  inset-0  flex  items-center  justify-center  overflow-visible">
  <img
  src={imagenUrl}  alt="Llave"
  className="pointer-events-none"
  style={{
  transform:  `translate(${imgTransform.x}px,  ${imgTransform.y}px)  scale(${imgTransform.scale})  rotate(${imgTransform.rotate}deg)`,
  transition:  activeTouchesRef.current  >  0  ?  'none'  :  'transform  0.1s  ease-out',
  opacity:  fase  ===  'ajuste'  ?  0.6  :  1,
  }}
  draggable={false}
  />
  </div>
  )}
  {fase  !==  'captura'  &&  renderizarGrilla()}
  </div>
  </div>

  {/*  Capa  segura  */}
  <div  className="absolute  inset-0  pointer-events-none  z-20">
  <button  onClick={onClose}  className="absolute  top-4  right-4  z-40  p-3  bg-foreground/90  backdrop-blur-md  border  border-slate-700/60  rounded-full  shadow-lg  text-muted-foreground  hover:text-white  active:scale-95  pointer-events-auto">
  <X  size={20}  />
  </button>

  {fase  ===  'alineacion'  &&  (
  <>
  <div  className="absolute  left-3  sm:left-5  top-[calc(100%+100px)]  -translate-y-1/2  z-[70]  flex  flex-col  gap-4  pointer-events-none  items-center">
  <ControlDeslizanteVertical  icono={ZoomIn}  onChangeDelta={handleZoomDelta}  />
  </div>
  <div  className="absolute  right-3  sm:right-5  top-[calc(100%+100px)]  -translate-y-1/2  z-[70]  flex  flex-col  gap-4  pointer-events-none  items-center">
  <ControlDeslizanteVertical  icono={RotateCcw}  onChangeDelta={handleRotateDelta}  />
  </div>
  <div  className="absolute  right-3  sm:right-5  top-[60%]  -translate-y-1/2  flex  flex-col  gap-3  pointer-events-none  items-center">
  <button  onClick={alternarBloqueoVista}  className="w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-primary  rounded-[1.25rem]  shadow-[0_4px_15px_rgba(37,99,235,0.5)]  flex  justify-center  items-center  active:scale-90  transition-transform  pointer-events-auto  shrink-0">
  <ArrowRight  size={26}  strokeWidth={2.8}  className="text-primary-foreground"  />
  </button>
  {desbloqueadoUnaVez  &&  (
  <button  onClick={confirmarFinal}  className="w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-amber-500  rounded-[1.25rem]  shadow-[0_4px_15px_rgba(212,160,23,0.5)]  flex  justify-center  items-center  active:scale-90  transition-transform  pointer-events-auto  shrink-0">
  <Check  size={28}  strokeWidth={3}  className="text-foreground"  />
  </button>
  )}
  </div>
  </>
  )}

  {fase  ===  'ajuste'  &&  (
  <>
  <div  className="absolute  left-3  sm:left-5  top-[calc(100%+100px)]  -translate-y-1/2  z-[70]  flex  flex-col  gap-4  pointer-events-none  items-center">
  <div  className="flex  flex-col  items-center  justify-center  w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-foreground/90  backdrop-blur-md  rounded-[1.25rem]  border  border-slate-700/60  shadow-xl  pointer-events-auto">
  <span  className="text-[9px]  text-muted-foreground  font-bold  uppercase  tracking-widest">Corte</span>
  <span  className="text-xl  font-black  text-white  leading-none">{cursorActivo.corteIndex  +  1}</span>
  </div>
  </div>
  <div  className="absolute  right-3  sm:right-5  top-[calc(100%+100px)]  -translate-y-1/2  z-[70]  flex  flex-col  gap-4  pointer-events-none  items-center">
  <div  className="flex  flex-col  items-center  justify-center  w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-foreground/90  backdrop-blur-md  rounded-[1.25rem]  border  border-slate-700/60  shadow-xl  pointer-events-auto">
  <span  className="text-[9px]  text-muted-foreground  font-bold  uppercase  tracking-widest">Nivel</span>
  <span  className="text-xl  font-black  text-amber-400  leading-none">{(cortes[cursorActivo.corteIndex]?.[cursorActivo.lado]  ||  0)  +  1}</span>
  </div>
  </div>
  <div  className="absolute  right-3  sm:right-5  top-[60%]  -translate-y-1/2  flex  flex-col  gap-3  pointer-events-none  items-center">
  {showLadoToggle  &&  (
  <button  onClick={alternarLado}  className="relative  w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-foreground/90  backdrop-blur-md  border  border-slate-700/60  rounded-[1.25rem]  shadow-xl  flex  justify-center  items-center  active:scale-90  transition-transform  pointer-events-auto  shrink-0">
  <ArrowLeftRight  size={18}  className="text-amber-400"  />
  <span  className="absolute  bottom-1  text-[8px]  font-black  tracking-widest  text-amber-400  uppercase">
  {cursorActivo.lado  ===  'izq'  ?  'IZQ'  :  'DER'}
  </span>
  </button>
  )}
  <button  onClick={alternarBloqueoVista}  className="w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-primary  rounded-[1.25rem]  shadow-[0_4px_15px_rgba(37,99,235,0.5)]  flex  justify-center  items-center  active:scale-90  transition-transform  pointer-events-auto  shrink-0">
  <ArrowLeft  size={26}  strokeWidth={2.8}  className="text-primary-foreground"  />
  </button>
  {desbloqueadoUnaVez  &&  (
  <button  onClick={confirmarFinal}  className="w-[54px]  sm:w-[60px]  h-[54px]  sm:h-[60px]  bg-amber-500  rounded-[1.25rem]  shadow-[0_4px_15px_rgba(212,160,23,0.5)]  flex  justify-center  items-center  active:scale-90  transition-transform  pointer-events-auto  shrink-0">
  <Check  size={28}  strokeWidth={3}  className="text-foreground"  />
  </button>
  )}
  </div>
  </>
  )}
  </div>
  </div>

  {/*  =======================  TABLERO  INFERIOR  =======================  */}
  {fase  !==  'captura'  &&  (
  <div  className="absolute  bottom-0  left-0  w-full  h-[200px]  z-50  pointer-events-none  flex  items-center  justify-center">
  {fase  ===  'alineacion'  &&  (
  <div  className="grid  grid-cols-3  gap-2  w-[160px]  h-[160px]  pointer-events-none">
  <div  /><button  onClick={()  =>  moverDpad('y',  -1)}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-primary  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronUp  size={28}  /></button><div  />
  <button  onClick={()  =>  moverDpad('x',  -1)}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-primary  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronLeft  size={28}  /></button>
  <div  className="pointer-events-auto  flex  items-center  justify-center  bg-slate-900/80  backdrop-blur-md  rounded-2xl  border  border-slate-700/60  shadow-inner"><Crosshair  size={22}  className="text-muted-foreground"  /></div>
  <button  onClick={()  =>  moverDpad('x',  1)}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-primary  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronRight  size={28}  /></button>
  <div  /><button  onClick={()  =>  moverDpad('y',  1)}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-primary  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronDown  size={28}  /></button><div  />
  </div>
  )}

  {fase  ===  'ajuste'  &&  (
  <div  className="grid  grid-cols-3  gap-2  w-[160px]  h-[160px]  pointer-events-none">
  <div  /><button  onClick={()  =>  moverCursor(1)}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-primary  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronUp  size={28}  /></button><div  />
  <button  onClick={()  =>  ajustarProfundidad('izq')}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-amber-500  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronLeft  size={28}  /></button>
  <div  className="pointer-events-auto  flex  items-center  justify-center  bg-slate-900/80  backdrop-blur-md  rounded-2xl  border  border-slate-700/60  shadow-inner"><Crosshair  size={22}  className="text-muted-foreground"  /></div>
  <button  onClick={()  =>  ajustarProfundidad('der')}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-amber-500  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronRight  size={28}  /></button>
  <div  /><button  onClick={()  =>  moverCursor(-1)}  className="pointer-events-auto  flex  items-center  justify-center  bg-foreground/90  backdrop-blur-md  rounded-2xl  text-white  active:bg-primary  transition-colors  shadow-lg  border  border-slate-700/60"><ChevronDown  size={28}  /></button><div  />
  </div>
  )}
  </div>
  )}

  {/*  =======================  MODAL  DE  CAPTURA  INICIAL  =======================  */}
  {fase  ===  'captura'  &&  mostrarMenuCaptura  &&  (
  <div  className="absolute  inset-0  bg-slate-900/70  backdrop-blur-md  flex  items-center  justify-center  z-[60]  p-6  pointer-events-auto">
  <div  className="bg-white  border  border-slate-300  p-5  rounded-3xl  flex  flex-col  gap-3  w-full  max-w-xs  shadow-2xl">
  <h3  className="text-center  text-muted-foreground  font-bold  uppercase  tracking-widest  mb-1  text-[10px]">Origen  de  imagen</h3>
  <label  className="flex  items-center  justify-center  gap-3  bg-primary  text-primary-foreground  p-3.5  rounded-2xl  cursor-pointer  active:scale-95  transition-transform">
  <Camera  size={18}  />
  <span  className="font-bold  tracking-wider  text-sm">Tomar  Foto</span>
  <input  type="file"  accept="image/*"  capture="environment"  className="hidden"  onChange={handleCargaImagen}  />
  </label>
  <label  className="flex  items-center  justify-center  gap-3  bg-muted  border  border-slate-300  text-foreground  p-3.5  rounded-2xl  cursor-pointer  active:scale-95  transition-transform">
  <ImageIcon  size={18}  />
  <span  className="font-bold  tracking-wider  text-sm">Abrir  Galería</span>
  <input  type="file"  accept="image/*"  className="hidden"  onChange={handleCargaImagen}  />
  </label>
  <button  onClick={onClose}  className="mt-1  text-muted-foreground  font-bold  text-xs  tracking-widest  uppercase  py-2">Cancelar</button>
  </div>
  </div>
  )}
  </motion.div>
  );
}
