# Andrei Bautin portfolio

Public portfolio: https://andreibautin.github.io/ — no login required.

A full-screen GPU particle field forms my name, then transforms into a planet,
sculpture knot, or jellyfish when a project is selected. Pointer movement
disturbs the field; clicking sends an expanding wave. Live demos, resume,
experience and contact remain direct controls. No account or backend.

## Run it

Double-click `start-app.bat` (Node.js required), or `npm run dev`, then open
http://127.0.0.1:4357. `npm run verify` is the gate; after cloning, run
`git config core.hooksPath .githooks` so it also gates every push.

## The idea

There is no build: `dist/` is the source, published to GitHub Pages as-is.
What a build would normally guarantee, `verify` pins instead — every
generated file (stamped links, the Three.js subset, the logo module, the
font subset) is checked against its generator, so a stale one fails the push
rather than reaching the site.

More: [architecture](docs/ARCHITECTURE.md), [testing](docs/TESTING.md),
[security](SECURITY.md).

## Presentation

One scene, four forms. TERRA | Procedural Planet Explorer; CONSTRUCT | Liquid
Sculpture Studio; PELAGIC | Interactive Ocean Life. The particle forms are
purpose-built previews, not embedded copies of the applications. Actual
project captures and engineering details appear under How it works.

The scene uses shader animation and analytic pointer forces, not a physical
fluid solver. Reduced motion keeps a still with instant scene changes. If
WebGL is unavailable, the HTML identity and project controls remain usable.
