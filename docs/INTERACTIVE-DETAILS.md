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

## Project field notes

`dist/script.js` opens `aside#project-info` inside the particle stage from
How it works. The aside replaces project copy, with no backdrop, focus trap or
renderer pause. Its Overview, Under the hood and Preview buttons expose one
content block at a time. Launch/source links and the bottom picker stay usable.
Changing projects keeps the notes open, selects the new article and starts at
Overview. Back to project or Escape closes the notes and focuses How it works;
Home or a professional destination closes them. The professional Back to
projects action returns to the last demo, or TERRA if none was selected.

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

Reduced motion disables automatic animation and waves; explicit inspection
still renders on demand. Controls appear only after successful graphics startup
and disappear on context loss. Manual rotation and text navigation are independent.
Professional Problem / My contribution / Outcome choices reveal the selected
account in place; the reveal animation is disabled for reduced motion.

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
