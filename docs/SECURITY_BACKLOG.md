# Security backlog

Drafted 2026-10-13 from a read of `dist/`, `serve.cjs` and the Pages
workflow. The attack surface is small: a static site on GitHub Pages, no
forms, no third-party scripts, no user input reaches the DOM, and
`insertAdjacentHTML` is only ever passed constant strings. Pages sets no
custom headers, so anything header-shaped has to be a `<meta>` tag.

Each item is done when `npm run verify` is green and the outcome is
recorded here.

## Round 1

1. **Content-Security-Policy meta tag** on `index.html` and `404.html`:
   `default-src 'self'`, no `unsafe-inline` for scripts, `object-src
   'none'`, `base-uri 'self'`, `form-action 'none'`. Needs item 2 first.
   An XSS that ever slips in then cannot load or run foreign code.
   **Done.** Also `style-src 'self'` with no inline styles: the four
   `style="--a:…"` orbit angles became classes. `img-src` allows `data:`
   for the logo sprites hero.js draws. Checked in the browser: no
   violations, hero canvas renders, all assets 200.
2. **Move the 404 page's inline theme script to a file** so the CSP can
   forbid inline script without a hash to keep in sync.
   **Done.** Its `<style>` moved to `404.css` as well. Light theme still
   applied before paint in the browser.
3. **Referrer policy meta** (`strict-origin-when-cross-origin` or
   `no-referrer`) so outbound links to LinkedIn/Render don't carry paths.
   **Done.** `strict-origin-when-cross-origin` on both pages.
4. **Pin GitHub Actions to commit SHAs** in `pages.yml`. The deploy job
   holds `pages: write` and `id-token: write`; a moved tag on a
   third-party action would run with them.
   **Done.** `verify` fails on any `uses:` not pinned to a 40-hex SHA.
   Writing that check exposed that the Three.js subset check had never
   matched anything (regex lost its backslashes); fixed separately.
5. **Dependabot for `github-actions`** so pinned SHAs don't rot.
   **Done.** Monthly, `.github/dependabot.yml`.
6. **Strip metadata from shipped binaries.** Check the résumé PDF and
   images for author paths, usernames, GPS/EXIF; make `verify` fail if
   any reappears.
   **Done — nothing to strip.** PDF info is generic (author "Un-named",
   pdf-lib producer, no XMP); `og-hero.jpg` EXIF is three resolution
   tags, no GPS; others have none. `verify` now fails on an XMP packet or
   a local user path in any shipped binary (checked by planting one).
7. **`verify` guards:** fail on any `http://` URL, any external
   `<script src>`, any inline `<script>`/`on*=` handler, and any
   `target="_blank"` without `rel="noopener"`. Turns this round into a
   gate rather than a snapshot.
   **Done.** Also asserts the exact CSP string and no `<style>`/`style=`.
   Each case checked by injecting it into 404.html: all six fail verify.
8. **Guard `localStorage` in `script.js`.** Unguarded reads throw when
   storage is blocked and stop the rest of the script — not an exploit,
   but a hardening/robustness gap the 404 page already handles.
   **Done.** Checked in the browser with `localStorage` made to throw:
   the toggle still flips the theme, no error.
9. **Dev server hardening.** `serve.cjs` already binds to 127.0.0.1 and
   rejects path traversal; add `X-Content-Type-Options: nosniff` and the
   same CSP as a header so local runs exercise the real policy.
   **Done.** The header is read from index.html's meta tag, so the two
   cannot drift. Checked with curl and a page load: headers present, all
   8 assets 200, no violations.

## Deliberately not in scope

- HSTS / `X-Frame-Options`: not settable on Pages, and `frame-ancestors`
  is ignored in a meta CSP. Clickjacking a page with no actions is moot.
- Subresource Integrity: every script is same-origin.
