import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom.js';

const window = installDom();
const { createQuestionLoader } = await import('../src/questions.js');
const { toFindings } = await import('../src/findings.js');

test('findings carry what finds their steps: the rule prefix, the reason code and the values', () => {
  const [f] = toFindings({
    checksResults: [
      {
        ruleId: 'p-as-heading',
        outcome: 'cantTell',
        i18n: { titleKey: 'pAsHeading_title' },
        occurrences: [
          {
            html: '<p><strong>Opening hours</strong></p>',
            summary: 'This bold line…',
            i18n: { params: { fontSizePx: '16' } },
            data: { details: { reasonCode: 'BOLD_SHORT_PARAGRAPH' } }
          }
        ]
      }
    ]
  });
  assert.equal(f.reviewPrefix, 'pAsHeading');
  assert.equal(f.reasonCode, 'BOLD_SHORT_PARAGRAPH');
  assert.deepEqual(f.values, { fontSizePx: '16', reasonCode: 'BOLD_SHORT_PARAGRAPH' });
});

test('the loader asks core for the steps in the locale, English after, with the values', async () => {
  const calls = [];
  window.SureA11yReview = {
    dictionaries: { en: {}, es: {} },
    howToCheckFrom: (dicts, prefix, code, locales, options) => {
      calls.push([prefix, code, locales, options.values]);
      return prefix === 'pAsHeading' ? { steps: ['Uno'], passWhen: 'Bien', failWhen: 'Mal' } : null;
    }
  };
  // Already loaded: no script is added.
  const questionFor = createQuestionLoader(document, { urls: ['review.en.js'], locale: 'es-ES' });
  const card = (prefix) => ({
    places: [{ reviewPrefix: prefix, reasonCode: 'X', values: { a: 1 } }]
  });
  assert.deepEqual(await questionFor(card('pAsHeading')), {
    steps: ['Uno'],
    passWhen: 'Bien',
    failWhen: 'Mal'
  });
  assert.deepEqual(calls[0], ['pAsHeading', 'X', ['es-es', 'en'], { a: 1 }]);
  assert.equal(await questionFor(card('other')), null, 'no steps: null');
  assert.equal(await questionFor({ places: [{}] }), null, 'nothing to look up: null');
  assert.equal(document.querySelectorAll('script').length, 0);
  delete window.SureA11yReview;
});
