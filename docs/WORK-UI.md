# Work HUD

`dist/work-ui.js` and `dist/work-ui.css` add a compact professional-work HUD
inside the existing full-screen particle stage. It is not a page section and
never scrolls the page: the copy occupies the left third on desktop, tabs take
the project picker's slot at the bottom, and the centre/right of the scene
stays clear for the particles. The renderer, scene selection and header belong
to the main page (`dist/script.js`, `dist/hero.js`); this module draws no canvas.

## Integration (owned by main)

- Markup: an empty `div#work-panel` with `hidden` inside `section.particle-stage`.
- Link `./work-ui.css` and import `./work-ui.js`, then call
  `mountWorkUI(document)`; it returns `{ dispose() }`. Until then the files
  reference each other only in comments so the unreferenced-files check passes.
- Add `work-ui.js` to `SHIPPED_JS` in `scripts/checks/shared.cjs` and its text
  to the font-subset scan if it should be gated like the other scripts. Every
  character used is already in `UNICODES` (ASCII, `·`, `←`).
- Mounting adds `body.work-ui-ready`; main can then route Experience, Resume
  and Contact clicks to modes instead of the dialog. Disposal removes it.
  Without the module everything still works through the existing dialog.
- `#work-navigation` hosts the page's shared section subheader above the copy.
  The module's standalone back button hides only while that shared node is present.

## Event contract

`window` CustomEvent `portfolio:mode`, `detail: { mode }`, where mode is
`knowledge`, `replication`, `payments`, `career`, `contact` or `null`
(no professional panel). `destination:home` on a null request asks the page to
restore Home and focus its Resume choice; other null requests return to projects.
These events are authoritative. On each valid event the module
synchronously sets `#work-panel.hidden`, `data-work-mode`, `body.work-view`,
each view's `hidden` and each tab's `aria-selected`/`tabindex`. Invalid
details are ignored; re-dispatching the current mode is a no-op.

Only knowledge, replication and payments appear in this tab row. Resume
(`career`) and Contact are separate header sections with named regions and no
professional tab row. See [Sections](SECTIONS.md) for the ordered navigation,
persistent welcome and visitor-selected sections.

Experience uses the shared `.scene-picker` grid from `dist/styles.css`: three
equal columns, a title and subtitle, and the same spacing, active border and
responsive sizing as Projects. `work-ui.css` hides only the personal picker
while professional views are open. Back to projects and Escape restore the last
selected demo, or TERRA if none was selected, before focusing its picker.

Controls (tabs, Home, Escape inside the panel, the in-panel
Contact buttons) only *request* navigation by dispatching the same event; the
module shows what the event says, so a main listener that redirects wins.

Focus moves only for navigation: a tab keeps focus on itself; an in-panel link
or an external event raised while focus is on a control (a header button)
focuses the new view's title; returning to projects from inside the panel
focuses `#projects`. Initial load, a restored mode while focus rests on the body,
and repeated dispatches do not move focus.

## Contents

Knowledge assistant, replication and payments each have an eyebrow, a title,
one short paragraph, an abstract `aria-hidden` line diagram (no text, numbers
or fake dashboards) and a Problem / My contribution / Outcome switcher.
Career has four selectable milestones (May 2019 CSU degree, June 2019
Brainspire/3Cloud, September 2024 senior role, AZ-900/AI-900) and the
approved PDF. Contact shows the selectable address, mailto, LinkedIn, GitHub,
the PDF and a copy button. All copy is taken from `dist/index.html` and
`dist/Andrei_Bautin_Resume.pdf`; the only figures are "more than 11 hours of
manual work each day" and "5+ engineers".

Resume uses a separate bottom `.scene-picker` milestone row. Selection emits
`portfolio:career-step` with its zero-based index. `work-shapes.js` supplies
explicit per-particle node ownership, including each node's rings and trails;
journey connections have no node owner. `hero.js` enlarges and brightens the
selected node while keeping its neighbours visible. This emphasis is independent
of the motion uniform, so reduced motion retains selection without an animation
loop. Rotation and zoom preserve the selected milestone.

Every tab row is `role=tablist` with roving tabindex and automatic activation:
ArrowLeft/ArrowRight wrap, Home/End jump.

Copy email reports success only after `navigator.clipboard.writeText`
resolves. On rejection or a missing API it selects the address and says how
to copy it; without selection support it names the address. A late answer
from an earlier click, or one after `dispose()`, is ignored.

`dispose()` removes its listeners, timers and DOM, restores the panel's
`hidden`, removes both body classes and returns focus to `#projects` if it was
inside the panel.

## Tests and limits

`scripts/work-ui.test.cjs` loads the module through `vm.SourceTextModule`
against a small fake DOM: mount/dispose, synchronous event state, focus
policy, roving keys, Escape/back, the main-page veto, factual content,
clipboard success/denied/missing/stale/disposed, and CSS scope.

Not verified here: real browser layout, contrast over the live particles,
screen-reader output and the mobile internal scroll. Those need a browser
review after main integrates the markup.
