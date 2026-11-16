// The panel in the Studio's own colours: its surfaces, text and lines come
// from the Studio's theme (Sanity UI's `--card-…` custom properties, which
// also carry a team's own Studio theme), and only the group colours and the
// accent are the panel's, in their light or dark set as the Studio is.

import { TOKENS, DARK_TOKENS } from '@surea11y/panel/src/ui/tokens.js';

/** Panel token → the Studio's custom property it follows. */
export const STUDIO_COLOURS = {
  surface: '--card-bg-color',
  'surface-subtle': '--card-muted-bg-color',
  'surface-tag': '--card-badge-default-bg-color',
  text: '--card-fg-color',
  'text-muted': '--card-muted-fg-color',
  border: '--card-border-color',
  'border-strong': '--card-icon-color'
};

/**
 * The panel's colour tokens for a Studio colour scheme ('light' or 'dark').
 * Studio colours are written as `var(--card-…, fallback)`, so outside a
 * Studio card the panel's own value applies.
 */
export function studioTokens(scheme = 'light') {
  const base = scheme === 'dark' ? { ...TOKENS, ...DARK_TOKENS } : TOKENS;
  const out = {};
  for (const name of Object.keys(DARK_TOKENS)) {
    out[name] = STUDIO_COLOURS[name] ? `var(${STUDIO_COLOURS[name]}, ${base[name]})` : base[name];
  }
  return out;
}

/** Sets tokens on an element, as `--sa11y-…` custom properties. */
export function applyTokens(el, tokens) {
  for (const [name, value] of Object.entries(tokens))
    el.style.setProperty(`--sa11y-${name}`, value);
}
