/**
 * Pure conversion / calculator / formatting logic.
 *
 * No React and no React Native imports live in here on purpose: everything in
 * this file runs under plain node, so `node scripts/test-engine.mjs` can check
 * the maths without a simulator.
 */

export type RateMap = Record<string, number>;

export const OPERATORS = ['+', '−', '×', '÷'] as const;
export type Operator = (typeof OPERATORS)[number];

const MAX_LEN = 24;

function isOperator(ch: string): ch is Operator {
  return (OPERATORS as readonly string[]).includes(ch);
}

/* ------------------------------------------------------------------ input */

/**
 * Apply one keypad press to the expression string.
 *
 * The expression is what the user sees; it stays a plain string so undo is
 * just a slice and there is no hidden state to get out of sync with the display.
 */
export function pressKey(expr: string, key: string): string {
  if (key === 'clear') return '';
  if (key === 'back') return expr.slice(0, -1);

  if (isOperator(key)) {
    if (expr === '') return '';
    const last = expr[expr.length - 1];
    // Typing a second operator swaps it rather than stacking.
    if (isOperator(last)) return expr.slice(0, -1) + key;
    if (last === '.') return expr.slice(0, -1) + key;
    return expr + key;
  }

  if (expr.length >= MAX_LEN) return expr;

  if (key === '.') {
    const seg = currentSegment(expr);
    if (seg.includes('.')) return expr;
    if (seg === '') return expr + '0.';
    return expr + '.';
  }

  if (key >= '0' && key <= '9') {
    const seg = currentSegment(expr);
    // Don't build "007"; a leading zero only survives in front of a decimal.
    if (seg === '0') return expr.slice(0, -1) + key;
    // Cap the digits after a decimal point so the display can't overflow.
    if (seg.includes('.') && seg.split('.')[1].length >= 8) return expr;
    return expr + key;
  }

  return expr;
}

/** The number the user is currently typing (text after the last operator). */
function currentSegment(expr: string): string {
  let i = expr.length;
  while (i > 0 && !isOperator(expr[i - 1])) i--;
  return expr.slice(i);
}

/** True when the expression contains an operator worth showing a result for. */
export function hasOperator(expr: string): boolean {
  return [...expr].some(isOperator);
}

/* ----------------------------------------------------------------- maths */

/**
 * Evaluate a keypad expression with normal precedence.
 * Returns null when the expression cannot be read as a number.
 */
export function evaluate(expr: string): number | null {
  if (expr === '') return 0;

  const numbers: number[] = [];
  const ops: Operator[] = [];
  let buf = '';

  for (const ch of expr) {
    if (isOperator(ch)) {
      if (buf === '' || buf === '.') return null;
      numbers.push(parseFloat(buf));
      ops.push(ch);
      buf = '';
    } else {
      buf += ch;
    }
  }
  // A trailing operator means the user is mid-entry: evaluate what we have.
  if (buf === '' || buf === '.') {
    if (ops.length === 0) return null;
    ops.pop();
  } else {
    numbers.push(parseFloat(buf));
  }

  if (numbers.some((n) => !isFinite(n))) return null;

  // Pass 1: × and ÷ collapse left to right.
  for (let i = 0; i < ops.length; ) {
    if (ops[i] === '×' || ops[i] === '÷') {
      const a = numbers[i];
      const b = numbers[i + 1];
      const value = ops[i] === '×' ? a * b : b === 0 ? NaN : a / b;
      numbers.splice(i, 2, value);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Pass 2: + and − over what is left.
  let result = numbers[0];
  for (let i = 0; i < ops.length; i++) {
    result = ops[i] === '+' ? result + numbers[i + 1] : result - numbers[i + 1];
  }

  return isFinite(result) ? result : null;
}

/**
 * Convert between two currencies.
 * `rates` maps a currency code to how many units of it one base unit buys.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: RateMap
): number | null {
  if (from === to) return amount;
  const f = rates[from];
  const t = rates[to];
  if (!f || !t || !isFinite(f) || !isFinite(t)) return null;
  return (amount / f) * t;
}

/* ------------------------------------------------------------- formatting */

/** Group the integer part with thin separators: 1234567.8 -> "1,234,567.8". */
function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * How many decimal places a value should be shown to.
 *
 * Normally the currency's own precision, but values that would round away to
 * zero get extra digits instead — showing "0.00" for a real amount is the
 * single most confusing thing a converter can do.
 */
export function displayPrecision(value: number, decimals: number): number {
  const abs = Math.abs(value);
  if (abs > 0 && abs < Math.pow(10, -decimals) / 2) {
    // Extend precision until two significant digits survive.
    return Math.min(10, Math.ceil(-Math.log10(abs)) + 1);
  }
  if (abs >= 1e12) return 0;
  return decimals;
}

/** Format a converted value for display. */
export function formatAmount(value: number, decimals: number): string {
  if (!isFinite(value)) return '—';

  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(displayPrecision(value, decimals));
  const [intPart, frac] = fixed.split('.');
  const body = frac ? `${group(intPart)}.${frac}` : group(intPart);
  return negative ? `−${body}` : body;
}

/**
 * Turn a converted value back into a plain string the keypad can keep editing.
 *
 * Uses the same precision formatAmount just displayed, so tapping a row to make
 * it the base never changes the number the user was already looking at.
 */
export function toEntry(value: number, decimals: number): string {
  if (!isFinite(value)) return '';
  let s = Math.abs(value).toFixed(displayPrecision(value, decimals));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '' ? '0' : s;
}

/** Render the expression itself, with digit grouping on each number. */
export function formatExpression(expr: string): string {
  if (expr === '') return '0';
  let out = '';
  let buf = '';
  const flush = () => {
    if (!buf) return;
    const [intPart, frac] = buf.split('.');
    out += frac !== undefined ? `${group(intPart)}.${frac}` : group(intPart);
    buf = '';
  };
  for (const ch of expr) {
    if (isOperator(ch)) {
      flush();
      out += ` ${ch} `;
    } else {
      buf += ch;
    }
  }
  flush();
  return out;
}

/**
 * How many decimals a unit rate deserves. Big rates (1 USD = 163.72 JPY) don't
 * need four; tiny ones (1 USD = 0.000032 BTC-scale) need more than four.
 */
export function unitRatePrecision(rate: number): number {
  if (rate >= 100) return 2;
  if (rate >= 0.01) return 4;
  return 6;
}

/** "1 USD = 1.37 CAD" style line for the currently selected pair. */
export function rateLine(
  from: string,
  to: string,
  rates: RateMap
): string | null {
  const one = convert(1, from, to, rates);
  if (one === null) return null;
  return `1 ${from} = ${formatAmount(one, unitRatePrecision(one))} ${to}`;
}

/** "Updated 2h ago" / "Updated just now" for the rate timestamp. */
export function relativeTime(timestampMs: number, nowMs: number): string {
  const secs = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (secs < 90) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
