import test from 'node:test';
import assert from 'node:assert/strict';
import { TOKENS, CONTRAST_PAIRS, tokenCss } from '../src/ui/tokens.js';

function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('every token pair keeps its WCAG contrast', () => {
  const failures = [];
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    assert.ok(TOKENS[fg] && TOKENS[bg], `${fg} and ${bg} are tokens`);
    const ratio = contrast(TOKENS[fg], TOKENS[bg]);
    if (ratio < min) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
  }
  assert.deepEqual(failures, []);
});

test('the tokens become custom properties', () => {
  const css = tokenCss();
  assert.match(css, /--sa11y-accent: #1d5fa6;/);
  assert.match(css, /--sa11y-radius: 6px;/);
});
