# End-to-end tests

The WordPress plugin in Chromium, against a local WordPress with the plugin
active and the test posts created (`content.php`: short, typical and long,
IDs 8, 9 and 10 by default). Every file is skipped when `WP_URL` is not set.

With wp-env (see the main README), which creates the posts when it starts:

```sh
npm run e2e:browser     # once: the Chromium the tests use
npm run test:e2e:local  # the address and login come from wp-env.env
```

Against another WordPress, create the posts with
`wp eval-file tests/e2e/content.php` and give their IDs if they differ:

```sh
WP_URL=http://127.0.0.1:8881 WP_USER=admin WP_PASS=... CHROMIUM=/path/to/chrome \
  POST_TYPICAL=9 POST_LONG=10 npm run test:e2e
```

The files run one after another (`--test-concurrency=1`): they share the
test posts, and a test that answers a finding or hides one clears it again
when it ends, whatever happened.

## The WordPress to run them against

Any WordPress 6.6 or later, **served by a real web server**: `wp-env` (the
simplest), or nginx or Apache with PHP-FPM. A minimal nginx site:

```nginx
server {
    listen 127.0.0.1:8881;
    root /path/to/wordpress;
    index index.php;
    location / { try_files $uri $uri/ /index.php?$args; }
    location ~ \.php$ {
        try_files $uri =404;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:9083; # a PHP-FPM pool
    }
}
```

**Not PHP's built-in server (`php -S`).** With several workers
(`PHP_CLI_SERVER_WORKERS`), a worker sometimes answers a request for a
static file and then never closes the connection; that worker takes no more
requests. The system hands each new connection to one worker's queue, so a
connection handed to a stuck worker waits until the test times out: a login
whose next page never comes, an editor whose scripts never finish loading.
Its log shows it: requests accepted and answered, never "Closing", each in a
different worker. With 4 workers about one run in two failed somewhere; with
16, still most runs. PHP documents the built-in server as a development
tool.

## Logging in

Every file logs in through `logIn()` (`site.mjs`). WordPress's login page
moves the focus to the username field and selects it 200 ms after it loads;
when that came while the password was being typed, the password went into
the username field and the form was never sent (its password is required).
That happened a few times in a hundred runs of the suite. `logIn()` waits
for that focus before typing and checks both fields before logging in; if
a login still doesn't leave the page, it is tried once more and what the
page held is logged (`# login attempt`).

## No requests outside the site

Every browser context comes from `siteContext()` (`site.mjs`), which refuses
requests to any host but the test site. WordPress asks gravatar.com for
avatars; without a network such a request can hang and hold up a page's
load event. The plugin itself makes no outside requests.
