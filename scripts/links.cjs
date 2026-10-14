// Lists every outbound link on the published pages and flags any that no
// longer answer. A link to a deleted service is worse than a broken link:
// a subdomain like *.onrender.com can be claimed by whoever registers it
// next, and the portfolio would then send visitors to their page.
// Needs network, so it is not part of verify: npm run links
const fs = require('node:fs');
const html = ['dist/index.html', 'dist/404.html'].map((f) => fs.readFileSync(f, 'utf8')).join('');
const urls = [...new Set([...html.matchAll(/href="(https:\/\/[^"]+)"/g)].map((m) => m[1]))];

(async () => {
  let failed = 0;
  for (const url of urls) {
    let status;
    try {
      // LinkedIn answers bots with 999; anything it returns still proves the
      // name resolves to LinkedIn, so only a network failure counts there.
      status = (await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) })).status;
    } catch (error) { status = error.cause?.code || error.name; }
    const ok = status === 200 || (url.includes('linkedin.com') && typeof status === 'number');
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${status} ${url}`);
  }
  if (failed) { console.error(`${failed} outbound link(s) need a look`); process.exitCode = 1; }
})();
