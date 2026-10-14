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
2. **Move the 404 page's inline theme script to a file** so the CSP can
   forbid inline script without a hash to keep in sync.
3. **Referrer policy meta** (`strict-origin-when-cross-origin` or
   `no-referrer`) so outbound links to LinkedIn/Render don't carry paths.
4. **Pin GitHub Actions to commit SHAs** in `pages.yml`. The deploy job
   holds `pages: write` and `id-token: write`; a moved tag on a
   third-party action would run with them.
5. **Dependabot for `github-actions`** so pinned SHAs don't rot.
6. **Strip metadata from shipped binaries.** Check the résumé PDF and
   images for author paths, usernames, GPS/EXIF; make `verify` fail if
   any reappears.
7. **`verify` guards:** fail on any `http://` URL, any external
   `<script src>`, any inline `<script>`/`on*=` handler, and any
   `target="_blank"` without `rel="noopener"`. Turns this round into a
   gate rather than a snapshot.
8. **Guard `localStorage` in `script.js`.** Unguarded reads throw when
   storage is blocked and stop the rest of the script — not an exploit,
   but a hardening/robustness gap the 404 page already handles.
9. **Dev server hardening.** `serve.cjs` already binds to 127.0.0.1 and
   rejects path traversal; add `X-Content-Type-Options: nosniff` and the
   same CSP as a header so local runs exercise the real policy.

## Deliberately not in scope

- HSTS / `X-Frame-Options`: not settable on Pages, and `frame-ancestors`
  is ignored in a meta CSP. Clickjacking a page with no actions is moot.
- Subresource Integrity: every script is same-origin.
