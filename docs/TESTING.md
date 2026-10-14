# Testing

| Command | Runs | Covers |
|---|---|---|
| `npm run verify` | every push, PR, deploy | 13 check groups over the repo (`scripts/checks.cjs`), then `scripts/*.test.cjs` |
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
an encoded path out of `dist/`.

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
