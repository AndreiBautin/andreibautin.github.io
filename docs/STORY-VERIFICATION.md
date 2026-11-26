# Portfolio story integration evidence

The approved implementation uses real isolated native CLI workers, with the
integration root composing their modules into the existing static site:

| Provider | Verified source commit | Responsibility |
| --- | --- | --- |
| Codex intro worker | fb248c6d3e56eeb64998fb6083d1198c4df8c77b | First-session intro, image/scene timing, policy and interruption |
| Claude | c74b040041e9473ecc3d269fbe96e1ee51ad4b83 | Career timeline, contact states and clipboard handling |
| Grok | 695fea6dbd1428aab73156933fe4c55af28fa2ee | Three seeded Canvas2D experience illustrations |

Each provider handoff passed its full gate and an independent supervisor check.
The final integration reruns the full gate with the real HTML contracts and all
three modules, plus module-version/asset smoke checks. Twenty planted check groups
are exercised by their defects. State/fixture tests cover deterministic geometry,
bounds, pointer recovery, invalid input, exact intro timing, interruption, late
graphics readiness, session/motion/data policies, clipboard races and disposal.

Integration preserves the approved resume PDF bytes, existing project launches,
profile/contact destinations, security policy, fonts and port 4357. It adds the
scrolling case-study HTML, capability-specific styling, progressive controls,
offscreen hero suspension, dependency-first asset versions and lifecycle cleanup.
The intro uses existing actual project captures; illustrations are abstract
explanations, not real client systems, metrics or private screenshots.

The first Grok pass was stopped after twenty minutes of reads with no source
changes; its history was preserved. The second delivered the committed module.
A continuation independently rechecked that same commit; there is one integrated
Grok implementation, not a duplicate implementation or replayed patch.

## Browser acceptance still required

The local HTTP smoke check passes at http://127.0.0.1:4357, including every
stylesheet, capture, module and versioned import. The connected browser access
host is unavailable. The current native Chrome window still displays the old
public portfolio, so a prerequisite request asks the user to open the local
preview for direct visual checks. No screenshot, GPU appearance, mobile behavior,
screen-reader behavior or native clipboard permission result is invented from
CPU/fixture tests.

After the preview is open, inspect first-visit/replay/skip, interrupt with project
selection and scrolling, check all three illustrations and replay, inspect career
keyboard/disclosure behavior, direct resume download, contact focus/copy and both
themes. Also review reduced motion and a narrow viewport. No public push/deploy
has been performed in this implementation run. The preview server is left running
for review. Long-run PushNotification is not exposed by the current tool session.
