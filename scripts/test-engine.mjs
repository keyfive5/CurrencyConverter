/**
 * Sanity checks for the pure conversion/calculator logic.
 * Run: node --experimental-strip-types scripts/test-engine.mjs
 */
import assert from 'node:assert/strict';

import {
  convert,
  evaluate,
  formatAmount,
  formatExpression,
  hasOperator,
  pressKey,
  relativeTime,
  toEntry,
  unitRatePrecision,
} from '../src/engine.ts';

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

const type = (keys, start = '') =>
  [...keys].reduce((acc, k) => pressKey(acc, k), start);

console.log('input');
check('digits accumulate', () => assert.equal(type('123'), '123'));
check('leading zero is replaced', () => assert.equal(type('05'), '5'));
check('zero then decimal survives', () => assert.equal(type('0.5'), '0.5'));
check('bare decimal gets a zero', () => assert.equal(type('.'), '0.'));
check('one decimal per number', () => assert.equal(type('1.2.3'), '1.23'));
check('operator swaps, never stacks', () =>
  assert.equal(pressKey(pressKey('12+', '×'), '−'), '12−'));
check('no leading operator', () => assert.equal(pressKey('', '+'), ''));
check('operator after decimal replaces it', () =>
  assert.equal(pressKey('12.', '+'), '12+'));
check('backspace', () => assert.equal(pressKey('123', 'back'), '12'));
check('clear', () => assert.equal(pressKey('123+4', 'clear'), ''));
check('decimal digits are capped', () =>
  assert.equal(type('1.123456789'), '1.12345678'));

console.log('evaluate');
check('empty is zero', () => assert.equal(evaluate(''), 0));
check('plain number', () => assert.equal(evaluate('42.5'), 42.5));
check('precedence', () => assert.equal(evaluate('2+3×4'), 14));
check('precedence both ways', () => assert.equal(evaluate('2×3+4'), 10));
check('division', () => assert.equal(evaluate('10÷4'), 2.5));
check('left to right same precedence', () =>
  assert.equal(evaluate('100−10−5'), 85));
check('chained mixed', () => assert.equal(evaluate('10+20×3÷2'), 40));
check('trailing operator uses what is typed', () =>
  assert.equal(evaluate('12+'), 12));
check('divide by zero is null', () => assert.equal(evaluate('5÷0'), null));
check('hasOperator', () => {
  assert.equal(hasOperator('123'), false);
  assert.equal(hasOperator('1+2'), true);
});

console.log('convert');
const rates = { USD: 1, EUR: 0.9, JPY: 150, CAD: 1.37 };
check('same currency is identity', () =>
  assert.equal(convert(100, 'USD', 'USD', rates), 100));
check('via base', () => assert.equal(convert(100, 'USD', 'EUR', rates), 90));
check('cross rate', () => {
  const v = convert(90, 'EUR', 'JPY', rates);
  assert.ok(Math.abs(v - 15000) < 1e-9, `got ${v}`);
});
check('round trip', () => {
  const there = convert(250, 'CAD', 'JPY', rates);
  const back = convert(there, 'JPY', 'CAD', rates);
  assert.ok(Math.abs(back - 250) < 1e-9, `got ${back}`);
});
check('unknown currency is null', () =>
  assert.equal(convert(1, 'USD', 'XXX', rates), null));

console.log('format');
check('grouping', () => assert.equal(formatAmount(1234567.891, 2), '1,234,567.89'));
check('zero-decimal currency', () => assert.equal(formatAmount(15000.6, 0), '15,001'));
check('tiny values keep significance', () => {
  const s = formatAmount(0.0000117, 2);
  assert.ok(s.startsWith('0.0000'), `got ${s}`);
  assert.notEqual(s, '0.00');
});
check('exact zero stays plain', () => assert.equal(formatAmount(0, 2), '0.00'));
check('negatives', () => assert.equal(formatAmount(-1234.5, 2), '−1,234.50'));
check('expression spacing', () =>
  assert.equal(formatExpression('1234+56×2'), '1,234 + 56 × 2'));
check('entry round-trips what was displayed', () => {
  // Tapping a row makes it the base; the value on screen must not change.
  // (Trailing zeros may drop — "145.50" becoming an editable "145.5" is fine —
  // so compare by re-formatting rather than by raw string.)
  for (const [value, decimals] of [
    [23821.62, 0],
    [145.5, 2],
    [0.0000377, 2],
    [16372, 0],
    [1234.5678, 3],
  ]) {
    const shown = formatAmount(value, decimals);
    const entry = toEntry(value, decimals);
    assert.equal(
      formatAmount(parseFloat(entry), decimals),
      shown,
      `${value}@${decimals}: entry "${entry}" re-formats to ${formatAmount(parseFloat(entry), decimals)}, was showing ${shown}`
    );
  }
});
check('entry strips trailing zeros', () => {
  assert.equal(toEntry(100, 2), '100');
  assert.equal(toEntry(23821.62, 0), '23822');
});
check('unit rate precision scales with size', () => {
  assert.equal(unitRatePrecision(163.72), 2);
  assert.equal(unitRatePrecision(1.4115), 4);
  assert.equal(unitRatePrecision(0.8788), 4);
  assert.equal(unitRatePrecision(0.0000117), 6);
});
check('empty expression shows zero', () => assert.equal(formatExpression(''), '0'));

console.log('time');
const t0 = Date.parse('2026-07-28T12:00:00Z');
check('just now', () => assert.equal(relativeTime(t0, t0 + 30_000), 'just now'));
check('minutes', () => assert.equal(relativeTime(t0, t0 + 20 * 60_000), '20m ago'));
check('hours', () => assert.equal(relativeTime(t0, t0 + 3 * 3600_000), '3h ago'));
check('yesterday', () =>
  assert.equal(relativeTime(t0, t0 + 24 * 3600_000), 'yesterday'));

console.log(`\n${passed} checks passed`);
