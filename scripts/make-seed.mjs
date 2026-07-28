/**
 * Regenerate src/seed-rates.ts — the rate snapshot bundled into the binary so
 * a brand-new install works before (or without) its first network call.
 *
 * Run: node scripts/make-seed.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const source = readFileSync(join(root, 'src/currencies.ts'), 'utf8');
const known = new Set(
  [...source.matchAll(/^\s*\['([A-Z]{3})',/gm)].map((m) => m[1])
);
if (known.size < 100) throw new Error(`only parsed ${known.size} codes`);

const res = await fetch('https://open.er-api.com/v6/latest/USD');
const data = await res.json();
if (data.result !== 'success') throw new Error('rate fetch failed');

const rates = {};
for (const code of [...known].sort()) {
  const value = data.rates[code];
  if (typeof value === 'number' && isFinite(value) && value > 0) {
    rates[code] = value;
  }
}

const missing = [...known].filter((c) => !(c in rates));
const timestamp = (data.time_last_update_unix ?? Date.now() / 1000) * 1000;

const body = `/**
 * Rate snapshot bundled at build time — regenerate with scripts/make-seed.mjs.
 * Only used until the app completes its first live fetch.
 *
 * Published ${new Date(timestamp).toISOString()} by ${data.provider}
 */

export const SEED_TIMESTAMP = ${timestamp};

export const SEED_RATES: Record<string, number> = {
${Object.entries(rates)
  .map(([code, value]) => `  ${code}: ${value},`)
  .join('\n')}
};
`;

writeFileSync(join(root, 'src/seed-rates.ts'), body);
console.log(
  `wrote ${Object.keys(rates).length} rates (${missing.length ? `missing: ${missing.join(', ')}` : 'all codes covered'})`
);
