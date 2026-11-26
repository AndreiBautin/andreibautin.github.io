# Optional project introduction

`dist/intro.js` exports `mountIntro(root = document)` returning `{ replay(), dispose() }`.
`dist/intro-state.js` owns pure timing and start policy; `dist/intro.css` owns only
the introduction's presentation. This is a static-site adapter, with no domain
layer, dependency, generated image, network call or storage of visitor content.

## Integration contract

Main integration must reference intro.css, import intro.js and call mountIntro
after project selection has initialized. Mount once and dispose before remounting.
No automatic side effects occur on module import. The provisional file-pair
comments retain the three coupled files until real entry-point references exist.
Main owns markup and module version stamping; this worker changes neither.

Inside `.particle-stage`, provide `section#portfolio-intro[hidden]`, `.intro-copy`
containing `p#intro-message`, `figure.intro-preview` containing three images with
`data-intro-image="terra"`, `"nacre"`, `"pelagic"`, then `p#intro-caption` and
`button#skip-intro`. Use the existing local captures respectively:
`images/planet-wide.webp`, `images/nacre-ribbon.webp`, `images/pelagic-thumb.webp`.
Give each image appropriate project alt text and dimensions in HTML. Provide
`button#replay-intro` outside the section. Buttons need `type="button"`.
The overlay is a small nonmodal card; it never traps focus or hides ordinary
content. Its only pointer target is Skip. Keep header/project controls outside
the card's footprint when composing the final layout. Do not add a rapidly
changing live region; the content is also available in ordinary project HTML.

## One run, end to end

On mount, intro.js reads the session marker and live motion/data policies.
Denied storage skips the automatic run. A seen session, reduced motion, data
saving, or explicit Terra/Nacre/Pelagic/experience/career/contact hash skips it
too (the legacy construct hash is also preserved). Replay ignores session/hash
policy but honors motion and data saving. A started run marks the session seen.

intro-state.js advances through identity/scene 0 for 900ms, then Terra/1,
Nacre/2 and Pelagic/3 for 1300ms each: 4800ms total visible time. intro.js
updates textContent, image hidden properties and the overlay's data-intro-beat,
dispatching `portfolio:scene` on the window with `{ detail: { index } }` at each
beat. It does not change selected-project HTML, location or history. Completion
or Skip restores the scene selected when the run started. Images are preexisting
project captures; captions make no performance or client claims.

Document capture listeners cancel on outside pointerdown, keydown, click or
wheel, restoring before the control's own handler runs. Passive pointer motion
does nothing. External scene events and hash changes cancel without dispatching
a restoration over the visitor's choice. There are no delayed exit timers.
Hidden tabs cancel their frame and clear the clock anchor; resuming cannot spend
hidden time. Pagehide ends the run; live motion/data changes end it immediately.
Dispose restores if active and removes every listener and pending frame.
Focus is never moved on entry; if Skip held focus at exit it returns to Replay.
Ordinary content never depends on loading a capture or rendering particles.

## Verification and limits

`scripts/intro.test.cjs` uses node:test and vm.SourceTextModule with no dependency.
It checks exact beat boundaries and total duration, hostile/nonfinite clocks,
pause/resume, terminal interruption, policies, image/scene sequence, immediate
Skip, repeated replay, outside input, stale callbacks, external scene selection,
live preferences, pagehide and listener disposal. Run independently with
`node --experimental-vm-modules --test scripts/intro.test.cjs`, or via `npm run verify`.

Deliberately not tested here: browser layout, actual GPU morphs, image decoding,
screen-reader behavior and final entry-point wiring. Those need main's integrated
markup and native browser review. No shared stamps, HTML, resume or project
selection code are edited by this worker. The intro owns no scroll observer:
hidden-tab timing pauses; wheel/touch pointer input and outside keyboard input
cancel before normal navigation. Main retains responsibility for suspending
the underlying particle renderer offscreen.
