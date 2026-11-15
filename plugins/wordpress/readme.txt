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

What it can't decide on its own, it asks you, rather than guessing.

It is a checker, not an overlay: it never changes what your visitors see, and
it doesn't claim to make a site "compliant". Your content is checked in your
browser and is never sent anywhere.

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

Yes. "Reviewed, it's fine" records who checked a finding, when, and an
optional note, and everyone who edits the post sees it, in the editor and on
the page. "Hide for me" only hides it for you. Settings → Accessibility
checker sets who sees the checker and who can review.

= Does it slow the editor down? =

It checks in a hidden frame a moment after you stop typing: one second while
its sidebar is open, three seconds otherwise. The first check waits until the
editor has finished loading.

== Changelog ==

= Unreleased =
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
