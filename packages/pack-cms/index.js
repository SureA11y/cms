'use strict';

/**
 * SureA11y for CMS: a checklist pack for @surea11y/core.
 *
 * Splits core's rules by who can fix what they find, for tools that show
 * results to the people who write a site's content:
 *
 * - `cms-content`: what an author writes (text, images, links, headings,
 *   lists, tables, embeds), checked against WCAG 2.2 A and AA, with the
 *   best-practice rules about content and the pack's own rules. Rules that
 *   judge the theme's style sheets and layout are left out.
 * - `cms-theme`: what the theme or template decides (style sheets, layout,
 *   page structure), for the people who can change it.
 * - `cms-page`: both, for checking a whole page as visitors get it (a
 *   preview or a published page); the tool then says which findings are in
 *   the author's content and which in the theme.
 *
 *   runDomRulesInPage(url, '.entry-content', { packs: [pack], profile: 'cms-content' })
 */

const { definePack, wcagTags } = require('@surea11y/core/pack');
const { name, version } = require('./package.json');

// Rules that judge the theme's style sheets or layout rather than what an
// author writes: an author can't fix what they find from the editor. On a
// whole page (`cms-page`), the host still tells content from theme by where
// each finding is: one on an element inside the author's content, such as
// a block whose fixed height was set in the editor, is the author's.
const THEME_RULES = [
  'text-spacing-content-loss',
  'resize-text-content-loss',
  'css-focus-indicator-suppressed',
  'css-hidden-focus',
  'css-orientation-lock',
  'focus-not-obscured-minimum',
  'target-size-minimum',
  'meta-viewport-zoom-enabled',
  'meta-viewport-large',
  'bypass-blocks-present',
  'skip-link',
  'region',
  'landmark-one-main',
  'landmark-unique',
  'landmark-no-duplicate-banner',
  'landmark-no-duplicate-contentinfo',
  'landmark-no-duplicate-main',
  'landmark-banner-is-top-level',
  'landmark-complementary-is-top-level',
  'landmark-contentinfo-is-top-level',
  'landmark-main-is-top-level',
  'page-zones-landmark',
  'page-title-present',
  'page-title-patterns',
  'html-lang-attr-present'
];

// Best-practice rules about content, which no WCAG tag selects.
const CONTENT_BEST_PRACTICE = [
  'heading-order',
  'empty-heading',
  'image-redundant-alt',
  'empty-table-header',
  'table-duplicate-name',
  'scope-attr-valid'
];

module.exports = definePack({
  name,
  version,
  title: 'SureA11y for CMS',
  namespace: 'cms',
  description:
    "Splits core's rules into what a content author can fix and what the theme decides, and adds checks authors need.",
  core: '^1.17.0',

  rules: [require('./rules/manual/cms-link-to-document')],

  profiles: {
    'cms-content': {
      tags: wcagTags('2.2', ['A', 'AA']),
      // A link whose text says nothing on its own is an author's to fix,
      // though only 2.4.9 (AAA) asks for it.
      rules: [...CONTENT_BEST_PRACTICE, 'link-name-quality-link-only'],
      exclude: { rules: THEME_RULES }
    },
    'cms-theme': {
      tags: [],
      rules: THEME_RULES
    },
    'cms-page': {
      tags: wcagTags('2.2', ['A', 'AA']),
      rules: [...CONTENT_BEST_PRACTICE, 'link-name-quality-link-only', ...THEME_RULES]
    }
  },

  rollups: [
    {
      id: 'cms-images',
      title: 'Images have a text alternative that describes them',
      checksIds: ['img-alt-present', 'img-alt-quality', 'img-alt-decorative', 'image-redundant-alt']
    },
    {
      id: 'cms-headings',
      title: 'Headings are real headings, in order',
      checksIds: ['p-as-heading', 'heading-order', 'empty-heading', 'heading-quality']
    },
    {
      id: 'cms-links',
      title: 'Links say where they go',
      checksIds: [
        'link-name-present',
        'link-name-quality',
        'link-name-quality-link-only',
        'identical-links-same-purpose',
        'cms-link-to-document'
      ]
    },
    {
      id: 'cms-tables',
      title: 'Tables have headers',
      checksIds: ['td-has-header', 'table-th-has-data-cells', 'empty-table-header', 'table-fake-caption']
    }
  ],

  dictionaries: { en: require('./i18n/en.json'), es: require('./i18n/es.json') }
});
