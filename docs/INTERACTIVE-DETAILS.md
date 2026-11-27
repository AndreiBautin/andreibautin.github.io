# Interactive details

The fullscreen particle stage remains the application. Information changes in
response to a visitor's choice, with no timed tour or scrolling homepage.
This integrates Claude's task 06 flow review, revised against the final source.

## Home

Three controls lead to Resume, Experience and Projects. Hover or keyboard focus
previews the chosen section in the welcome copy; leaving restores the identity.
This never changes the URL or particle target. Selection opens that section.
The resume keeps its PDF and modified-click fallback. Experience keeps the
nonmodal About panel if the optional professional module is unavailable.
The controls use the same full-width `.scene-picker` row as Projects and
Experience, with thin top rules and short subtitles. They have no card surface.
Professional details use unboxed captions; resume milestones show compact dates
with full descriptive accessible labels. The selected caption retains the degree,
employer or certification facts and the approved PDF remains available.
Home has no top branding, role/location label, theme toggle or duplicate menu.
Other sections retain quiet in-stage Home actions; header menus stay hidden. A saved theme
preference still loads without requiring a visible theme control.

## Project field notes

`dist/script.js` opens `aside#project-info` inside the particle stage from
How it works. The aside replaces project copy, with no backdrop, focus trap or
renderer pause. Its Overview, Under the hood and Preview buttons expose one
content block at a time. Launch/source links and the bottom picker stay usable.
Changing projects keeps the notes open, selects the new article and starts at
Overview. Back to project or Escape closes the notes and focuses How it works;
Home or a professional destination closes them. The professional Home action
returns to the welcome and focuses its Resume choice. Escape retains the
last-demo return (TERRA initially).

`dist/index.html` retains the actual descriptions and captures; no facts are
generated. The panel needs only the classic UI script, so it works if graphics
or professional imports fail. Without JavaScript, the noscript links and PDF
remain. Short/narrow viewports scroll the panel internally, not the page.

## Model inspection

`dist/hero.js` captures the primary pointer on the canvas. Mouse rotation requires
holding the right button; left-click sends a wave and left-drag does not rotate.
Touch keeps direct drag inspection. A six-pixel threshold separates dragging
from a click. The context menu is suppressed only over an active model canvas.
Rotation applies before the
shader positions the model in the stage; text never rotates. Yaw wraps and
pitch is bounded to 60 degrees each way. Cancel/lost capture, scene changes and
context loss release capture and end dragging. Nonfinite coordinates are ignored.
The wheel zooms the model from 0.65 to 1.5 times its normal size, without moving
text or changing the camera. Pixel/line/page wheel deltas are normalized and
bounded per event. Ctrl/Command-wheel preserves browser zoom. Text panels scroll
independently because their wheel events do not target the canvas.
Turn and zoom buttons provide keyboard equivalents. Reset view clears manual
rotation and zoom. Selecting another scene resets inspection. The welcome name
supports the same right-drag, wheel and keyboard controls while staying on Home.
Manual inspection rotates the full particle geometry, including the name.
There is no permanent interaction-instruction label over the scene. Turn, zoom
and reset controls are visually clipped until keyboard focus enters their group,
then remain visible while focus is within it. Mouse inspection stays active.
The footer contact shortcut is removed; Contact remains in section navigation
and the professional panels, with native email and profile links.
The points/FPS counter is removed. The footer appears only for an actual graphics
failure; adaptive quality still uses frame timing internally.

Reduced motion disables automatic animation and waves; explicit inspection
still renders on demand. Controls appear only after successful graphics startup
and disappear on context loss. Manual rotation and text navigation are independent.
Professional Problem / My contribution / Outcome choices reveal the selected
account in place; the reveal animation is disabled for reduced motion.

## Resume motion

The four career nodes retain their geometry coordinates. `work-shapes.js` replaces
the former straight baseline with short tilted orbital trails. In `hero.js`,
flow identity 4 spins the node rings, bobs their centers, sends light pulses along
the curved journey and gently rocks the assembly. It fades in only after the
scene morph settles and uses the existing paused/reduced-motion frame lifecycle.
Selecting a resume milestone updates `portfolio:career-step` and emphasizes that
node's pulse without navigating or advancing the story automatically.

Resume uses smaller particle footprints and lower opacity than the other scenes
to limit additive overlap in its dense rings. Its spheres carry deterministic
local directional shading, preserving shadow faces and the gold credential node.
Selected milestones receive a restrained light sweep rather than a broad white
boost. Exposure follows the existing flow fade and stays consistent in reduced
motion; it does not alter the project models or their palette.

## Contact and presentation scale

The content subheader carries a thin back arrow with a 44px hit area, an accessible
Back to home label and visible keyboard focus. It sits above the section copy,
alongside Resume, Experience, Projects and Contact links with an active underline.
One shared navigation node moves between the scene copy, professional HUD and
project details so routing and focus use the same controls everywhere. The arrow
returns to the welcome choices rather than following browser history. Home keeps
four matching bottom choices (two columns on phones) and hides the interior
subheader. Scrolling project notes keeps that row sticky. Only `#scene-summary`
announces project copy changes; the relocated navigation is outside its live region.
Short screens move the content's upper bound to 28px so the row remains reachable
while details scroll inside their panel.

Contact joins the same gated loop as flow identity 5. Its open nexus ring turns,
satellite bodies rotate, packet bands travel and curved connections carry pulses.
A slow whole-shape precession, breathing and float make the scene visibly alive
without pointer input. The old ungated Contact wobble/alpha floor is removed.
All nine scenes retain their distinct idle movement: name rock/float, planet and
sculpture spin, jellyfish pulse, and five professional flow identities. Reduced
motion deliberately settles them; hidden frames pause their clock.

Default presentation is 12 percent larger (8 percent on narrow phones), applied
to model coordinates before stage positioning. Wheel zoom/reset remains relative
to that baseline; text and interface sizing do not change.

## Evidence and limits

Navigation tests execute the shipped classic script: direct Home Experience,
intent previews, stale hover after navigation, detail-step visibility, retained
notes on project changes, Escape/focus return and professional transitions.
Renderer tests execute the actual pointer handlers: threshold, pointer identity,
bounded pitch, cancellation, manual reduced-motion renders and reset. These do
not simulate held mouse buttons at the operating-system level. Wheel tests cover
unit normalization, bounds, browser zoom modifiers and reset. These state tests do
not establish GPU appearance. Native Chrome review checks the actual stage,
field notes, preview images, model drag and turn controls separately. Physical
mobile, touch and screen-reader acceptance remain open.
