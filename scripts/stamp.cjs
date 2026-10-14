// Stamps the stylesheet and script links in dist/index.html with a short
// hash of each file's content, so a changed file is never served from a
// browser's cache under the old name. Run before committing a change to
// styles.css, script.js or hero.js; verify refuses a stamp that does not match.
const fs = require('node:fs');
const path = require('node:path');
const { hashOf, STAMPED } = require('./checks.cjs');
function stamp(dist) {
  let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const stamps = STAMPED.map((file) => `./${file}?v=${hashOf(fs.readFileSync(path.join(dist, file)))}`);
  STAMPED.forEach((file, i) => {
    const start = html.indexOf(`./${file}`);
    if (start < 0) throw new Error(`no link to ${file}`);
    html = html.slice(0, start) + stamps[i] + html.slice(html.indexOf('"', start));
  });
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  return stamps;
}
module.exports = { stamp };
if (require.main === module) console.log('stamped', stamp(path.resolve(__dirname, '..', 'dist')).join(' '));
