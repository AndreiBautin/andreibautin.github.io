// The checks `npm run verify` runs, as named groups over a repository root,
// one file per area under scripts/checks/. Taking the root as a parameter is
// what lets scripts/verify.test.cjs plant a defect in a copy and prove each
// group fails on it: a check that cannot fail is how the Three.js subset
// check once passed while matching nothing.
const path = require('node:path');
const shared = require('./checks/shared.cjs');

const checks = [
  ...require('./checks/repo.cjs'),
  ...require('./checks/content.cjs'),
  ...require('./checks/assets.cjs'),
  ...require('./checks/policy.cjs'),
];

// Runs every group rather than stopping at the first, so one push shows
// every problem. Returns [{ name, error }] for the groups that failed.
function run(root) {
  const c = shared.context(path.resolve(root));
  return checks.map(([name, check]) => { try { check(c); return { name }; } catch (error) { return { name, error }; } });
}

const { PORT, TYPES, CSP_META, REFERRER_META, hashOf, STAMPED } = shared;
module.exports = { run, names: checks.map(([name]) => name), PORT, TYPES, CSP_META, REFERRER_META, hashOf, STAMPED };
