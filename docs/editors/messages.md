# What each finding means

<!-- Made by scripts/editor-docs.mjs from the build and the panel's messages. Do not edit by hand. -->

Every rule the checker runs, 138 in all, by the name the plugin
shows. The checker puts each finding in one of four groups: **to fix**
(it is sure), **likely problem** (the evidence points to one: confirm it),
**needs a person** (only a person can tell: answer the question) and
**probably fine**. See [the guide](README.md) for how to work through them.

The 12 rules editors meet most have their messages written for
editors, listed with what to do. The others are rarer, and their messages
are the engine's own.

## In your content (114)

Fixed in the post or page, by whoever writes it.

### Met most often

#### Alternative text describes the image

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `img-alt-quality`

What you may see:

- The alternative text of this image, "…", looks like a file name.
- The alternative text of this image, "…", is a placeholder or a generic word.
- Check that this image's alternative text describes it.

What to do:

- A file name tells someone who can't see the image nothing about it. Replace it with text that says what the image shows.
- Words such as "image" or "photo" don't say what the image shows. Replace them with a short description, or mark the image as decorative if it is only decoration.
- Screen readers already say it is an image. Start with what the image shows, without "Image of" or "Picture of".
- Keep the alternative text to a sentence or two. Put longer descriptions in the text or a caption.
- Say what the image shows or why it is there, in a sentence or two, without repeating the text next to it.

#### Data tables have header cells

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `td-has-header`

What you may see:

- This table has no header cells.
- This table cell has no header.

What to do:

- If the table holds data, turn on its header row (or header column), so each cell is read with its label. A table used only to place things side by side needs no headers.
- Make the first row (or column) of the table its header, so every cell is read with its label.

#### Heading levels don't skip a level

A good practice, not a WCAG requirement · Rule `heading-order`

What you may see:

- This heading jumps from level … to level …, skipping a level.
- The level … heading "…" comes after the level … heading "…", skipping a level.

What to do:

- Go down one level at a time: a level 2 heading is followed by level 3, not level 4. Choose the level by the outline, not by how the heading looks.

#### Headings aren't empty

A good practice, not a WCAG requirement · Rule `empty-heading`

What you may see:

- This heading is empty.

What to do:

- Write the heading's text, or remove the heading if it isn't needed.

#### Images have alternative text

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `img-alt-present`

What you may see:

- This image has no alternative text.
- This image's alternative text is only spaces, so it is neither described nor marked as decorative.

What to do:

- Write alternative text that says what the image shows. If it is only decoration, mark it as decorative instead.

#### Images marked as decorative really are decorative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `img-alt-decorative`

What you may see:

- This image is marked as decorative. Check that it only decorates.

What to do:

- If it shows information, such as a chart or a person, write alternative text that says what it shows.

#### Link text makes sense on its own

WCAG 2.4.9 (AAA) · Rule `link-name-quality-link-only`

What you may see:

- The link text "…" only makes sense with the sentence around it.

What to do:

- People often move from link to link, hearing only the link text. Make the link text itself say where it goes, such as "the 2026 price list" instead of "click here".

#### Link text says where the link goes

WCAG 2.4.4 (A), 2.4.9 (AAA) · EN 301 549 9.2.4.4 · Rule `link-name-quality`

What you may see:

- The link text "…" doesn't say where it leads.

What to do:

- Use link text that says where the link goes, such as "Download the 2026 price list" instead of "Download" or "Click here".

#### Links have text

WCAG 2.4.4 (A), 2.4.9 (AAA), 4.1.2 (A) · EN 301 549 9.2.4.4, 9.4.1.2 · Rule `link-name-present`

What you may see:

- This link has no text.

What to do:

- Give the link text that says where it goes. For an image link, write alternative text that says where it goes.

#### Links to documents say what they open

A good practice, not a WCAG requirement · Rule `cms-link-to-document`

What you may see:

- This link opens a … file, but the text doesn't say so.

What to do:

- Add the file type and size after the link text, such as "Annual report (PDF, 2 MB)". Check the file itself is accessible too.

#### Text has enough contrast with its background

WCAG 1.4.3 (AA) · EN 301 549 9.1.4.3 · Rule `contrast-minimum`

What you may see:

- This text is hard to read: its colours have a contrast of …:1, and it needs at least …:1.

What to do:

- Choose a darker text colour or a lighter background (or the other way round) in the block's colour settings, until the contrast reaches …:1.

#### Text that looks like a heading is a real heading

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `p-as-heading`

What you may see:

- This short, large, bold paragraph looks like a heading.
- This bold line comes before plain text, as a heading does.

What to do:

- If it introduces a section, make it a heading instead of a bold paragraph, so people using screen readers can find and skip between sections.
- If it introduces the text after it, make it a heading instead of a bold paragraph, so people using screen readers can find and skip between sections.

