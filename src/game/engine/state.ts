import { scoreDart } from '../scoring/rules';
import type { GameState, PlayerProfile, SimulatedDart, VisitRecord } from '../types';

export const START_SCORE = 501;

export function createLeg(profile: PlayerProfile, opts: { startScore?: number; opponentScore?: number | null } = {}): GameState {
  const start = opts.startScore ?? START_SCORE;
  return {
    playerScore: start,
    opponentScore: opts.opponentScore ?? null,
    dartsRemainingInVisit: 3,
    visitScore: 0,
    visitStartScore: start,
    dartsInBoard: [],
    visitDarts: [],
    visitNumber: 1,
    totalDartsThrown: 0,
    playerProfile: profile,
    legStatus: 'active',
    history: [],
  };
}

/**
 * Apply a thrown dart. Pure: returns a new state.
 * Handles bust (restores the visit start score and ends the visit),
 * checkout (double out, leg won) and the end of a three-dart visit.
 */
export function applyDartResult(state: GameState, dart: SimulatedDart): GameState {
  if (state.legStatus !== 'active') throw new Error('Leg is over');
  const isDouble = dart.multiplier === 2;
  const result = scoreDart(state.playerScore, dart.score, isDouble);
  const darts = [...state.visitDarts, dart];
  // A bounced-out dart is part of the visit but no longer physically in the board.
  const inBoard = dart.bouncedOut ? state.dartsInBoard : darts;
  const totalDartsThrown = state.totalDartsThrown + 1;

  const endVisit = (finalScore: number, bust: boolean, checkout: boolean): GameState => {
    const record: VisitRecord = {
      visitNumber: state.visitNumber,
      startScore: state.visitStartScore,
      darts,
      scored: bust ? 0 : state.visitStartScore - finalScore,
      bust,
      checkout,
    };
    return {
      ...state,
      playerScore: finalScore,
      dartsRemainingInVisit: 3,
      visitScore: 0,
      visitStartScore: finalScore,
      dartsInBoard: [],
      visitDarts: [],
      visitNumber: checkout ? state.visitNumber : state.visitNumber + 1,
      totalDartsThrown,
      legStatus: checkout ? 'won' : 'active',
      history: [...state.history, record],
    };
  };

  if (result.kind === 'bust') return endVisit(state.visitStartScore, true, false);
  if (result.kind === 'checkout') return endVisit(0, false, true);

  if (state.dartsRemainingInVisit === 1) return endVisit(result.remaining, false, false);
  return {
    ...state,
    playerScore: result.remaining,
    dartsRemainingInVisit: (state.dartsRemainingInVisit - 1) as 1 | 2,
    visitScore: state.visitScore + dart.score,
    dartsInBoard: inBoard,
    visitDarts: darts,
    totalDartsThrown,
  };
}

/** Darts in the board right now, for display: the current visit, or the last finished one. */
export function lastVisit(state: GameState): VisitRecord | undefined {
  return state.history[state.history.length - 1];
}
