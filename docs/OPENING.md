# Opening

What a visitor sees from page load until the first section is on the stage.
Section views, deep links and fallbacks are in docs/SECTIONS.md; this file
covers only the opening overview, its renderer handoff and its limits.

## Sequence

Section order is **Resume, Experience, Projects, Contact**. The opening leads
with Resume and ends on Resume.

| Order | Beat                  | Section    | Renderer target            |
|-------|-----------------------|------------|----------------------------|
| 1     | identity              | Welcome    | 0 (name)                   |
| 2     | career                | Resume     | 7 (`career`)               |
| 3-5   | knowledge, replication, payments | Experience | 4, 5, 6        |
| 6-8   | TERRA, NACRE, PELAGIC | Projects   | 1, 2, 3                    |
| end   | finish or Skip        | Resume     | 7, mode `career`           |

- About 10.8 s of overview time, counted only while the tab is visible and
  the renderer is ready (see Renderer handoff).
- **One overview per page load.** A clean entry (no hash, motion allowed, no
  Save-Data) plays it every load. There is no session suppression: a reload
  or a new tab plays it again.
- **Explicit hashes bypass it.** Any section or project hash accepted by
  docs/SECTIONS.md lands directly on that view with no overview.
- **Skip intro**, Escape inside the overlay and natural completion all land on
  Resume (`career`), keeping a clean URL or changing a replay's hash to
  `#work-career`. Other visitor input stops the overview and
  yields to whatever the visitor chose.
- **The skipped intro must not flash the name.** If the overview will not
  play, the first frame the renderer draws is the landing target, not target
  0.
- **Navigation is never blocked.** Header links, project buttons, launch and
  source links and the resume PDF work before, during and after the overview,
  with or without graphics.

## Renderer handoff

The overview advances only once the renderer can show the beat, so a slow
GPU or font load does not spend the Resume or Experience beats on a blank or
name-shaped field.

- Ready means `portfolio:graphics-ready` has fired, or `body.field-ready` is
  already set when the overview mounts. The class matters: `dist/hero.js` is
  a separate module and can finish before `dist/story.js` mounts the intro,
  so the event alone can be missed.
- The wait is bounded to 2500 ms. If the renderer is not ready in time, or
  `body.field-unavailable` is set, the overview advances on its text alone;
  it never holds the overlay open waiting for WebGL.
- The wait never captures input. Any navigation during it ends the overview
  the same way it would during a beat.

## Startup and interruption

`story.js` imports the overview before announcing work readiness. In that same
callback it selects the default Resume view, then mounts the overview. The
overview snapshots Resume as its restoration target, switches immediately to
the name, and starts its visible hold only after readiness. An explicit hash
instead opens its requested target. `hero.js` reads the selected work mode or
route at startup and snaps to it before its initial frame; default restoration
also requests an instant scene rather than morphing from the name.

- The intro only dispatches `portfolio:scene`; it never selects a mode, a
  project or a URL.
- A hidden tab pauses the clock (`pauseIntro`); a visible tab resumes it.
- Reduced motion or Save-Data prevents it and stops it if either turns on;
  CSS also hides `#portfolio-intro` under reduced motion.
- Replay intro restarts it, still subject to reduced motion and Save-Data.
- Focus inside the overlay moves to Replay intro when it ends; default
  landings never move focus.
- Overview transitions use the short 0.55 s morph (`showcase: true`);
  visitor navigation uses 1.45 s.

## Limits

- **Professional targets are optional.** If `dist/work-shapes.js` fails to
  import, `hero.js` keeps targets 0-3 only and `change()` ignores 4-8. The
  overview still shows Resume and Experience text, but the field stays on
  the previous form for those beats. `graphics-ready` fires either way, so
  readiness does not imply targets 4-8 exist.
- **No work UI, no Resume landing.** A failed work-ui import still permits
  the overview; completion restores the initial scene. Header controls fall
  back to dialogs and the PDF.
- **Reduced motion** draws one static frame per change; there is no
  overview; default Resume restoration is instant and direct hashes select
  their work target at renderer startup.
- **The 10.8 s figure is beat time, not wall time.** The bounded readiness
  wait and any hidden-tab time are added on top.
- **The overlay region is not live**; beat text is not announced. Screen
  reader users get the landing view, not the overview.
- **No browser check here.** This document was written from source only;
  nothing in it was observed in a running browser.

## Verification scope

`scripts/intro.test.cjs` checks the full timeline, renderer warmup and bounded
fallback, hidden-tab behavior, cancellation and storage independence.
`scripts/opening.test.cjs` executes the asynchronous loader order.
`scripts/experience-motion.test.cjs` exercises initial target selection and the
actual instant change function. Native review establishes appearance separately.
