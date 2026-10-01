import { describe, expect, it } from 'vitest';
import { canCheckout, isBogey, scoreDart, BOGEY_NUMBERS } from '../scoring/rules';

describe('double-out scoring', () => {
  it('continues on a normal score', () => {
    expect(scoreDart(501, 60, false)).toEqual({ kind: 'continue', remaining: 441 });
  });
  it('checks out only on a double', () => {
    expect(scoreDart(40, 40, true)).toEqual({ kind: 'checkout' });
    expect(scoreDart(40, 40, false)).toEqual({ kind: 'bust' }); // e.g. a single 40 cannot exist, but 0 without a double busts
    expect(scoreDart(50, 50, true)).toEqual({ kind: 'checkout' }); // bullseye counts as a double
  });
  it('busts below zero and on exactly one', () => {
    expect(scoreDart(20, 21, false)).toEqual({ kind: 'bust' });
    expect(scoreDart(20, 19, false)).toEqual({ kind: 'bust' });
  });
});

describe('checkout knowledge', () => {
  it('knows the classic maximums', () => {
    expect(canCheckout(170, 3)).toBe(true);
    expect(canCheckout(171, 3)).toBe(false);
    expect(canCheckout(110, 2)).toBe(true);
    expect(canCheckout(111, 2)).toBe(false);
    expect(canCheckout(50, 1)).toBe(true);
    expect(canCheckout(41, 1)).toBe(false);
  });
  it('finds exactly the standard bogey numbers', () => {
    const bogeys = Array.from({ length: 169 }, (_, i) => i + 2).filter(isBogey);
    expect(bogeys).toEqual([...BOGEY_NUMBERS].sort((a, b) => a - b));
  });
});
