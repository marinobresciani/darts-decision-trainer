import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DecisionGrade } from '../game/types';

export type DecisionLogEntry = {
  score: number;
  dartsLeft: number;
  target: string;
  grade: DecisionGrade;
  feedback: string;
  bogeyMistake: boolean;
  obstructionRelated: boolean;
  landed: string;
};

export type LegRecord = {
  date: string;
  profileId: string;
  targetAverage: number;
  won: boolean;
  darts: number;
  visits: number;
  /** Actual three-dart average the simulator produced. */
  average: number;
  /** Darts thrown while on a finish (score at most 170 and a double was aimed at). */
  checkoutDarts: number;
  decisions: DecisionLogEntry[];
};

const KEY = 'darts-trainer/legs/v1';

export async function loadLegs(): Promise<LegRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LegRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveLeg(leg: LegRecord): Promise<void> {
  try {
    const legs = await loadLegs();
    legs.push(leg);
    await AsyncStorage.setItem(KEY, JSON.stringify(legs.slice(-200)));
  } catch {
    // Storage is a convenience; the game works without it.
  }
}

export async function clearLegs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

/** Decision quality as a 0-100 score: preferred 100, good 80, acceptable 50, poor 15, invalid 0. */
export function decisionScore(decisions: DecisionLogEntry[]): number {
  if (!decisions.length) return 0;
  const w: Record<DecisionGrade, number> = { preferred: 100, good_alternative: 80, acceptable: 50, poor: 15, invalid: 0 };
  return Math.round(decisions.reduce((s, d) => s + w[d.grade], 0) / decisions.length);
}

export function gradeCounts(decisions: DecisionLogEntry[]): Record<DecisionGrade, number> {
  const c: Record<DecisionGrade, number> = { preferred: 0, good_alternative: 0, acceptable: 0, poor: 0, invalid: 0 };
  decisions.forEach((d) => c[d.grade]++);
  return c;
}
