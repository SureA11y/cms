// What every end-to-end test shares: a browser context that talks only to the
// test site. WordPress pages ask for avatars from gravatar.com; with no
// network, such a request can hang until a timeout and hold up a page's load
// event, which made tests fail at random. Requests to any other host are
// refused at once, so a test depends on the site alone, as the plugin does
// (it makes no outside requests).

const { WP_URL } = process.env;

/** A browser context that refuses every request but the test site's. */
export async function siteContext(browser, options = {}) {
  const context = await browser.newContext(options);
  const site = new URL(WP_URL || 'http://localhost').origin;
  await context.route(
    (url) => url.origin !== site && /^https?:$/.test(url.protocol),
    (route) => route.abort('blockedbyclient')
  );
  return context;
}
