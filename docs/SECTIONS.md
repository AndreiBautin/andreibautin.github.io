# Sections

The page is one fullscreen particle stage. A clean URL holds the welcome name
and its four choices; no section is selected automatically. The section order is
Resume, Experience, Projects and Contact, with number keys 1-4 in the same order.
Interior sections show a compact subheader directly above their content. Its
back arrow returns to the name; four links switch sections without that detour.

| Section | Enhanced view | Fallback |
| --- | --- | --- |
| Resume | Career and credentials, mode career, with approved PDF link | Native PDF anchor |
| Experience | Knowledge assistant, replication and payments tabs | Nonmodal About/experience panel |
| Projects | Last selected demo, or TERRA initially; focuses project picker | Direct project links and noscript list |
| Contact | Email, copy, LinkedIn, GitHub and PDF | Nonmodal About panel, scrolled to contact |

## Welcome actions

Explore my background uses the same career mode as Resume once the professional
UI is ready. Its href always remains the approved PDF, so modified clicks and
missing enhancement retain native navigation. Explore projects selects a demo
and focuses the picker. Explore experience opens knowledge mode, retaining a
nonmodal panel fallback. Contact opens its own stage or nonmodal fallback. All
four choices and the subheader work without graphics.
See [Welcome](WELCOME.md) for the bounded particle entrance and fallback details.

## State and routes

`dist/script.js` owns scene and section state. `portfolio:mode` requests a
professional view; valid modes map to renderer targets 4-8. `markSection` sets
body data-section and aria-current=location on the selected subheader control.
`placeNavigation` moves the shared node to the current copy, professional host
or open inspector, avoiding duplicate controls and listeners.
The welcome has no selected header item. Late module or graphics readiness
restores explicit destinations without replacing a visitor's selection.

Accepted routes: #resume/#career/#work-career, #experience/#work-knowledge,
#work-replication, #work-payments, #contact/#work-contact, #projects, #terra,
#nacre/#construct, #pelagic and #top. Explicit professional destinations start
on their requested target. Selecting another section changes the hash; selecting
Home clears it. No timer changes the scene, URL, section or focus.

Only Experience shows the three professional tabs, with ArrowLeft/ArrowRight,
Home and End for roving focus. Resume and Contact are named regions, not extra
Experience tabs. Each professional piece keeps Problem/My contribution/Outcome;
Resume keeps its career milestones and PDF; Contact keeps clipboard feedback.
Home returns to the welcome and focuses its Resume choice. Escape returns to the
previously selected project (TERRA initially). Manual transitions
retain the existing 1.45-second morph, or an immediate settled form with reduced
motion. Focus follows explicit navigation, not idle time.

Project launch/detail links keep their published URLs except on the exact local
portfolio origin, where the existing pinned local demo routing applies. Images
remain inside project details. No timed overview, countdown, Skip or Replay is
shipped. Keyboard Skip to projects remains an ordinary accessibility link.
