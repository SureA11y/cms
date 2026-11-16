// Sanity's field paths, as arrays (['body', { _key: 'k1' }]) and as the
// strings Sanity itself writes ('body[_key=="k1"]'). A finding's item id is
// the string, so it names its field and can be turned back into the path
// the form moves to.

/** ['body', { _key: 'k1' }, 'alt'] → 'body[_key=="k1"].alt' */
export function pathToString(path) {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') out += `[${segment}]`;
    else if (segment && typeof segment === 'object' && typeof segment._key === 'string')
      out += `[_key==${JSON.stringify(segment._key)}]`;
    else out += (out ? '.' : '') + String(segment);
  }
  return out;
}

const SEGMENT = /([A-Za-z_$][\w$-]*)|\[_key=="((?:[^"\\]|\\.)*)"\]|\[(\d+)\]/g;

/** 'body[_key=="k1"].alt' → ['body', { _key: 'k1' }, 'alt'] */
export function stringToPath(text) {
  const path = [];
  for (const m of String(text).matchAll(SEGMENT)) {
    if (m[1] !== undefined) path.push(m[1]);
    else if (m[2] !== undefined) path.push({ _key: JSON.parse(`"${m[2]}"`) });
    else path.push(Number(m[3]));
  }
  return path;
}

/** A document's id without its draft or release prefix. */
export function publishedId(id) {
  return String(id || '')
    .replace(/^drafts\./, '')
    .replace(/^versions\.[^.]+\./, '');
}
