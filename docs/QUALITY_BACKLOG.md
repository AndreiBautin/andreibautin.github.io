# Quality backlog

Drafted 2026-10-14 from a read of `dist/`, `verify.cjs`, `serve.cjs`,
`scripts/` and the workflows. Covers architecture, code cleanliness, test
coverage and documentation; security, performance and UI have their own
backlogs.

**Shape decision, stated once:** this is a static site with no domain
layer — nothing in it has rules beyond "show the resume". No layers get
added. The architecture work is about the *gate*: `verify.cjs` is the only
thing standing between a commit and production, and it is one 83-line
script of assertions that has already once passed while checking nothing
(the Three.js regex, Security round 1 item 4).

Each item is done when `npm run verify` is green and the outcome is
recorded here.

## Round 1

### Architecture

1. **Split `verify.cjs` into named check groups** (`scripts/checks/*.cjs`:
   facts, links, stamp, csp, budgets, fonts, binaries, vendor). `verify`
   runs every group, prints one line per group, and fails with the group
   name. Today the first failing `assert` stops the run, so a push shows
   one problem at a time and an error like `Invalid Unicode` doesn't say
   which file.
   **Done.** `scripts/checks.cjs`, 13 groups; `verify` prints `ok`/`FAIL` per group and runs all of them.
2. **Syntax-check every script by discovery, not by list.** The
   `node --check` list is hand-maintained and already misses
   `scripts/stamp.cjs`, `lighthouse.cjs`, `build_marks.cjs`,
   `build_three.cjs` and `verify.cjs` itself. Glob `dist/**/*.js`,
   `scripts/*.cjs`, root `*.cjs` (excluding `dist/vendor`).
   **Done.** Found by walking the tree; `404.js` and `tech-marks.js` are now checked too.
3. **Drop `npm run build`.** It is an alias for `verify` and there is no
   build; the name suggests a step that doesn't exist.
   **Done.**
4. **One source for the dev port.** `4317` is written three times in
   `serve.cjs` and once in the README; make it one constant and have
   `verify` assert the README states the same port.
   **Done.** `PORT` in `checks.cjs`, used by `serve.cjs`; group `dev port`.

### Code cleanliness

5. **`verify.cjs` reads each file once.** Several files are read three or
   four times in different checks; a small `read(path)` cache inside the
   check runner removes the repetition and the drift between them (e.g.
   the "shown text" list and the "text formatting" list disagree on
   whether `404.js` is checked).
   **Done.** `context(root)` caches reads.
6. **Name the file lists.** The page list, the text-file list and the
   shipped-script list are each written inline more than once. Define
   them once in the runner so a new file is added in one place.
   **Done.** `PAGES`, `STAMPED`, `TEXT`, `SHIPPED_JS` at the top of `checks.cjs`.

### Test coverage

7. **Every check is proven to fail.** A `node:test` suite
   (`scripts/verify.test.cjs`, run by `verify`) copies `dist/` to a temp
   dir, plants one known defect per check (stale stamp, inline style,
   unpinned action, NUL byte, glyph outside the font subset, XMP in an
   image, broken `#anchor`, over-budget file), and asserts that group
   fails. This is the test that would have caught the Three.js regex.
   Requires item 1 so checks can take a root directory.
   **Done.** Asserts *exactly* the planted group fails (all 13 are specific) and that every group has a defect.
8. **`stamp.cjs` is idempotent and `build_marks.cjs` is deterministic.**
   Running either twice yields byte-identical output; a non-deterministic
   generator makes the staleness check flap.
   **Done.** `scripts/tools.test.cjs`; stamp is also shown to repair a stale stamp.
9. **`serve.cjs` contract test.** Start it on an ephemeral port in the
   test, assert: CSP header equals the meta tag, `..` traversal is 403,
   POST is 405, a missing path returns the 404 page with status 404.
   These are the local-only behaviours nothing else exercises.
   **Done.** A literal `..` never reaches the server (URL parsing resolves it), so the server now decodes the path before its guard and the test sends `..%2f`; a malformed escape gets 400.

### Documentation