### Less common

#### A button that opens something says whether it's open

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-expanded-state-mismatch`

#### A checkbox says it's ticked only when it is

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-checked-state-mismatch`

#### A control's name includes the words you see on it

WCAG 2.5.3 (A) · EN 301 549 9.2.5.3 · Rule `label-in-name`

#### A table's caption and summary don't repeat each other

A good practice, not a WCAG requirement · Rule `table-duplicate-name`

#### Accessibility attributes (ARIA) are real attributes

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-valid-attr`

#### Accessibility attributes (ARIA) have valid values

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-valid-attr-value`

#### Accessibility attributes (ARIA) suit the element they're on

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-allowed-attr`

#### Accessibility attributes don't give an element two parents

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `aria-owns-valid`

#### Accessibility roles are real, valid roles

WCAG 1.3.1 (A), 4.1.2 (A) · EN 301 549 9.1.3.1, 9.4.1.2 · Rule `aria-roles-valid`

#### Alternative text doesn't repeat the text next to the image

A good practice, not a WCAG requirement · Rule `image-redundant-alt`

#### Alternative text of image buttons says what they do

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `input-image-alt-quality`

#### An error message is linked only to a field marked as wrong

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-conditional-attr`

#### Audio and video have a transcript

WCAG 1.2.1 (A) · EN 301 549 9.1.2.1 · Rule `media-alternative-transcript-evidence`

#### Braille labels have an ordinary text label too

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-braille-equivalent`

#### Buttons and links aren't inside each other

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `nested-interactive-controls-absent`

#### Buttons have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `button-name-present`

#### Checkboxes and switches have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `binary-control-name-present`

#### Clickable areas of an image map have a name

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `area-alt-present`

#### Clickable images work with the keyboard too

WCAG 2.1.1 (A), 2.1.3 (AAA) · EN 301 549 9.2.1.1 · Rule `server-side-image-map-absent`

#### Content inside a frame can be reached with the keyboard

WCAG 2.1.1 (A), 2.1.3 (AAA) · EN 301 549 9.2.1.1 · Rule `iframe-focusable-content`

#### Controls can be reached with the keyboard

WCAG 2.1.1 (A), 2.1.3 (AAA) · EN 301 549 9.2.1.1 · Rule `widget-keyboard-focusable`

#### Decorative parts of a control can't get keyboard focus

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `presentational-children-focusable-absent`

#### Description list items are inside a description list

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `dlitem-parent-valid`

#### Description lists are built correctly

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `definition-list-children-valid`

#### Dialogs have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `dialog-name-present`

#### Drawings made with a canvas have a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `canvas-text-alternative-present`

#### Drop-down fields have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `combobox-name-present`

#### Each form field has one label

WCAG 3.3.2 (A) · EN 301 549 9.3.3.2 · Rule `form-control-single-label`

#### Element IDs are unique

WCAG 4.1.1 (A) · Rule `duplicate-id`

#### Elements don't use outdated accessibility roles

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-deprecated-role`

#### Elements that need a name have one

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-role-name-present`

#### Embedded content has a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `embed-text-alternative-present`

#### Embedded frames have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `iframe-name-present`

#### Embedded frames have different names

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `iframe-title-unique`

#### Embedded frames with the same name show the same thing

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `identical-iframes-same-purpose`

#### Embedded objects have a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `object-text-alternative-present`

#### Expandable sections have a title

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `summary-name-present`

#### Fields marked as wrong show an error message

WCAG 3.3.1 (A) · EN 301 549 9.3.3.1 · Rule `invalid-field-error-message`

#### Form field labels are clear and different from each other

WCAG 2.4.6 (AA) · EN 301 549 9.2.4.6 · Rule `form-control-label-quality`

#### Form fields have a label

WCAG 1.3.1 (A), 3.3.2 (A), 4.1.2 (A) · EN 301 549 9.1.3.1, 9.3.3.2, 9.4.1.2 · Rule `form-control-programmatic-label-present`

#### Form fields have a label you can see

WCAG 3.3.2 (A) · EN 301 549 9.3.3.2 · Rule `form-control-programmatic-label-quality`

#### Form fields use a valid autocomplete value

WCAG 1.3.5 (AA) · EN 301 549 9.1.3.5 · Rule `autocomplete-valid`

#### Graphics have a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `role-img-text-alternative-present`

#### Grouped controls contain only the parts they allow

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `aria-prohibited-children`

#### Grouped controls contain the parts they need

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `aria-required-children`

#### Headings say what the section is about

WCAG 2.4.6 (AA) · EN 301 549 9.2.4.6 · Rule `heading-quality`

#### IDs that labels refer to are unique

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `duplicate-id-aria`

#### Image buttons have alternative text

WCAG 1.1.1 (A), 4.1.2 (A) · EN 301 549 9.1.1.1, 9.4.1.2 · Rule `input-image-alt-present`

#### Image buttons with no text really need none

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `input-image-alt-decorative`

#### Images inside graphics have a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `svg-image-text-alternative-present`

#### Interactive elements have the settings their role needs

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-required-attr`

