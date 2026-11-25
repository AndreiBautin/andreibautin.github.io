# Architecture

A static site with no domain layer: nothing here has rules beyond showing
the resume, so there are no layers. `dist/` is published to GitHub Pages
unchanged; the scripts in `scripts/` generate parts of it ahead of time and
`verify` checks they are current.

## One page load, end to end

1. **`dist/index.html`** arrives. Its `<meta http-equiv="Content-Security-Policy">`
   allows same-origin scripts, styles and fonts only, with Trusted Types on
   (Pages cannot send headers, so the policy is a meta tag). Two fonts are
   preloaded from `dist/fonts/`, subset to the characters the site uses by
   `scripts/subset_fonts.py`.
2. **`styles.css?v=<hash>`** and **`script.js?v=<hash>`** load. The `?v=`
   is a content hash written by `scripts/stamp.cjs`: Pages caches for ten
   minutes, and a fresh page with a cached stylesheet once drew the hero as
   a block image.
3. **`script.js`** wires the theme toggle, copy-email button, and current
   navigation section. It also overlays a decorative 2D canvas on the real
   full-screen name heading: deterministic character streams fall continuously
   through a cached text mask at at most 25 frames per second. The name never
   scrambles or resolves to a different treatment. The heading
   remains accessible and readable without JavaScript or canvas. Reduced
   motion disables the effect, and hidden/offscreen states cancel work.
   Static content and project links work without it.
4. **`hero.js`** imports the integrity-pinned Three.js subset and generated
   technology marks. A deterministic canvas texture draws a restrained green
   code wall on one flat mesh. It draws at about eleven frames per second,
   stops offscreen or when the tab is hidden, and renders a still for reduced
   motion. Data saver skips this decorative download. The project cards use
   actual captures, with optional details for the technical explanation.
5. A missing path gets **`404.html`**, with `404.css` and `404.js` (the
   theme applied before paint) as files so the CSP can forbid inline code.

## Build-time generators and what pins them

| Generator | Writes | `verify` group that fails if stale |
|---|---|---|
| `scripts/stamp.cjs` | `?v=` in `index.html` | stamp |
| `scripts/build_three.cjs` | `dist/vendor/three.hero.min.js` | generated files |
| `scripts/build_marks.cjs` | `dist/tech-marks.js` | generated files |
| `scripts/subset_fonts.py` | `dist/fonts/*.woff2` | font subset |
| `scripts/build_resume.py` | an unpublished alternate PDF | — |

The published `Andrei_Bautin_Resume.pdf` is the approved resume copied in
unchanged, not generated, so it cannot disagree with the one on LinkedIn.

## Gates

`verify.cjs` runs the check groups in `scripts/checks/` (one file per area, run by
`scripts/checks.cjs`), then the tests
in `scripts/verify.test.cjs` and `scripts/tools.test.cjs`. It gates the pre-push hook (`.githooks/pre-push`),
pull requests, and the deploy in `.github/workflows/pages.yml`, which then
runs `scripts/smoke.cjs` against the live URL. `serve.cjs` serves `dist/`
locally on port 4357 with the CSP sent as a real header. Port 4317 belongs to
Guide on this desktop; sharing its origin can let Guide's cached navigation
intercept the portfolio preview.
