# Portfolio integration decisions

- Read CLAUDE.md and docs/ARCHITECTURE.md. This is an existing static site;
  dist/ is published source, with no application build or domain layer.
- User approved an interruptible first-session image/particle introduction,
  three scrolling professional experience effects, career timeline and contact
  presentation. Preserve real project links and the approved resume PDF bytes.
- Facts come from the approved PDF/existing factual content. No invented client
  names, before/after timings, throughput metrics or testimonials. Effects are
  illustrative diagrams, not live client systems or benchmarks.
- Codex owns integration/main, dist/index.html, styles.css, script.js, hero.js,
  story.js, story.css, intro.js, intro-state.js, shared checks/config and docs.
- Grok owns dist/experience-effects.js, dist/experience.css,
  scripts/experience-effects.test.cjs and docs/EXPERIENCE-EFFECTS.md only.
- Claude owns dist/career.js, dist/career.css, scripts/career.test.cjs and
  docs/CAREER.md only. Shared markup contracts: docs/STORY-CONTRACT.md.
- Workers use isolated branches, inspect status first, never merge/push or edit
  another worktree. No subagents, paid API calls, GUI driving or credential edits.
  Stop on real quota/auth errors and preserve partial work.
- No inline scripts/styles/handlers, innerHTML or eval. Use textContent/classes.
  Respect reduced motion, data saving and hidden/offscreen suspension. Do not
  hide useful HTML until a renderer or animation finishes.
- Run npm run stamp and npm run verify before a handoff/commit. Workers must not
  edit shared stamp files; their owned modules are versioned during integration.
- New scroll visuals must not leave the hero's animation running offscreen.
  Contact and resume links remain direct, keyboard accessible and selectable.
- Do not publish/push during the design implementation run. Prepare and verify
  a local reviewable result; publication is a separate final action.