10. **`CLAUDE.md`** — the traps, not the file tree: run `stamp` after
    editing CSS/JS; no inline script or style (CSP); new glyphs need
    `subset_fonts.py`; new `THREE.*` names need `build_three.cjs`; facts
    must be in the resume; the published PDF is copied, never generated.
    **Done.**
11. **`docs/ARCHITECTURE.md`** — one request traced end to end naming
    real files: `index.html` → stamped `styles.css`/`script.js` →
    `hero.js` idle import → `vendor/three.hero.min.js` + `tech-marks.js`,
    plus the build-time generators and what `verify` pins about each.
    **Done.**
12. **`docs/TESTING.md`** — what `verify`, `smoke`, `links`, `observatory`
    and `lighthouse` each cover, and what is **deliberately not tested**
    (browser rendering, WebGL, animation feel, external profile pages)
    and why.
    **Done.**
13. **README to fifteen seconds.** It is one dense paragraph; split into
    what it is / how to run / the one idea (no build — `dist/` is the
    source, and `verify` pins every generated file to its generator), and
    move the PDF and hosting details to the docs above.
    **Done.**

## Round 2

Drafted 2026-10-14 after round 1.

1. **Bring `verify` back under five seconds.** Round 1 took it from about
   1 s to 28 s: each of 15 planted-defect cases copies the repo and spawns
   one `node --check` per script. Check every file in one child process
   instead of one each, and copy only what each case touches.
   **Done.** 3.6 s. Syntax is parsed in-process with `vm` (`scripts/parse.cjs`), clean parses and gzip sizes are memoised by content, and each case is a tree of hard links to one template copy.
2. **Pin the Node version CI runs.** Tests rely on `fs.cpSync`, global
   `fetch` and `node:test` hooks; `ubuntu-latest` changes its default
   Node without notice. Declare `engines.node` and have `verify` fail on an
   older runtime with a clear message (no new action needed).
   **Done.** `engines.node` `>=20`; `verify` exits with the minimum and the running version.
3. **`smoke.cjs` reuses the policy from `checks.cjs`.** It re-extracts the
   CSP from `index.html` and hard-codes the referrer tag; export both from
   `checks.cjs` so the live check and the local check cannot disagree.
   **Done.** `CSP_META` and `REFERRER_META` exported from `checks.cjs`; the local csp group now checks the referrer tag too. Smoke run against the live site: passed.
4. **Every shipped extension has a MIME type in `serve.cjs`.** A new file
   type in `dist/` would be served locally as `application/octet-stream`
   (and refused by `nosniff`) while working on Pages. Add a check group and
   its planted defect.
   **Done.** Group `mime types`; `TYPES` moved to `checks.cjs` and `serve.cjs` imports it.
5. **`.gitattributes` covers the generated and checked files it misses.**
   `scripts/*.cjs`, `*.md` and workflows commit with CRLF warnings on
   Windows; the stamp only needs `dist/`, but mixed endings make diffs
   noisy. Decide per path and record why.
   **Done.** `* text=auto eol=lf`, `*.bat eol=crlf` (cmd misreads LF batch files), binaries marked. Index was already LF; only working copies changed.
6. **State the lint/format/typecheck decision.** The standard gate is
   typecheck + lint + format + test + build; this repo has zero
   dependencies and checks only syntax and whitespace. Either add
   `// @ts-check` with a pinned `tsc` run via `npx`, or record in
   `docs/TESTING.md` why the zero-dependency gate is the deliberate choice.
   **Done.** Recorded in `docs/TESTING.md`: zero-dependency gate kept on purpose, and which groups stand in for lint and format.
7. **`script.js` sections become named functions.** 289 lines of
   top-level wiring for ten features; one `init*` function per feature,
   called in order, makes the file scannable and lets one feature's
   failure (e.g. a missing element) be guarded without stopping the rest.
   **Done.** Fifteen `init*` functions; each is run under try/`reportError`. Checked in the browser against the previous version: year, nav pill element, six spotlights, cursor ring, menu open/Escape all match, no errors besides a skipped view transition both versions show in a hidden pane. **Unchecked:** frame-driven behaviour (star field drawing, pill placement, the theme transition) — the pane stopped delivering animation frames to both versions, so those were compared by reading the moved code, not by running it. Browser testing also found `createServer` returned 403 for every path given an unresolved root; fixed and tested.
