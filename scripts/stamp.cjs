// Stamps the stylesheet and script links in dist/index.html with a short
// hash of each file's content, so a changed file is never served from a
// browser's cache under the old name. Run before committing a change to
// styles.css or script.js; verify refuses a stamp that does not match.
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const dist = path.resolve(__dirname, '..', 'dist');
const hashOf = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, file))).digest('hex').slice(0, 10);
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const file of ['styles.css', 'script.js']) {
  const stamped = `./${file}?v=${hashOf(file)}`;
  const start = html.indexOf(`./${file}`);
  if (start < 0) throw new Error(`no link to ${file}`);
  const end = html.indexOf('"', start);
  html = html.slice(0, start) + stamped + html.slice(end);
}
fs.writeFileSync(path.join(dist, 'index.html'), html);
console.log('stamped', ['styles.css', 'script.js'].map((f) => `${f}?v=${hashOf(f)}`).join(' '));
