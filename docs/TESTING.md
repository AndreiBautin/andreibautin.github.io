# Testing

Welcome regressions execute the shipped UI and optional loader: idle and late
readiness keep the name and URL unchanged, no tour is imported or scheduled,
background opens Resume with native PDF fallback and modifier behavior, and
projects opens the demo picker. Existing work, clipboard, deep-link and Escape
coverage remains. Renderer frame tests check that the particle reveal clamps
once, stays settled through prolonged idle, pauses while hidden and initializes
direct targets instantly. These are behavioral checks, not a visual-quality claim.

The historical native checks below describe earlier section/refresh milestones;
the timed overview they mention has since been removed. Current welcome details
and acceptance limits are in docs/WELCOME.md.
Native fullscreen Chrome review on November 26 confirmed each top-level
section, the three-project picker and local TERRA launch destination, the
dedicated career/resume view with its PDF link, and the separate Contact view.
Replay showed the professional and project overview beats with actual captures,
then completed on Experience at `#work-knowledge`. The page had refreshed itself
after the passing gate. Status remained approximately 60 fps at 42000 points.
This desktop check does not establish physical mobile or screen-reader behavior.

The HTML name is permanently visually clipped, including during startup and
graphics failure. Its previous timed reveal is removed; readiness classes cannot
bring back a large plain-text overlay. The heading remains in the accessibility
tree, while errors use the existing status and working links. Native refresh
review remains necessary; the automated gate does not establish appearance.

Native Chrome refresh acceptance on November 26 also exercised the shipped
local polling protocol. With the page already open, an unverified temporary
bundle edit suppressed the endpoint token (`204`) and did not reload the page.
After stamping and the full passing gate, it reloaded automatically without
browser input. Restoring the exact original bytes and passing the gate caused
another automatic reload. The temporary edit was removed. This establishes
desktop refresh behavior, not cross-device rendering quality.

Experience regressions execute real target generation at 42000 points and the
18000/24000 draw-range prefixes, checking every document quadrant, replication
lane, annulus sector and complete local orb. `experience-motion.test.cjs` runs
the shipped frame function against injected rendering seams: flow waits for the
morph, changes identity only while faded, leaves the original scenes and stops
while hidden. A planted descending range proves the GLSL constant-range check
detects undefined smoothstep usage. This is not shader compilation or visual QA.
The real renderer startup sequence is also exercised with no selected project:
an experience deep link must still start the frame loop and announce readiness
so `script.js` can restore its professional scene.

Native Chrome acceptance on November 26: refreshed the existing local
`#work-knowledge` tab through Computer Use after restarting the stopped preview
server. The first check exposed the missing selected-project startup bug; after
the correction, the screenshot showed the retrieval scene with no plain-name
overlay, and the live status reported 42000 points at approximately 60 fps.
The left display remained fullscreen. This establishes that desktop path only;
mobile, reduced-motion and every other scene still need their own native checks.

The `single-screen viewport` group rejects a fixed minimum height on the particle
stage. Its regression plants a 700px rule and restamps the assets, so only the
layout invariant fails. Short-height CSS keeps project copy, the intro and the
professional HUD in their existing overlay regions. These checks establish the
source constraint, not computed browser layout: native checks at small-phone and
short-landscape sizes remain outstanding, including keyboard access to locally
scrolling copy and intro Skip. No screenshot or visual-perfection claim follows
from this static gate.

| Command | Runs | Covers |
|---|---|---|
| `npm run verify` | every push, PR, deploy | 21 check groups over the repo (`scripts/checks/`), then `scripts/*.test.cjs` |
| `scripts/smoke.cjs` | after each deploy | live pages equal this commit's `dist/`, carry the CSP and referrer policy, every linked asset and dynamic import loads |
| `npm run links` | weekly | outbound links still answer (a lapsed service's subdomain can be claimed) |
| `scripts/observatory.cjs` | weekly | live Mozilla Observatory grade has not dropped |
| `npm run lighthouse` | by hand | performance medians over several runs |

## What the tests are for

`scripts/navigation.test.cjs` executes the actual shipped UI script against a
small event/DOM fixture: late readiness cannot replace a scene, explicit work
destinations survive delayed mounting, malformed modes do nothing, Back/Escape
restores the last project, and unavailable enhancements keep dialog/PDF access.
`scripts/work-ui.test.cjs` covers panel visibility, roving focus, career details,
clipboard and disposal. Its CSS check rejects a panel selector that could style
the body's work-view state. `scripts/work-shapes.test.cjs` covers finite bounded
geometry, seeded identity, low counts and distinct targets. These tests establish
state/geometry behavior, not the live WebGL appearance or mobile layout.

`scripts/opening.test.cjs` executes the optional loader and its failure/disposal paths. It permits only the work UI import and rejects automatic navigation timers.

`scripts/presentation.test.cjs` protects the single-screen composition: the
homepage contains one particle stage, with experience/contact behind explicit
controls and a direct resume link. It prevents accidentally appending a scrolling
resume homepage. Visual style and native dialog behavior still require browser
review; this structural regression check does not establish their appearance.

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

Navigation regressions cover the hidden welcome picker, explicit Projects/Skip
navigation, and returning from professional panels to a visible demo. The work
HUD fixture checks shared title/subtitle tab structure and roving keyboard focus.
Native desktop review checks the two picker layouts; physical mobile rendering
and screen-reader acceptance remain separate checks.

Interactive-details regressions cover direct Experience on Home, intent previews
that cannot overwrite a later selection, nonmodal project notes, step visibility,
project switching and Escape focus return. Inspection tests execute the renderer's
actual pointer listeners with injected events and render calls, covering capture
identity, threshold, cancel/lost capture, pitch limits and reduced-motion manual
rendering. Native GPU/drag and preview checks complement these state checks.

- **Browser rendering and layout.** No headless browser in the gate: it
  would be the slowest and flakiest part of verify for a site whose layout
  changes rarely and is checked by eye at each change.
- **Particle rendering and animation feel.** Native Chrome review checks all
  four forms, transitions, pointer waves, themes and dialog navigation. No
  pixel-perfect GPU snapshots run in CI: cross-device appearance and physical
  mobile performance remain separate checks.
- **Browser event wiring.** Native dialog focus, keyboard project selection,
  theme switching and direct links are checked in the browser. Geometry tests
  do not pretend to establish these UI interactions.
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

## Particle invariants

`scripts/particles.test.cjs` exercises maximum-population finite coordinates,
bounded colors/positions, deterministic seeded identity and
rejected allocation/input errors. The particle-boundary gate rejects browser
globals, ambient randomness and imports in the geometry module; its planted
defect proves the restriction actually fires. The shader uses analytic forces;
the tests do not claim scientific simulation accuracy.

The name distance-field tests cover enclosed glyph holes, signed distances,
immutable input and bounded allocation. Extruded-name tests cover front/back depth, side samples and enclosed holes.
Native Chrome review checks readability, motion and transitions; unit tests
do not judge the visual style.
