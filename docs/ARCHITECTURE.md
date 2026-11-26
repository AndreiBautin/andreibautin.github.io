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
   a block image. The stamp also versions hero.js imports before hashing the
   hero itself, so a new GPU export or particle target cannot reuse an old URL.
3. **`script.js`** owns theme, project selection, direct links, hash navigation,
   and native dialogs. A project button validates an index, updates the copy
   and launch link, then dispatches `portfolio:scene`. Experience and contact
   retain the resume facts in accessible HTML; no renderer owns their state.
4. **`hero.js`** imports the integrity-pinned Three.js subset, technology marks,
   and browser-free **`particle-shapes.js`**. It passes a population and seed to
   `createShapes`, then uploads four deterministic targets: atmosphere, planet, folded
   ribbon and jellyfish. The loaded name font is rasterized once and supplied to
   `createNameShape`, which samples front, back and side surfaces with beveled
   depth. The same points and shader render every form; the Matrix-green name
   rocks and floats continuously to show its thickness. Reduced motion keeps
   it still. The HTML name remains an accessible fallback. One Points
   draw call morphs source/target attributes in a vertex shader. Selecting a
   new target captures the interpolated attributes before transitioning again.
   Shape motion, pointer swirl and click waves are analytic shader functions,
   not a fluid solver or stateful particle physics simulation. Work uses frame
   deltas with a catch-up cap. Hidden tabs stop; page-cache restoration resumes;
   reduced motion uses a still and instant changes. Smaller/data-saving devices
   start with 18,000 points; desktop starts at 42,000, with a bounded quality
   reduction under sustained load. A rendering failure leaves the HTML name
   and controls. No third-party project runs inside the scene.
5. **`story.js`** optionally mounts **`intro.js`**, whose pure **`intro-state.js`**
   timeline advances through actual captures and scene events without selecting a
   project or changing its URL. The compact overlay lives inside the particle
   stage; navigation cancels it before taking effect. The renderer announces late
   readiness so an active intro can resend its current beat. Module URLs are
   versioned recursively, so a changed dependency invalidates the page URL.
   It independently mounts **`work-ui.js`** inside the stage's hidden work panel.
   Header navigation has its original dialog/PDF fallback until that mount
   succeeds. **`script.js`** maps validated professional modes to the five
   **`work-shapes.js`** targets in the same renderer. Back/Escape restores the
   previously selected project; a late enhancement cannot reset a running intro.
   The HUD's panel selectors are scoped below its container so the body state
   class cannot acquire a panel's layout. Only panel details scroll when needed;
   no professional section is appended to the page.
6. A missing path gets **`404.html`**, with `404.css` and `404.js` (the
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
in `scripts/verify.test.cjs`, `scripts/tools.test.cjs`, and
`scripts/particles.test.cjs`. It gates the pre-push hook (`.githooks/pre-push`),
pull requests, and the deploy in `.github/workflows/pages.yml`, which then
runs `scripts/smoke.cjs` against the live URL. `serve.cjs` serves `dist/`
locally on port 4357 with the CSP sent as a real header. Port 4317 belongs to
Guide on this desktop; sharing its origin can let Guide's cached navigation
intercept the portfolio preview.
