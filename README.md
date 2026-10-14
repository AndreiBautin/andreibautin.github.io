# Andrei Bautin portfolio

Public portfolio: https://andreibautin.github.io/ — no login required.

## Run it

Double-click `start-app.bat` (Node.js required), or `npm run dev`, then open
http://127.0.0.1:4317. `npm run verify` is the gate; after cloning, run
`git config core.hooksPath .githooks` so it also gates every push.

## The idea

There is no build: `dist/` is the source, published to GitHub Pages as-is.
What a build would normally guarantee, `verify` pins instead — every
generated file (stamped links, the Three.js subset, the logo module, the
font subset) is checked against its generator, so a stale one fails the push
rather than reaching the site.

More: [architecture](docs/ARCHITECTURE.md), [testing](docs/TESTING.md),
[security](SECURITY.md).
