# End-to-end tests

The WordPress plugin in Chromium, against a local WordPress with the plugin
active and the Phase 0 test posts created
(`prototypes/phase-0/make-content.php`). Every file is skipped when `WP_URL`
is not set.

```sh
WP_URL=http://127.0.0.1:8881 WP_USER=admin WP_PASS=... CHROMIUM=/path/to/chrome \
  POST_TYPICAL=9 POST_LONG=10 npm run test:e2e
```

The files run one after another (`--test-concurrency=1`): they share the
test posts, and a test that answers a finding or hides one clears it again
when it ends, whatever happened.

## The WordPress to run them against

Any WordPress 6.6 or later. One way, with PHP's built-in server and the
SQLite database plugin:

```sh
PHP_CLI_SERVER_WORKERS=16 php -S 127.0.0.1:8881 -t /path/to/wordpress
```

Give the built-in server **at least 16 workers**. With the 4 used at first,
a browser's next request after a login sometimes waited 30 seconds to be
taken up while the workers sat on other browsers' open connections; four
logins in 563 never reached the dashboard, and the tests that made them
timed out at random. Nothing in the server's log was slow: the requests
were never accepted. PHP's built-in server is a development tool; a site
behind nginx or Apache doesn't need this.

## No requests outside the site

Every browser context comes from `siteContext()` (`site.mjs`), which refuses
requests to any host but the test site. WordPress asks gravatar.com for
avatars; without a network such a request can hang and hold up a page's
load event. The plugin itself makes no outside requests.
