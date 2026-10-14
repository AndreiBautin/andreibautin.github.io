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
3. **`script.js`** (classic script) wires everything that is not the hero,
   one `init*` function per feature — `initTheme`, `initReveals`,
   `initCountUp`, `initTimeline`, `initNav` (current section and the
   sliding pill), `initMenu`, `initCopyEmail`, `initStars`, `initTab` and the
   pointer effects — started in order by the loop at the bottom. A feature
   that throws is passed to `reportError` and the rest still start.
4. **`hero.js`** (module) waits for `load` and then idle time, and — unless
   data saver is on, memory is ≤ 2 GB or WebGL is missing — imports
   **`vendor/three.hero.min.js`** (only the exports in
   `scripts/build_three.cjs`) and **`tech-marks.js`** (the SVGs in
   `assets/tech/`, bundled by `scripts/build_marks.cjs`). `start()` then
   wires named steps: `createStage` (renderer, camera, lights),
   `buildSpheres` (one per logo, each with its own wander constants),
   `enableGrab` (drag to spin), `fitter` (layout for wide and phone views),
   and runs the frame loop, which pauses while the hero is off screen. The
   canvas fades in once shaders have compiled.
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
locally on port 4317 with the CSP sent as a real header.
