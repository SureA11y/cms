// The app's entry point in Contentful: the panel in the entry's sidebar,
// and the configuration screen shown when the app is installed.
import { init, locations } from '@contentful/app-sdk';
import { mount } from './app.js';
import { ensureReviewType, REVIEW_TYPE } from './reviews.js';
import { parseOrigins } from './origins.js';

const root = document.getElementById('root');

init((sdk) => {
  if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    mount(sdk, root);
    return;
  }
  // The editor tab, an option a team adds per content type: loaded only
  // here, since it brings Contentful's field editors.
  if (sdk.location.is(locations.LOCATION_ENTRY_EDITOR)) {
    import('./editor-tab.js').then(({ mountEditorTab }) => mountEditorTab(sdk, root));
    return;
  }
  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    configure(sdk);
  }
});

/**
 * Installing: the app adds its panel to the sidebar of every content type,
 * under Publish, and creates its own content type for the answers. The
 * website's preview addresses let the editor tab check the live preview's
 * page too.
 */
function configure(sdk) {
  const h = (tag, text) => Object.assign(document.createElement(tag), { textContent: text });
  root.append(
    h('h1', 'SureA11y accessibility checker'),
    h(
      'p',
      'Installing adds an "Accessibility" section to the sidebar of every content type, ' +
        'under Publish. It checks the entry as editors write. Nothing is sent anywhere.'
    ),
    h(
      'p',
      'It also adds a content type, "Accessibility answers", where it keeps what people answer ' +
        'about findings. Its entries are never published.'
    ),
    h('h2', "Checking the website's preview page")
  );
  const label = h('label', 'Preview addresses (one per line)');
  label.htmlFor = 'preview-origins';
  label.style.cssText = 'display:block;font-weight:600;margin:8px 0 4px';
  const input = document.createElement('textarea');
  input.id = 'preview-origins';
  input.rows = 3;
  input.style.cssText = 'width:100%;max-width:480px;font:inherit;padding:6px';
  input.setAttribute('aria-describedby', 'preview-help');
  const help = h(
    'p',
    "The addresses your website's preview runs on, for example https://preview.example.com. " +
      'With the SureA11y preview script in its preview mode, the Accessibility editor tab, put ' +
      "first among the content type's editors, checks the live preview's page with the fields. " +
      'Only these addresses can send it results.'
  );
  help.id = 'preview-help';
  root.append(label, input, help);
  sdk.app
    .getParameters()
    .then((p) => {
      input.value = ((p && p.previewOrigins) || []).join('\n');
    })
    .catch(() => {});
  sdk.app.onConfigure(async () => {
    await ensureReviewType(sdk.cma);
    const { items } = await sdk.cma.contentType.getMany({ query: { limit: 1000 } });
    const EditorInterface = {};
    for (const ct of items) {
      if (ct.sys.id !== REVIEW_TYPE) EditorInterface[ct.sys.id] = { sidebar: { position: 1 } };
    }
    return {
      parameters: { previewOrigins: parseOrigins(input.value) },
      targetState: { EditorInterface }
    };
  });
  sdk.app.setReady();
}
