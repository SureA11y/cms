# SureA11y for CMS — Research Report

As of 2026-10-04.

## Summary

**Yes, we can match the existing CMS checkers, and we can go further, but the advantage has to come from the product, not only from the engine.** The engine is ready to embed: a 206 KB compressed browser bundle with no dependencies, full translations in five languages, and honest "could not decide" results. What it lacks for editors is a set of content checks, plain wording and a way to remember human answers. All are fixable, and most can be worked around by the plugin at first.

The field is narrower than it looks. Sa11y and Editoria11y now share one GPL engine, which powers the leading free checkers in WordPress, Drupal and Joomla. Equalize Digital leads commercially in WordPress with axe-core. Editoria11y sets the bar for the editor experience: live, plain-language, spellcheck-style feedback that shows each role only what it can fix.

Where we can lead:

1. **Who can fix it**: attribute each problem to a block, a template part or the theme, and jump to it. Nobody does this.
2. **Questions instead of warnings**: turn uncertain results into questions the author answers once, kept as evidence.
3. **Evidence, not compliance claims**: results and answers mapped to WCAG 2.2 and EN 301 549, which EU public bodies need for accessibility statements. EN 301 549 also requires authoring tools to suggest repairs.
4. **WordPress's own validation framework**, now an official experiment heading for core.
5. **Editors nobody serves**: CKEditor 5 and the headless CMSs have no content checker, and our MPL-2.0 licence can go where GPL tools cannot.

**Recommended first step:** a small prototype that runs the engine inside the WordPress block editor and measures a real scan, while the maintainer answers the open questions at the end of this report. Then write the plan.

## Scope and method

This report compares our engine with the accessibility checkers already built into CMSs, to decide whether a SureA11y CMS plugin can match them and where it can do better. It feeds the plan for this repository.

- **Our engine:** `@surea11y/core` 1.9.0, read and run directly from the source, from the point of view of a content editor rather than a developer.
- **WordPress and Drupal:** the main targets, studied in depth.
- **Headless and hosted CMSs** (Contentful, Sanity, Storyblok, Shopify and others), plus the editor libraries many CMSs share (CKEditor, TinyMCE): covered more briefly.
- **Joomla:** context only. Sa11y has shipped inside Joomla itself since version 4.1, so every Joomla site already has a free checker.
- **Overlays and commercial site-wide platforms:** included only to set boundaries and price context.

Sources are public source code on GitHub (cloned and read), documentation, and search results. The research environment could not reach wordpress.org, drupal.org, extensions.joomla.org or most vendor sites, so install counts, ratings, prices and support-forum complaints are taken from third-party summaries where available and marked [unverified].

## Our engine through a CMS lens

The engine is technically ready to sit inside a CMS, but it was built for conformance auditing, not for content editors. It lacks several checks editors expect, its messages are written for developers, and it has no way to record a person's answer. All figures were measured on `@surea11y/core` 1.9.0 in jsdom (a simulated browser in Node.js); nothing could be tested in a real browser.

### What already works for a CMS

- **Drop-in browser bundle.** `surea11y.browser.js` is 857 KB, or 206 KB compressed. It adds one global, `window.a11ycore`, and a page calls `a11ycore.runa11yCoreInPage(...)`. No dependencies and no network calls.
- **Complete translations.** German, Spanish, French and Japanese each have 844 of 844 messages (about 30 KB compressed per language).
- **Every message can be rewritten without forking.** `engineOptions.messages` overrides any message in any language, and a new language can be added partially, falling back to English. A plugin can therefore supply its own editor-friendly wording.
- **Scoping.** A CSS selector limits the scan to part of a page, such as the content area. Whole-page rules (page title, language, landmarks) then correctly report "not applicable". `excludeSelectors` hides elements from all rules or from one rule.
- **Every problem comes with a fix.** Each occurrence has a `summary` (what is wrong) and a `hint` (how to fix it), the element's selector and a short HTML snippet.
- **Honest outcomes.** Results are pass, fail, cantTell (could not decide) or not applicable. 27 automatic rules attach an uncertainty code and a `needed` sentence that reads like a question, for example "Whether the page provides a control that pauses the scrolling content."
- **Standards for the public sector.** Profiles for EN 301 549 (V3.2.1 and V4.1.1) and Section 508 add the matching clause to each result, which is useful for EU and US public bodies and their accessibility statements.
- **Licence.** MPL-2.0 with no "incompatible with secondary licences" notice, so it can be combined with GPL code as WordPress.org requires. This is our reading, not legal advice.

