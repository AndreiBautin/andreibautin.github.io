# Testing

| Command | Runs | Covers |
|---|---|---|
| `npm run verify` | every push, PR, deploy | 19 check groups over the repo (`scripts/checks/`), then `scripts/*.test.cjs` |
| `scripts/smoke.cjs` | after each deploy | live pages equal this commit's `dist/`, carry the CSP and referrer policy, every linked asset and dynamic import loads |
| `npm run links` | weekly | outbound links still answer (a lapsed service's subdomain can be claimed) |
| `scripts/observatory.cjs` | weekly | live Mozilla Observatory grade has not dropped |
| `npm run lighthouse` | by hand | performance medians over several runs |

## What the tests are for

`scripts/verify.test.cjs` plants one defect per check group in a copy of the
repository and expects exactly that group to fail. A check that cannot fail
is worse than none — the Three.js subset check once passed for months
matching nothing — so a new group must come with its defect, and the test
enforces that.

`scripts/tools.test.cjs` covers what nothing else exercises: `stamp` is
idempotent and repairs a stale stamp, `build_marks` is deterministic, and
`serve.cjs` returns the CSP header, the 404 page, 405 for writes and 403 for
an encoded path out of `dist/`. It also runs `smoke.cjs`'s `check()` against a
local copy, so the live-site check is proven to pass on a faithful copy and
to name a missing asset or policy on a bad one.

## No linter, formatter or typechecker, on purpose

The usual gate is typecheck + lint + format + test + build. This repository
has no dependencies to install and no build, and keeps it that way: a
pre-push hook and CI that need `npm install` or a network fetch of `tsc`
or ESLint are slower and can fail for reasons that are not the change.
What those tools would catch here is covered instead by `verify` groups
that need nothing but Node:

- **syntax**: every script parsed (`scripts/parse.cjs`).
- **text formatting**: no trailing whitespace, control characters or
  invalid Unicode; `.gitattributes` fixes line endings.
- **content security policy**: the rules a linter would be configured
  for here (no `innerHTML`, `eval`, inline handlers or styles).

Revisit if the JavaScript grows real logic; a type error in event wiring
shows on first click, which is the cost accepted.

## Deliberately not tested

- **Browser rendering and layout.** No headless browser in the gate: it
  would be the slowest and flakiest part of verify for a site whose layout
  changes rarely and is checked by eye at each change.
- **The WebGL hero and animation feel.** Decoration; when it fails it fails
  to a static hero, and pixel tests of a seeded 3D scene cost more than the
  regressions they would catch.
- **`script.js` behaviour.** Event wiring with no logic to get wrong
  silently; a broken toggle is visible on first click.
- **External profile pages' content.** Not ours; `links` only checks they
  answer.
- **`build_three.cjs` and `subset_fonts.py` themselves.** They need the
  network and Python; their *outputs* are pinned by verify instead.
- **`build_resume.py`.** It builds an alternate one-page resume that is not
  published; it needs Python and ReportLab, and nothing depends on its
  output. Kept as a tool, not checked; run it by hand when that version is
  wanted, and inspect the PDF as CLAUDE.md describes.
- **The backup site behind `.openai/hosting.json`.** Kept for the original
  hosting; verify checks only that it still points at `dist`, not that the
  backup is up.
