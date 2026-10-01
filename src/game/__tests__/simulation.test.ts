import { describe, expect, it } from 'vitest';
import { createLeg, createRng, evaluateTargetChoice, generateTargetCandidates, PROFILES, simulateDart, applyDartResult, parseTarget } from '..';
import { simulateDartAt } from '../simulation/dispersion';
import type { GameState } from '../types';

describe('seeded simulation', () => {
  it('reproduces the same dart for the same seed', () => {
    const a = simulateDartAt({ kind: 'T', number: 20 }, PROFILES[2], createRng(99));
    const b = simulateDartAt({ kind: 'T', number: 20 }, PROFILES[2], createRng(99));
    expect(a).toEqual(b);
  });

  it('reproduces a whole leg from a seed', () => {
    const play = (seed: number) => {
      const rng = createRng(seed);
      let s: GameState = createLeg(PROFILES[1]);
      const scores: number[] = [];
      while (s.legStatus === 'active' && s.totalDartsThrown < 300) {
        const best = generateTargetCandidates(s).sort((x, y) => x.expectedDarts - y.expectedDarts)[0];
        const d = simulateDart(s, best.target, rng);
        scores.push(d.score);
        s = applyDartResult(s, d);
      }
      return scores;
    };
    expect(play(2026)).toEqual(play(2026));
  });

  it('lets a double attempt miss off the board for zero', () => {
    const rng = createRng(1);
    const darts = Array.from({ length: 3000 }, () => simulateDartAt({ kind: 'D', number: 20 }, PROFILES[2], rng));
    expect(darts.some((d) => d.segment === null && d.score === 0)).toBe(true);
    expect(darts.some((d) => d.segment === 20 && d.multiplier === 2)).toBe(true);
    expect(darts.some((d) => d.segment === 5 || d.segment === 1)).toBe(true); // neighbours
  });
});

describe('calibration', () => {
  it.each(PROFILES.map((p) => [p.id, p] as const))('%s scores close to its target when aiming T20', (_, p) => {
    const rng = createRng(5);
    let total = 0;
    const n = 60000;
    for (let i = 0; i < n; i++) total += simulateDartAt({ kind: 'T', number: 20 }, p, rng).score;
    expect((3 * total) / n).toBeGreaterThan(p.targetAverage * 0.93);
    expect((3 * total) / n).toBeLessThan(p.targetAverage * 1.07);
  });
});

describe('route engine', () => {
  const medium = PROFILES[1];

  it('flags T20 on 189 with one dart: a single 20 leaves the 169 bogey', () => {
    const s: GameState = { ...createLeg(medium, { startScore: 249 }), playerScore: 189, dartsRemainingInVisit: 1 };
    const ev = evaluateTargetChoice(s, parseTarget('T20'));
    expect(ev.grade).not.toBe('preferred');
    expect(ev.feedback).toMatch(/169/);
    expect(ev.feedback).toMatch(/bogey/);
    const t19 = evaluateTargetChoice(s, parseTarget('T19'));
    expect(t19.grade).toBe('preferred');
  });

  it('accepts more than one legitimate route', () => {
    const s = createLeg(medium, { startScore: 170 });
    const good = generateTargetCandidates(s).filter((c) => c.grade === 'preferred' || c.grade === 'good_alternative');
    expect(good.length).toBeGreaterThan(1);
  });

  it('grades an impossible target as invalid', () => {
    const s = createLeg(medium, { startScore: 32 });
    expect(evaluateTargetChoice(s, parseTarget('T20')).grade).toBe('invalid');
    expect(evaluateTargetChoice(s, parseTarget('D16')).grade).toBe('preferred');
  });

  it('offers about ten candidates', () => {
    const c = generateTargetCandidates(createLeg(medium));
    expect(c.length).toBe(10);
  });

  it('separates decision from result: the grade does not depend on where the dart lands', () => {
    const s = createLeg(medium, { startScore: 40 });
    const before = evaluateTargetChoice(s, parseTarget('D20')).grade;
    const missed = applyDartResult(s, { x: 0, y: 180, segment: null, multiplier: 0, score: 0, aimedAt: parseTarget('D20') });
    expect(before).toBe('preferred');
    expect(missed.playerScore).toBe(40);
  });

  it('can prefer a different target when T20 is blocked', () => {
    // Two darts sitting right on the T20 aim point.
    const t20 = { x: 0, y: 103 };
    const blocking = [
      { ...t20, x: -1.5, segment: 20, multiplier: 3 as const, score: 60, aimedAt: parseTarget('T20') },
      { ...t20, x: 1.5, segment: 20, multiplier: 3 as const, score: 60, aimedAt: parseTarget('T20') },
    ];
    const s: GameState = { ...createLeg(PROFILES[0]), playerScore: 381, dartsRemainingInVisit: 1, dartsInBoard: blocking, visitDarts: blocking };
    const t20Eval = evaluateTargetChoice(s, parseTarget('T20'));
    expect(t20Eval.grade).not.toBe('preferred');
  });
});
