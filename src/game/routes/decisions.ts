import { OUTCOMES, targetKey, targetLabel, targetValue, isDoubleTarget } from '../board/geometry';
import { canCheckout, isBogey, scoreDart } from '../scoring/rules';
import { calculateObstruction, obstructedDistribution } from '../simulation/obstruction';
import { toSparse, type SparseDistribution } from '../simulation/outcomes';
import type { DartTarget, DecisionEvaluation, DecisionGrade, GameState, TargetCandidate } from '../types';
import { evaluateTargets, type SolverTables } from './solver';
import { tablesFor } from './tables';

/** Grade bands, in expected darts lost against the best choice. */
const PREFERRED_WITHIN = 0.03;
const GOOD_WITHIN = 0.12;
const ACCEPTABLE_WITHIN = 0.35;

type Analysis = {
  tables: SolverTables;
  q: Float64Array;
  /** Values ignoring the darts in the board, to explain obstruction. */
  q0: Float64Array;
  sparse: SparseDistribution[];
  bestIndex: number;
  obstructed: Set<number>;
};

const memo = new WeakMap<GameState, Analysis>();

/** Expected darts for every target in the current state, with obstruction applied. */
function analyse(state: GameState): Analysis {
  const hit = memo.get(state);
  if (hit) return hit;
  const tables = tablesFor(state.playerProfile.id);
  const sparse = [...tables.sparse];
  const obstructed = new Set<number>();
  if (state.dartsInBoard.length) {
    tables.targets.forEach((t, i) => {
      const ob = calculateObstruction(t, state.dartsInBoard);
      if (ob.nearbyDarts > 0) {
        sparse[i] = toSparse(obstructedDistribution(t, state.playerProfile, state.dartsInBoard));
        if (ob.blockedFraction > 0.15) obstructed.add(i);
      }
    });
  }
  const q = evaluateTargets(tables, state.visitStartScore, state.playerScore, state.dartsRemainingInVisit, sparse);
  const q0 = obstructed.size
    ? evaluateTargets(tables, state.visitStartScore, state.playerScore, state.dartsRemainingInVisit)
    : q;
  let bestIndex = 0;
  for (let i = 1; i < q.length; i++) if (q[i] < q[bestIndex]) bestIndex = i;
  const a = { tables, q, q0, sparse, bestIndex, obstructed };
  memo.set(state, a);
  return a;
}

/** Hitting the target exactly would bust: never a sensible aim. */
function isInvalid(state: GameState, t: DartTarget): boolean {
  return scoreDart(state.playerScore, targetValue(t), isDoubleTarget(t)).kind === 'bust';
}

function gradeFor(delta: number, invalid: boolean): DecisionGrade {
  if (invalid) return 'invalid';
  if (delta <= PREFERRED_WITHIN) return 'preferred';
  if (delta <= GOOD_WITHIN) return 'good_alternative';
  if (delta <= ACCEPTABLE_WITHIN) return 'acceptable';
  return 'poor';
}

/** Probability that this throw busts the visit. */
function bustProbability(state: GameState, sd: SparseDistribution): number {
  let p = 0;
  sd.idx.forEach((o, k) => {
    if (scoreDart(state.playerScore, OUTCOMES[o].score, OUTCOMES[o].isDouble).kind === 'bust') p += sd.p[k];
  });
  return p;
}

/** The most likely outcome of this throw that would leave a bogey number at the end of the visit. */
function bogeyLeave(state: GameState, sd: SparseDistribution): { label: string; leave: number; p: number } | null {
  if (state.dartsRemainingInVisit !== 1) return null;
  let found: { label: string; leave: number; p: number } | null = null;
  sd.idx.forEach((o, k) => {
    const res = scoreDart(state.playerScore, OUTCOMES[o].score, OUTCOMES[o].isDouble);
    if (res.kind === 'continue' && isBogey(res.remaining) && sd.p[k] >= 0.08) {
      if (!found || sd.p[k] > found.p) found = { label: OUTCOMES[o].label, leave: res.remaining, p: sd.p[k] };
    }
  });
  return found;
}

function describeOutcome(label: string): string {
  if (label.startsWith('S')) return `a single ${label.slice(1)}`;
  if (label.startsWith('T')) return `treble ${label.slice(1)}`;
  if (label.startsWith('D')) return `double ${label.slice(1)}`;
  return label;
}

