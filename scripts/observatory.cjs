// Scans the live site with Mozilla's HTTP Observatory and fails below the
// score it had when the security policy shipped. Catches a lost CSP or
// referrer policy between deploys. B (75) is the ceiling on Pages: the rest
// needs headers Pages cannot send (docs/SECURITY_BACKLOG.md).
const host = process.argv[2] || 'andreibautin.github.io';
const floor = 75;
(async () => {
  const response = await fetch(`https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${encodeURIComponent(host)}`, { method: 'POST', signal: AbortSignal.timeout(60_000) });
  const result = await response.json();
  if (!response.ok || result.error) { console.error(`observatory scan failed: ${result.error || response.status}`); process.exitCode = 1; return; }
  console.log(`observatory: ${host} grade ${result.grade}, score ${result.score} (floor ${floor})`);
  if (result.score < floor) { console.error(`score fell below ${floor}: ${result.details_url}`); process.exitCode = 1; }
})();
