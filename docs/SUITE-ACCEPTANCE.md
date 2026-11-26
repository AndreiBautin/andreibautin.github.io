# Five-app acceptance queue

## Resumed priority: November 26

The user explicitly prioritized the portfolio and standalone demo apps over the
game. Codex owns the portfolio's short-viewport and navigation corrections;
Claude's PELAGIC audio, pointer, keyboard/panel and capture changes and Grok's
NACRE float32, pointer, shortcut/fullscreen and GPU-failure changes are reviewed
and integrated into their original source apps. Each demo worker uses its own
isolated checkout and real native CLI. THAUMARA queues remain stopped and their
completed work preserved. The active demo coordinator and receipts live under
the November 26 suite-demo-workers control directory outside Git.

Current local evidence: the portfolio passes 21 check groups and their tests plus
the HTTP smoke check; TERRA passes its full gate with 357 tests in 71 files.
PELAGIC main `f4e34b9` passes its full gate with 69 tests in eight files. NACRE
main `0caa597` passes its full gate with 157 tests in fifteen files, including
native D3D12 GPU readback. These are integration commits, rather than worker-only
results. Existing local Vite servers use these original app folders. Browser appearance,
actual audio and downloaded-file acceptance remain outstanding for the parent
operator. Preserve the source demos before resuming their game intake.

User direction, November 25: keep working across the portfolio, TERRA, NACRE,
PELAGIC and THAUMARA with three real native provider CLIs, using existing account
allowances only. No token purchases, billing/auth changes or public publication.
Actual quota/auth failures stop that provider and preserve its work. Finished
useful tasks advance to a concrete remaining requirement, not token-burning work.

## Current portfolio composition

November 26 experience refinement: retrieval has layered document stacks,
a nucleus and orbit traces; replication has a capped source and four ribbed
channels; payments has a double-depth annulus, teeth, inset ring and output.
Scene-specific GPU motion adds inward retrieval pulses, advancing replication
packets, rolling channels, a payment sweep and output packets, with depth shade
and eased motion handoffs. Adaptive prefixes preserve all structural bins.
The source gate and 91 tests pass; browser animation quality remains a native
acceptance item. See EXPERIENCE-QUALITY.md and EXPERIENCE-MOTION.md.

The original fullscreen particle application is the presentation to extend.
There is one particle stage, with direct links and a dialog fallback. No scrolling
marketing, experience or career chapters are added. An interruptible optional
4.8-second introduction cycles actual project captures and the existing forms.
It skips reduced motion, data saving and explicit destinations. Replay is an
explicit control, not a blocking loader. Navigation cancels it synchronously.

Professional work uses five additional particle targets in the same scene:
knowledge retrieval, asynchronous replication, payment automation, career, and
contact. A compact HUD supplies facts and controls while leaving most of the
scene visible. Each has a distinct composition; the approved PDF and contact
destinations remain directly available. Existing project forms remain intact.

## Concrete acceptance and known gaps

| App | Required acceptance | Known state at intake |
| --- | --- | --- |
| Portfolio | First-session intro; three distinct professional scenes; career/resume and contact in the existing fullscreen interaction model; keyboard/mobile/reduced-motion fallback | Intro, five targets and compact mode controls integrated; source/state tests green; native visual acceptance blocked by browser URL confidence check |
| TERRA | Preserve seeded planet generation, flight/drop, surface/water/weather, tuning and existing saved/shareable state; validate current workflows before changes | Original source unchanged; fresh full gate passed 357 tests in 71 files; native acceptance pending |
| NACRE | Preserve editable sculpture/archive; finish ten distinct functional material scenes with real simulation, pause/reset and bounded input; verify actual GPU output | Original main includes float32 archive boundary, pointer ownership, single-shot shortcuts, live fullscreen state and disabled simulation controls after GPU failure; full gate passed 157 tests; native touch/visual/device-loss acceptance pending |
| PELAGIC | Preserve immediate jellyfish and optional living aquarium; validate feeding, schooling, obstacles, capture and visible controls | Original main includes lifecycle-safe optional audio, pointer ownership, keyboard/panel focus and honest capture feedback; full gate passed 69 tests; native appearance, audio, touch and downloaded-file acceptance pending |
| THAUMARA | Minimal readable entry, real planet/flight presentation and versioned source adapters, persistent building/matter/spells/loadouts/counterable encounter; no duplicate resources or reset worlds | Sandbox loop has prior tests; source snapshots are not completed engine ports; capability gaps remain in its SOURCE-INTEGRATION.md |

Each app must pass its own full verification gate after relevant changes. Local
native browser checks establish presentation and controls; unit tests and receipts
alone do not. THAUMARA stays private. No perfection or completed full-game claim
is inferred from a foundation, source snapshot or single visual.

## Local review of the integrated milestone

- Portfolio: `http://127.0.0.1:4357/`. Keep the original particle stage; check
  intro cancellation, the three professional scenes, career/contact, a short
  viewport, reduced motion and modified Resume clicks.
- NACRE: `http://127.0.0.1:4386/`. Shape a material, use right-drag and a second
  contact without stealing the stroke, hold shortcut keys without repeated
  resets, and enter/exit fullscreen. `?studio=legacy` retains the archive editor.
- PELAGIC: `http://127.0.0.1:4392/`. Keep the immediate jellyfish opening; verify
  click versus drag/pinch, open/close settings and Ocean controls by keyboard,
  explicitly enable sound, and request an image download. The app reports a
  download request, because a browser cannot confirm a saved file.

These URLs are local previews, not publication. HTTP checks establish served
content only. No new native browser, speaker, touch or download acceptance is
claimed by this milestone. The game stays deferred.

## Ownership for the current portfolio milestone

Codex: main, shared markup/UI state, renderer, intro, contracts/gates and review.
Claude: work-ui.js/work-ui.css and owned tests/docs in its isolated worktree.
Grok: pure work-shapes.js and owned tests/docs in its isolated worktree.
Receipts and native launcher status live outside Git under the suite-workers
control directory. No worker edits another checkout or merges/pushes main.
