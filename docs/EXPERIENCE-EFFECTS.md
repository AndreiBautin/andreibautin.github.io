# Experience effects

Grok owns the three scrolling chapter diagrams. Presentation lives in
`dist/experience.css` (panel wash and canvas sizing). Stage geometry lives in
`dist/experience-effects.js`. Chapter layout, copy and the replay button stay
in the shared story markup.

`mountExperienceEffects(root = document)` finds each `[data-experience]`
article whose key is `knowledge`, `replication` or `payments`, draws its
`canvas[data-experience-canvas]`, and returns `{ dispose() }`. It sets only
the canvas backing-store size for device pixel ratio. `dist/experience.css`
sets the display size.

The drawings are seeded diagrams of the resume work: records gather around a
question and connect to an answer; a serial queue opens into parallel lanes;
tangled manual payment hops straighten into one automated route. They are not
live client systems. The approved time outcome stays in the HTML, not as a
canvas metric.

Pointer movement tugs nearby marks. Click replays knowledge and payments.
Click on replication shoves the lanes and the playback eases them back.
`button[data-experience-replay]` replays that article. Reduced motion draws
the resolved composition and updates when the preference changes. Hidden tabs
and offscreen articles stop frame work. Dispose removes observers, listeners
and the animation frame.

Pure helpers for tests: `createExperienceModel`, `sampleExperience`,
`createPlayback`, `stepPlayback`, `replayPlayback`, plus `EXPERIENCE_KEYS`
and `EXPERIENCE_LIMITS`. Models reject unknown keys and non-integer seeds.
Samples stay inside the panel.
