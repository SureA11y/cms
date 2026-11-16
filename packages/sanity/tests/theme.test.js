import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTRAST_PAIRS } from '@surea11y/panel/src/ui/tokens.js';
import { studioTokens, STUDIO_COLOURS } from '../src/theme.js';

// Sanity Studio's default theme, read from a running Studio (sanity 6.21).
const STUDIO = {
  light: {
    '--card-bg-color': '#ffffff',
    '--card-muted-bg-color': '#f6f6f8',
    '--card-badge-default-bg-color': '#eeeef1',
    '--card-fg-color': '#252837',
    '--card-muted-fg-color': '#515870',
    '--card-border-color': '#e3e4e8',
    '--card-icon-color': '#515870'
  },
  dark: {
    '--card-bg-color': '#13141b',
    '--card-muted-bg-color': '#191a24',
    '--card-badge-default-bg-color': '#21232f',
    '--card-fg-color': '#e4e5e9',
    '--card-muted-fg-color': '#979cb0',
    '--card-border-color': '#2a2d3f',
    '--card-icon-color': '#979cb0'
  }
};

function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** A token value as the Studio resolves it: its own colour, else the fallback. */
function resolve(value, studio) {
  const m = /^var\((--[\w-]+), (#[0-9a-f]{6})\)$/i.exec(value);
  return m ? studio[m[1]] || m[2] : value;
}

for (const scheme of ['light', 'dark']) {
  test(`in a ${scheme} Studio, every pair keeps its contrast with the Studio's own colours`, () => {
    const tokens = studioTokens(scheme);
    const colour = (name) => resolve(tokens[name], STUDIO[scheme]);
    const failures = [];
    // The line under a field also sets "N more in this field" in muted text on a tint.
    const lineExtra = ['problem', 'likely', 'review', 'fine'].map((g) => [
      'text-muted',
      `${g}-tint`,
      4.5
    ]);
    for (const [fg, bg, min] of [...CONTRAST_PAIRS, ...lineExtra]) {
      const ratio = contrast(colour(fg), colour(bg));
      if (ratio < min) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
    }
    assert.deepEqual(failures, []);
  });
}

test('surfaces, text and lines follow the Studio; groups and the accent are ours', () => {
  const t = studioTokens('dark');
  assert.equal(t.surface, 'var(--card-bg-color, #1c1e25)');
  assert.equal(t.problem, '#ff9089');
  assert.equal(t.accent, '#8ab8ef');
  assert.equal(studioTokens('light').problem, '#b32d2e');
  for (const name of Object.keys(STUDIO_COLOURS)) assert.match(t[name], /^var\(--card-/);
});
