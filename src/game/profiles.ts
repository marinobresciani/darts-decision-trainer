import type { PlayerProfile } from './types';
import calibrated from '../data/calibration.json';

/**
 * Difficulty is the inverse of simulated skill: a strong simulated player
 * usually hits what you choose (easy to train with); a weak one keeps
 * throwing you into awkward scores you must recover from (hard).
 *
 * Spread values (mm) come from scripts/calibrate.ts, which searches for the
 * spread that reproduces each profile's target scoring average.
 */
const base = {
  doubleAccuracyModifier: 1.1,
  trebleAccuracyModifier: 1.0,
  bullAccuracyModifier: 1.1,
  largeMissProbability: 0.03,
};

const sigma = (id: string, fallback: number) => (calibrated as Record<string, number>)[id] ?? fallback;

function profile(id: string, name: string, targetAverage: number, fallbackSigma: number): PlayerProfile {
  const s = sigma(id, fallbackSigma);
  return { id, name, targetAverage, radialAccuracy: s, angularAccuracy: s, ...base };
}

export const PROFILES: PlayerProfile[] = [
  profile('easy', 'Easy (≈105 average)', 105, 16),
  profile('medium', 'Medium (≈75 average)', 75, 30),
  profile('hard', 'Hard (≈50 average)', 50, 50),
  profile('extreme', 'Extreme (≈27 average)', 27, 90),
];

export function profileById(id: string): PlayerProfile {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown profile ${id}`);
  return p;
}
