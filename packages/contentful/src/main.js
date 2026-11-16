// The app's entry point in Contentful: the panel in the entry's sidebar,
// and the configuration screen shown when the app is installed.
import { init, locations } from '@contentful/app-sdk';
import { mount } from './app.js';
import { ensureReviewType, REVIEW_TYPE } from './reviews.js';

const root = document.getElementById('root');

init((sdk) => {
  if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    mount(sdk, root);
    return;
  }
  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    configure(sdk);
  }
});

/**
 * Installing: the app adds its panel to the sidebar of every content type,
 * under Publish, and creates its own content type for the answers.
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
    )
  );
  sdk.app.onConfigure(async () => {
    await ensureReviewType(sdk.cma);
    const { items } = await sdk.cma.contentType.getMany({ query: { limit: 1000 } });
    const EditorInterface = {};
    for (const ct of items) {
      if (ct.sys.id !== REVIEW_TYPE) EditorInterface[ct.sys.id] = { sidebar: { position: 1 } };
    }
    return { parameters: {}, targetState: { EditorInterface } };
  });
  sdk.app.setReady();
}
