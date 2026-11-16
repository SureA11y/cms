=== SureA11y ===
Contributors: surea11y
Tags: accessibility, a11y, checker, block editor, wcag
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

An accessibility checker for the block editor, in plain language.

== Description ==

SureA11y checks what you write as you write it: images without a useful
description, bold lines that should be headings, links whose text doesn't
say where they go, tables without headers, links to documents that don't say
what they open, and more. It checks against WCAG 2.2, and tells you plainly
what it found and how to fix it.

What it can't decide on its own, it asks you, rather than guessing: "Check
it" shows what to look at, and your answer (it's fine, it's a problem, or not
sure) is shared with everyone who edits the post.

It is a checker, not an overlay: it never changes what your visitors see, and
it doesn't claim to make a site "compliant". Your content is checked in your
browser and is never sent anywhere. Visitors load nothing of it.

* **In the editor:** a sidebar with what it found, a marker beside each
  block with a finding, and a count on the toolbar button.
* **On the page:** "Check accessibility" in the toolbar checks the whole
  page, theme included, and says which findings are yours and which are the
  theme's. "Check at phone width" finds what makes it scroll sideways.
* **In the Site Editor:** templates, headers and footers, as visitors get
  them.
* **For the team:** Dashboard → Accessibility shows the problems found on
  the most pages and the latest answers; the lists of posts and pages have an
  Accessibility column.
* **As evidence:** each check is recorded with the post, and downloads as
  CSV (with WCAG and EN 301 549 references) or EARL.
* **In your language:** English, Spanish, German, French and Japanese.

== Installation ==

1. Install the plugin from Plugins → Add New, or upload the `surea11y`
   folder to `/wp-content/plugins/`.
2. Activate it.
3. Open a post in the editor and choose the accessibility icon in the top
   toolbar.

Settings → Accessibility checker sets who sees the checker, who can answer
for everyone, where your theme puts the content, and which rules run.

== Frequently Asked Questions ==

= Where is it? =

In the editor, choose the accessibility icon in the top toolbar, or
Options > Accessibility. The icon shows how many things there are to fix or
confirm, and the checks before publishing show the same in one line.

On a preview or a published page, choose "Check accessibility" in the
toolbar at the top. It checks the whole page, theme included, and tells you
which findings are in your content and which are in the theme. Only people
who can edit the page see it.

= Can my team share what they checked? =

Yes. An answer to "Check it" (it's fine, it's a problem, or not sure) records
who answered, when, and an optional note, and everyone who edits the post
sees it, in the editor and on the page. "Hide for me" only hides a finding
for you. Settings → Accessibility checker sets who sees the checker and who
can answer.

= Does it make my site compliant? =

No checker can. It finds what can be found automatically and asks you about
what only a person can judge; some of WCAG can only be checked by people,
such as whether a text alternative fits its image in context. It never
changes your pages for visitors.

= Is anything sent to another service? =

No. Content is checked in your browser. The plugin makes no requests to
other servers and has no tracking.

= What does it store, and what happens when I delete it? =

With each post: your team's answers (who, when, the note) and the last 20
records of its checks. In each person's editor preferences: the findings they
hid for themselves. These are included in WordPress's personal data export
and erasure, and the plugin suggests text for your privacy policy.
Deactivating keeps everything. Deleting the plugin removes all of it, so
download the records you want to keep first.

= Does it slow the editor down? =

It checks in a hidden frame a moment after you stop typing: one second while
its sidebar is open, three seconds otherwise. The first check waits until the
editor has finished loading.

= Where is the source code? =

The plugin's `build/` folder holds the checking engine and the panel,
compressed. Their source is SureA11y's engine, @surea11y/core
(https://github.com/SureA11y/core), and the panel and CMS pack in the
SureA11y for CMS repository, from which `npm run build` makes these files.

== Screenshots ==

1. The Accessibility sidebar in the editor, with a marker beside each block that has a finding.
2. "Check it": what to look at, and your answer, shared with your team.
3. Nothing left to fix or review, and the record of the check.
4. Dashboard → Accessibility: the problems found on the most pages.

== Third-party code ==

`build/engine.js` bundles @surea11y/core and the CMS pack, and
`build/panel.js` is the SureA11y panel: all three under the Mozilla Public
License 2.0, which is compatible with the GPL.

== Changelog ==

= Unreleased =
* Deleting the plugin removes what it stored; its data is included in
  WordPress's personal data export and erasure, with suggested privacy
  policy text.
* The CSV export names each finding's EN 301 549 clauses beside its WCAG
  criteria.
* The Accessibility sidebar in the Site Editor: templates, headers and
  footers are checked as visitors get them, with each finding on its block.
* "Check it" speaks an editor's language for nineteen more kinds of
  finding: contrast over images, tables, embeds, moving images and the
  phone-width check.
* Rules are named in plain words, in your language, on the settings page
  and in the site overview.
* An Accessibility column in the lists of posts and pages: each post's
  counts from its last check, with your team's answers since.
* Dashboard → Accessibility: the problems found on the most pages, the
  pages with the most to fix, and your team's latest answers, from the
  checks people have run. Nothing is crawled.
* A record of each check, kept with the post when you save and when you
  check the page, with your team's answers. Download it as CSV or EARL from
  the Accessibility sidebar.
* "Check it" speaks an editor's language for the findings met most: no
  developer tools or HTML in its steps.
* "Check it" on findings the checker can't decide: the steps to check it,
  what fine and a problem look like, and your answer, shared with your
  team: it's fine, it's a problem, or not sure.
* Headings and Images views: the headings in order, and what a screen
  reader says for each image.
* From a finding: change a heading's level, open the text colour, or select
  a link's text.
* "Hide for me" on pages too, and "Edit in the editor" opens the editor on
  that finding.
* "Check at phone width" on pages: finds what makes the page scroll
  sideways on a phone (WCAG 1.4.10).
* Fewer buttons on each finding: "Reviewed" and "Hide for me" are under
  "More".

= 0.1.0 =
* First version: the editor sidebar, its count on the toolbar, a line in the
  checks before publishing, and the page checker on previews and published
  pages.