#### Items in a tree have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `treeitem-name-present`

#### Keyboard focus isn't taken away

WCAG 2.1.1 (A), 2.1.3 (AAA), 2.4.7 (AA), 2.4.13 (AAA) · EN 301 549 9.2.1.1, 9.2.4.7 · Rule `focus-not-removed-by-script`

#### Language settings on parts of the page are valid

WCAG 3.1.2 (AA) · EN 301 549 9.3.1.2 · Rule `valid-lang`

#### Links in text stand out by more than their colour

WCAG 1.4.1 (A) · EN 301 549 9.1.4.1 · Rule `link-in-text-block`

#### List items are inside a list

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `listitem-parent-valid`

#### Lists contain only list items

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `list-children-valid`

#### Menu items have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `menuitem-name-present`

#### Meters have a name

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `meter-name-present`

#### Moving content can be paused

WCAG 2.2.2 (A) · EN 301 549 9.2.2.2 · Rule `moving-content-pausable`

#### Names aren't given to elements that can't have one

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-prohibited-attr`

#### Nothing hidden from screen readers can get keyboard focus

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `aria-hidden-focus`

#### Number fields with up and down arrows have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `spinbutton-name-present`

#### Options in a list have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `option-name-present`

#### Parts of a grouped control are inside that group

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `aria-required-parent`

#### Passwords can be pasted

WCAG 3.3.8 (AA) · EN 301 549 9.3.3.8 · Rule `password-paste-enabled`

#### Progress bars have a name

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `progressbar-name-present`

#### Radio buttons and checkboxes that share a name should be in a named group

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `form-group-name-present`

#### Scrolling areas can be scrolled with the keyboard

WCAG 2.1.1 (A), 2.1.3 (AAA) · EN 301 549 9.2.1.1 · Rule `scrollable-region-focusable`

#### Scrolling text can be paused

WCAG 2.2.2 (A) · EN 301 549 9.2.2.2 · Rule `deprecated-elements-not-used`

#### Search fields have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `searchbox-name-present`

#### Selection lists have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `listbox-name-present`

#### Sliders have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `slider-name-present`

#### Sound that plays by itself can be stopped

WCAG 1.4.2 (A) · EN 301 549 9.1.4.2 · Rule `no-autoplay-audio`

#### Status messages are announced

WCAG 4.1.3 (AA) · EN 301 549 9.4.1.3 · Rule `live-region-announcements`

#### Symbols used as a graphic should have a contrast of at least 3:1

WCAG 1.4.11 (AA) · EN 301 549 9.1.4.11 · Rule `symbol-graphic-contrast`

#### Table cells point to existing header cells

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `table-headers-attr-valid`

#### Table header cells aren't empty

A good practice, not a WCAG requirement · Rule `empty-table-header`

#### Table header cells describe some data

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `table-th-has-data-cells`

#### Table header settings are valid

A good practice, not a WCAG requirement · Rule `scope-attr-valid`

#### Tables use a real caption, not a first row

WCAG 1.3.1 (A) · EN 301 549 9.1.3.1 · Rule `table-fake-caption`

#### Tabs have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `tab-name-present`

#### Text alternatives of canvas drawings make sense

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `canvas-text-alternative-quality`

#### Text alternatives of embedded content make sense

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `embed-text-alternative-quality`

#### Text alternatives of embedded objects make sense

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `object-text-alternative-quality`

#### Text alternatives of vector graphics make sense

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `svg-text-alternative-quality`

#### Text contrast can be measured

WCAG 1.4.3 (AA), 1.4.6 (AAA) · EN 301 549 9.1.4.3 · Rule `contrast-computable`

#### Text fields have a name

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `textbox-name-present`

#### Text is real text, not a picture of text

WCAG 1.4.5 (AA) · EN 301 549 9.1.4.5 · Rule `image-of-text`

#### Text spacing can be increased by the reader

WCAG 1.4.12 (AA) · EN 301 549 9.1.4.12 · Rule `avoid-inline-spacing`

#### Text stays readable when the page is zoomed to 200%

WCAG 1.4.4 (AA) · EN 301 549 9.1.4.4 · Rule `resize-text-content-loss`

#### The names of clickable image areas make sense

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `area-alt-quality`

#### The page doesn't declare two different languages

WCAG 3.1.1 (A) · EN 301 549 9.3.1.1 · Rule `html-xml-lang-mismatch`

#### The page doesn't reload or redirect on a timer

WCAG 2.2.1 (A), 2.2.4 (AAA), 3.2.5 (AAA) · EN 301 549 9.2.2.1 · Rule `meta-refresh-timing-absent`

#### The page fits a phone screen without scrolling sideways

WCAG 1.4.10 (AA) · EN 301 549 9.1.4.10 · Rule `reflow-horizontal-scroll`

#### The whole page isn't hidden from screen readers

WCAG 1.3.1 (A), 4.1.2 (A) · EN 301 549 9.1.3.1, 9.4.1.2 · Rule `aria-hidden-body`

#### Things that react to a click also work with the keyboard

WCAG 2.1.1 (A), 2.1.3 (AAA) · EN 301 549 9.2.1.1 · Rule `click-handler-keyboard-operable`

#### Things that react to the mouse also work with the keyboard

WCAG 2.1.1 (A), 2.1.3 (AAA) · EN 301 549 9.2.1.1 · Rule `mouse-only-event-handlers`

#### Tooltips have text

WCAG 4.1.2 (A) · EN 301 549 9.4.1.2 · Rule `tooltip-name-present`

#### Vector graphics (SVG) have a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `svg-text-alternative-present`

#### Video preview images have a text alternative

WCAG 1.1.1 (A) · EN 301 549 9.1.1.1 · Rule `video-poster-text-alternative-present`

#### Videos have captions

WCAG 1.2.2 (A) · EN 301 549 9.1.2.2 · Rule `video-caption`

## In the theme or template (24)

Fixed in the theme, its templates or the site's settings, usually by whoever
builds or looks after the site. The page checker and the Site Editor show
them; the post editor doesn't.

### All content is inside a page region

A good practice, not a WCAG requirement · Rule `region`

### Keyboard focus isn't hidden behind other content

WCAG 2.4.11 (AA) · EN 301 549 9.2.4.11 · Rule `focus-not-obscured-minimum`

### Keyboard focus stays visible

WCAG 1.4.11 (AA), 2.4.7 (AA), 2.4.13 (AAA) · EN 301 549 9.1.4.11, 9.2.4.7 · Rule `css-focus-indicator-suppressed`

### Page regions of the same kind have different names

A good practice, not a WCAG requirement · Rule `landmark-unique`

### Sidebars aren't inside another page region

A good practice, not a WCAG requirement · Rule `landmark-complementary-is-top-level`

### Text stays readable with more spacing

WCAG 1.4.12 (AA) · EN 301 549 9.1.4.12 · Rule `text-spacing-content-loss`

### The "skip to content" link goes somewhere

A good practice, not a WCAG requirement · Rule `skip-link`

### The header, navigation, search and footer are marked as page regions

A good practice, not a WCAG requirement · Rule `page-zones-landmark`

### The main content isn't inside another page region

A good practice, not a WCAG requirement · Rule `landmark-main-is-top-level`

### The page has a title

WCAG 2.4.2 (A) · EN 301 549 9.2.4.2 · Rule `page-title-present`

### The page has only one main content area

A good practice, not a WCAG requirement · Rule `landmark-no-duplicate-main`

### The page has only one site footer

A good practice, not a WCAG requirement · Rule `landmark-no-duplicate-contentinfo`

### The page has only one site header

A good practice, not a WCAG requirement · Rule `landmark-no-duplicate-banner`

### The page marks its main content

A good practice, not a WCAG requirement · Rule `landmark-one-main`

### The page says what language it's in

WCAG 3.1.1 (A) · EN 301 549 9.3.1.1 · Rule `html-lang-attr-present`

### The page title says what the page is

WCAG 2.4.2 (A) · EN 301 549 9.2.4.2 · Rule `page-title-patterns`

### The page works both upright and sideways

WCAG 1.3.4 (AA) · EN 301 549 9.1.3.4 · Rule `css-orientation-lock`

### The site footer isn't inside another page region

A good practice, not a WCAG requirement · Rule `landmark-contentinfo-is-top-level`

### The site header isn't inside another page region

A good practice, not a WCAG requirement · Rule `landmark-banner-is-top-level`

### Things that can get keyboard focus aren't invisible

WCAG 2.4.7 (AA) · EN 301 549 9.2.4.7 · Rule `css-hidden-focus`

### Things to click or tap are big enough, or far enough apart

WCAG 2.5.8 (AA) · EN 301 549 9.2.5.8 · Rule `target-size-minimum`

### Visitors can skip past repeated parts of the page

WCAG 2.4.1 (A) · EN 301 549 9.2.4.1 · Rule `bypass-blocks-present`

### Visitors can zoom in

WCAG 1.4.4 (AA) · EN 301 549 9.1.4.4 · Rule `meta-viewport-zoom-enabled`

### Visitors can zoom in to five times the size

A good practice, not a WCAG requirement · Rule `meta-viewport-large`
