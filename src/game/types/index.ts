// Core types shared by the engine, the simulator and the route engine.
// Nothing in src/game may import React, React Native or browser APIs.

/** A target the trainee can aim at. */
export type DartTarget =
  | { kind: 'S'; number: number } // single (aim point in the inner single bed)
  | { kind: 'D'; number: number } // double
  | { kind: 'T'; number: number } // treble
  | { kind: 'SB' } // outer bull, 25
  | { kind: 'DB' }; // bullseye, 50 (counts as a double)

/** Where a dart actually landed, resolved to a scoring bed. */
export type Multiplier = 0 | 1 | 2 | 3;

export type SimulatedDart = {
  /** Board coordinates in millimetres, origin at the bull, y pointing up (towards 20). */
  x: number;
  y: number;
  segment: number | 'bull' | null; // null = outside the scoring area
  multiplier: Multiplier;
  score: number;
  /** The target the trainee chose for this dart. */
  aimedAt: DartTarget;
  entryAngle?: number;
  /** True when the dart hit another dart and fell out (scores 0, not left in the board). */
  bouncedOut?: boolean;
};

export type PlayerProfile = {
  id: string;
  name: string;
  /** Nominal three-dart average the profile is calibrated to. */
  targetAverage: number;
  /** Standard deviation (mm) of the landing point along the radius through the aim point. */
  radialAccuracy: number;
  /** Standard deviation (mm) perpendicular to the radius. */
  angularAccuracy: number;
  doubleAccuracyModifier: number;
  trebleAccuracyModifier: number;
  bullAccuracyModifier: number;
  /** Probability that a dart is thrown with three times the normal spread. */
  largeMissProbability: number;
};

export type OpponentState = {
  score: number;
};

export type LegStatus = 'active' | 'won' | 'lost';

export type VisitRecord = {
  visitNumber: number;
  startScore: number;
  darts: SimulatedDart[];
  scored: number;
  bust: boolean;
  checkout: boolean;
};

export type GameState = {
  playerScore: number;
  opponentScore: number | null;
  dartsRemainingInVisit: 1 | 2 | 3;
  visitScore: number;
  /** Score at the start of the current visit, restored on bust. */
  visitStartScore: number;
  /** Darts physically in the board (cleared at the end of each visit). */
  dartsInBoard: SimulatedDart[];
  /** Every dart thrown this visit, including bounce-outs. */
  visitDarts: SimulatedDart[];
  visitNumber: number;
  totalDartsThrown: number;
  playerProfile: PlayerProfile;
  legStatus: LegStatus;
  /** Completed visits, newest last. */
  history: VisitRecord[];
};

export type DecisionGrade = 'preferred' | 'good_alternative' | 'acceptable' | 'poor' | 'invalid';

export type DecisionEvaluation = {
  target: DartTarget;
  grade: DecisionGrade;
  /** Expected darts to finish the leg after this choice (lower is better). */
  expectedDarts: number;
  /** Expected darts after the best available choice. */
  bestExpectedDarts: number;
  bestTargets: DartTarget[];
  /** Short, user-facing explanation; empty when nothing is worth saying. */
  feedback: string;
};

export type TargetCandidate = {
  target: DartTarget;
  label: string;
  expectedDarts: number;
  grade: DecisionGrade;
};

/** A source of uniform random numbers in [0, 1). */
export type RandomSource = () => number;
