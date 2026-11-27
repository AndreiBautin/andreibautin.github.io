# Welcome

The home screen holds the particle name after one brief formation. Its short
introduction and three choices remain visible until the visitor selects a section.
There is no timed tour, countdown, Skip or Replay control.
The bottom personal-project picker is hidden in the initial HTML and on every
return home. It appears only after choosing Projects; the three welcome choices
remain the starting point.
Explore experience opens the professional section directly. Hovering or focusing
the choices previews their context in the welcome copy without changing the
particle scene or URL. See [Interactive details](INTERACTIVE-DETAILS.md).

## One visit

`dist/index.html` supplies the introduction and real links before graphics load.
Explore my background points to the approved resume PDF. Once the work UI is
ready, an ordinary primary click opens the Resume stage; modified clicks and
unavailable enhancement keep the native PDF destination. Explore projects opens
the last selected demo (TERRA initially) and focuses the project picker.

The header remains Resume, Experience, Projects, Contact, with keys 1-4 in that
order. The home mark returns to the name. Each chosen section stays put, with
its own particle form and readable controls. Images belong to project details.

## Implementation

- `dist/script.js` owns selection and links. Work readiness restores explicit
  deep links only; it never replaces a clean welcome or a visitor's choice.
- `dist/story.js` mounts only the professional controls. It has no timers,
  animation loop or tour import. Import failure preserves native fallbacks.
- `dist/hero.js` owns the entrance inside its existing frame loop. A seeded
  shader reveal draws dispersed points into the name over roughly one second,
  then clamps at its settled value. It never emits a route or scene choice.
  Hidden tabs pause it. Selecting another form completes the entrance immediately.
- Deep work/project links initialize their target directly. Reduced motion starts
  with the settled name, without formation, drift or pointer waves. Manual
  navigation retains its existing 1.45-second morph when motion is allowed.

## Accessibility and fallback

The canvas remains aria-hidden. The accessible h1 stays permanently visually
clipped, including graphics failure; it must never become the rejected large
plain-name overlay. The visible welcome h2 supplies the name, alongside its
introduction, PDF/project choices and header links even without WebGL. No
scene or focus changes on an idle welcome. Visitor navigation may focus the
selected panel title or project picker. Copy email retains its status feedback.

No JavaScript: native resume and project anchors plus the noscript project list
remain available. No professional enhancement: the background action follows
the PDF; Experience and Contact retain the nonmodal panel fallback. Professional deep
links show a matching summary and target before enhancement, and keep that
summary if the import fails. No renderer: status
and factual links remain available. Optional professional geometry failure does
not remove those controls. No additional images or services load for an intro.

## Verification

The integrated gate checks the actual loader and UI, idle welcome, late readiness,
background/PDF modifier behavior, project choice, deep links, hidden-frame pause,
bounded entrance and instant target initialization. Native desktop review checks
appearance separately; physical mobile and screen-reader acceptance remain open.
