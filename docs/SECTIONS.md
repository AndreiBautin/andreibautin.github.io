# Sections

The page stays one stage: `section.particle-stage` in `dist/index.html`. The
four top-level sections are views of that stage, not pages, scroll anchors or
routes. Nothing here changes the renderer, the CSP or the resume facts.

| # | Section    | Header control                                   | Stage view (enhanced)                    | Fallback (no `work-ui-ready`)          |
|---|------------|--------------------------------------------------|------------------------------------------|----------------------------------------|
| 1 | Resume     | `a[data-resume][data-section-link=resume]`, `href` is the PDF | mode `career` (milestones + PDF link) | The link opens the PDF                 |
| 2 | Experience | `button[data-open=about][data-section-link=experience]` | `#work-panel`, mode `knowledge`, three subscene tabs | `dialog#about` opens at the top       |
| 3 | Projects   | `a[data-projects][data-section-link=projects]`, `href="#projects"` | Last selected project, else TERRA; focus moves to `nav#projects` | Same picker without work UI; native anchor without JS |
| 4 | Contact    | `button[data-open=about][data-contact][data-section-link=contact]` | mode `contact` (email, copy, LinkedIn, GitHub, PDF) | `dialog#about`, scrolled to `#contact` |

The `01`-`04` counters are `aria-hidden`; the accessible names stay
"Resume", "Experience", "Projects", "Contact".

## Experience subscenes

Only Experience has subscenes: `knowledge`, `replication`, `payments`
(`EXPERIENCE` in `dist/work-ui.js`). They are a `role=tablist` with roving
tabindex (Arrow keys, Home, End). `career` and `contact` are `role=region`
views with the tab row hidden, so Resume and Contact never look like a fourth
or fifth Experience tab. Each subscene keeps its Problem / My contribution /
Outcome switcher, abstract SVG and Resume/Contact actions. Renderer targets
are `4 + MODES.indexOf(mode)` (`dist/work-shapes.js`).

## State and URLs

`dist/script.js` owns state; `window` `portfolio:mode` is the only way to
change the professional view.

- `markSection()` sets `body[data-section]` (`home`, `experience`, `resume`,
  `projects`, `contact`) and `aria-current="location"` on the matching header
  control. `home` (INDEX) marks no header control.
- A visitor action writes the hash with `history.replaceState`: `#work-<mode>`
  or `#<project>`. Default entry leaves the clean home URL alone. Intro
  completion keeps that clean URL, or writes `#work-career` after replay
  from a deep link so the displayed view and a reload agree.
- Accepted deep links: `#experience` (= `knowledge`), `#resume` and `#career`
  (= `career`), `#contact`, `#work-<mode>`, `#projects`, `#terra`, `#nacre`,
  `#construct` (= NACRE), `#pelagic`, `#top`. Any of them suppresses the intro.
- Escape on the stage (outside a dialog) returns from a professional view to
  the last selected project. Keys `1`-`4` activate Resume, Experience,
  Projects and Contact, matching the header order. The home mark retains the
  original particle-name scene; Projects contains only the three demos.

## First entry

With no hash and no visitor navigation yet, `portfolio:work-ready` lands on
Resume (`career`). `dist/story.js` mounts `work-ui.js` before importing
`intro.js`, so this landing happens before the intro starts and the intro's
`selectedScene()` records the Resume target as the scene to restore.

## Overview intro

`dist/intro-state.js` defines one 10.8 s pass (`INTRO_DURATION = 10800`), eight
beats, each with a `section` label shown in `#intro-step` as
`<section> / n of 8`:

| Start (ms) | Section    | Beat        | Scene |
|------------|------------|-------------|-------|
| 0          | Welcome    | identity    | 0     |
| 1600       | Resume     | career      | 7     |
| 3000       | Experience | knowledge   | 4     |
| 4200       | Experience | replication | 5     |
| 5400       | Experience | payments    | 6     |
| 6600       | Projects   | TERRA       | 1     |
| 8000       | Projects   | NACRE       | 2     |
| 9400       | Projects   | PELAGIC     | 3     |

The intro only dispatches `portfolio:scene`; it never selects a project, a
mode or a URL. While it plays, `.scene-copy`, `.work-hud` and `.work-tabs` are
`visibility:hidden`. Preview images show only on project beats.

Ending it:

- **Completion, Skip intro, Escape inside the overlay**: `finish()` hides the
  overlay and dispatches `portfolio:intro-complete`; `dist/script.js` then
  lands on Resume (`career`). Escape is consumed so the same key cannot
  also leave that view. If work UI failed to mount, completion restores the
  original scene to keep its copy and particles consistent.
- **Any other pointer, key, click or wheel, a hash change, or a scene from
  elsewhere**: `stop()` restores the scene recorded at start (or yields to
  the new choice). It does not dispatch `portfolio:intro-complete`. Tab and
  Shift+Tab continue the intro while allowing keyboard focus to reach Skip.
- It runs once on each clean page load, with no session storage. It does not
  start with reduced motion,
  Save-Data or a deep link, and stops if either preference turns on. A hidden
  tab pauses it. **Replay intro** starts it again when motion is allowed.

## Links that must not change

- Every resume link is `./Andrei_Bautin_Resume.pdf`. The header Resume link
  only intercepts a plain primary click once the work UI is ready; Ctrl, Cmd,
  Shift, Alt and middle clicks open the PDF. The Resume view offers the
  download as a real link.
- Projects uses the same modified-click rule; its `href="#projects"` works
  with no script.
- Project launch and source links are plain anchors in `dist/script.js`
  `projects`, `dialog#project-info` and the `<noscript>` list. They never wait
  for graphics, the intro or the work UI. On the local portfolio origin only,
  launch and detail links point at the pinned local demo servers
  (docs/LOCAL-DEMOS.md).

## Fallbacks

| Missing piece                 | Result                                                               |
|-------------------------------|----------------------------------------------------------------------|
| WebGL / `dist/hero.js`        | Status message; every control and link still works.                  |
| `dist/work-ui.js`             | Header uses dialogs and the PDF; first entry is INDEX, not Resume. |
| `dist/intro.js`               | No intro, no Replay button; first entry is still Resume.         |
| JavaScript                    | `<noscript>` project links, resume link, skip link to `#projects`.   |

## Accessibility

- Header controls are real buttons and links with their visible names;
  the current section is `aria-current="location"`.
- Focus moves only on visitor navigation: a tab keeps focus on the tab,
  other navigation focuses the view title (`tabindex=-1`), Back/Escape focuses
  `nav#projects`. Default landings and the intro never move focus. If focus is
  inside the overlay when it ends, it moves to Replay intro.
- Contact copy reports through a `role=status` region and falls back to
  selecting the address.
- The intro region is not live; beat text changes are not announced.
