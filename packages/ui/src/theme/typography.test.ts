import { describe, expect, it } from '@jest/globals';
import { font, textStyle, tracking } from './typography';

describe('font', () => {
  it('uses one Inter family per weight, without fontWeight', () => {
    expect(font('bold')).toEqual({ fontFamily: 'Inter_700Bold' });
    expect(font('regular')).toEqual({ fontFamily: 'Inter_400Regular' });
  });
});

describe('tracking', () => {
  it('stays near zero at caption size and tightens as the size grows', () => {
    expect(tracking(12)).toBe(0.01);
    expect(tracking(17)).toBe(-0.22);
    expect(tracking(65)).toBe(-1.45);
  });
});

describe('textStyle', () => {
  it('lets a caller override the variant weight', () => {
    expect(textStyle('body', 'bold')).toMatchObject({ fontSize: 17, lineHeight: 22 });
    expect(textStyle('body', 'bold').fontFamily).toBe(font('bold').fontFamily);
  });
});
