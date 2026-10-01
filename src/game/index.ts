// Public engine API (spec §20). Platform-independent: no React, no browser APIs.
import { throwWithObstruction } from './simulation/obstruction';
import type { DartTarget, GameState, RandomSource, SimulatedDart } from './types';

export * from './types';
export { createLeg, applyDartResult, START_SCORE } from './engine/state';
export { evaluateTargetChoice, generateTargetCandidates } from './routes/decisions';
export { calculateObstruction } from './simulation/obstruction';
export { createRng } from './simulation/rng';
export { PROFILES, profileById } from './profiles';
export { targetLabel, parseTarget, resolvePoint, BOARD_ORDER } from './board/geometry';
export { isBogey, canCheckout, BOGEY_NUMBERS } from './scoring/rules';

/** Simulate the physical throw: the player's spread, then any deflection off darts already in the board. */
export function simulateDart(state: GameState, target: DartTarget, rng: RandomSource): SimulatedDart {
  return throwWithObstruction(target, state.playerProfile, state.dartsInBoard, rng);
}
