// Security posture: what the pages allow, what binaries carry, and what
// the workflows run.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PAGES, SHIPPED_JS, CSP_META, REFERRER_META } = require('./shared.cjs');

module.exports = [
  // The pages keep to what their policy allows, so it never has to loosen:
  // same-origin scripts only, no inline code or styles.
  ['content security policy', (c) => {
    for (const page of PAGES) {
      const text = c.read('dist/' + page);
      assert(text.includes(CSP_META), `${page}: Content-Security-Policy missing or changed`);
      assert(text.includes(REFERRER_META), `${page}: referrer policy missing or changed`);
      assert(!/http:\/\//.test(text), `${page}: http:// URL`);
      for (const [tag] of text.matchAll(/<script\b[^>]*>/g)) assert(/\bsrc="(\.\/|\/)(?!\/)/.test(tag), `${page}: inline or external script ${tag}`);
      assert(!/<style\b|\sstyle="|\son[a-z]+=/i.test(text), `${page}: inline style or event handler`);
      for (const [tag] of text.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert(/rel="[^"]*noopener/.test(tag), `${page}: target=_blank without rel=noopener`);
    }
    // Trusted Types would refuse these at runtime; failing here makes it a
    // build error rather than a silently missing piece of the page.
    for (const file of SHIPPED_JS) assert(!/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(c.read('dist/' + file)), `${file}: string-to-code or string-to-HTML call`);
  }],
  // XMP packets and local paths are where usernames and machine names leak from.
  ['binary metadata', (c) => {
    for (const dir of ['dist', 'dist/images', 'dist/fonts']) for (const name of fs.readdirSync(path.join(c.root, dir)).filter((f) => /\.(pdf|jpe?g|png|webp|woff2)$/.test(f))) {
      assert(!/<x:xmpmeta|[A-Za-z]:\\\\?Users\\|\/Users\/|\/home\//.test(c.bytes(`${dir}/${name}`).toString('latin1')), `${dir}/${name} carries metadata or a local path; strip it`);
    }
  }],
  // The deploy job holds pages: write; a tag moved on an action would run with it.
  ['pinned actions', (c) => {
    for (const workflow of fs.readdirSync(path.join(c.root, '.github/workflows'))) for (const [, ref] of c.read(`.github/workflows/${workflow}`).matchAll(/uses: *(\S+)/g)) assert(/@[0-9a-f]{40}$/.test(ref), `${workflow}: ${ref} must be pinned to a commit SHA`);
  }],
];
