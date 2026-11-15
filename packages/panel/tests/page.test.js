import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom.js';

const win = installDom(`<!doctype html><html lang="en"><body>
  <header><nav><a id="menu" href="/">Home</a></nav></header>
  <main><article><div class="entry-content"><p id="bold"><strong>Opening times</strong></p><img id="pic" src="a.png" alt="IMG_1.png"></div></article></main>
  <button id="opener">Check</button>
</body></html>`);
// jsdom has no layout: give elements a size, as a browser would.
win.HTMLElement.prototype.getBoundingClientRect = () => ({
  top: 0,
  left: 0,
  right: 100,
  bottom: 20,
  width: 100,
  height: 20
});
const { scanPage } = await import('../src/page.js');
const { createPagePanel } = await import('../src/ui/page-panel.js');

function fakeEngine(seen) {
  win.a11ycore = {
    runa11yCoreInPage(url, context, options) {
      seen.push({ context, options });
      const occ = (selector, summary) => ({
        selector,
        summary,
        html: `<x ${selector}>`,
        data: { details: { reasonCode: 'R' } }
      });
      return {
        checksResults: [
          {
            ruleId: 'p-as-heading',
            outcome: 'cantTell',
            occurrences: [occ('#bold', 'Bold line.')]
          },
          {
            ruleId: 'img-alt-quality',
            outcome: 'cantTell',
            occurrences: [{ ...occ('#pic', 'File name.'), lean: { toward: 'fail' } }]
          },
          {
            ruleId: 'link-name-quality',
            outcome: 'fail',
            occurrences: [occ('#menu', 'Menu link.'), occ('#gone', 'Gone.')]
          }
        ]
      };
    }
  };
}

test('findings in the content and in the theme are told apart', () => {
  const seen = [];
  fakeEngine(seen);
  const { findings } = scanPage(document, {
    contentSelector: '.entry-content',
    excludeSelectors: ['[data-surea11y-panel]']
  });
  const by = Object.fromEntries(findings.map((f) => [f.summary, f]));
  assert.equal(by['Bold line.'].outside, false);
  assert.equal(by['Bold line.'].itemLabel, 'Your content');
  assert.equal(by['File name.'].outside, false);
  assert.equal(by['Menu link.'].outside, true);
  assert.equal(by['Menu link.'].itemLabel, 'Theme or template');
  assert.equal(by['Menu link.'].itemId, '#menu', 'shown by its selector');
  assert.equal(by['Gone.'].itemId, null, 'an element no longer there cannot be shown');
  assert.deepEqual(seen[0].options.excludeSelectors, ['[data-surea11y-panel]']);
  assert.equal(seen[0].options.profile, 'cms-page');
});

test("without a content area, everything is the theme's", () => {
  fakeEngine([]);
  const { findings } = scanPage(document, { contentSelector: '.nope' });
  assert.ok(findings.every((f) => f.outside));
});

test('the page panel: focus to its heading on open, back to the opener on Escape', () => {
  let closed = 0;
  const panel = createPagePanel(document, { onClose: () => closed++ });
  const opener = document.getElementById('opener');
  opener.focus();
  panel.open(opener);
  assert.equal(panel.isOpen(), true);
  const heading = panel.host.shadowRoot.querySelector('h2');
  assert.equal(panel.host.shadowRoot.activeElement, heading);
  assert.equal(heading.textContent, 'Accessibility checker');
  heading.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(panel.isOpen(), false);
  assert.equal(document.activeElement, opener);
  assert.equal(closed, 1);
  panel.host.remove();
});

test('the page panel is a labelled region with a named close button', () => {
  const panel = createPagePanel(document, { title: 'Accessibility' });
  const root = panel.host.shadowRoot;
  const section = root.querySelector('section');
  assert.equal(
    root.getElementById(section.getAttribute('aria-labelledby')).textContent,
    'Accessibility'
  );
  assert.equal(root.querySelector('.close').getAttribute('aria-label'), 'Close');
  panel.host.remove();
});

test('a finding about the whole page has nothing to show', () => {
  win.a11ycore = {
    runa11yCoreInPage: () => ({
      checksResults: [
        {
          ruleId: 'page-title-patterns',
          outcome: 'cantTell',
          occurrences: [{ selector: 'html', summary: 'Title.', html: '<html>' }]
        }
      ]
    })
  };
  const { findings } = scanPage(document, { contentSelector: '.entry-content' });
  assert.equal(findings[0].itemId, null);
  assert.equal(findings[0].outside, true);
});

test('nothing is reported inside what was excluded, even by a rule that missed it', () => {
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div id="wpadminbar"><form id="adminbarsearch"></form></div>'
  );
  win.a11ycore = {
    runa11yCoreInPage: () => ({
      checksResults: [
        {
          ruleId: 'page-zones-landmark',
          outcome: 'cantTell',
          occurrences: [{ selector: '#adminbarsearch', summary: 'Zone.', html: '<form>' }]
        }
      ]
    })
  };
  const { findings } = scanPage(document, { excludeSelectors: ['#wpadminbar'] });
  assert.equal(findings.length, 0);
  document.getElementById('wpadminbar').remove();
});
