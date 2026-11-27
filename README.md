# Andrei Bautin portfolio

Public portfolio: https://andreibautin.github.io/ — no login required.

An extruded particle name shares a scene with a planet, folded ribbon, and
jellyfish. The same dots transform between all four forms. Pointer movement
disturbs the field; clicking sends an expanding wave. Live demos, resume,
experience and contact remain direct controls. No account or backend.

Experience, Resume, Projects and Contact are separate views of this same stage,
in that order. Experience opens first. An optional nine-second first-session
tour showcases professional work and personal projects, then lands on Experience.
It respects reduced motion and data saving, with Skip and Replay controls.
See [section navigation](docs/SECTIONS.md).

## Run it

Double-click `start-app.bat` (Node.js 20 or newer). It starts the preview,
waits until http://127.0.0.1:4357 serves this portfolio, and opens that
address once. `start-app.bat --no-browser` does the same without a browser
or a pause, for an operator that will refresh the page itself. Details are
in [startup](docs/STARTUP.md). `npm run dev` still serves the same port.
`npm run verify` is the gate; after cloning, run
`git config core.hooksPath .githooks` so it also gates every push. The
launcher does not change that Git setting.

## The idea

There is no build: `dist/` is the source, published to GitHub Pages as-is.
What a build would normally guarantee, `verify` pins instead — every
generated file (stamped links, the Three.js subset, the logo module, the
font subset) is checked against its generator, so a stale one fails the push
rather than reaching the site.

More: [architecture](docs/ARCHITECTURE.md), [testing](docs/TESTING.md),
[security](SECURITY.md).

## Presentation

One scene, four forms. TERRA | Procedural Planet Explorer; NACRE | Liquid
Sculpture Studio; PELAGIC | Interactive Ocean Life. The particle forms are
purpose-built previews, not embedded copies of the applications. Actual
project captures and engineering details appear under How it works.

The scene uses shader animation and analytic pointer forces, not a physical
fluid solver. Reduced motion keeps a still with instant scene changes. If
WebGL is unavailable, the HTML identity and project controls remain usable.