### What gets in the way

- **Speed.** A post of 1,518 elements took 0.75 seconds per scan (1.8 seconds the first time), of which 0.31 seconds was one contrast rule. The scan is synchronous and needs the page, so it freezes the editor while it runs. Real browsers should be faster, but that is unverified.
- **It cannot be handed an element.** The engine always scans the document it was loaded into. To check the block editor's canvas, which is an iframe, the bundle must be loaded inside that iframe.
- **Silent fallbacks.** A scope selector that matches nothing scans the whole page instead. A rule list passed in the wrong shape is ignored and every rule runs.
- **Heading order only within the scope.** A block with an `<h3>` cannot see the page's `<h1>` outside it, so skipped levels across blocks need a scan of the whole content area.
- **Results balloon when saved.** Every result repeats the engine options, including the whole translation dictionary. With the Spanish file loaded, one small scan serialises to **20.7 MB** of JSON instead of 199 KB. Harmless in memory, a problem the moment results are saved or sent anywhere.
- **It touches the live page.** Three rules call `.focus()` on elements and one injects a `<style>` tag, both restored afterwards. Inside a live editor that can trigger the editor's own handlers.
- **Contrast is noisy in editor canvases.** With no known background, the strict default stays silent, while the `contrast-computable` rule produced 18 "not computable" results on a small test page.
- **Only 1 of 133 rules has a help link.**

### Messages through an editor's eyes

The wording names HTML elements and attributes rather than what the editor sees on screen.

| Rule | What the engine says | Would an editor understand? |
| --- | --- | --- |
| `heading-order` | "This heading jumps from level 1 to level 3, skipping a level." | Yes |
| `link-name-quality` | "This link's accessible name ("click here") is a generic, non-descriptive phrase." | Mostly; "accessible name" is jargon |
| `img-alt-present` | "Missing alt attribute on `<img>`." | Partly; the editor sees an "Alternative text" field, not an attribute |
| `empty-heading` | "This heading has no accessible name." | Barely |
| `contrast-minimum` | "Element has insufficient color contrast of 1.92:1 (foreground: #bbbbbb, background: #ffffff...)" | Technical |
| `td-has-header` | "This data cell has no associated header (no headers attribute...)" | No |
| `contrast-computable` | "Contrast is not computable because the effective background is not fully opaque at the root (alpha=0.00)." | No |
| `manual-review` | "See guidance for this rule." | No |

Nothing in the engine distinguishes the editor's content from the theme or template.

### Uncertainty, but no answers

The 52 manual rules can only report cantTell, never fail, and carry no uncertainty code or question. No part of the engine records a human answer such as "I checked, this alt text is fine". `baseline.js` only remembers known failures for CI. A CMS plugin would have to store reviews itself.

### Checks editors expect

The engine has 133 checks (80 automatic, 52 manual, plus one meta check), strongest on ARIA and markup validity. Against the checks editor tools usually offer:

