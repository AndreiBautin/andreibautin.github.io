# Career and contact presentation

Owner: Claude worker. Files: `dist/career.js`, `dist/career.css`,
`scripts/career.test.cjs`, this doc. Contract: `docs/STORY-CONTRACT.md`.

The timeline, resume link, contact links and email address are complete HTML.
career.js adds disclosure behaviour, selected states, one-shot pulses and the
copy-email button. If it fails to load or throws, the markup is left as it was.

## Export

`mountCareer(root = document)` returns `{ dispose() }`. It is safe on a page
without `#career` or `#contact`, and `dispose()` is idempotent. Pure helpers are
also exported for tests: `validKey`, `initialKey`, `nextIndex`, `emailFromHref`,
`TIMINGS`, `MESSAGES`.

## Selectors career.js reads

| Selector | Use |
|---|---|
| `#career` | timeline section |
| `#career .career-shell` | gets `data-career-ready`, `data-career-motion`, `.is-revealed` |
| `#career .career-path` | gets `data-career-active="<key>"` and `data-career-index="0..3"` |
| `#career button[data-career-step="<key>"]` | toggles; needs `aria-expanded` and `aria-controls` |
| `#<aria-controls>` (or `[data-career-detail="<key>"]` in `#career`) | the panel; `hidden` toggled |
| `.career-step` (closest to the button) | gets `.is-selected` and one-shot `.is-pulsing` |
| `#contact .contact-orbit` | gets `data-contact-ready`, `data-contact-active="<key>"`, `data-contact-motion`, one-shot `.is-signaling` |
| `#contact .contact-orbit .contact-node[data-contact-node="<key>"]` | email, linkedin, github; one-shot `.is-pulsing` |
| `#contact .contact-node[data-contact-node="email"]`, else `#contact a[href^="mailto:"]` | source of the address (its `href`) |
| `#copy-email`, `#copy-status` | copy button and its polite live region |

Keys are lowercase (`/^[a-z][a-z0-9-]{0,31}$/`); bad or duplicate keys, and steps
without a panel, are left untouched. Recommended markup, as in the test fixture:

```html
<section id="career" class="story-section career-section">
  <div class="career-shell"><ol class="career-path">
    <li class="career-step">
      <button data-career-step="education" aria-expanded="false" aria-controls="career-education">...</button>
      <div id="career-education" data-career-detail="education">...</div>
    </li>
    <!-- engineer, senior, credentials -->
  </ol></div>
</section>
<section id="contact" class="story-section contact-finale">
  <a class="email" href="mailto:...">...</a>
  <div class="contact-orbit">
    <a class="contact-node" data-contact-node="email" href="mailto:...">address</a>
    <a class="contact-node" data-contact-node="linkedin" href="https://linkedin.com/in/...">LinkedIn</a>
    <a class="contact-node" data-contact-node="github" href="https://github.com/...">GitHub</a>
  </div>
  <button id="copy-email" type="button">Copy email</button>
  <p id="copy-status" role="status" aria-live="polite"></p>
</section>
```

Leave the detail panels **not** `hidden` in HTML so they read with JS off;
career.js collapses all but one on mount. A button marked `aria-expanded="true"`
opens first; otherwise the first step does. The career CSS hangs the
draw-in on `.career-shell`, so keep that wrapper.

## Behaviour

- **Timeline.** One milestone open at a time; clicking the open one closes it.
  Arrow keys, Home and End move focus between milestone buttons without
  selecting (Enter/Space select, as native buttons). The selected node fills
  with the accent, an accent span runs along the path up to it, and a single
  ring pulses once on selection (not on mount).
- **Reveal.** The first time the shell is 20% in view the hairline draws in.
  Text is never hidden or faded while waiting. Without IntersectionObserver,
  or under reduced motion, it is drawn immediately.
- **Contact.** Hover or keyboard focus on a destination marks it active, rings
  it once and sends one light pulse along the connecting hairline. Links stay
  plain `href`s; nothing intercepts navigation.
- **Copy email.** `navigator.clipboard.writeText(address)`; `aria-busy` while
  pending. Success ("Email address copied to the clipboard.") is announced only
  after the promise resolves, then clears after 4 s. On rejection or a missing
  API, the visible address is selected with the Selection API, outlined, and the
  status says it is selected and to press Ctrl+C or Cmd+C (or to select it when
  selection is unavailable); this clears after 10 s. A late answer from an
  earlier click, or one arriving after `dispose()`, is ignored.
- **Reduced motion.** Read live from `prefers-reduced-motion`; a change applies
  without reload. CSS drops draw-in, rings, pulses and transitions; lines,
  nodes and selected states remain.
- **Dispose.** Removes every listener (including the media query), disconnects
  the observer, clears all timers and restores the original `hidden`,
  `aria-expanded`, attributes and classes.

No `innerHTML`, `eval`, `element.style`, `requestAnimationFrame`, intervals,
network calls or dependencies. No infinite CSS animation. Addresses and links
come from the markup, never from career.js.

## Integration notes for Codex

- `dist/script.js` still binds its own `#copy-email` click handler (lines
  55-60). With both, two writes race and the old handler announces "Email copied"
  without the selection fallback. Remove that handler when wiring career.js.
- The contract test in `scripts/career.test.cjs` is skipped until
  `dist/index.html` carries `section#career`; then it checks every key has a
  button with `aria-expanded`/`aria-controls`, a matching panel, the three
  contact nodes, the mailto address and the copy elements.
- Path progress (`data-career-index`) is drawn for four steps in a four-column
  row on desktop and a vertical line at 800 px and below; other step counts
  still work but the accent span stops matching node centres.
- Contact nodes stack in a column at 560 px and below, where the connecting
  hairline is hidden.

## Limitations

- Tested against a fake DOM fixture, not a browser; native browser QA,
  focus rings, theme contrast and layout at real widths remain for integration.
- The real page markup is not final, so selectors were checked only against
  the fixture.
