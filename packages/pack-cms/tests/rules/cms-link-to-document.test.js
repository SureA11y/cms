'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runa11yCoreOnHtml } = require('@surea11y/core/testing');
const pack = require('../..');

const RULE = 'cms-link-to-document';
const run = (body) => {
  const result = runa11yCoreOnHtml(
    `<!doctype html><html lang="en"><body><main>${body}</main></body></html>`,
    {
      engineOptions: { packs: [pack] },
      runOnly: [RULE]
    }
  );
  return result.checksResults.find((c) => c.ruleId === RULE);
};
const codes = (rule) => rule.occurrences.map((o) => o.data.details.reasonCode);

test(`${RULE}: a link to a document that doesn't say so is asked about`, () => {
  for (const href of [
    '/files/report.pdf',
    '/f/budget.XLSX',
    '/f/form.docx?v=2',
    '/f/slides.pptx#p3',
    '/f/a%20b.odt'
  ]) {
    const rule = run(`<p>Download the <a href="${href}">annual report</a>.</p>`);
    assert.equal(rule.outcome, 'cantTell', href);
    assert.deepEqual(codes(rule), ['DOCUMENT_LINK_FORMAT_UNSTATED'], href);
  }
});

test(`${RULE}: a format named in the link, its title or its paragraph counts as said`, () => {
  for (const body of [
    '<p><a href="/r.pdf">Annual report (PDF, 2 MB)</a></p>',
    '<p><a href="/r.pdf" title="PDF document">Annual report</a></p>',
    '<p><a href="/r.pdf">Annual report</a> (PDF, 2 MB)</p>',
    '<ul><li><a href="/b.xlsx">2026 budget</a>, Excel spreadsheet</li></ul>'
  ]) {
    assert.deepEqual(codes(run(body)), ['DOCUMENT_LINK'], body);
  }
});

test(`${RULE}: a type attribute names the format too`, () => {
  const rule = run('<p><a href="/download?id=7" type="application/pdf">Annual report</a></p>');
  assert.deepEqual(codes(rule), ['DOCUMENT_LINK_FORMAT_UNSTATED']);
});

test(`${RULE}: other links, and a format word inside another word, don't count`, () => {
  assert.equal(
    run('<p><a href="/reports/">Reports</a> <a href="/page.html">Page</a></p>').outcome,
    'notApplicable'
  );
  // "pdfs" is not the word "pdf": the format is still unstated.
  assert.deepEqual(codes(run('<p><a href="/r.pdf">All our pdfs</a></p>')), [
    'DOCUMENT_LINK_FORMAT_UNSTATED'
  ]);
});

test(`${RULE}: tagged best practice, mapped to no WCAG criterion`, () => {
  const meta = pack.rules.find((r) => r.id === RULE).meta;
  assert.deepEqual(meta.wcagSc, []);
  assert.ok(meta.tags.includes('best-practice'));
});
