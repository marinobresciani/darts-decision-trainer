import { ALL_TARGETS, OUTCOMES, targetKey } from '../board/geometry';
import { scoreDart } from '../scoring/rules';
import type { DistributionTable, SparseDistribution } from '../simulation/outcomes';
import { toSparse } from '../simulation/outcomes';
import type { DartTarget } from '../types';

/**
 * The route engine is a decision graph, not a checkout table.
 *
 * For a given simulated player we compute V(s): the expected number of darts
 * to finish the leg from score s at the start of a visit, playing optimally.
 * Inside a visit the value also depends on the score the visit started on,
 * because a bust sends the player back there:
 *
 *   W(s0; s, d) = min over targets t of  1 + sum_o P(o | t) * next(o)
 *   next(o) = 0                      on checkout
 *           = V(s0)                  on bust
 *           = V(r)                   if that was the last dart of the visit
 *           = W(s0; r, d - 1)        otherwise
 *
 * Every target on the board is considered (singles, doubles, trebles, 25 and
 * Bull), so unorthodox routes are found when the numbers say they are good.
 */

export type SolverTables = {
  /** V[s] for s = 0..maxScore; V[0] = 0, V[1] unused. */
  V: Float64Array;
  targets: DartTarget[];
  sparse: SparseDistribution[];
};

export function prepareTargets(dist: DistributionTable): { targets: DartTarget[]; sparse: SparseDistribution[] } {
  const targets = ALL_TARGETS;
  return { targets, sparse: targets.map((t) => toSparse(dist[targetKey(t)])) };
}

/** Within-visit values for one visit start score s0, given V for every lower score and a guess for V(s0). */
function visitValues(
  s0: number,
  vS0: number,
  V: Float64Array,
  sparse: SparseDistribution[],
): (s: number, d: number) => { value: number; q: Float64Array } {
  const memo = new Map<number, { value: number; q: Float64Array }>();
  const next = (s: number, d: number, o: number): number => {
    const out = OUTCOMES[o];
    const res = scoreDart(s, out.score, out.isDouble);
    if (res.kind === 'checkout') return 0;
    if (res.kind === 'bust') return vS0;
    const r = res.remaining;
    if (d === 1) return r === s0 ? vS0 : V[r];
    return get(r, d - 1).value;
  };
  const get = (s: number, d: number) => {
    const key = s * 4 + d;
    const hit = memo.get(key);
    if (hit) return hit;
    const q = new Float64Array(sparse.length);
    let best = Infinity;
    for (let t = 0; t < sparse.length; t++) {
      const sd = sparse[t];
      let e = 1;
      for (let k = 0; k < sd.idx.length; k++) e += sd.p[k] * next(s, d, sd.idx[k]);
      q[t] = e;
      if (e < best) best = e;
    }
    const v = { value: best, q };
    memo.set(key, v);
    return v;
  };
  return get;
}

/** Solve V(s) for s = 2..maxScore. Cost grows with maxScore; 501 takes a few seconds in Node. */
export function solve(dist: DistributionTable, maxScore = 501): SolverTables {
  const { targets, sparse } = prepareTargets(dist);
  const V = new Float64Array(maxScore + 1);
  V[0] = 0;
  V[1] = Infinity;
  for (let s0 = 2; s0 <= maxScore; s0++) {
    // V(s0) appears on both sides (bust, or a visit that scores nothing): fixed-point iteration.
    let guess = s0 > 2 ? V[s0 - 1] + 0.5 : 5;
    for (let iter = 0; iter < 60; iter++) {
      const value = visitValues(s0, guess, V, sparse)(s0, 3).value;
      if (Math.abs(value - guess) < 1e-7) {
        guess = value;
        break;
      }
      guess = value;
    }
    V[s0] = guess;
  }
  return { V, targets, sparse };
}

/**
 * Expected darts to finish for every target, from the current in-visit position.
 * `sparse` may be overridden per target (e.g. obstructed targets).
 */
export function evaluateTargets(
  tables: SolverTables,
  visitStartScore: number,
  score: number,
  dartsLeft: 1 | 2 | 3,
  sparseOverride?: SparseDistribution[],
): Float64Array {
  const sparse = sparseOverride ?? tables.sparse;
  const get = visitValues(visitStartScore, tables.V[visitStartScore], tables.V, tables.sparse);
  // Recompute only the top level with the (possibly obstructed) distributions.
  const q = new Float64Array(sparse.length);
  for (let t = 0; t < sparse.length; t++) {
    const sd = sparse[t];
    let e = 1;
    for (let k = 0; k < sd.idx.length; k++) {
      const out = OUTCOMES[sd.idx[k]];
      const res = scoreDart(score, out.score, out.isDouble);
      let n: number;
      if (res.kind === 'checkout') n = 0;
      else if (res.kind === 'bust') n = tables.V[visitStartScore];
      else if (dartsLeft === 1) n = tables.V[res.remaining];
      else n = get(res.remaining, dartsLeft - 1).value;
      e += sd.p[k] * n;
    }
    q[t] = e;
  }
  return q;
}
