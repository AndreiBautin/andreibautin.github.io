# Portfolio story contracts

Approved flow: short optional intro -> interactive project hero -> three
professional-impact chapters -> career/resume -> contact. Static HTML is useful
with JS/GPU unavailable. Dark/light themes inherit existing CSS variables.

## Experience (Grok)

dist/experience-effects.js exports mountExperienceEffects(root = document).
It returns { dispose() }. It may export pure deterministic helpers for tests.
For each [data-experience] article, find its canvas[data-experience-canvas].
Keys: knowledge, replication, payments. Each canvas has CSS width/height in its
parent .experience-visual. The module owns backing-store DPR sizing only, not
style attributes. Draw via Canvas2D or the existing vendored subset, with no
dependencies, requests or APIs. Simulations receive frame time and seeded
identity; no ambient randomness. Bound points/count/steps and reject bad input.

- knowledge: scattered documents organize around a question, connected source
  nodes return to an answer. Pointer/click can guide/replay the flow.
- replication: a serialized queue resolves into parallel lanes; pointer/click
  disturbs flow and shows recovery. Illustrative, no fabricated throughput.
- payments: tangled manual routes resolve into an automated path; HTML carries
  the approved more-than-11-hours-per-day outcome, not a made-up new metric.

Optional per-article button[data-experience-replay] replays its illustration.
Keep animation local, pausing when hidden/offscreen, no scroll trapping. Reduced
motion draws a static final composition; preference changes apply live. Do not
edit shared HTML/JS/style/config. experience.css owns effect presentation only;
base layout lives in story.css. Tests use node:test, as the current gate does.

## Career/contact (Claude)

dist/career.js exports mountCareer(root = document), returning { dispose() }.
It enhances section#career and section#contact with readable milestones and
connected destinations. Markup:

- #career .career-shell, .career-path, button[data-career-step] with aria-expanded
  and aria-controls pointing to [data-career-detail] panels. Keys education,
  engineer, senior, credentials. Hidden details remain reachable via buttons.
- #stack-strip remains a technology icon target populated by the hero.
- #contact .contact-orbit with .contact-node[data-contact-node] direct links for
  email, linkedin, github. Email is visible/selectable, no contact form/server.
- #copy-email button and #copy-status live region. career.js owns copy behavior;
  handle clipboard denial with the selectable-address fallback, no fake success.

The visual career path is a CSS/SVG constellation/timeline. Contacts send a
subtle pulse along connections on hover and keyboard focus. No inline style,
external dependencies, fake messages, new claims, PDF generation, shared edits,
scroll hijacking, account prompts or analytics. Reduced motion preserves clear
static lines/nodes; dark/light and narrow screens remain readable.

Facts: 3Cloud, a Cognizant Company, formerly Brainspire Solutions. Software
Engineer June 2019-September 2024, Senior Software Engineer September 2024-present.
Colorado State University B.S. Applied Computing Technology, May 2019.
Azure Fundamentals AZ-900 and AI Fundamentals AI-900. Mentored/onboarded 5+
engineers. Approved PDF stays byte-identical. Contact addresses stay unchanged.

Codex owns final markup, intro, stamps, integration and native browser QA. Workers
report exact exports, behavior, checks and limitations in their owned docs.
