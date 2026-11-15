/* Phase 0 probe. Runs where the content is rendered (editor canvas or front
 * end) and exposes window.__sureProbe for the measurement script. */
(function () {
  'use strict';
  var loadedAt = performance.now();
  var engine = window.a11ycore;
  var reviewCache = {};

  function median(xs) {
    var s = xs.slice().sort(function (a, b) { return a - b; });
    return s.length ? s[Math.floor(s.length / 2)] : null;
  }

  function resourceTiming(name) {
    var e = performance.getEntriesByType('resource').filter(function (r) { return r.name.indexOf(name) !== -1; })[0];
    return e ? { transferBytes: e.transferSize, encodedBytes: e.encodedBodySize, decodedBytes: e.decodedBodySize, fetchMs: Math.round(e.responseEnd - e.startTime), responseEndMs: Math.round(e.responseEnd) } : null;
  }

  // Which block (editor) or region (front end) an occurrence belongs to.
  function attribute(selector, scopeEl) {
    var el = null;
    try { el = document.querySelector(selector); } catch (e) { return { kind: 'bad-selector' }; }
    if (!el) return { kind: 'not-found' };
    var block = el.closest('[data-block]');
    if (block) return { kind: 'block', clientId: block.getAttribute('data-block'), type: block.getAttribute('data-type') };
    if (scopeEl && scopeEl.contains(el)) return { kind: 'content' };
    return { kind: 'template' };
  }

  function scan(opts) {
    opts = opts || {};
    var engineOptions = { locale: opts.locale || 'en' };
    if (opts.compact) engineOptions.output = { detail: 'findings' };
    var runOnly = opts.excludeRuleIds ? { excludeRuleIds: opts.excludeRuleIds } : null;
    var t0 = performance.now();
    var r = engine.runa11yCoreInPage(location.href, opts.scope || null, engineOptions, runOnly);
    return { ms: performance.now() - t0, result: r };
  }

  function summarize(r, scopeSelector) {
    var scopeEl = scopeSelector ? document.querySelector(scopeSelector) : null;
    var counts = { fail: 0, cantTell: 0, occurrencesFail: 0, occurrencesCantTell: 0 };
    var attribution = {};
    var leans = { pass: 0, fail: 0, none: 0 };
    var byRule = {};
    r.checksResults.forEach(function (c) {
      if (c.outcome !== 'fail' && c.outcome !== 'cantTell') return;
      counts[c.outcome]++;
      (c.occurrences || []).forEach(function (o) {
        var oc = o.occurrenceOutcome || c.outcome;
        if (oc === 'fail') counts.occurrencesFail++; else counts.occurrencesCantTell++;
        var a = attribute(o.selector, scopeEl);
        var key = a.kind + (a.type ? ':' + a.type : '');
        attribution[key] = (attribution[key] || 0) + 1;
        if (oc === 'cantTell') leans[o.lean && o.lean.toward ? o.lean.toward : 'none']++;
        byRule[c.ruleId] = (byRule[c.ruleId] || 0) + 1;
      });
    });
    return { counts: counts, attribution: attribution, leans: leans, byRule: byRule, scopeMatched: !!scopeEl };
  }

  function sideEffects(fn) {
    var before = { active: document.activeElement, scrollY: window.scrollY, styles: document.querySelectorAll('style').length };
    var parentSel = null;
    try { parentSel = window.parent.wp.data.select('core/block-editor').getSelectedBlockClientId(); } catch (e) {}
    var mutations = 0;
    var mo = new MutationObserver(function (list) { mutations += list.length; });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    var out = fn();
    mo.takeRecords().forEach(function () { mutations++; });
    mo.disconnect();
    var parentSelAfter = null;
    try { parentSelAfter = window.parent.wp.data.select('core/block-editor').getSelectedBlockClientId(); } catch (e) {}
    return {
      out: out,
      effects: {
        focusChanged: document.activeElement !== before.active,
        scrollChanged: window.scrollY !== before.scrollY,
        styleTagsAdded: document.querySelectorAll('style').length - before.styles,
        mutationRecords: mutations,
        selectedBlockChanged: parentSel !== parentSelAfter
      }
    };
  }

  function loadReview(locale) {
    if (reviewCache[locale]) return Promise.resolve(reviewCache[locale]);
    var t0 = performance.now();
    return fetch(window.__sureProbeReviewBase + locale + '.json').then(function (res) {
      return res.text().then(function (text) {
        var dict = JSON.parse(text);
        reviewCache[locale] = { dict: dict, bytes: text.length, ms: performance.now() - t0 };
        return reviewCache[locale];
      });
    });
  }

  window.__sureProbe = {
    loadedAt: loadedAt,
    elementCount: function (scope) { var el = scope ? document.querySelector(scope) : document.documentElement; return el ? el.getElementsByTagName('*').length : 0; },
    resources: function () {
      return { engine: resourceTiming('surea11y.browser.js'), es: resourceTiming('surea11y.i18n.es.js'), htc: resourceTiming('how-to-check.js'), probeLoadedAt: Math.round(loadedAt) };
    },
    measure: function (opts) {
      var runs = opts.runs || 5;
      var first = sideEffects(function () { return scan(opts); });
      var times = [first.out.ms];
      for (var i = 1; i < runs; i++) times.push(scan(opts).ms);
      var r = first.out.result;
      var full = JSON.stringify(r).length;
      return {
        firstMs: Math.round(first.out.ms), medianMs: Math.round(median(times.slice(1))), times: times.map(Math.round),
        checks: r.checksResults.length, resultBytes: full,
        scopeNote: r.engine && r.engine.scope ? r.engine.scope : undefined,
        effects: first.effects,
        summary: summarize(r, opts.scope)
      };
    },
    howToCheck: function (opts) {
      return loadReview(opts.locale || 'en').then(function (rev) {
        var r = scan(opts).result;
        var t0 = performance.now();
        var dicts = {}; dicts[opts.locale || 'en'] = rev.dict;
        var withSteps = window.surea11yHowToCheck.applyHowToCheck(r, dicts);
        var ms = performance.now() - t0;
        var cant = 0, withHtc = 0, sample = null;
        withSteps.checksResults.forEach(function (c) {
          (c.occurrences || []).forEach(function (o) {
            if ((o.occurrenceOutcome || c.outcome) !== 'cantTell') return;
            cant++;
            if (o.howToCheck) { withHtc++; if (!sample) sample = { ruleId: c.ruleId, summary: o.summary, howToCheck: o.howToCheck }; }
          });
        });
        return { dictBytes: rev.bytes, dictFetchParseMs: Math.round(rev.ms), applyMs: Math.round(ms), cantTellOccurrences: cant, withSteps: withHtc, sample: sample };
      });
    }
  };
})();
