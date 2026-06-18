const DARK_TEXT = "#111827";
const LIGHT_TEXT = "#ffffff";

function normalizeHexColor(hex: string) {
  const clean = hex.trim().replace("#", "");

  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return clean
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return clean;
  }

  return null;
}

function relativeLuminance(hex: string) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const [r, g, b] = [0, 2, 4].map((start) => {
    const value = parseInt(normalized.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(firstHex: string, secondHex: string) {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  if (first === null || second === null) return 0;

  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(backgroundHex: string | null | undefined) {
  if (!backgroundHex) return DARK_TEXT;

  const whiteRatio = contrastRatio(backgroundHex, LIGHT_TEXT);
  const darkRatio = contrastRatio(backgroundHex, DARK_TEXT);

  return whiteRatio >= darkRatio ? LIGHT_TEXT : DARK_TEXT;
}
