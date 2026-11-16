// The website's preview addresses: as set on the configuration screen, and
// as the app reads them back. Pure, for tests.

/** One address per line (or comma), as origins; anything else left out. */
export function parseOrigins(text) {
  const out = [];
  for (const part of String(text || '').split(/[\s,]+/)) {
    if (!part) continue;
    try {
      const url = new URL(part);
      if (
        (url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) &&
        !out.includes(url.origin)
      )
        out.push(url.origin);
    } catch {
      // not an address
    }
  }
  return out;
}

/** The preview addresses set on the configuration screen, as origins. */
export function previewOriginsOf(sdk) {
  const list = ((sdk.parameters || {}).installation || {}).previewOrigins;
  return parseOrigins(Array.isArray(list) ? list.join('\n') : '');
}
