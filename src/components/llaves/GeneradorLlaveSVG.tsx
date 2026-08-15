import { useMemo } from 'react';
import type { ConfiguracionVisualLlave } from '@/types';
import { LlaveSimetricaDobleLado } from './LlaveSimetricaDobleLado';
import { LlaveEstandarUnLado } from './LlaveEstandarUnLado';
import { LlaveDobleEjeExterior } from './LlaveDobleEjeExterior';
import { LlaveDobleEjeInterior } from './LlaveDobleEjeInterior';
import { LlavePistaCanalUnificada } from './LlavePistaCanalUnificada';
import { LlavePistaSemiCanal } from './LlavePistaSemiCanal';
import { LlaveUnEjeLateral } from './LlaveUnEjeLateral';
import { InputCorteSVG } from './InputCorteSVG';

interface GeneradorLlaveSVGProps {
  config: ConfiguracionVisualLlave;
  cortesPrimarios: number[];
  cortesSecundarios?: number[];
  valoresPrimarios?: string[];
  valoresSecundarios?: string[];
  onPrimaryChange?: (index: number, value: string) => void;
  onSecondaryChange?: (index: number, value: string) => void;
  advancedMode?: boolean;
  tileVariants?: { up: boolean; down: boolean }[];
  onVariantToggle?: (flatIdx: number, dir: 'up' | 'down') => void;
  /** Global index of the currently selected cell (driven by the virtual keypad) */
  selectedGlobalIdx?: number;
  /** Notifies parent that a different cell has been chosen as keypad target */
  onSelectCell?: (globalIdx: number) => void;
  /** Disables the native keyboard inside the SVG inputs */
  virtualKeypadMode?: boolean;
  /** Ajuste global: color del trazo (contorno) de la llave. Por defecto usa el color primario del tema. */
  strokeColor?: string;
  /** Ajuste global: grosor (px) del trazo de la llave. Por defecto 3.5. */
  strokeWidth?: number;
  /** Ajuste por serie: ancho/alto (px) de la caja de cada dígito. Por defecto 18. */
  boxSize?: number;
  /** Ajuste por serie: tamaño de fuente (px) del número dentro de cada caja. Por defecto 14. */
  numberSize?: number;
  /** Ajuste por serie: grosor del número (escala CSS font-weight, 100-900). Por defecto 700. */
  numberWeight?: number;
}

function getBaseYTop(tipo: string): number {
  switch (tipo) {
    case 'doble_lado': return 65;
    case '2_ejes_exterior': return 75;
    default: return 60;
  }
}

