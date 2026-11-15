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
Options > Accessibility.

= Does it slow the editor down? =

It checks about a second after you stop typing, in a hidden frame, and only
while its sidebar is open.

== Changelog ==

= 0.1.0 =
* First version: the editor sidebar.
