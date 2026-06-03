import { describe, expect, it } from 'vitest';
import { emuToPx, halfPointsToPx, ooxmlColorToCss, twipsToPx } from './docxUnits';

describe('docxUnits', () => {
  it('converts OOXML units using 96 CSS pixels per inch', () => {
    expect(twipsToPx(1440)).toBe(96);
    expect(halfPointsToPx(24)).toBe(16);
    expect(emuToPx(914400)).toBe(96);
  });

  it('normalizes OOXML colors for CSS', () => {
    expect(ooxmlColorToCss('1f4e79')).toBe('#1F4E79');
    expect(ooxmlColorToCss('auto')).toBeUndefined();
    expect(ooxmlColorToCss(undefined)).toBeUndefined();
  });
});
