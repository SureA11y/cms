// Writes data.json: the test article as the Content Preview API would give
// it (one locale, the image resolved), read through the Management API, so
// the test site needs no token of its own. Run: node data.mjs. Not shipped.
import fs from 'node:fs';
import { api, ENTRY } from '../seed.mjs';

const LOCALE = 'en-US';
const one = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[LOCALE]]));
const entry = api('GET', `entries/${ENTRY}`);
const fields = one(entry.fields);
if (fields.mainImage) {
  const asset = api('GET', `assets/${fields.mainImage.sys.id}`);
  fields.mainImage = { sys: { id: asset.sys.id, type: 'Asset' }, fields: one(asset.fields) };
}
const out = {
  sys: { id: entry.sys.id, type: 'Entry', contentType: entry.sys.contentType },
  fields
};
fs.writeFileSync(new URL('./data.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('data.json written');
