import { ALL_TARGETS, OUTCOME_COUNT, outcomeIndex, resolvePoint, targetKey } from '../board/geometry';
import type { DartTarget, PlayerProfile, RandomSource } from '../types';
import { sampleLanding } from './dispersion';
import { createRng } from './rng';

/** Probability of each of the 63 outcomes when aiming at a target. */
export type OutcomeDistribution = Float64Array;

/** Sparse form used by the solver: only outcomes with non-zero probability. */
export type SparseDistribution = { idx: number[]; p: number[] };

export function estimateDistribution(
  target: DartTarget,
  profile: PlayerProfile,
  rng: RandomSource,
  samples = 20000,
): OutcomeDistribution {
  const counts = new Float64Array(OUTCOME_COUNT);
  for (let i = 0; i < samples; i++) {
    const { x, y } = sampleLanding(target, profile, rng);
    counts[outcomeIndex(resolvePoint(x, y))]++;
  }
  for (let i = 0; i < OUTCOME_COUNT; i++) counts[i] /= samples;
  return counts;
}

export type DistributionTable = Record<string, OutcomeDistribution>;

/** Distributions for every aimable target, deterministic for a given seed. */
export function buildDistributionTable(profile: PlayerProfile, samples = 20000, seed = 12345): DistributionTable {
  const rng = createRng(seed);
  const table: DistributionTable = {};
  for (const t of ALL_TARGETS) table[targetKey(t)] = estimateDistribution(t, profile, rng, samples);
  return table;
}

export function toSparse(d: OutcomeDistribution, minP = 1e-5): SparseDistribution {
  const idx: number[] = [];
  const p: number[] = [];
  let kept = 0;
  for (let i = 0; i < d.length; i++) {
    if (d[i] >= minP) {
      idx.push(i);
      p.push(d[i]);
      kept += d[i];
    }
  }
  // Renormalise so probabilities still sum to 1.
  for (let i = 0; i < p.length; i++) p[i] /= kept;
  return { idx, p };
}
