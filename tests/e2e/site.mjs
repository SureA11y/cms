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

/**
 * Logs in on WordPress's login page. Now and then (a few times in a hundred
 * runs of the suite, never in 150 logins on their own) the browser sends no
 * form after the click, and the page stays on the login screen; the server
 * never sees a request. The login page is WordPress's, not the plugin's, so
 * a login that doesn't leave it within 10 seconds is tried once more, and
 * what the page held is logged, to find the cause.
 */
export async function logIn(page, user, pass) {
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${WP_URL}/wp-login.php`);
    await page.fill('#user_login', user);
    await page.fill('#user_pass', pass);
    try {
      await Promise.all([
        page.waitForURL(/wp-admin/, { waitUntil: 'commit', timeout: 10000 }),
        page.click('#wp-submit')
      ]);
      return;
    } catch (error) {
      const state = await page
        .evaluate(() => ({
          url: location.href,
          user: document.querySelector('#user_login')?.value,
          passwordLength: (document.querySelector('#user_pass')?.value || '').length,
          formValid: document.querySelector('#loginform')?.checkValidity(),
          readyState: document.readyState
        }))
        .catch((e) => String(e));
      console.log(
        `# login attempt ${attempt} did not leave the login page: ${JSON.stringify(state)}`
      );
      if (attempt === 2) throw error;
    }
  }
}
