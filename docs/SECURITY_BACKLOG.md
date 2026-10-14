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

## Round 1 results

All nine done. The policy is now a gate: `verify` fails on anything the
CSP would have to loosen for, on unpinned actions, and on metadata in
binaries. One find beyond the plan: verify's Three.js subset check had
never matched anything.

## Round 2

Drafted 2026-10-13. Facts gathered: no pre-push hook installed; `main`
has no branch protection; secret scanning and push protection are on;
Dependabot security updates are off; http:// redirects to https.

1. **Pre-push hook running `npm run verify`**, committed under
   `.githooks/` with `core.hooksPath`, so a red build never reaches the
   deploy job.
   **Done.** Enabled in this clone; README says how for a new one.
2. **`persist-credentials: false`** on checkout. The job never pushes,
   so the token should not sit in `.git/config` for later steps.
   **Done.**
3. **Lint the workflow with zizmor** in CI (template injection,
   excessive permissions, cache poisoning). Pinned, read-only.
   **Done.** `workflow-lint` job, zizmor 1.30.1 offline; deploy needs it.
   Its one finding (no Dependabot cooldown) fixed with a 7-day cooldown.
   Clean locally; not yet run on a GitHub runner (nothing pushed).
4. **Post-deploy smoke check:** fetch the live page after deploy and
   assert the CSP meta and referrer meta are present and every asset
   returns 200 — proves the policy shipped, not just that it built.
   **Done.** `scripts/smoke.cjs`, last step of the deploy job, retrying
   for ~2 min while Pages swaps builds. Passes against a local server;
   fails against today's live site, as it should until this is pushed.
5. **Vendored Three.js provenance:** record the npm integrity hash of
   three@0.170.0 in `build_three.cjs` and fail the rebuild on mismatch,
   so the 487 KB file can be traced to a known package.
   **Done.** Integrity for three and esbuild checked against the install
   lockfile; a wrong hash stops the build (tested). A rebuild today is
   byte-identical to the committed file, so it is reproducible.
6. **Outbound link ownership check:** `dj-visualizer.onrender.com` is a
   third-party subdomain; if that service is deleted the name can be
   claimed by someone else. A script that flags non-200 outbound links.
   **Done.** `npm run links`, plus a weekly `links.yml` workflow. All 8
   links 200 today. verify's SHA-pin check now covers every workflow.
7. **`SECURITY.md`** with a contact for reports (GitHub private
   vulnerability reporting).
   **Done.** Points at private reporting, which needs item 10 turned on
   to work.
8. **Dev server parity:** answer non-GET methods with 405 and serve
   `404.html` for missing paths like Pages does, so the 404 page and its
   policy are exercised locally.
   **Done.** POST → 405, HEAD supported (the smoke check uses it), a deep
   missing path → styled 404 page with all assets 200 in the browser.

Needs you (GitHub settings, not code):

9. **Branch protection on `main`** requiring the verify check.
10. **Turn on Dependabot security updates** and private vulnerability
    reporting.

## Round 2 results

Items 1–8 done, verify green. Not yet observed on GitHub: the
`workflow-lint` job, the post-deploy smoke step and `links.yml` have run
only locally, because nothing has been pushed. Items 9–10 wait on you.

## Round 3

Drafted 2026-10-13. Facts gathered: the résumé PDF's links are all
https or mailto; zizmor's strictest persona finds only naming and
comment nits; start-app.bat does not enable the pre-push hook.

1. **Trusted Types.** Add `require-trusted-types-for 'script'` to the
   CSP so the browser itself refuses any string-to-HTML sink. First
   replace script.js's two `insertAdjacentHTML` calls (constant strings
   today) with `createElement`, and check Three.js sets no such sink.
   **Done.** Also `trusted-types 'none'` (no policies may be created).
   Three.js, hero.js and tech-marks.js had no sinks; verify now fails on
   any. In the browser: pill and 6 spotlights present, hero renders, a
   probe `insertAdjacentHTML` is refused, page load causes no violation.
