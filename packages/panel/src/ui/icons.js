// The panel's icons: stroke drawings in currentColor, so they take the colour
// of the text around them (and the system colour in forced-colours mode).
// They are decoration: whatever they mean is also said in words.

const PATHS = {
  problem: ['circle:12,12,9', 'M12 7.5v5.5M12 16.5v.5'],
  likely: ['M12 3.5 2.5 20h19L12 3.5z', 'M12 9.5v5M12 17.3v.4'],
  review: ['circle:12,12,9', 'M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6v.4'],
  'probably-fine': ['circle:12,12,9', 'm8 12.3 2.8 2.8L16.2 9.5'],
  marked: ['m5 12.5 4.5 4.5L19 7.5'],
  previous: ['m15 6-6 6 6 6'],
  next: ['m9 6 6 6-6 6'],
  chevron: ['m6 9 6 6 6-6'],
  empty: ['M6 3h8l4 4v14H6z', 'M14 3v4h4M9 12h6M9 16h4'],
  spinner: ['M21 12a9 9 0 1 1-6.2-8.6'],
  // Small marks for the markers beside the content.
  'mark-problem': ['M12 6v8M12 18v.5'],
  'mark-likely': ['M12 6v8M12 18v.5'],
  'mark-review': ['M9 9a3 3 0 1 1 4.2 2.7c-.7.4-1.2 1-1.2 1.8V14M12 18v.5'],
  'mark-probably-fine': ['m7 12.5 3.2 3.2L17 9']
};

const SVG = 'http://www.w3.org/2000/svg';

/** An <svg> icon, hidden from assistive technology. */
export function icon(doc, name, size = 18, strokeWidth = 2) {
  const svg = doc.createElementNS(SVG, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  for (const spec of PATHS[name] || []) {
    if (spec.startsWith('circle:')) {
      const [cx, cy, r] = spec.slice(7).split(',');
      const c = doc.createElementNS(SVG, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', r);
      svg.append(c);
    } else {
      const p = doc.createElementNS(SVG, 'path');
      p.setAttribute('d', spec);
      svg.append(p);
    }
  }
  return svg;
}
