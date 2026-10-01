import { aimPoint, OUTCOME_COUNT, outcomeIndex, resolvePoint } from '../board/geometry';
import type { DartTarget, PlayerProfile, RandomSource, SimulatedDart } from '../types';
import { sampleLanding } from './dispersion';
import { createRng } from './rng';
import type { OutcomeDistribution } from './outcomes';

/**
 * MVP obstruction model (spec §12.3): a dart already in the board shadows a
 * small disc around its tip. A new dart heading into that disc is deflected
 * sideways, or occasionally bounces out and scores nothing.
 * A dart in S20 does not block T20 unless it is physically close to it.
 */
export const BLOCK_RADIUS_MM = 4.5;
const DEFLECT_MIN_MM = 4;
const DEFLECT_MAX_MM = 11;
const BOUNCE_OUT_PROBABILITY = 0.12;

export type ObstructionResult = {
  /** Share (0..1) of a small disc around the aim point covered by darts in the board. */
  blockedFraction: number;
  /** Darts within reach of the aim point. */
  nearbyDarts: number;
};

/** Geometric blocking of a target's aim point, independent of the thrower. */
export function calculateObstruction(target: DartTarget, dartsInBoard: SimulatedDart[]): ObstructionResult {
  const aim = aimPoint(target);
  const AIM_DISC = 7; // mm: where a decent throw at this target arrives
  let inside = 0;
  let total = 0;
  for (let dx = -AIM_DISC; dx <= AIM_DISC; dx += 0.5) {
    for (let dy = -AIM_DISC; dy <= AIM_DISC; dy += 0.5) {
      if (dx * dx + dy * dy > AIM_DISC * AIM_DISC) continue;
      total++;
      const x = aim.x + dx;
      const y = aim.y + dy;
      if (dartsInBoard.some((d) => (d.x - x) ** 2 + (d.y - y) ** 2 <= BLOCK_RADIUS_MM ** 2)) inside++;
    }
  }
  const nearbyDarts = dartsInBoard.filter((d) => Math.hypot(d.x - aim.x, d.y - aim.y) < AIM_DISC + BLOCK_RADIUS_MM).length;
  return { blockedFraction: total ? inside / total : 0, nearbyDarts };
}

/** Apply deflection or bounce-out to a raw landing point. Returns null on a bounce-out. */
export function applyObstruction(
  point: { x: number; y: number },
  dartsInBoard: SimulatedDart[],
  rng: RandomSource,
): { x: number; y: number } | null {
  const hit = dartsInBoard.find((d) => (d.x - point.x) ** 2 + (d.y - point.y) ** 2 <= BLOCK_RADIUS_MM ** 2);
  if (!hit) return point;
  if (rng() < BOUNCE_OUT_PROBABILITY) return null;
  // Deflect away from the blocking dart, with some randomness in direction.
  let ax = point.x - hit.x;
  let ay = point.y - hit.y;
  const len = Math.hypot(ax, ay) || 1;
  ax /= len;
  ay /= len;
  const turn = (rng() - 0.5) * Math.PI * 0.8;
  const dirX = ax * Math.cos(turn) - ay * Math.sin(turn);
  const dirY = ax * Math.sin(turn) + ay * Math.cos(turn);
  const dist = DEFLECT_MIN_MM + rng() * (DEFLECT_MAX_MM - DEFLECT_MIN_MM);
  return { x: point.x + dirX * dist, y: point.y + dirY * dist };
}

/** Outcome distribution for a target with darts already in the board. */
export function obstructedDistribution(
  target: DartTarget,
  profile: PlayerProfile,
  dartsInBoard: SimulatedDart[],
  samples = 6000,
  seed = 7,
): OutcomeDistribution {
  const rng = createRng(seed);
  const counts = new Float64Array(OUTCOME_COUNT);
  for (let i = 0; i < samples; i++) {
    const p = applyObstruction(sampleLanding(target, profile, rng), dartsInBoard, rng);
    counts[p ? outcomeIndex(resolvePoint(p.x, p.y)) : 0]++;
  }
  for (let i = 0; i < OUTCOME_COUNT; i++) counts[i] /= samples;
  return counts;
}

/** Throw a dart, including deflections off darts already in the board. */
export function throwWithObstruction(
  target: DartTarget,
  profile: PlayerProfile,
  dartsInBoard: SimulatedDart[],
  rng: RandomSource,
): SimulatedDart {
  const raw = sampleLanding(target, profile, rng);
  const p = applyObstruction(raw, dartsInBoard, rng);
  if (!p) {
    // Bounce-out: the dart scores nothing and falls out; mark it off-board.
    return { x: raw.x, y: raw.y, segment: null, multiplier: 0, score: 0, aimedAt: target, bouncedOut: true };
  }
  const bed = resolvePoint(p.x, p.y);
  return { x: p.x, y: p.y, segment: bed.segment, multiplier: bed.multiplier, score: bed.score, aimedAt: target };
}
