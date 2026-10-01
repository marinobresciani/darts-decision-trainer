import { describe, expect, it } from 'vitest';
import { applyDartResult, createLeg } from '../engine/state';
import { aimPoint, resolvePoint } from '../board/geometry';
import { PROFILES } from '../profiles';
import type { DartTarget, SimulatedDart } from '../types';

const profile = PROFILES[1];

/** A dart landing exactly on a target's aim point. */
function dart(t: DartTarget): SimulatedDart {
  const { x, y } = aimPoint(t);
  const bed = resolvePoint(x, y);
  return { x, y, segment: bed.segment, multiplier: bed.multiplier, score: bed.score, aimedAt: t };
}

describe('visit flow', () => {
  it('counts down and ends the visit after three darts', () => {
    let s = createLeg(profile);
    s = applyDartResult(s, dart({ kind: 'T', number: 20 }));
    expect(s.playerScore).toBe(441);
    expect(s.dartsRemainingInVisit).toBe(2);
    expect(s.dartsInBoard).toHaveLength(1);
    s = applyDartResult(s, dart({ kind: 'T', number: 20 }));
    s = applyDartResult(s, dart({ kind: 'T', number: 20 }));
    expect(s.playerScore).toBe(321);
    expect(s.dartsRemainingInVisit).toBe(3);
    expect(s.dartsInBoard).toHaveLength(0);
    expect(s.visitNumber).toBe(2);
    expect(s.history[0].scored).toBe(180);
  });

  it('restores the start score on a bust and ends the visit', () => {
    let s = createLeg(profile, { startScore: 40 });
    s = applyDartResult(s, dart({ kind: 'S', number: 20 })); // 20 left
    s = applyDartResult(s, dart({ kind: 'S', number: 19 })); // 1 left: bust
    expect(s.playerScore).toBe(40);
    expect(s.dartsRemainingInVisit).toBe(3);
    expect(s.history[0].bust).toBe(true);
  });

  it('wins only by finishing on a double', () => {
    let s = createLeg(profile, { startScore: 32 });
    s = applyDartResult(s, dart({ kind: 'S', number: 16 })); // 16 left
    s = applyDartResult(s, dart({ kind: 'D', number: 8 }));
    expect(s.legStatus).toBe('won');
    expect(s.playerScore).toBe(0);
    expect(s.totalDartsThrown).toBe(2);
  });

  it('busts when reaching zero without a double', () => {
    let s = createLeg(profile, { startScore: 20 });
    s = applyDartResult(s, dart({ kind: 'S', number: 20 }));
    expect(s.legStatus).toBe('active');
    expect(s.playerScore).toBe(20);
  });
});

describe('board geometry', () => {
  it('resolves aim points to their own bed', () => {
    expect(resolvePoint(0, 0).score).toBe(50);
    expect(dart({ kind: 'T', number: 19 }).score).toBe(57);
    expect(dart({ kind: 'D', number: 16 }).score).toBe(32);
    expect(dart({ kind: 'SB' }).score).toBe(25);
  });
  it('scores 0 outside the double ring', () => {
    expect(resolvePoint(0, 175).score).toBe(0);
  });
  it('places 1 and 5 either side of 20', () => {
    const a = aimPoint({ kind: 'T', number: 20 });
    expect(resolvePoint(a.x + 22, a.y).segment).toBe(1);
    expect(resolvePoint(a.x - 22, a.y).segment).toBe(5);
  });
});
