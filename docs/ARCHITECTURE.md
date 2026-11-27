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
   and the in-stage project inspector. A project button validates an index, updates the copy
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
   reduction under sustained load. A rendering failure leaves the status message
   and controls. No third-party project runs inside the scene.
   The HTML name is a permanently visually clipped heading for assistive
   technology. It never becomes a large plain-text overlay, including during
   startup, missing modules, no-script use or context loss. There is no reveal
   timer or readiness-dependent styling for that heading. Graphics errors use
   the existing status message; project and resume links never wait for graphics.
5. **`story.js`** mounts **`work-ui.js`** in the hidden work panel and announces
   readiness. **`script.js`** restores an explicit professional destination, or
   leaves the welcome and any visitor selection alone. The header orders Resume,
   Experience, Projects and Contact; only Experience has the three professional
   tabs. There is no tour or automatic default section. **`hero.js`** forms the
   welcome name once with a bounded seeded shader reveal in its existing loop;
   reduced motion starts settled and hidden tabs pause. Scene selection completes
   that reveal, then uses the normal 1.45-second morph. Direct routes initialize
   their requested target without morphing from the name. The welcome's background
   link retains its PDF fallback; direct Experience and Projects choices open
   their sections. Focus/hover previews describe those choices without routing.
   Work UI controls map to five **`work-shapes.js`** targets through `script.js`.
   Header dialogs and direct links remain available without the enhancement or
   renderer. Only panel details scroll; no sections are appended to the page.
   See [Welcome](WELCOME.md) and [Sections](SECTIONS.md).

   Project How it works opens the `aside#project-info` in this same stage.
   `script.js` selects Overview, Under the hood or Preview; the bottom picker
   changes its article without dismissing it. `hero.js` captures primary drags
   and applies bounded manual inspection in the shader before stage positioning.
   Text stays upright and native turn/reset buttons remain keyboard accessible.
   See [Interactive details](INTERACTIVE-DETAILS.md) for event/fallback behavior.
   A shared content subheader moves above the current copy or project inspector;
   its four direct section choices reflect the active section. Home instead uses
   four bottom choices. The back arrow restores the welcome. Professional panels request
   `portfolio:mode` with `mode:null,destination:home`; the classic script restores
   the welcome and focuses its first section choice. Projects expose an in-stage
   Home action. Resume uses flow identity 4 for orbiting rings, bobbing milestones
   and traveling light along the curved journey; no straight baseline remains.
   Contact uses flow identity 5 for its turning nexus, traveling packets and slow
   precession. All nine scenes have distinct idle motion and share slightly
   enlarged model framing, with narrower-screen limits and settled reduced motion.

6. A missing path gets **`404.html`**, with `404.css` and `404.js` (the
   theme applied before paint) as files so the CSP can forbid inline code.

## Experience geometry

`dist/work-shapes.js` gives knowledge retrieval a layered spherical nucleus,
orbital traces and tilted document stacks. Replication uses a capped source
cylinder, four ribbed helical channels and receiving rings. Payments uses a
double-depth annulus, discrete radial teeth, an inset ring and an output stream.
These remain bounded deterministic particle targets, not live service diagrams.
Weighted fair interleaving distributes structural bands through the buffers:
adaptive draw-range reduction keeps every motif rather than dropping all packets
and connections from the end of the buffer. Native visual review remains needed.

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