export function evaluateTargetChoice(state: GameState, target: DartTarget): DecisionEvaluation {
  const a = analyse(state);
  const i = a.tables.targets.findIndex((t) => targetKey(t) === targetKey(target));
  const best = a.q[a.bestIndex];
  const delta = a.q[i] - best;
  const invalid = isInvalid(state, target);
  let grade = gradeFor(delta, invalid);

  // Bogey teaching rule (spec §7): when a likely miss leaves a bogey and an
  // equally good target avoids it, the choice is never "preferred", even if
  // the expected-darts difference is small for this simulated player.
  const myBogey = invalid ? null : bogeyLeave(state, a.sparse[i]);
  const bogeyFree =
    myBogey &&
    a.tables.targets.findIndex(
      (_, k) => k !== i && a.q[k] - best <= GOOD_WITHIN && !isInvalid(state, a.tables.targets[k]) && (bogeyLeave(state, a.sparse[k])?.p ?? 0) < myBogey.p / 2,
    );
  if (myBogey && bogeyFree !== null && bogeyFree !== undefined && bogeyFree >= 0 && grade === 'preferred') grade = 'good_alternative';
  const bestTargets = a.tables.targets.filter((_, k) => a.q[k] - best <= PREFERRED_WITHIN);
  const bestLabel = targetLabel(a.tables.targets[a.bestIndex]);
  const label = targetLabel(target);

  let feedback = '';
  if (invalid) {
    feedback = `${label} can't work here: hitting it busts on ${state.playerScore}.`;
  } else if (grade === 'preferred') {
    // Praise a switch away from an obstructed bed; otherwise stay quiet on obvious scoring darts.
    // An obstructed target that would have been the right call on a clear board.
    const blockedBest = [...a.obstructed].find(
      (k) => k !== i && a.q0[k] - Math.min(...a.q0) <= PREFERRED_WITHIN && a.q[k] - best > PREFERRED_WITHIN,
    );
    if (blockedBest !== undefined) feedback = `Good switch: ${targetLabel(a.tables.targets[blockedBest])} is obstructed.`;
    else if (state.playerScore <= 170) feedback = 'Good route.';
  } else if (grade === 'good_alternative' && myBogey && bogeyFree !== null && bogeyFree !== undefined && bogeyFree >= 0) {
    feedback = `Risky: ${describeOutcome(myBogey.label)} leaves ${myBogey.leave}, a bogey. ${targetLabel(a.tables.targets[bogeyFree])} avoids it.`;
  } else if (grade === 'good_alternative') {
    feedback = `Strong alternative. ${bestLabel} is slightly better.`;
  } else {
    const reasons: string[] = [];
    const bogey = bogeyLeave(state, a.sparse[i]);
    const bestBogey = bogeyLeave(state, a.sparse[a.bestIndex]);
    if (bogey && (!bestBogey || bestBogey.p < bogey.p / 2)) {
      reasons.push(`Risky: ${describeOutcome(bogey.label)} leaves ${bogey.leave}, a bogey.`);
    }
    if (a.obstructed.has(i)) reasons.push(`${label} is heavily obstructed.`);
    const pb = bustProbability(state, a.sparse[i]);
    if (pb - bustProbability(state, a.sparse[a.bestIndex]) > 0.1) reasons.push(`About ${Math.round(pb * 100)}% of throws here bust.`);
    if (state.dartsRemainingInVisit === 1 && !canCheckout(state.playerScore - targetValue(target), 3) && state.playerScore - targetValue(target) > 1 && state.playerScore - targetValue(target) <= 170) {
      reasons.push(`Even a hit leaves ${state.playerScore - targetValue(target)}, with no three-dart finish.`);
    }
    reasons.push(`${bestLabel} gives a better route.`);
    feedback = reasons.slice(0, 2).join(' ');
  }

  return { target, grade, expectedDarts: a.q[i], bestExpectedDarts: best, bestTargets, feedback };
}

const DISPLAY_ORDER: Record<DartTarget['kind'], number> = { T: 0, S: 1, D: 2, SB: 3, DB: 4 };

/**
 * About ten plausible choices: the strongest routes, plus tempting but weaker
 * options (the "obvious" treble, a bogey trap, an obstructed bed) and, now and
 * then, a target that cannot work, because spotting those is part of the skill.
 */
export function generateTargetCandidates(state: GameState, count = 10): TargetCandidate[] {
  const a = analyse(state);
  const best = a.q[a.bestIndex];
  const order = Array.from(a.q, (v, k) => [v, k] as const).sort((x, y) => x[0] - y[0]).map(([, k]) => k);
  const keys = a.tables.targets.map(targetKey);
  const chosen = new Set<number>();
  const add = (k: number | undefined) => {
    if (k !== undefined && k >= 0 && chosen.size < count) chosen.add(k);
  };

  // The strongest five.
  order.slice(0, 5).forEach(add);
  // The habitual targets players reach for.
  ['T20', 'T19', 'Bull'].forEach((key) => {
    const k = keys.indexOf(key);
    if (k >= 0 && (state.playerScore > 60 || key === 'Bull')) add(k);
  });
  // Obstructed beds, so the trainee has to notice them.
  a.obstructed.forEach(add);
  // A bogey trap on the last dart of a visit.
  if (state.dartsRemainingInVisit === 1) {
    const trap = order.find((k) => bogeyLeave(state, a.sparse[k]) && !chosen.has(k));
    add(trap);
  }
  // The double you're "on", even when it isn't the best idea.
  if (state.playerScore <= 40 && state.playerScore % 2 === 0) add(keys.indexOf(`D${state.playerScore / 2}`));
  if (state.playerScore === 50) add(keys.indexOf('Bull'));
  // One target that cannot work, near the finish, where the mistake is instructive.
  if (state.playerScore <= 60) {
    const invalid = order.find((k) => isInvalid(state, a.tables.targets[k]) && a.tables.targets[k].kind !== 'S');
    if (invalid !== undefined && chosen.size < count) add(invalid);
  }
  // Fill up with the next best.
  for (const k of order) {
    if (chosen.size >= count) break;
    add(k);
  }

  return [...chosen]
    .map((k) => {
      const t = a.tables.targets[k];
      const invalid = isInvalid(state, t);
      return { target: t, label: targetLabel(t), expectedDarts: a.q[k], grade: gradeFor(a.q[k] - best, invalid) };
    })
    .sort((x, y) => {
      const d = DISPLAY_ORDER[x.target.kind] - DISPLAY_ORDER[y.target.kind];
      if (d) return d;
      return ('number' in y.target ? y.target.number : 0) - ('number' in x.target ? x.target.number : 0);
    });
}
