# SureA11y for editors

SureA11y checks the accessibility of what you write in WordPress, while you
write it, and tells you in plain words what it found and what to do.

## A checker, not an overlay

SureA11y never changes what your visitors see. It adds nothing to your
pages: no toolbar, no widget, no script for visitors. It doesn't "fix" pages
automatically, and it doesn't make a site "compliant": no tool can. It finds
what can be found automatically, asks you about what only a person can
judge, and keeps a record of what was checked and answered.

Your content is checked in your own browser. Nothing is sent to another
service.

## Where you find it

- **In the editor:** the accessibility icon at the top right opens the
  Accessibility sidebar. A number on the icon says how many things there are
  to fix or confirm. Blocks with a finding get a small marker beside them;
  choose it to see the finding.
- **Before publishing:** the checks before publishing have one line with the
  same counts. It never stops you publishing.
- **On a page:** while logged in, "Check accessibility" in the toolbar at the
  top checks the whole page, theme included. "Check at phone width" checks it
  as a phone shows it.
- **In the Site Editor:** the same sidebar checks templates, headers and
  footers.
- **For the whole site:** Dashboard → Accessibility lists the problems found
  on the most pages, the pages with the most to fix, and the latest answers.
  The lists of posts and pages have an Accessibility column.

## The four groups

| Group | What it means | What to do |
| --- | --- | --- |
| To fix | The checker is sure there is a problem. | Fix it. "How to fix" says how. |
| Likely problem | The evidence points to a problem, but it can't be sure. | Look, then fix it or answer the question. |
| Needs a person | Only a person can tell. | Answer the question ("Check it"). |
| Probably fine | The evidence says it is fine. | A quick look confirms it. |

"Show" selects the block the finding is in. The arrows at the top step
through every place in order. "Headings" lists the post's headings in
order; "Images" shows what a screen reader says for each image.

## Answering a question

"Check it" shows what to look at, step by step, and what "fine" and "a
problem" look like. Then answer:

- **Yes, it's fine:** the finding moves to "Reviewed, fine", with your name, the
  date and your note, for everyone who edits the post.
- **No, it's a problem:** it moves to "To fix", saying who confirmed it.
- **Not sure:** it stays open, saying you weren't sure, so someone else can
  look.

"Reopen" takes an answer back. "Hide for me" (under "More") hides a finding
for you only, without answering for the team. Your site's settings decide
who may answer for everyone.

## Your content or the theme

On a page, each finding says whether it is in **your content** (the post or
page you write) or in the **theme or template** (the header, the menu, the
footer, the site's styles). Theme findings are usually for whoever builds or
looks after the site, and are fixed once for every page, often in the Site
Editor.

A finding worded for editors has a closed part, **For your developer**: the
rule's name, the element's code and, where it applies, the CSS involved. You
don't need it to act; pass it on to whoever builds the site when the fix is
theirs.

## Records of checks

When you save a post by hand, and when you check its page, SureA11y records
the check: when, who, what it found and the answers given until then. The
sidebar shows the last record and downloads every record as a spreadsheet
(CSV) or as EARL, a standard format for test results. Each finding names the
WCAG criteria and EN 301 549 clauses it relates to.

## What a checker can't tell you

Some of accessibility can only be judged by people: whether text is clear,
whether an image's description fits what the page says, whether a page
makes sense read aloud. Automatic checks catch some problems, and questions
help with more, but they don't replace trying the page with a keyboard and a
screen reader, and asking the people who use it.

## Every finding, explained

[What each finding means](messages.md) lists every rule the checker runs,
with the messages you may see and what to do.
