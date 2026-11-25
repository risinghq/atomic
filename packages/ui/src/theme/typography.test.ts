import { describe, expect, it } from 'vitest';
import { font, textStyle } from './typography';

describe('font', () => {
  it('uses the rounded system face with a weight on iOS', () => {
    expect(font('semibold', 'ios')).toEqual({ fontFamily: 'ui-rounded', fontWeight: '600' });
  });

  it('uses one Nunito family per weight, without fontWeight, elsewhere', () => {
    expect(font('bold', 'android')).toEqual({ fontFamily: 'Nunito_700Bold' });
    expect(font('regular', 'web')).toEqual({ fontFamily: 'Nunito_400Regular' });
  });
});

describe('textStyle', () => {
  it('lets a caller override the variant weight', () => {
    expect(textStyle('body', 'bold')).toMatchObject({ fontSize: 17, lineHeight: 22 });
    expect(textStyle('body', 'bold').fontFamily).toBe(font('bold').fontFamily);
  });
});
