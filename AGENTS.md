# Portfolio decisions

- Read CLAUDE.md and docs/ARCHITECTURE.md before editing.
- Preserve the immersive single-screen particle application. Extend its scene,
  navigation and click-open panels; do not append a scrolling marketing or resume
  homepage. The user explicitly rejected that composition on November 25, 2026.
- The restored presentation is commit 60bd42e. Rejected story work is preserved
  on preserve/scroll-story-20261125; do not reintroduce its layout by assumption.
- Intro, professional work, resume and contact enhancements must fit the existing
  interaction model. Review their composition before implementing a replacement.
- Keep direct project/contact links, keyboard access, reduced motion, renderer
  fallback and the approved resume PDF bytes. Facts must come from the resume.
- dist/ is source; no application build or domain layer. No dependencies,
  inline script/style, innerHTML or eval. Port 4357 is pinned.
- Run npm run stamp and npm run verify before committing. Do not push or publish
  during a local design correction; publication requires its own authorization.
- The approved opening is a calm welcome: one renderer-only name formation,
  then ambient interaction. Never cycle sections or auto-land on Resume after
  loading. Resume, Experience, Projects and Contact change only on selection.
- Home choices preview their context on focus/hover without routing. Project
  details stay in the stage and remain open across project changes. No modal
  focus traps, including the professional fallback; text stays upright while
  particle models support explicit drag and keyboard-accessible turn controls.
- Home uses the same thin-rule scene-picker as Projects and Experience. Keep
  captions unboxed and resume milestones compact; models are the visual focus.
- All particle models, including the Home name, support right-drag and wheel
  inspection. Home hides duplicate header section links; retain AB and theme,
  and the bottom section choices. Other sections keep the header and Contact.
- Avoid persistent interaction instructions and footer contact shortcuts. Model
  controls reveal only on keyboard focus; right-drag and wheel remain active.
