/* Phase 0: "sandbox" scanning. Runs in the editor's outer window. Renders the
 * post's blocks as WordPress saves them into one hidden iframe that carries
 * the canvas's styles, scans that, and maps findings to top-level blocks. */
(function () {
  'use strict';
  var frame = null;
  var vendor = null;

  function canvasDoc() {
    var c = document.querySelector('iframe[name="editor-canvas"]');
    return c && c.contentDocument;
  }

  function blocksHtml() {
    var blocks = wp.data.select('core/block-editor').getBlocks();
    return blocks.map(function (b) {
      return '<div data-sa11y-block="' + b.clientId + '" data-sa11y-type="' + b.name + '">' + wp.blocks.getBlockContent(b) + '</div>';
    }).join('\n');
  }

  function ensureFrame() {
    if (frame) return Promise.resolve({ created: false, ms: 0 });
    var t0 = performance.now();
    var cdoc = canvasDoc();
    var styles = Array.prototype.map.call(cdoc.querySelectorAll('link[rel="stylesheet"], style'), function (n) { return n.outerHTML; }).join('\n');
    var bodyClass = cdoc.body.className.replace(/block-editor[\w-]*|editor-styles-wrapper/g, '');
    frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    frame.title = 'SureA11y sandbox';
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + cdoc.documentElement.clientWidth + 'px;height:800px;border:0;visibility:hidden;';
    frame.srcdoc = '<!doctype html><html lang="' + (document.documentElement.lang || 'en') + '"><head><meta charset="utf-8"><title>sandbox</title>' + styles +
      '<script src="' + vendor + 'surea11y.browser.js"><\/script></head><body class="' + bodyClass + '"><main id="sa11y-content" class="wp-block-post-content is-layout-constrained"></main></body></html>';
    return new Promise(function (resolve) {
      frame.addEventListener('load', function () { resolve({ created: true, ms: performance.now() - t0 }); }, { once: true });
      document.body.appendChild(frame);
    });
  }

  function scan(opts) {
    opts = opts || {};
    return ensureFrame().then(function (setup) {
      var t0 = performance.now();
      var html = blocksHtml();
      var t1 = performance.now();
      var doc = frame.contentDocument;
      doc.getElementById('sa11y-content').innerHTML = html;
      var t2 = performance.now();
      var engineOptions = { locale: opts.locale || 'en' };
      var runOnly = opts.excludeRuleIds ? { excludeRuleIds: opts.excludeRuleIds } : null;
      var r = frame.contentWindow.a11ycore.runa11yCoreInPage(location.href, '#sa11y-content', engineOptions, runOnly);
      var t3 = performance.now();
      var byRule = {}, mapped = 0, unmapped = 0, counts = { fail: 0, cantTell: 0 };
      r.checksResults.forEach(function (c) {
        (c.occurrences || []).forEach(function (o) {
          var oc = o.occurrenceOutcome || c.outcome;
          if (oc !== 'fail' && oc !== 'cantTell') return;
          counts[oc]++;
          byRule[c.ruleId] = (byRule[c.ruleId] || 0) + 1;
          var el = null; try { el = doc.querySelector(o.selector); } catch (e) {}
          if (el && el.closest('[data-sa11y-block]')) mapped++; else unmapped++;
        });
      });
      return {
        setupMs: Math.round(setup.ms), frameCreated: setup.created,
        serializeMs: Math.round(t1 - t0), renderMs: Math.round(t2 - t1), scanMs: Math.round(t3 - t2), totalMs: Math.round(t3 - t0),
        elements: doc.getElementById('sa11y-content').getElementsByTagName('*').length,
        counts: counts, byRule: byRule, mappedToBlock: mapped, unmapped: unmapped
      };
    });
  }

  window.__sureSandbox = { init: function (v) { vendor = v; }, scan: scan };
})();
