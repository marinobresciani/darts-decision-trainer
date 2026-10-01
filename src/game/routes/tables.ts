import easy from '../../data/tables-easy.json';
import medium from '../../data/tables-medium.json';
import hard from '../../data/tables-hard.json';
import extreme from '../../data/tables-extreme.json';
import type { DistributionTable } from '../simulation/outcomes';
import { prepareTargets, type SolverTables } from './solver';

type RawTables = { profileId: string; dist: Record<string, number[]>; V: (number | null)[] };

const RAW: Record<string, RawTables> = { easy, medium, hard, extreme } as Record<string, RawTables>;
const cache = new Map<string, SolverTables & { dist: DistributionTable }>();

/** Precomputed route tables for a profile (built by scripts/precompute.ts). */
export function tablesFor(profileId: string): SolverTables & { dist: DistributionTable } {
  const hit = cache.get(profileId);
  if (hit) return hit;
  const raw = RAW[profileId];
  if (!raw) throw new Error(`No precomputed tables for profile "${profileId}". Run scripts/precompute.ts.`);
  const dist: DistributionTable = Object.fromEntries(Object.entries(raw.dist).map(([k, v]) => [k, Float64Array.from(v)]));
  const V = Float64Array.from(raw.V.map((x) => (x === null ? Infinity : x)));
  const { targets, sparse } = prepareTargets(dist);
  const t = { V, targets, sparse, dist };
  cache.set(profileId, t);
  return t;
}
