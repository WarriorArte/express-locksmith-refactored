import type {
  DecoderConfig,
  DecoderTipoLlave,
  DecoderAlineacion,
  TipoLlaveSVG,
  KeycodeProfile,
} from "@/types";

/**
 * Presets físicos del decodificador-por-foto, extraídos del monolito original (decfoto.jsx).
 * NO modificar valores: rompen la matemática de alineación de cámara.
 */
export const DECODER_PRESETS: Record<string, Partial<DecoderConfig> & { lado?: 'izq' | 'der' }> = {
  estandar_un_hombro: { lado: 'izq', anchoLlave: 598, profundidades: [600, 550, 500, 450], distanciasCortes: [390, 640, 890, 1140, 1390] },
  estandar_doble_hombro: { anchoLlave: 830, profundidades: [830, 760, 690, 620], distanciasCortes: [250, 460, 670, 880, 1090, 1300, 1510, 1720] },
  estandar_doble_punta: { anchoLlave: 820, profundidades: [820, 760, 700, 640], distanciasCortes: [2240, 2010, 1780, 1550, 1320, 1090, 860, 630] },
  dos_ejes_exterior_punta: { anchoLlave: 895, profundidades: [790, 754, 718, 682, 646, 610], distanciasCortes: [1840, 1535, 1230, 925, 620, 380] },
  dos_ejes_interior_punta: { anchoLlave: 780, profundidades: [125, 205, 285], distanciasCortes: [1510, 1270, 1030, 790, 550] },
  pista_canal_hombro: { lado: 'izq', anchoLlave: 820, profundidades: [380, 320, 260, 200], distanciasCortes: [300, 600, 900, 1200, 1500, 1800, 2100, 2400] },
  '1_eje_lateral_punta': { lado: 'der', anchoLlave: 570, profundidades: [400, 340, 280, 220, 160], distanciasCortes: [2475, 2180, 1885, 1590, 1295, 1000, 760, 520] },
};

/**
 * Mapeo TipoLlaveSVG → DecoderTipoLlave.
 * pista_semi_canal y 1_eje_lateral comparten preset 'pista_canal' (decisión del usuario).
 */
export function mapVisualTipoToDecoder(tipo: TipoLlaveSVG | undefined): DecoderTipoLlave | null {
  switch (tipo) {
    case 'doble_lado': return 'estandar_doble';
    case 'estandar_1_lado': return 'estandar_un';
    case '2_ejes_exterior': return 'dos_ejes_exterior';
    case '2_ejes_internos': return 'dos_ejes_interior';
    case 'pista_canal':
    case 'pista_semi_canal':
    case '1_eje_lateral':
      return 'pista_canal';
    default:
      return null;
  }
}

/**
 * Construye un DecoderConfig por defecto a partir del KeycodeProfile.
 * Usa el tipo visual + bittingConfig.length para escoger preset y ajustar distancias.
 * Retorna null si no se puede inferir (sin configuracionVisual).
 */
export function buildDefaultDecoderConfig(profile: Pick<KeycodeProfile, 'configuracionVisual' | 'bittingConfig'>): DecoderConfig | null {
  const tipo = mapVisualTipoToDecoder(profile.configuracionVisual?.tipo);
  if (!tipo) return null;

  const isDosEjes = tipo === 'dos_ejes_exterior' || tipo === 'dos_ejes_interior';
  const alineacion: DecoderAlineacion =
    tipo === 'estandar_un' || tipo === 'pista_canal' ? 'hombro' : 'punta';

  const presetKey = `${tipo}_${alineacion}`;
  const preset = DECODER_PRESETS[presetKey];

  // Ajustar longitud de distanciasCortes a la longitud real del bitting
  const totalLen = profile.bittingConfig.axes && profile.bittingConfig.axes.length >= 2
    ? profile.bittingConfig.axes.reduce((s, a) => s + a.length, 0)
    : profile.bittingConfig.length;

  const fitDist = (src: number[] | undefined, target: number): number[] => {
    if (!src || src.length === 0) {
      // Distribución uniforme genérica
      return Array.from({ length: target }, (_, i) => 300 + i * 250);
    }
    if (src.length === target) return [...src];
    if (src.length > target) return src.slice(0, target);
    // extender repitiendo el último delta
    const last = src[src.length - 1];
    const delta = src.length > 1 ? src[src.length - 1] - src[src.length - 2] : 250;
    const out = [...src];
    for (let i = src.length; i < target; i++) out.push(last + delta * (i - src.length + 1));
    return out;
  };

  const lenIzq = profile.bittingConfig.axes?.[0]?.length ?? totalLen;
  const lenDer = isDosEjes
    ? (profile.bittingConfig.axes?.[1]?.length ?? Math.max(totalLen - lenIzq, lenIzq))
    : lenIzq;

  return {
    tipoLlave: tipo,
    alineacion,
    ladoEstandarUn: (preset?.lado as 'izq' | 'der') ?? 'izq',
    anchoLlave: preset?.anchoLlave ?? 800,
    profundidades: preset?.profundidades ?? [400, 320, 240, 160],
    distanciasCortes: fitDist(preset?.distanciasCortes, lenIzq),
    distanciasCortesDer: fitDist(preset?.distanciasCortes, lenDer),
    escalaPixelMm: 0.20,
  };
}

/**
 * Cambia tipoLlave / alineacion SIN sobreescribir los datos numéricos
 * ingresados por el usuario (profundidades, distancias, ancho, escala, lado).
 * Las validaciones se aplican aparte en el editor.
 */
export function applyDecoderPreset(prev: DecoderConfig, tipoLlave: DecoderTipoLlave, alineacion: DecoderAlineacion): DecoderConfig {
  return { ...prev, tipoLlave, alineacion };
}
