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

= Does it slow the editor down? =

It checks in a hidden frame a moment after you stop typing: one second while
its sidebar is open, three seconds otherwise. The first check waits until the
editor has finished loading.

== Changelog ==

= 0.1.0 =
* First version: the editor sidebar, its count on the toolbar, a line in the
  checks before publishing, and the page checker on previews and published
  pages.
