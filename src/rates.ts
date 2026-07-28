/**
 * Rate fetching and offline caching.
 *
 * Order of preference: cached rates (instant, works on a plane) -> network
 * refresh in the background -> bundled snapshot if the cache is empty and the
 * network is unreachable. The screen is never blank and never blocks on a
 * request.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ALL_CODES } from './currencies';
import { SEED_RATES, SEED_TIMESTAMP } from './seed-rates';
import type { RateMap } from './engine';

export type RateSnapshot = {
  rates: RateMap;
  /** When the provider published these rates (ms since epoch). */
  timestamp: number;
  /** 'seed' means bundled-at-build-time, never fetched on this device. */
  source: 'seed' | 'cache' | 'network';
};

const CACHE_KEY = 'cc.rates.v1';
const TIMEOUT_MS = 12000;

/** Rates are quoted per 1 USD; the UI converts through that base. */
const PRIMARY = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

const KNOWN = new Set(ALL_CODES);

async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Keep only codes the app knows how to label, and drop junk values. */
function sanitize(raw: Record<string, unknown>): RateMap {
  const out: RateMap = {};
  for (const [code, value] of Object.entries(raw)) {
    const upper = code.toUpperCase();
    if (!KNOWN.has(upper)) continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (isFinite(n) && n > 0) out[upper] = n;
  }
  return out;
}

async function fromPrimary(): Promise<RateSnapshot> {
  const data = await getJson(PRIMARY);
  if (data?.result !== 'success' || !data?.rates) {
    throw new Error('unexpected payload');
  }
  const rates = sanitize(data.rates);
  if (Object.keys(rates).length < 20) throw new Error('too few rates');
  return {
    rates,
    timestamp: data.time_last_update_unix
      ? data.time_last_update_unix * 1000
      : Date.now(),
    source: 'network',
  };
}

async function fromFallback(): Promise<RateSnapshot> {
  const data = await getJson(FALLBACK);
  const table = data?.usd;
  if (!table) throw new Error('unexpected payload');
  const rates = sanitize(table);
  if (Object.keys(rates).length < 20) throw new Error('too few rates');
  const published = data.date ? Date.parse(`${data.date}T00:00:00Z`) : NaN;
  return {
    rates,
    timestamp: isFinite(published) ? published : Date.now(),
    source: 'network',
  };
}

/** Fetch fresh rates, trying the backup provider if the first one is down. */
export async function fetchRates(): Promise<RateSnapshot> {
  try {
    return await fromPrimary();
  } catch {
    return await fromFallback();
  }
}

export async function loadCached(): Promise<RateSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.rates || typeof parsed.timestamp !== 'number') return null;
    return { rates: parsed.rates, timestamp: parsed.timestamp, source: 'cache' };
  } catch {
    return null;
  }
}

export async function saveCached(snapshot: RateSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates: snapshot.rates, timestamp: snapshot.timestamp })
    );
  } catch {
    // A failed cache write is not worth interrupting the user over.
  }
}

/** The rates shipped inside the binary, used until the first successful fetch. */
export function seedSnapshot(): RateSnapshot {
  return { rates: SEED_RATES, timestamp: SEED_TIMESTAMP, source: 'seed' };
}
