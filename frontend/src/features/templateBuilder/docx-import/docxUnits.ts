const CSS_PIXELS_PER_INCH = 96;
const TWIPS_PER_INCH = 1440;
const POINTS_PER_INCH = 72;
const EMU_PER_INCH = 914400;

export function twipsToPx(value: number | undefined): number {
  if (!value) return 0;
  return (value / TWIPS_PER_INCH) * CSS_PIXELS_PER_INCH;
}

export function halfPointsToPx(value: number | undefined): number {
  if (!value) return 0;
  return (value / 2 / POINTS_PER_INCH) * CSS_PIXELS_PER_INCH;
}

export function emuToPx(value: number | undefined): number {
  if (!value) return 0;
  return (value / EMU_PER_INCH) * CSS_PIXELS_PER_INCH;
}

export function ooxmlColorToCss(value: string | undefined): string | undefined {
  if (!value || value.toLowerCase() === 'auto') return undefined;
  const normalized = value.trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(normalized)) return undefined;
  return `#${normalized}`;
}
