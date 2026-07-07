// Dev/CI self-check for the pure fee model (computeSplit + eurCeil + surfPct), extracted from app.js.
// No framework: loads app.js headless, reads window._model, asserts the money-path invariants. Runs in <1s.
//   node scripts/test-model.mjs   (also `npm test`, and a CI step)
import assert from 'node:assert/strict';
import { loadApp } from './_load-app.mjs';

const M = loadApp()._model;
assert.ok(M && M.computeSplit, 'window._model.computeSplit is not exposed by app.js');
const { computeSplit, surfPct, eurCeil, SURF, RESERVES } = M;

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

// --- eurCeil: €0.01 floor + round UP to the cent (Rozo charges to the cent) ---
ok(eurCeil(0) === 0.01, 'eurCeil floor: 0 -> 0.01');
ok(eurCeil(0.001) === 0.01, 'eurCeil floor: tiny -> 0.01');
ok(eurCeil(1.231) === 1.24, 'eurCeil rounds UP to the cent');
ok(eurCeil(1.20) === 1.20, 'eurCeil exact cent unchanged');

// --- surfPct: never above the 0.5% cap, and rises (or holds) as the hub drains (lower L => dearer) ---
ok(SURF.cap === 0.5, 'SURF.cap is 0.5 (%)');
for (const dk of ['S2B', 'B2S']) for (const c of [200, 1000, 3000]) {
  ok(surfPct(dk, c, 9000) <= SURF.cap + 1e-9, `${dk} c=${c}: surfPct <= cap`);
  ok(surfPct(dk, c, 3000) >= surfPct(dk, c, 9000) - 1e-9, `${dk} c=${c}: surfPct rises as L drains`);
}

// synthetic exact per-chunk fees (fee[n] ~ chunk * rate) — internally consistent inputs for the invariants
const mkFees = (T, rate, maxN) => { const f = {}; for (let k = 1; k <= maxN; k++) f[k] = Math.round((T / k) * rate * 100) / 100; return f; };

// --- S2B reserves the Available => escalation => a range can appear. min <= likely <= max on every priced row ---
{
  const T = 3000, fees = mkFees(T, 0.0012, 6);
  const { rows, best, bestN } = computeSplit('S2B', T, 'exactIn', 9000, fees, 6, null);
  const priced = rows.filter(r => r.ok && !r.loading);
  ok(priced.length >= 3, 'S2B: several priced rows');
  for (const r of priced) {
    ok(r.feeFlat <= r.fee + 1e-9 && r.fee <= r.feeWorst + 1e-9, `S2B n=${r.n}: min <= likely <= max`);
    ok(Math.abs(r.feeFlat - r.n * eurCeil(fees[r.n])) < 1e-9, `S2B n=${r.n}: min = n * exact dryrun`);
  }
  ok(best && bestN === best.n, 'S2B: a recommended split is returned');
}

// --- B2S no longer reserves => ratio=1 => the range collapses (max == min, likely == min) ---
{
  const T = 3000, fees = mkFees(T, 0.0009, 6);
  const { rows } = computeSplit('B2S', T, 'exactIn', 12000, fees, 6, null);
  for (const r of rows.filter(r => r.ok && !r.loading)) {
    ok(r.feeWorst <= r.feeFlat + 1e-9, `B2S n=${r.n}: no range (max <= min)`);
    ok(r.fee === r.feeFlat, `B2S n=${r.n}: likely == min`);
  }
}

// --- a chunk larger than the liquidity is flagged infeasible, not priced ---
{
  const { rows } = computeSplit('S2B', 3000, 'exactIn', 500, { 1: 5 }, 6, null); // L0=500 < chunk 3000
  const r1 = rows.find(r => r.n === 1);
  ok(r1 && r1.ok === false, 'chunk > liquidity -> row.ok=false');
}

// --- F-6: per-chunk feasibility must account for the reservation each earlier chunk drains ---
// S2B reserves the Available → n chunks each ≤ L0 can still over-subscribe cumulatively (infeasible);
// B2S does not reserve → the same split stays feasible (cap stays L0 per chunk). That asymmetry IS F-6.
{
  const T = 8000, L0 = 5000, fees = mkFees(T, 0.0012, 4);   // n=2 → two ~3995 receipts, each ≤ L0=5000 but ~2× cumulatively
  const s2b = computeSplit('S2B', T, 'exactIn', L0, fees, 4, null).rows.find(r => r.n === 2);
  ok(s2b && s2b.ok === false, 'F-6 S2B: cumulatively over-subscribed split (2×~3995 > L0=5000) is infeasible');
  const b2s = computeSplit('B2S', T, 'exactIn', L0, fees, 4, null).rows.find(r => r.n === 2);
  ok(b2s && b2s.ok === true, 'F-6 B2S: no reservation → cap stays L0, same split feasible');
}

console.log(`✓ model self-check: ${n} assertions passed`);
