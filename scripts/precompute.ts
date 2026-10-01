// Precompute, per profile, the outcome distributions and the value table V(s).
// The app loads these instead of solving on the phone.
// Usage: npx tsx scripts/precompute.ts
import { writeFileSync } from 'node:fs';
import { PROFILES } from '../src/game/profiles';
import { buildDistributionTable } from '../src/game/simulation/outcomes';
import { solve } from '../src/game/routes/solver';

for (const p of PROFILES) {
  const t0 = Date.now();
  const dist = buildDistributionTable(p, 40000, 2026);
  const tables = solve(dist, 501);
  const round = (x: number) => Math.round(x * 1e5) / 1e5;
  const data = {
    profileId: p.id,
    sigma: p.radialAccuracy,
    dist: Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, Array.from(v, round)])),
    V: Array.from(tables.V, (x) => (Number.isFinite(x) ? round(x) : null)),
  };
  writeFileSync(new URL(`../src/data/tables-${p.id}.json`, import.meta.url), JSON.stringify(data));
  console.log(
    `${p.id.padEnd(8)} ${(Date.now() - t0) / 1000}s  V(501)=${tables.V[501].toFixed(1)} darts  V(170)=${tables.V[170].toFixed(2)}  V(40)=${tables.V[40].toFixed(2)}`,
  );
}