| Check | Status | Detail |
| --- | --- | --- |
| Missing alt text | Covered | `img-alt-present` (fail) |
| Suspicious alt text (file name, "image of") | Missing | `img-alt-quality` gives the same "review" message for every image with alt text, good or bad |
| Alt text repeating nearby text | Covered | `image-redundant-alt` (cantTell) |
| Skipped heading levels | Covered | `heading-order` (cantTell only) |
| Empty headings | Covered | `empty-heading` (cantTell, not fail) |
| Placeholder headings | Covered | `heading-quality` |
| "Click here", "read more" | Partial | Exact phrases in 5 languages, but suppressed when the paragraph has other text |
| A web address as link text | Missing | |
| Image and text linking to the same place side by side | Missing | |
| Empty links | Covered | `link-name-present` (fail) |
| Text contrast | Covered | Needs a real browser and a known background |
| Tables without headers | Partial | `td-has-header` only checks tables of 4×4 or larger |
| Links to PDF and Office files | Missing | |
| ALL CAPS text | Missing | |
| Fake lists ("- item" lines) | Missing | |
| Bold paragraphs used as headings | Partial | Only when the text is 18px or larger |
| Captions on embedded YouTube or Vimeo video | Partial | Native `<video>` only |
| Marquee and blink | Partial | Marquee only |
| Language of the page and of passages | Covered | |
| Form labels | Covered | |
| Readability | Missing | |

## The existing tools

WordPress has three serious editor-facing checkers: Equalize Digital, Editoria11y and Sa11y. None of them checks a fully rendered page while the author types. Facts below come from each tool's public source code, cloned on 2026-10-04, unless marked [unverified].

### WordPress

