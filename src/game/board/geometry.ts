import type { DartTarget, Multiplier } from '../types';

// Standard steel-tip dartboard dimensions in millimetres (WDF/BDO regulation radii).
export const R_BULLSEYE = 6.35;
export const R_OUTER_BULL = 15.9;
export const R_TREBLE_INNER = 99;
export const R_TREBLE_OUTER = 107;
export const R_DOUBLE_INNER = 162;
export const R_DOUBLE_OUTER = 170;

/** Numbers clockwise from the top. */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;

const WEDGE_DEG = 18;

/** Angle (degrees, clockwise from the top) of the centre of a number's wedge. */
export function wedgeCentreAngle(n: number): number {
  const i = BOARD_ORDER.indexOf(n as (typeof BOARD_ORDER)[number]);
  if (i < 0) throw new Error(`Not a board number: ${n}`);
  return i * WEDGE_DEG;
}

/** The two numbers either side of n on the board. */
export function neighbours(n: number): [number, number] {
  const i = BOARD_ORDER.indexOf(n as (typeof BOARD_ORDER)[number]);
  return [BOARD_ORDER[(i + 19) % 20], BOARD_ORDER[(i + 1) % 20]];
}

export type ResolvedBed = { segment: number | 'bull' | null; multiplier: Multiplier; score: number };

/** Resolve a landing point to the bed it scores in. */
export function resolvePoint(x: number, y: number): ResolvedBed {
  const r = Math.hypot(x, y);
  if (r <= R_BULLSEYE) return { segment: 'bull', multiplier: 2, score: 50 };
  if (r <= R_OUTER_BULL) return { segment: 'bull', multiplier: 1, score: 25 };
  if (r > R_DOUBLE_OUTER) return { segment: null, multiplier: 0, score: 0 };
  // Clockwise angle from the top.
  let deg = (Math.atan2(x, y) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  const idx = Math.floor(((deg + WEDGE_DEG / 2) % 360) / WEDGE_DEG);
  const n = BOARD_ORDER[idx];
  let multiplier: Multiplier = 1;
  if (r >= R_TREBLE_INNER && r <= R_TREBLE_OUTER) multiplier = 3;
  else if (r >= R_DOUBLE_INNER) multiplier = 2;
  return { segment: n, multiplier, score: n * multiplier };
}

/** Polar to board coordinates (angle clockwise from the top). */
export function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(a), y: radius * Math.cos(a) };
}

/** The point a player aims at for a given target. */
export function aimPoint(t: DartTarget): { x: number; y: number } {
  switch (t.kind) {
    case 'DB':
      return { x: 0, y: 0 };
    case 'SB':
      // Aim at the outer-bull ring itself, above the bullseye.
      return polar((R_BULLSEYE + R_OUTER_BULL) / 2, 0);
    case 'T':
      return polar((R_TREBLE_INNER + R_TREBLE_OUTER) / 2, wedgeCentreAngle(t.number));
    case 'D':
      return polar((R_DOUBLE_INNER + R_DOUBLE_OUTER) / 2, wedgeCentreAngle(t.number));
    case 'S':
      // The fat inner single: safe from the double ring, the usual setup aim.
      return polar((R_OUTER_BULL + R_TREBLE_INNER) / 2, wedgeCentreAngle(t.number));
  }
}

/** Points scored if the target is hit exactly. */
export function targetValue(t: DartTarget): number {
  switch (t.kind) {
    case 'DB':
      return 50;
    case 'SB':
      return 25;
    case 'T':
      return t.number * 3;
    case 'D':
      return t.number * 2;
    case 'S':
      return t.number;
  }
}

export function isDoubleTarget(t: DartTarget): boolean {
  return t.kind === 'D' || t.kind === 'DB';
}

export function targetLabel(t: DartTarget): string {
  switch (t.kind) {
    case 'DB':
      return 'Bull';
    case 'SB':
      return '25';
    default:
      return `${t.kind}${t.number}`;
  }
}

export function targetKey(t: DartTarget): string {
  return targetLabel(t);
}

export function parseTarget(label: string): DartTarget {
  if (label === 'Bull') return { kind: 'DB' };
  if (label === '25') return { kind: 'SB' };
  const kind = label[0] as 'S' | 'D' | 'T';
  const number = Number(label.slice(1));
  if (!['S', 'D', 'T'].includes(kind) || !(number >= 1 && number <= 20)) {
    throw new Error(`Bad target label: ${label}`);
  }
  return { kind, number };
}

/** Every aimable target: 20 singles, 20 doubles, 20 trebles, 25 and Bull. */
export const ALL_TARGETS: DartTarget[] = [
  ...BOARD_ORDER.flatMap((n): DartTarget[] => [
    { kind: 'T', number: n },
    { kind: 'D', number: n },
    { kind: 'S', number: n },
  ]),
  { kind: 'SB' },
  { kind: 'DB' },
];

/**
 * Discrete scoring outcomes, indexed 0..62:
 * 0 = miss (outside the scoring area), then S1..S20, D1..D20, T1..T20, 25, 50.
 */
export const OUTCOME_COUNT = 63;

export function outcomeIndex(bed: ResolvedBed): number {
  if (bed.segment === null) return 0;
  if (bed.segment === 'bull') return bed.multiplier === 2 ? 62 : 61;
  return bed.multiplier === 1 ? bed.segment : bed.multiplier === 2 ? 20 + bed.segment : 40 + bed.segment;
}

export type Outcome = { score: number; isDouble: boolean; label: string };

export const OUTCOMES: Outcome[] = Array.from({ length: OUTCOME_COUNT }, (_, i) => {
  if (i === 0) return { score: 0, isDouble: false, label: 'Miss' };
  if (i === 61) return { score: 25, isDouble: false, label: '25' };
  if (i === 62) return { score: 50, isDouble: true, label: 'Bull' };
  if (i <= 20) return { score: i, isDouble: false, label: `S${i}` };
  if (i <= 40) return { score: (i - 20) * 2, isDouble: true, label: `D${i - 20}` };
  return { score: (i - 40) * 3, isDouble: false, label: `T${i - 40}` };
});
