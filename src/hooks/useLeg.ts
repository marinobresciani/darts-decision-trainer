import { useCallback, useMemo, useRef, useState } from 'react';
import {
  applyDartResult,
  createLeg,
  createRng,
  evaluateTargetChoice,
  generateTargetCandidates,
  simulateDart,
  targetLabel,
  type DecisionEvaluation,
  type GameState,
  type PlayerProfile,
  type SimulatedDart,
  type TargetCandidate,
} from '../game';
import { isDoubleTarget } from '../game/board/geometry';
import type { DecisionLogEntry } from '../state/stats';

export type Turn = {
  evaluation: DecisionEvaluation;
  dart: SimulatedDart;
  /** Score and darts in hand when the choice was made: the position the grade refers to. */
  before: number;
  dartsBefore: number;
  /** Remaining score after this dart (or the restored score on a bust). */
  after: number;
  bust: boolean;
  checkout: boolean;
  visitEnded: boolean;
  visitScored?: number;
};

function landedLabel(d: SimulatedDart): string {
  if (d.bouncedOut) return 'Bounce-out (0)';
  if (d.segment === null) return 'Off the board (0)';
  if (d.segment === 'bull') return d.multiplier === 2 ? 'Bull (50)' : '25';
  const p = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : 'S';
  return `${p}${d.segment} (${d.score})`;
}

export function useLeg(profile: PlayerProfile, seed: number) {
  const rng = useRef(createRng(seed));
  const [state, setState] = useState<GameState>(() => createLeg(profile));
  const [lastTurn, setLastTurn] = useState<Turn | null>(null);
  const [ghost, setGhost] = useState<SimulatedDart[]>([]);
  const [log, setLog] = useState<DecisionLogEntry[]>([]);
  const [checkoutDarts, setCheckoutDarts] = useState(0);

  const candidates: TargetCandidate[] = useMemo(
    () => (state.legStatus === 'active' ? generateTargetCandidates(state) : []),
    [state],
  );

  const choose = useCallback(
    (c: TargetCandidate) => {
      if (state.legStatus !== 'active') return;
      const evaluation = evaluateTargetChoice(state, c.target);
      const dart = simulateDart(state, c.target, rng.current);
      const next = applyDartResult(state, dart);
      const visitEnded = next.visitNumber !== state.visitNumber || next.legStatus !== 'active';
      const rec = visitEnded ? next.history[next.history.length - 1] : undefined;
      setLog((l) => [
        ...l,
        {
          score: state.playerScore,
          dartsLeft: state.dartsRemainingInVisit,
          target: targetLabel(c.target),
          grade: evaluation.grade,
          feedback: evaluation.feedback,
          bogeyMistake: /bogey/i.test(evaluation.feedback) && evaluation.grade !== 'preferred',
          obstructionRelated: /obstruct/i.test(evaluation.feedback),
          landed: landedLabel(dart),
        },
      ]);
      if (state.playerScore <= 170 && isDoubleTarget(c.target)) setCheckoutDarts((n) => n + 1);
      setGhost(visitEnded ? (rec?.darts ?? []) : []);
      setLastTurn({
        evaluation,
        dart,
        before: state.playerScore,
        dartsBefore: state.dartsRemainingInVisit,
        after: next.playerScore,
        bust: !!rec?.bust,
        checkout: !!rec?.checkout,
        visitEnded,
        visitScored: rec?.scored,
      });
      setState(next);
    },
    [state],
  );

  return { state, candidates, choose, lastTurn, ghost, log, checkoutDarts, landedLabel };
}
