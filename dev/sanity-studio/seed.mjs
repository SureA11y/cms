// Puts the test article in the test project: the mock-up's example, with a
// file name for alternative text, a "click here" link, a heading that skips
// a level and a table without header cells. Run: node seed.mjs
// Sends through curl (see api()).
import { execFileSync } from 'node:child_process';

const PROJECT = '1tmgxdtl';
export const DATASET = 'development';
const IMAGE = 'image-2e89e74ff33d2e4856699a3a1c15f8eb8ab9d7d4-640x360-png';
const span = (key, text, marks = []) => ({ _type: 'span', _key: key, text, marks });

export const article = {
  _id: 'surea11y-test-article',
  _type: 'article',
  title: 'Opening hours over the holidays',
  slug: { _type: 'slug', current: 'opening-hours' },
  mainImage: { _type: 'image', alt: 'IMG_2041.jpg', asset: { _type: 'reference', _ref: IMAGE } },
  body: [
    {
      _type: 'block',
      _key: 'k1',
      style: 'h2',
      markDefs: [],
      children: [span('s1', 'From 23 December')]
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [{ _key: 'l1', _type: 'link', href: 'https://library.example/branches' }],
      children: [
        span('s2', 'All branches close at 15:00. For the full list of branches, '),
        span('s3', 'click here', ['l1']),
        span('s4', '.')
      ]
    },
    {
      _type: 'block',
      _key: 'k3',
      style: 'h4',
      markDefs: [],
      children: [span('s5', "Children's library")]
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [span('s6', 'The reading room stays open until 17:00.')]
    },
    {
      _type: 'table',
      _key: 'k5',
      rows: [
        { _type: 'tableRow', _key: 'r1', cells: ['Branch', '24 Dec', '31 Dec'] },
        { _type: 'tableRow', _key: 'r2', cells: ['Central', '10–14', '10–14'] }
      ]
    }
  ]
};

export function seed() {
  const body = JSON.stringify({
    mutations: [{ delete: { id: `drafts.${article._id}` } }, { createOrReplace: article }]
  });
  return api('POST', `data/mutate/${DATASET}`, body);
}

/**
 * A request to the project's API through curl, which uses the environment's
 * proxy. SANITY_TOKEN, when set, is sent; in an environment whose proxy adds
 * the token itself, leave it unset.
 */
export function api(method, path, body) {
  const args = ['-s', '-X', method, '-H', 'Content-Type: application/json'];
  if (process.env.SANITY_TOKEN)
    args.push('-H', `Authorization: Bearer ${process.env.SANITY_TOKEN}`);
  if (body) args.push('--data-binary', body);
  args.push(`https://${PROJECT}.api.sanity.io/v2025-02-19/${path}`);
  return execFileSync('curl', args, { encoding: 'utf8' });
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(seed());
