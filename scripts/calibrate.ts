// Find, for each profile, the spread (mm) whose scoring average matches the target.
// Scoring average = 3 x mean points per dart when aiming at T20 (the scoring phase).
// Usage: npx tsx scripts/calibrate.ts
import { writeFileSync } from 'node:fs';
import { simulateDartAt } from '../src/game/simulation/dispersion';
import { createRng } from '../src/game/simulation/rng';
import type { PlayerProfile } from '../src/game/types';

const TARGETS: Record<string, number> = { easy: 105, medium: 75, hard: 50, extreme: 27 };
const SAMPLES = 200_000;

function scoringAverage(sigma: number): number {
  const p: PlayerProfile = {
    id: 'x',
    name: 'x',
    targetAverage: 0,
    radialAccuracy: sigma,
    angularAccuracy: sigma,
    doubleAccuracyModifier: 1.1,
    trebleAccuracyModifier: 1,
    bullAccuracyModifier: 1.1,
    largeMissProbability: 0.03,
  };
  const rng = createRng(42);
  let total = 0;
  for (let i = 0; i < SAMPLES; i++) total += simulateDartAt({ kind: 'T', number: 20 }, p, rng).score;
  return (3 * total) / SAMPLES;
}

const out: Record<string, number> = {};
for (const [id, target] of Object.entries(TARGETS)) {
  // Average falls as spread grows: bisection.
  let lo = 1;
  let hi = 250;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (scoringAverage(mid) > target) lo = mid;
    else hi = mid;
  }
  const s = Math.round(((lo + hi) / 2) * 100) / 100;
  out[id] = s;
  console.log(`${id.padEnd(8)} target ${target}  sigma ${s} mm  check ${scoringAverage(s).toFixed(1)}`);
}
writeFileSync(new URL('../src/data/calibration.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
