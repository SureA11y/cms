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
 * Logs in on WordPress's login page. The page moves the focus to the
 * username field and selects its text 200 ms after it loads
 * (`wp_attempt_focus`); when that came while the password was being typed,
 * the password went into the username field and the form, with an empty
 * required password, was never sent. So this waits for that focus first,
 * and checks both fields before logging in. If the login still doesn't
 * leave the page within 10 seconds, it is tried once more and what the page
 * held is logged.
 */
export async function logIn(page, user, pass) {
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${WP_URL}/wp-login.php`);
    await page
      .waitForFunction(() => document.activeElement?.id === 'user_login', null, {
        timeout: 2000
      })
      .catch(() => {});
    await page.fill('#user_login', user);
    await page.fill('#user_pass', pass);
    if (
      (await page.inputValue('#user_login')) !== user ||
      (await page.inputValue('#user_pass')) !== pass
    ) {
      await page.fill('#user_login', user);
      await page.fill('#user_pass', pass);
    }
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
          userLength: (document.querySelector('#user_login')?.value || '').length,
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
