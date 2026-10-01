import { aimPoint, resolvePoint } from '../board/geometry';
import type { DartTarget, PlayerProfile, RandomSource, SimulatedDart } from '../types';
import { gaussian } from './rng';

/** Spread multiplier for the kind of target being aimed at. */
function targetModifier(t: DartTarget, p: PlayerProfile): number {
  switch (t.kind) {
    case 'D':
      return p.doubleAccuracyModifier;
    case 'T':
      return p.trebleAccuracyModifier;
    case 'SB':
    case 'DB':
      return p.bullAccuracyModifier;
    default:
      return 1;
  }
}

/**
 * Sample a landing point around the aim point.
 * The spread is an ellipse aligned with the radius through the aim point:
 * radialAccuracy along it, angularAccuracy across it. With probability
 * largeMissProbability the whole spread is tripled (a bad throw).
 */
export function sampleLanding(
  target: DartTarget,
  profile: PlayerProfile,
  rng: RandomSource,
): { x: number; y: number } {
  const aim = aimPoint(target);
  const scale = targetModifier(target, profile) * (rng() < profile.largeMissProbability ? 3 : 1);
  const r = Math.hypot(aim.x, aim.y);
  // Unit vectors: radial (outwards) and tangential. At the bull, use the axes.
  const ux = r > 1e-9 ? aim.x / r : 0;
  const uy = r > 1e-9 ? aim.y / r : 1;
  const radial = gaussian(rng) * profile.radialAccuracy * scale;
  const tangential = gaussian(rng) * profile.angularAccuracy * scale;
  return {
    x: aim.x + radial * ux + tangential * uy,
    y: aim.y + radial * uy - tangential * ux,
  };
}

/** Throw one simulated dart at a target. */
export function simulateDartAt(target: DartTarget, profile: PlayerProfile, rng: RandomSource): SimulatedDart {
  const { x, y } = sampleLanding(target, profile, rng);
  const bed = resolvePoint(x, y);
  return { x, y, segment: bed.segment, multiplier: bed.multiplier, score: bed.score, aimedAt: target };
}