export function GeneradorLlaveSVG({
  config,
  cortesPrimarios,
  cortesSecundarios,
  valoresPrimarios,
  valoresSecundarios,
  onPrimaryChange,
  onSecondaryChange,
  advancedMode,
  tileVariants,
  onVariantToggle,
  selectedGlobalIdx,
  onSelectCell,
  virtualKeypadMode,
  strokeColor,
  strokeWidth,
  boxSize = 18,
  numberSize = 14,
  numberWeight = 700,
}: GeneradorLlaveSVGProps) {
  const boxHalf = boxSize / 2;
  // La caja de cada dígito mide boxSize x (boxSize + 6); el hueco reservado
  // entre la caja y el trazo de la llave debe escalar con ese alto para que
  // cajas grandes no invadan el dibujo.
  const boxH = boxSize + 6;
  const edgeGap = 4;
  const sanearCortes = (arr: number[]) =>
    arr.map(c => {
      const n = Number(c);
      return isNaN(n) || n < 1 ? 1 : n > config.maxDepth ? config.maxDepth : n;
    });

  const safePrimarios = useMemo(() => sanearCortes(cortesPrimarios), [cortesPrimarios, config.maxDepth]);
  const safeSecundarios = useMemo(
    () => (cortesSecundarios ? sanearCortes(cortesSecundarios) : []),
    [cortesSecundarios, config.maxDepth]
  );

  const isInteractive = !!(valoresPrimarios && onPrimaryChange);
  const isDualAxis = config.tipo === '2_ejes_exterior' || config.tipo === '2_ejes_internos';

  // Determine input placement side
  const inputSide = useMemo((): 'top' | 'bottom' | 'both' | 'none' => {
    if (!isInteractive) return 'none';
    if (isDualAxis) return 'both';
    const isCanal = config.tipo === 'pista_canal' || config.tipo === 'pista_semi_canal' || config.tipo === '1_eje_lateral';
    if (isCanal) {
      const orientacion = config.orientacion || 'inferior';
      return orientacion === 'inferior' ? 'bottom' : 'top';
    }
    return 'top';
  }, [isInteractive, isDualAxis, config.tipo, config.orientacion]);

  const inputNodes = useMemo(() => {
    if (!isInteractive) return null;

    const shoulderWidth = 35;
    const shoulderDrop = config.shoulderDrop ?? 12;
    const baseYTop = getBaseYTop(config.tipo);
    const baseYBottom = baseYTop + config.grosorLlave;
    const topEdgeY = baseYTop - shoulderDrop;
    const botEdgeY = baseYBottom + shoulderDrop;
    const startX = shoulderWidth + config.distanciaHombro;
    const spacing = config.spacing;

    const nodes: React.ReactNode[] = [];

    const primaryLen = valoresPrimarios!.length;
    const secondaryLen = valoresSecundarios?.length || 0;
    const totalGlobalInputs = primaryLen + secondaryLen;

    if (isDualAxis) {
      const maxLen = Math.max(primaryLen, secondaryLen);
      const totalDist = (maxLen > 0 ? maxLen - 1 : 0) * spacing;
      const spcPrimary = primaryLen > 1 ? totalDist / (primaryLen - 1) : spacing;
      const spcSecondary = secondaryLen > 1 ? totalDist / (secondaryLen - 1) : spacing;

      const yTop = topEdgeY - boxH - edgeGap;
      const yBottom = botEdgeY + edgeGap;

      valoresPrimarios!.forEach((val, i) => {
        const globalIndex = i;
        const v = tileVariants?.[globalIndex];
        nodes.push(
          <InputCorteSVG
            key={`sup-${i}`}
            x={startX + i * spcPrimary - boxHalf}
            y={yTop}
            value={val}
            onChange={(v) => onPrimaryChange!(i, v)}
            color="blue"
            maxDepth={config.maxDepth}
            idPrefix={config.tipo === '2_ejes_exterior' ? 'extSup' : 'intSup'}
            index={i}
            total={primaryLen}
            globalIndex={globalIndex}
            totalGlobalInputs={totalGlobalInputs}
            showUpArrow={advancedMode}
            showDownArrow={advancedMode}
            upActive={v?.up}
            downActive={v?.down}
            onUpToggle={() => onVariantToggle?.(globalIndex, 'up')}
            onDownToggle={() => onVariantToggle?.(globalIndex, 'down')}
            isSelected={selectedGlobalIdx === globalIndex}
            onSelect={() => onSelectCell?.(globalIndex)}
            virtualKeypadMode={virtualKeypadMode}
            boxSize={boxSize}
            numberSize={numberSize}
            numberWeight={numberWeight}
          />
        );
      });

      if (valoresSecundarios && onSecondaryChange) {
        valoresSecundarios.forEach((val, i) => {
          const globalIndex = primaryLen + i;
          const v = tileVariants?.[globalIndex];
          nodes.push(
            <InputCorteSVG
              key={`inf-${i}`}
              x={startX + i * spcSecondary - boxHalf}
              y={yBottom}
              value={val}
              onChange={(v) => onSecondaryChange(i, v)}
              color="blue"
              maxDepth={config.maxDepth}
              idPrefix={config.tipo === '2_ejes_exterior' ? 'extInf' : 'intInf'}
              index={i}
              total={secondaryLen}
              globalIndex={globalIndex}
              totalGlobalInputs={totalGlobalInputs}
              showUpArrow={advancedMode}
              showDownArrow={advancedMode}
              upActive={v?.up}
              downActive={v?.down}
              onUpToggle={() => onVariantToggle?.(globalIndex, 'up')}
              onDownToggle={() => onVariantToggle?.(globalIndex, 'down')}
              isSelected={selectedGlobalIdx === globalIndex}
              onSelect={() => onSelectCell?.(globalIndex)}
              virtualKeypadMode={virtualKeypadMode}
              boxSize={boxSize}
              numberSize={numberSize}
              numberWeight={numberWeight}
            />
          );
        });
      }
    } else {
      const orientacion = config.orientacion || 'inferior';
      const isCanal = config.tipo === 'pista_canal' || config.tipo === 'pista_semi_canal' || config.tipo === '1_eje_lateral';
      
      let inputY: number;
      if (isCanal) {
        inputY = orientacion === 'inferior' ? botEdgeY + edgeGap : topEdgeY - boxH - edgeGap;
      } else {
        inputY = topEdgeY - boxH - edgeGap;
      }

      const centers = valoresPrimarios!.map((_, i) => startX + i * spacing);

      let idPrefix = 'corte';
      if (config.tipo === 'doble_lado') idPrefix = 'simDoble';
      else if (config.tipo === 'estandar_1_lado') idPrefix = 'stdUnLado';
      else if (config.tipo === 'pista_canal') idPrefix = 'pistaUnif';
      else if (config.tipo === 'pista_semi_canal') idPrefix = 'pistaSemi';
      else if (config.tipo === '1_eje_lateral') idPrefix = 'ejeLat';

      valoresPrimarios!.forEach((val, i) => {
        const v = tileVariants?.[i];
        nodes.push(
          <InputCorteSVG
            key={`corte-${i}`}
            x={centers[i] - boxHalf}
            y={inputY}
            value={val}
            onChange={(v) => onPrimaryChange!(i, v)}
            maxDepth={config.maxDepth}
            idPrefix={idPrefix}
            index={i}
            total={primaryLen}
            globalIndex={i}
            totalGlobalInputs={totalGlobalInputs}
            showUpArrow={advancedMode}
            showDownArrow={advancedMode}
            upActive={v?.up}
            downActive={v?.down}
            onUpToggle={() => onVariantToggle?.(i, 'up')}
            onDownToggle={() => onVariantToggle?.(i, 'down')}
            isSelected={selectedGlobalIdx === i}
            onSelect={() => onSelectCell?.(i)}
            virtualKeypadMode={virtualKeypadMode}
            boxSize={boxSize}
            numberSize={numberSize}
            numberWeight={numberWeight}
          />
        );
      });
    }

    return nodes;
  }, [isInteractive, config, valoresPrimarios, valoresSecundarios, onPrimaryChange, onSecondaryChange, isDualAxis, advancedMode, tileVariants, onVariantToggle, selectedGlobalIdx, onSelectCell, virtualKeypadMode, boxHalf, boxSize, numberSize, numberWeight, boxH, edgeGap]);

  const inputMargin = boxH + 10 + (advancedMode ? 18 : 0);

  let element: React.ReactNode;
  switch (config.tipo) {
    case 'doble_lado':
      element = <LlaveSimetricaDobleLado config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveSimetricaDobleLado>;
      break;
    case 'estandar_1_lado':
      element = <LlaveEstandarUnLado config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveEstandarUnLado>;
      break;
    case '2_ejes_exterior':
      element = <LlaveDobleEjeExterior config={config} cortesSup={safePrimarios} cortesInf={safeSecundarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveDobleEjeExterior>;
      break;
    case '2_ejes_internos':
      element = <LlaveDobleEjeInterior config={config} cortesPrimarios={safePrimarios} cortesSecundarios={safeSecundarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveDobleEjeInterior>;
      break;
    case 'pista_canal':
      element = <LlavePistaCanalUnificada config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlavePistaCanalUnificada>;
      break;
    case 'pista_semi_canal':
      element = <LlavePistaSemiCanal config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlavePistaSemiCanal>;
      break;
    case '1_eje_lateral':
      element = <LlaveUnEjeLateral config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveUnEjeLateral>;
      break;
    default:
      element = (
        <div className="text-center text-muted-foreground p-8">
          <p className="font-semibold">Tipo de llave no soportado o sin configurar.</p>
        </div>
      );
  }

  // Los ajustes globales de color/grosor del trazo viajan como variables CSS
  // heredadas; cada componente de llave las consume con un valor por defecto.
  const strokeVars = {
    ...(strokeColor ? { '--key-stroke-color': strokeColor } : {}),
    ...(strokeWidth != null ? { '--key-stroke-width': strokeWidth } : {}),
  } as React.CSSProperties;

  return <div style={{ display: 'contents', ...strokeVars }}>{element}</div>;
}