2. **Enable the hook where people start the app.** `start-app.bat` sets
   `core.hooksPath` if it is unset, so a fresh clone is gated without
   reading the README.
   **Done.** Tested in cmd: unset → set to `.githooks`; an existing
   custom value is left alone.
3. **Observe the round 2 CI on GitHub.** After you push: confirm
   `workflow-lint`, the smoke step and a manual `links.yml` run are
   green, and record it. Until then they are verified only locally.
   **Done.** Push run 38503564803: verify, workflow-lint and deploy
   (including the live smoke step) all green. Manual links.yml run
   38503693939: green, 8/8 links 200. Dependabot opened PRs 1–3 for
   major action bumps; left for review, not merged.
4. **External scan of the live site** (Mozilla Observatory / securityheaders)
   after the push, recording the grade and anything header-only that a
   static Pages site cannot fix, so it is a known limit rather than a
   surprise.
   **Done.** Mozilla Observatory 2026-10-14: **B, 75/100**. Credit: CSP
   with no unsafe sources (+5), private referrer policy (+5), HSTS and
   https redirect (Pages). The only penalties are X-Frame-Options (−20)
   and X-Content-Type-Options (−5), both header-only; Pages cannot send
   them and meta equivalents are ignored. B is the ceiling on Pages; A
   needs a host with custom headers (e.g. Cloudflare in front).
5. **`build_three.cjs` without `shell: true`.** Node 24 warns that the
   shell concatenates arguments unescaped; they are constants today, but
   the temp directory is also left behind when the integrity check throws.
   **Done.** npm runs as `npm-cli.js` through node (no shell), with
   `--ignore-scripts`; the temp dir is removed in `finally` (checked by
   forcing a mismatch). Rebuild still byte-identical.
6. **Lock the CSP in the smoke check to the deployed commit** — smoke
   compares against the local `dist/`; in CI that is the same commit, but
   make it explicit by also checking the stamped asset hashes match.
   **Done.** Stronger than hashes: both live pages must equal this
   commit's `dist/` byte for byte.

## Round 3 results

All six done and deployed (push run for 4dc9697 green; live smoke passes
byte-for-byte; live page loads with no console errors under Trusted
Types). Observatory B is the ceiling on Pages.

## Round 4

Drafted 2026-10-14. Returns are now small: the code-side hardening a
static Pages site allows is in place, and what is left is mostly upkeep
or a hosting decision.

1. **Review Dependabot PRs 1–3** (major bumps: checkout 7, upload-pages-
   artifact 5, deploy-pages 5). Read each release's breaking changes;
   their verify and workflow-lint checks are green, but deploy is skipped
   on PRs, so the deploy-pages and upload-artifact pair is only proven by
   a real deploy. Merge together, then watch the deploy.
2. **Smoke-check the module graph too.** The live check covers files
   index.html links; `tech-marks.js` and the Three.js subset are imported
   by hero.js and are not checked. Include them.
3. **Weekly Observatory regression check** in `links.yml`: fail if the
   live score drops below 75, so a lost CSP is caught even without a
   deploy.

Needs you:

4. **GitHub settings** (carried from round 2): branch protection on
   `main` requiring verify and workflow-lint; Dependabot security
   updates; private vulnerability reporting (SECURITY.md relies on it).
5. **Decide whether grade A is worth a host change.** Only real headers
   (X-Frame-Options, nosniff) close the gap, which means a proxy such as
   Cloudflare in front of Pages or a different host. Not recommended for
   a portfolio with nothing to click-jack; listed so it is a decision,
   not an oversight.

## Deliberately not in scope

- HSTS / `X-Frame-Options`: not settable on Pages, and `frame-ancestors`
  is ignored in a meta CSP. Clickjacking a page with no actions is moot.
- Subresource Integrity: every script is same-origin.
