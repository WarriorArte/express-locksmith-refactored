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
}: GeneradorLlaveSVGProps) {
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

      const yTop = topEdgeY - 28;
      const yBottom = botEdgeY + 4;

      valoresPrimarios!.forEach((val, i) => {
        const globalIndex = i;
        const v = tileVariants?.[globalIndex];
        nodes.push(
          <InputCorteSVG
            key={`sup-${i}`}
            x={startX + i * spcPrimary - 9}
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
              x={startX + i * spcSecondary - 9}
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
            />
          );
        });
      }
    } else {
      const orientacion = config.orientacion || 'inferior';
      const isCanal = config.tipo === 'pista_canal' || config.tipo === 'pista_semi_canal' || config.tipo === '1_eje_lateral';
      
      let inputY: number;
      if (isCanal) {
        inputY = orientacion === 'inferior' ? botEdgeY + 4 : topEdgeY - 28;
      } else {
        inputY = topEdgeY - 28;
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
            x={centers[i] - 9}
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
          />
        );
      });
    }

    return nodes;
  }, [isInteractive, config, valoresPrimarios, valoresSecundarios, onPrimaryChange, onSecondaryChange, isDualAxis, advancedMode, tileVariants, onVariantToggle, selectedGlobalIdx, onSelectCell, virtualKeypadMode]);

  const inputMargin = advancedMode ? 52 : 34;

  switch (config.tipo) {
    case 'doble_lado':
      return <LlaveSimetricaDobleLado config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveSimetricaDobleLado>;
    case 'estandar_1_lado':
      return <LlaveEstandarUnLado config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveEstandarUnLado>;
    case '2_ejes_exterior':
      return <LlaveDobleEjeExterior config={config} cortesSup={safePrimarios} cortesInf={safeSecundarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveDobleEjeExterior>;
    case '2_ejes_internos':
      return <LlaveDobleEjeInterior config={config} cortesPrimarios={safePrimarios} cortesSecundarios={safeSecundarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveDobleEjeInterior>;
    case 'pista_canal':
      return <LlavePistaCanalUnificada config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlavePistaCanalUnificada>;
    case 'pista_semi_canal':
      return <LlavePistaSemiCanal config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlavePistaSemiCanal>;
    case '1_eje_lateral':
      return <LlaveUnEjeLateral config={config} cortes={safePrimarios} inputSide={inputSide} inputMargin={inputMargin}>{inputNodes}</LlaveUnEjeLateral>;
    default:
      return (
        <div className="text-center text-muted-foreground p-8">
          <p className="font-semibold">Tipo de llave no soportado o sin configurar.</p>
        </div>
      );
  }
}
