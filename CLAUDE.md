# CLAUDE.md

Static portfolio; `dist/` is the published source. See docs/ARCHITECTURE.md.

## What will bite

- **Edited `styles.css`, `script.js` or `hero.js`? Run `npm run stamp`.**
  verify refuses a stale `?v=` hash.
- **No inline script, style, `style=""` or `on*=` handlers** in the pages,
  and no `innerHTML`/`insertAdjacentHTML`/`eval` in shipped JS. The CSP and
  Trusted Types would block them at runtime; verify blocks them first. Use
  classes and `textContent`.
- **A new character on a page** (arrow, accent, symbol) must be added to
  `UNICODES` in `scripts/subset_fonts.py` and the fonts rebuilt.
- **A new `THREE.*` name in `hero.js`** must be added to `EXPORTS` in
  `scripts/build_three.cjs` and the vendor file rebuilt.
- **A new logo** goes in `assets/tech/`, then `node scripts/build_marks.cjs`.
- **Facts must be in the resume.** No invented metrics, clients or dates.
  The published PDF is copied in unchanged, never generated.
- **Workflow actions are pinned to 40-hex SHAs** with a version comment.
- **If a PDF changes**, check text extraction with pypdf and render it to
  inspect clipping, spacing and links; verify only checks it is a PDF.
- `.openai/hosting.json` is the original Sites hosting metadata, kept for
  the backup site; verify checks it still points at `dist`.
- **Write backslash-heavy code with an editor, not through a shell heredoc
  or an inline script.** Each layer re-reads escapes: `\b` has twice
  arrived as a backspace byte and `\w` as `w`. verify now fails on both
  (`text formatting`, `regex escapes`), but only after the fact.

## Where new code goes

- A new verify check: a named group in the matching `scripts/checks/` area
  file (repo, content, assets, policy) **and** its
  planted defect in `scripts/verify.test.cjs` (the test fails without one).
- Network checks (live site, outbound links) stay out of verify: they go in
  `scripts/` and a workflow.
- The dev port is `PORT` in `scripts/checks/shared.cjs`; verify checks the README
  matches.
