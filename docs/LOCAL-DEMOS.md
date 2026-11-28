# Local demo links

Each demo now supplies its own same-tab Portfolio return link: TERRA to `#terra`,
NACRE (playground and archive) to `#nacre`, and PELAGIC to `#pelagic`.
It restores that project's portfolio scene instead of the welcome name.
The app uses the local portfolio only from its exact pinned HTTP loopback
origin; hosted/direct visits use the public portfolio URL. Browser fullscreen
is retained by same-tab navigation; element fullscreen follows browser rules.
No publishing is performed by these local source changes.

On the local portfolio, the TERRA, NACRE and PELAGIC links open the local
development servers of those apps, so a source fix in a local checkout can be
reached from the local portfolio. The published site is unchanged.

## When it applies

Only when the page origin is exactly `http://127.0.0.1:4357` or
`http://localhost:4357`: protocol `http:`, port `4357`, hostname exactly
`127.0.0.1` or `localhost`. `onLocalPortfolio` in `dist/script.js` decides this
once, at load, from `location` alone. HTTPS, any other port, any other host
(lookalikes such as `localhost.example.test`, `127.0.0.1.nip.io`, `127.0.0.2`,
`[::1]`) and an unreadable or malformed `location` all count as not local. The
same test gates the local preview refresh (docs/LOCAL-PREVIEW.md).

## What changes

| Project | Published URL (kept everywhere else) | Local URL (pinned port) |
| --- | --- | --- |
| TERRA | `https://andreibautin.github.io/planet-generator/` | `http://127.0.0.1:5185/` |
| NACRE | `https://liquid-sculpture-studio.andreibautin94.chatgpt.site/` | `http://127.0.0.1:4386/` |
| PELAGIC | `https://pelagic.andreibautin94.chatgpt.site/` | `http://127.0.0.1:4392/` |

- The scene launch link (`Open TERRA`, `Open NACRE`, `Open PELAGIC`) and the
  matching `Open ...` link in the "How it works" dialog. A detail link is
  rewritten only when its `href` is exactly one of the published URLs above.
- Nothing else: the resume PDF, email, LinkedIn and GitHub links, the three
  `Source` links (TERRA: `https://github.com/AndreiBautin/planet-generator`,
  NACRE: `https://github.com/AndreiBautin/nacre`,
  PELAGIC: `https://github.com/AndreiBautin/pelagic`), all labels
  and facts are untouched. `index.html` still ships only the published URLs, as
  does its `<noscript>` list, which never runs script.
- Hosting metadata (`.openai/hosting.json`, Open Graph URLs) is not changed.
- No request, probe or app-state preflight is made to pick a link, and nothing
  navigates on its own. The page does not claim a local server is available or
  offline; if one is not running, the browser simply fails to open that link.

## Who runs what

The portfolio does not start the demo servers. The root operator starts each
app from its own source checkout on its pinned port (TERRA from the
`AndreiBautin/planet-generator` source, NACRE and PELAGIC from their own
repositories) and performs native browser acceptance of the opened apps; see
docs/SUITE-ACCEPTANCE.md. The ports above are pinned in `dist/script.js` and in
`scripts/local-links.test.cjs`; change both together.

## Tests

`scripts/local-links.test.cjs` runs the shipped `dist/script.js` against the
project-details links parsed from the shipped `index.html`, with an injected
`location`, clicking the real scene buttons. It checks the published origin
keeps every link byte for byte with no attribute writes or requests, both local
origins route exactly the three demo links while facts, the resume and the
`Source` link stay put, and lookalike, other-port and malformed locations keep
the published links and never assign, replace, reload or set `location`.


## Native review window

The local review default is browser fullscreen with one existing tab per demo
and one portfolio tab. Reuse those tabs for before/after views and restore
fullscreen after addressing a URL. Same-tab project/return links retain browser
fullscreen; the website does not claim it can force browser fullscreen on page
load without a user action. Operators must verify the final native window state.
Thaumara is no longer in the active demo set: its tab and port 4398 server were
closed, and its private worker control has a STOP guard. Do not recreate the
user's deleted Notion Projects structure to track this work.
