// The panel's design tokens: every colour, corner, space and size the UI
// uses, in one place. Components read them as CSS custom properties
// (`var(--sa11y-…)`), so the look changes here without touching them, and a
// site can override any of them on the element:
//
//   surea11y-results { --sa11y-radius: 0; --sa11y-accent: #2271b1; }
//
// Text and background pairs must keep WCAG 2.2 AA contrast (4.5:1 for text,
// 3:1 for icons and borders that carry meaning); tests/tokens.test.js checks
// every pair listed in CONTRAST_PAIRS.

export const TOKENS = {
  // Text and surfaces.
  text: '#1e1e1e',
  'text-muted': '#50575e',
  surface: '#ffffff',
  'surface-subtle': '#f6f7f7',
  'surface-tag': '#f0f0f0',
  border: '#dcdcde',
  'border-strong': '#8c8f94',

  // Actions and focus.
  accent: '#1d5fa6',
  'on-accent': '#ffffff',
  focus: '#1d5fa6',
  'focus-width': '2px',

  // Groups: each has a colour (icons, bars, markers) and a tint (selected
  // tiles and the card last shown). Never used alone: every group also has
  // an icon and a word.
  problem: '#b32d2e',
  'problem-tint': '#fcf0f1',
  likely: '#8a4d00',
  'likely-tint': '#fcf3e6',
  review: '#1d5fa6',
  'review-tint': '#eef4fb',
  fine: '#00702a',
  'fine-tint': '#edf7ef',
  marked: '#50575e',
  'marked-tint': '#f0f0f0',

  // Shape.
  shadow: '0 1px 2px rgba(0, 0, 0, .06)',
  radius: '6px',
  'radius-small': '4px',
  'radius-round': '999px',

  // Space.
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',

  // Type: sizes only; the family is the host's.
  'font-size': '13px',
  'font-size-small': '12px',
  'font-size-title': '14px',
  'font-size-count': '26px',

  // Targets (WCAG 2.5.8 asks for 24px; buttons use the larger one).
  'target-min': '24px',
  'button-height': '32px'
};

/**
 * The colours for a dark editor: lighter group colours and darker tints, so
 * every pair in CONTRAST_PAIRS keeps its contrast on dark surfaces. A host
 * applies them over TOKENS when its editor is dark (Sanity Studio can be).
 */
export const DARK_TOKENS = {
  text: '#e6e8ec',
  'text-muted': '#a9b0bb',
  surface: '#1c1e25',
  'surface-subtle': '#23262f',
  'surface-tag': '#2e323d',
  border: '#3b404c',
  'border-strong': '#7a8190',
  accent: '#8ab8ef',
  'on-accent': '#101722',
  focus: '#8ab8ef',
  problem: '#ff9089',
  'problem-tint': '#3b2124',
  likely: '#f2b663',
  'likely-tint': '#3a2d19',
  review: '#8ab8ef',
  'review-tint': '#1e2b3c',
  fine: '#74d391',
  'fine-tint': '#1b3325',
  marked: '#a9b0bb',
  'marked-tint': '#2e323d',
  shadow: '0 1px 2px rgba(0, 0, 0, .4)'
};

/** The pairs that must keep their contrast: [foreground, background, minimum]. */
export const CONTRAST_PAIRS = [
  ['text', 'surface', 4.5],
  ['text', 'surface-subtle', 4.5],
  ['text', 'surface-tag', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-muted', 'surface-subtle', 4.5],
  ['text-muted', 'surface-tag', 4.5],
  ['accent', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['focus', 'surface', 3],
  ['border-strong', 'surface', 3],
  ...['problem', 'likely', 'review', 'fine', 'marked'].flatMap((g) => [
    [g, 'surface', 4.5],
    [g, `${g}-tint`, 4.5],
    ['text', `${g}-tint`, 4.5],
    ['accent', `${g}-tint`, 4.5],
    ['on-accent', g, 4.5]
  ])
];

/** The tokens as custom properties for a `:host` rule. */
export function tokenCss(tokens = TOKENS) {
  return `:host {\n${Object.entries(tokens)
    .map(([name, value]) => `  --sa11y-${name}: ${value};`)
    .join('\n')}\n}`;
}
