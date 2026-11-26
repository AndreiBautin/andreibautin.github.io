# Local preview refresh

An open local preview reloads itself once after a full, passing `npm run verify`,
so a verified change does not need a manual reload. It is a local development
aid only: the published site is unchanged plain static hosting with no polling.

## Protocol

1. **Publish.** `verify.cjs` hashes every file in `dist/` before the gates run
   (`bundleToken` in `scripts/preview.cjs`: SHA-256 over sorted path, length and
   bytes, first 16 hex digits). Only after every check group and every test has
   passed does it hash `dist/` again. If the two agree, it writes the token to a
   per-checkout file outside the repository,
   `<os temp>/andrei-portfolio-preview/<checkout hash>.token`, by writing a
   temporary file and renaming it. Any failing group or test exits before this
   step, so a failed gate never publishes. An edit made while verify ran changes
   the second hash, so nothing is published for bytes the gates did not judge.
   The same bytes always give the same token. Publishing problems are reported
   but never change verify's result.
2. **Expose.** `serve.cjs` answers exactly `GET`/`HEAD /__preview/token`, and only
   when the client address is loopback and the `Host` header is
   `127.0.0.1:<port>` or `localhost:<port>` for the port it is listening on.
   It answers `200` with the bare 16-hex token, `204` when no valid token
   exists, and `404` for any other host. Before returning a token, it also hashes
   the current bundle: subsequent unverified edits suppress the token with `204`
   until the bytes match a verified bundle again. This closes the gap between
   publishing a token and a tab's next poll. The body is never anything but a token
   matching `^[0-9a-f]{16}$`: no paths, logs, timestamps or user data. Responses
   carry `Cache-Control: no-store` and the normal CSP. HTML and every other file
   are served byte for byte as before; nothing is injected into a page.
3. **Poll.** `dist/script.js` returns immediately unless the page origin is
   exactly `http://127.0.0.1:4357` or `http://localhost:4357`. Every other
   origin, the published site included, creates no timer, listener or request.
   On the local origin it owns one `setTimeout` chain and one
   `visibilitychange` listener. It requests the token same-origin with
   `cache: 'no-store'` and `credentials: 'omit'`, allowed by `connect-src 'self'`.
   - The first answer is the baseline (a token, or none for `204`).
   - The same token again: nothing happens.
   - A different valid token: `location.reload()`, once; polling stops.
     The reloaded page takes that token as its own baseline, so there is no loop.
   - Network errors, other statuses or malformed bodies change nothing; the
     interval doubles from 2 s up to 30 s and returns to 2 s after a good answer.
   - While the tab is hidden the timer is cleared and no request is made;
     becoming visible polls once and resumes.

## Limits

- Only verify publishes. `npm run stamp`, saving a file, or a failed verify
  does not reload the page; the browser keeps showing the last verified bundle.
- A page that bootstraps while the server is down takes its first successful
  answer as its baseline, so a verify that finished during that outage is not
  reloaded for. Reload manually once, or run verify again after another change.
- Unchanged `dist/` gives an unchanged token. A commit that changes nothing in
  `dist/` does not reload the page.
- The token is per checkout (keyed by its absolute path). A server started from
  another worktree reads that worktree's token. `PORTFOLIO_PREVIEW_TOKEN_FILE`
  overrides the location; the tests use it to run verify against a temporary copy.
- CI also writes this file in its own temp directory when verify passes; it is
  inert there.
- It never runs scripts, verify or anything else on the browser's behalf; the
  server exposes a read-only scalar. It binds `127.0.0.1` on port 4357 as before.
- `scripts/preview.test.cjs` covers the token, the failed-gate path, the real
  local endpoint and the shipped poll against injected fetch, timers and
  visibility. Native browser behavior still needs its own acceptance.