**[Equalize Digital Accessibility Checker](https://github.com/equalizedigital/accessibility-checker)** (v1.50.1, free and Pro). The market leader.

- **Engine:** axe-core 4.8 with 11 axe rules turned on, plus Equalize's own rules: 44 in total (24 errors, 20 warnings).
- **When it runs:** on save, draft or publish, in a hidden iframe that loads the preview. Not while typing. Results show in an editor sidebar and in a front-end highlighter for logged-in users.
- **UX strengths:** "View on page" and "Show code" for each issue. Dismissals require a reason (false positive, remediated, confirmed accessible), record who and when, and can be reopened. Role permissions for dismissing and exporting. A readability score, help articles and about 35 languages.
- **Also:** 12 free and 4 Pro "automatic fixes" injected on the front end (skip links, focus outlines). An accessibility statement generator. Weekly email reports.
- **Weaknesses:** it scans the whole page, so theme and plugin problems appear next to content problems on every page. 33 GitHub issues about false positives (empty buttons, aria-hidden, tracking pixels). Some database performance issues. Site-wide reports and custom post types require Pro.
- **Price and adoption** [unverified]: Pro from $190 to $2,250 a year; 10,000+ active installs, rated 4.9.
- **Privacy:** no external service; results stored in the site's database.

**[Editoria11y](https://github.com/itmaybejj/editoria11y-wp)** (v3.0.6, Princeton). The best editor experience.

- **Engine:** its own JavaScript library, which shares its test code with Sa11y. 50+ content checks free; about 50 developer and contrast checks, a crawler and custom tests in a paid tier.
- **When it runs:** live as the author types, in both the block editor and the classic editor. Also on published pages and previews for logged-in editors.
- **UX strengths:** spellcheck-style markers with tooltips in plain language ("This image needs alternative text", not "Failure of WCAG 1.1.1"). "Ignore" for oneself and "Mark as OK" for everyone. A heading outline and an alt-text viewer. A site-wide dashboard, filled in whenever a logged-in author views a page. 31 languages.
- **Content vs. theme:** its strongest point. It deliberately leaves out, or shows only to developers, issues editors cannot fix, and can be limited to the content area.
- **Weaknesses:** heuristic checks rather than a WCAG rule engine. Fragile when the block editor changes (broke after a Gutenberg update). Database lockups on large multisite installs (issue #61, open).
- **Price:** free; the paid tier is "contribute what you can".

**[Sa11y](https://github.com/ryersondmp/sa11y-wp)** (v1.2.9, Toronto Metropolitan University). Simple and free.

- **Engine:** the Sa11y library, 80+ checks, including readability.
- **When it runs:** only on previews and published pages for logged-in users. Not in the editor. No site-wide reports.
- **UX:** tooltips, outline and image panels, contrast suggestions with clickable colour codes, an HTML report export, dark mode. Dismissals are temporary and per user. Every check is shown to every user by default, so editors also see developer issues.
- **Adoption** [unverified]: about 300 active installs.

**[Block Accessibility Checks](https://github.com/troychaplin/block-accessibility-checks)** (v4.2.2) checks block settings rather than the rendered page: image alt text, button text, table headers, heading order. Each check can be set to Error, Warning or Off, and **errors block publishing**.

**Watch closely: [WordPress/accessibility-lab](https://github.com/WordPress/accessibility-lab).** Created on 2026-08-12 under the official WordPress organisation, it turns Block Accessibility Checks into a "Block Validation Framework" aimed at WordPress core. It gives plugins an API to register checks, warnings and errors, publish locking, and a Validation sidebar. If it lands in core, it is the natural place for a SureA11y plugin to plug in.

**WordPress core itself** has no general accessibility checker yet. The block editor warns about low colour contrast. An open proposal, [Gutenberg PR #83130](https://github.com/WordPress/gutenberg/pull/83130), would warn about unhelpful alt text (file names, "image", text duplicating the caption, over 150 characters).

**Less relevant:**

- **WP ADA Compliance Check** [unverified]: a server-side PHP scanner with 52 free or about 81 paid checks. Paid plans from $199 a year. Its own documentation discusses slow scans and server errors on large sites.
- **Elementor's Web Accessibility** (formerly One Click Accessibility): loads a closed scanner from Elementor's servers, sends data to Elementor, and rewrites page HTML on the server. In effect a server-side overlay.
- **[WP Accessibility](https://github.com/joedolson/wp-accessibility)** (Joe Dolson): a remediation toolkit with alt-text enforcement and diagnostic CSS rather than a checker.
- **Siteimprove Prepublish** [unverified]: a paid add-on that sends preview pages to Siteimprove's service.
- **New in 2026** [unverified]: AccessVane (axe-core with plain-English fixes) and several small entrants, some with AI-generated alt text.

### The shared engine: Sa11y and Editoria11y

Since Editoria11y 3.0 (April 2026), Editoria11y and Sa11y run **the same test code**. In practice, one open-source engine, licensed GPL, powers the leading free checkers in WordPress, Drupal and Joomla.

- **[Sa11y](https://github.com/ryersondmp/sa11y)** (v5.0.9, Toronto Metropolitan University, GPL-2.0-or-later): 108 check keys, contrast in AA, AAA or APCA, readability, 31 languages, CSV and HTML export, colour-blindness filters, and an "edit image" link back to the CMS. Dismissals are stored only in the user's browser.
- **[Editoria11y](https://github.com/itmaybejj/editoria11y)** (v3.0.1, Princeton, GPLv2) adds the author layer on top: about 105 checks, automatic runs, live checking inside CKEditor, TinyMCE and the block editor, "Hide" and "Mark OK", results synced to the site, and options to show each role only what it can fix. **It also ships a W3C ACT conformance harness with an EARL report**, so standards evidence is not unique to us. Its translations into 19 languages are machine-generated.

### Drupal

Editoria11y is the de facto standard, and the alternatives are either dead or paid services.

- **Editoria11y module** [unverified details]: live in CKEditor 5, on rendered pages and in Layout Builder. A dashboard under Reports lists top issues, worst pages, recent issues and dismissals, with CSV export. Separate permissions for viewing, hiding and marking OK. It is included in Drupal CMS's "Accessibility Tools" recipe. On 2026-09-23 it had a security advisory ([SA-CONTRIB-2026-185](https://www.drupal.org/sa-contrib-2026-185)): a "view" permission allowed editing and deleting results data. A results store is attack surface.
- **Canvas Accessibility Checker** [unverified]: Editoria11y-derived checks for Drupal Canvas, the new page builder.
- **CKEditor 5**, the editor Drupal uses, has **no accessibility checker**. The request has been [open since 2019](https://github.com/ckeditor/ckeditor5/issues/1941). The CKEditor 4 checker relied on the Quail engine, which is unmaintained.
- **Siteimprove** and **Acquia Optimize** (formerly Monsido) [unverified]: modules that show results from their paid services inside Drupal. Siteimprove's "Prepublish" sends draft HTML to Siteimprove; its results vanish on reload. Siteimprove's engine, [Alfa](https://github.com/Siteimprove/alfa), is open source (MIT) and based on ACT rules.
- **Drupal core**: alt text is required by default, and images can be marked decorative. There is no content checker.

### Joomla

Joomla ships Sa11y as its built-in "Accessibility Check" (Jooa11y), currently Sa11y 5.0.9 in Joomla 6.2. It is weak in practice:

- It only runs on the public site, not in the editor. The toolbar button appears only for articles already saved, and opens the page in a modal.
- Nothing is stored on the server: no dashboard and no shared dismissals.
- With "Show Always" turned on, every visitor sees it, including anonymous ones, and it can report [87 errors on an empty form](https://github.com/joomla/joomla-cms/issues/43566) because it scans the whole form.

### Editor libraries and headless CMSs

The headless CMSs have **no in-editor content checker at all**; their marketplaces offer only overlay widgets and external crawlers.

| Platform | What exists | Notes |
| --- | --- | --- |
| Contentful | Nothing found | Only an overlay integration |
| Sanity | SkynetAccessibility Scanner | A wrapper around a paid crawling service, $9 to $399 a month; Skynet also sells an overlay |
| Storyblok | Nothing shipped | Heading-order alerts planned [unverified] |
| Strapi, Payload | Only Skynet's overlay widget | |
| Contentstack | Nothing found | |
| Webflow | Built-in Audit panel [unverified] | 4 checks: alt text, link text, heading levels, duplicate IDs |
| Wix | Built-in Accessibility Wizard [unverified] | Site and page scan with manual tasks |
| Squarespace | Nothing built in | Editoria11y can be injected, without "Mark OK" |
| Shopify | Mostly overlay widgets | A few axe-core crawlers, such as AccessComply [unverified] |
| TinyMCE | Paid Accessibility Checker | 17 rules with automatic repair, run on demand; part of paid plans |
| CKEditor 5 | Nothing | Open request since 2019 |

### Commercial site-wide platforms (price context)

All are crawling services, priced per page and per year [unverified, from third-party pages]:

- **Siteimprove**: about £8,800 a year for 1,000 pages; typical contracts $15,000 to $150,000.
- **Silktide**: about £5,600 a year for 1,000 pages.
- **Deque axe Monitor** (built on axe-core): about $30,000 to $75,000 a year.
- **Acquia Web Governance**: by quote.
- **Pope Tech** (built on WAVE): free for 25 pages, $25 to $400 a month.
- **WAVE API**: $0.025 to $0.04 per page check.

## Overlays, and the rules driving demand

### What we must not be

An overlay is third-party code, usually JavaScript, that changes the page visitors see: a toolbar of user controls, "automatic repair", or both. The [Overlay Fact Sheet](https://github.com/karlgroves/overlayfactsheet), signed by about 1,150 accessibility professionals, says automated repairs are unreliable, that "full compliance cannot be achieved with an overlay", and that detecting assistive technology exposes a visitor's disability. It names accessiBe, AudioEye, EqualWeb, UserWay, Skynet's All in One Accessibility and Elementor's Ally, among others.

In April 2025 the US Federal Trade Commission's [order against accessiBe](https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc) became final: a $1 million payment, and a ban on claiming that an automated product makes or keeps any site WCAG-compliant [unverified]. The European Disability Forum and IAAP have stated jointly that overlays do not make sites compliant with EU law [unverified].

Equalize Digital and Editoria11y both state "this is not an overlay" in their FAQs; it is a norm in this market. Our rules:

- Never change the page that visitors see.
- Never claim "compliance", a percentage of WCAG covered, or that AI fixes everything.
- Never detect assistive technology or track visitors.
- Keep results in the customer's own database.

This rules out Equalize-style "automatic fixes" injected on the front end. Suggestions for the author are fine and, as the next section shows, required.

### Regulation behind the demand

- **European Accessibility Act**: applies since 2025-06-28 to e-commerce, banking, e-books, transport and similar services. Microenterprises providing services are exempt.
- **EN 301 549**: V4.1.1 was published on 2026-09-02 and adopts WCAG 2.2. V3.2.1 (WCAG 2.1) remains the legal reference until V4.1.1 is cited in the EU's Official Journal. Our engine already maps results to both versions.
- **EN 301 549 clause 11.8.4 applies directly to us.** An authoring tool that detects content that does not conform "shall provide repair suggestion(s)". A CMS checker therefore needs a concrete fix suggestion for every problem it flags.
- **US ADA Title II rule** (WCAG 2.1 AA for state and local government): the deadlines moved in April 2026, to 2027-04-26 for entities serving 50,000 people or more and 2028-04-26 for smaller ones.
- **Section 508**: the 2017 refresh adopted WCAG 2.0 AA and includes requirements for authoring tools.

Sources (not opened directly): [EU accessibility centre on EN 301 549](https://accessible-eu-centre.ec.europa.eu/content-corner/news/european-accessibility-standard-en-301-549-has-been-updated-2026-09-07_en), [EN 301 549 V3.2.1](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf), [Reed Smith on the ADA deadlines](https://www.reedsmith.com/articles/doj-extends-digital-accessibility-compliance-dates-under-title-ii-of-the-ada/), [Section508.gov on authoring tools](https://www.section508.gov/buy/authoring-tools/).

## Comparison

Editoria11y sets the bar for the editor experience and Equalize Digital for review workflow and reporting; our engine is stronger on rules and standards but has no product around it yet. The last column is the engine as it is today, not a plugin that does not exist.

| | Equalize Digital | Editoria11y | Sa11y | Block A11y Checks | TinyMCE checker | SureA11y engine today |
| --- | --- | --- | --- | --- | --- | --- |
| CMSs | WordPress | WordPress, Drupal, Squarespace | WordPress, Joomla (core) | WordPress | Any TinyMCE editor | None yet |
| Engine | axe-core + own rules (44) | Sa11y code (~105 checks) | Own (108 check keys) | Block settings only | Proprietary (17 rules) | Own (133 checks, 58 rules validated against ACT) |
| Checks while typing | No, on save | Yes | No | Yes | No, on demand | Possible; 0.75 s per scan in jsdom |
| Checks the rendered page | Yes | Yes | Yes | No | No | Yes |
| Content vs. theme | Weak | Strong | Weak | Not applicable | Content only | Scoping by selector only |
| "Could not decide" shown as such | No | As manual checks | As warnings | No | No | Yes: cantTell with uncertainty codes |
| Review and dismissal | Reason, note, who, when; reopen; role permissions | Hide for me; Mark OK for all | Per browser only | Severity settings | Ignore rules | None |
| Blocks publishing | No | No (planned) | No | Yes, configurable | No | Not applicable |
| Site-wide report | Pro | From editors' page views; crawler paid | No | No | No | None |
| Fix suggestions | Help articles; front-end auto-fixes | Plain-language tips | Tips | Messages in the block panel | Automatic repair | A hint per problem, developer wording |
| Plain language for editors | Good | Very good | Good | Good | Good | Developer wording |
| Readability | Yes | Via Sa11y | Yes | No | No | No |
| EN 301 549 / Section 508 mapping | No | No | No | No | Section 508 | Yes |
| ACT evidence (EARL) | No | Yes (harness) | No | No | No | Yes (58 rules, 798 cases) |
| Languages | ~35 | 19 (machine-translated) | 31 | Unknown | Unknown | 5 (human quality, about 100% complete) |
| Data leaves the site | No | No | No | No | No | No |
| Licence | GPL | GPLv2 | GPL-2.0+ | GPL | Commercial | MPL-2.0 |
| Price | Free; Pro $190 to $2,250 a year [unverified] | Free; pay what you can | Free | Free | Paid plans | Free |

What users clearly like across these tools:

- **Spellcheck-style feedback**: inline markers in context with a short plain-language tip, running automatically. A checker behind a button goes unused.
- **Show me where**: jump from a list to the highlighted element, and "next issue".
- **Two kinds of dismissal**: "hide for me" and "mark as OK for everyone", the second limited to trusted roles and auditable (reason, who, when, reopen).
- **Outline views**: the page's heading outline and all its alt texts in one place.
- **Role-aware results**: authors see what they can fix; developers see the rest.
- **No external service and no per-page fees.**
- **Configurable severity**, with errors that can block publishing.

What users complain about:

- **Noise**: theme and plugin problems repeated on every page, false positives on WordPress's own markup, developer errors shown to authors.
- **Late feedback**: only after saving, or only in preview.
- **Server load**: PHP crawls hitting time limits, heavy database queries, multisite lockups.
- **Breakage** when the block editor changes.
- **Paywalls** around custom post types, site-wide reports and crawling.

## Where we match, fall short and can go further

Matching the leaders is achievable, but going further depends on product work more than on the engine: content-versus-template attribution, author answers to uncertain results, and reaching editors no one serves yet.

### Where we already match

- Runs entirely in the browser, with nothing sent off-site.
- Checks the rendered page, scoped to the content area.
- A fix hint for every problem.
- Human-quality translations in five languages (fewer languages than competitors, but not machine-translated).
- Contrast, language, form-label and ARIA checks at least as deep as the others.

### Where we fall short today

1. **No product.** No panel, no inline markers, no dismissal, no dashboard. Everything users like in Editoria11y and Equalize Digital has to be built.
2. **Missing editor checks**: suspicious alt text, web addresses as link text, PDF links, ALL CAPS, fake lists, readability and others (see the engine section).
3. **Developer wording.** Fixable without changing core, by overriding messages, but someone has to write them.
4. **No memory of human answers.** Every reviewed item would come back on every scan.
5. **Speed while typing** is unproven: 0.75 seconds per scan in jsdom, blocking the page.

### Where we can go further

1. **Say who can fix it, down to the block.** Every tool either shows everything or hides whole categories. We can attribute each problem to a specific block in the post, to a template part, or to the theme or a plugin, and jump straight to that block. Nobody does this.
2. **Turn uncertainty into questions the author answers.** "Does this alt text describe the image?", answered once, recorded with who and when, and not asked again unless the content changes. Competitors show warnings to dismiss; we would collect evidence.
3. **Evidence, not compliance claims.** A dated trail of automated results and human answers, mapped to WCAG 2.2 and EN 301 549, exportable as EARL. That supports the accessibility statements EU public bodies must publish, and audits, without the overlay vendors' promises.
4. **Repair suggestions tied to editor controls**: "Open the Alternative text field" rather than "add an alt attribute". EN 301 549 clause 11.8.4 requires repair suggestions from authoring tools.
5. **Plug into WordPress's own validation framework.** The Block Validation Framework in WordPress/accessibility-lab is heading for core. Being the first real accessibility engine on it would put us where WordPress itself shows warnings and blocks publishing.
6. **One engine from editor to CI.** The same rules in the editor, in Playwright and Cypress tests, and on the command line. Authors and developers see the same results. No competitor offers this.
7. **Precision as a published number.** The ACT test corpus lets us publish false-positive rates. Competitors' issue trackers are full of false-positive reports.
8. **Reach editors nobody serves.** CKEditor 5 and the headless CMSs (Contentful, Sanity, Storyblok, Strapi, Payload) have no content checker. Sa11y and Editoria11y are GPL, which keeps them out of proprietary editors and SaaS products; our MPL-2.0 licence does not.

### Honest caveats

- Editoria11y is good, free, and has a real head start in Drupal. In Drupal we would need to be clearly better, not just comparable.
- Editoria11y already publishes ACT evidence, so standards alone will not set us apart.
- WordPress's validation framework is an experiment; its API may change or never reach core.

## Engine improvements to file as SureA11y/core issues

Twelve changes in core would make the plugin better for everyone, not only CMS users. They are ordered by how much a CMS plugin needs them; none has been filed yet.

| # | Change | Why a CMS needs it | Size |
| --- | --- | --- | --- |
| 1 | Stop repeating `engineOptions`, with the whole translation dictionary, inside every result | One scan serialises to 20.7 MB with a language file loaded; plugins save and send results | Small |
| 2 | Report an error, or flag the result, when the scope selector matches nothing or `runOnly` has the wrong shape, instead of silently scanning everything | Wrong scopes would show theme problems to editors without anyone noticing | Small |
| 3 | Make `img-alt-quality` tell suspicious alt text (file names, "image of", "photo", placeholders, very long text) from ordinary alt text | Today it asks for review on every image, so editors learn to ignore it | Medium |
| 4 | New content checks: a web address as link text, links to PDF and Office files, ALL CAPS text, fake lists, adjacent links to the same place | Every competing editor tool has them | Medium |
| 5 | Widen existing checks: "click here" inside longer paragraphs, bold paragraphs used as headings at normal size, small tables without headers, captions for embedded YouTube and Vimeo | Common editor mistakes that currently pass | Medium |
| 6 | A question for every cantTell, including the 52 manual rules: a stable code and a plain question the author can answer | The core of our difference; today manual rules carry no question | Medium |
| 7 | A stable identity for each occurrence, and an API to apply recorded human answers ("reviewed: fine") to later scans | Without it every reviewed item comes back on every scan | Medium |
| 8 | Accept an element or document to scan, not only a selector in the bundle's own page | Lets one copy of the engine check the editor's iframe canvas | Medium |
| 9 | An option to skip rules that change the live page (`.focus()` calls, injected styles) | Avoids interfering with the editor while the author works | Small |
| 10 | Allow the scan to yield to the browser between rules, or expose per-rule timing to schedule them | A 0.75-second freeze is noticeable while typing | Medium |
| 11 | Plain-language message set ("content" tone) alongside the developer wording, and help links for every rule | Only 1 of 133 rules has a help link | Large |
| 12 | A readability measure for the main languages | Offered by Equalize Digital and Sa11y | Medium |

The plugin can work around items 1, 2, 9 and 11 at first (strip options before saving, validate scopes itself, exclude the rules, override messages), so they should not delay a first version.

## Open questions and next steps

The next step is to write `docs/PLAN.md` from this report, after the maintainer answers the questions below.

### Questions for the maintainer

- [ ] WordPress only first, or WordPress and a headless CMS (for example Sanity or Storyblok) together, given that headless CMSs have no checker at all?
- [ ] Is Drupal still a near-term target, given Editoria11y's lead there?
- [ ] Free and open source only, or a paid tier later (site-wide reports, evidence export)?
- [ ] Is a hosted site-wide crawling service in scope at all?
- [ ] Licence for this repository: MPL-2.0 like core, or GPL-2.0-or-later, which WordPress.org always accepts?

### To verify with normal web access

The research environment could not open wordpress.org, drupal.org or most vendor sites. Before relying on them, check:

- [ ] The `surea11y` name is free on WordPress.org and Drupal.org.
- [ ] Install counts and ratings for Equalize Digital, Editoria11y and Sa11y.
- [ ] Equalize Digital, TinyMCE and commercial platform prices.
- [ ] The FTC order against accessiBe and the EU disability groups' statement on overlays.
- [ ] The engine's speed in a real browser, inside the block editor.

### Next steps

- [x] Copy this report into `docs/research/`.
- [ ] File the engine improvements above as issues in `SureA11y/core`.
- [ ] Build a small prototype: the browser bundle inside the WordPress block editor's canvas, timing a real scan.
- [ ] Write `docs/PLAN.md`.
