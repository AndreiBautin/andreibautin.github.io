// What the pages say and link to.
const path = require('node:path');
const assert = require('node:assert/strict');
const { PAGES, SHIPPED_JS, walk } = require('./shared.cjs');

const RESUME_FACTS = ['3Cloud', 'September 2024', 'June 2019', '11 hours', '5+ engineers', 'AZ-900', 'AI-900', 'Colorado State University'];

module.exports = [
  ['resume facts', (c) => {
    const html = c.read('dist/index.html');
    assert(!/hello@example|Electron|01\.4 TB|0\.98|evidence matching/.test(html), 'index.html carries a placeholder or retired claim');
    for (const text of RESUME_FACTS) assert(html.includes(text), `index.html lacks resume fact "${text}"`);
  }],
  // Both pages. index.html links relative (./), 404.html root-absolute (/),
  // because Pages serves it at whatever path was missing.
  ['links', (c) => {
    for (const page of PAGES) {
      const html = c.read('dist/' + page);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(ids.length, new Set(ids).size, `${page} has duplicate ids`);
      for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (href.startsWith('#')) assert(ids.includes(href.slice(1)), `${page}: ${href}: no element with that id`);
        const local = href.match(/^\.?\/(?!\/)([^?#]*)/);
        if (local) assert(c.exists('dist/' + (local[1] || 'index.html')), `${page}: ${href}: no such file in dist/`);
      }
    }
  }],
  // A key read but never written, or written under another spelling, loses
  // the visitor's setting silently: 404.js reads the theme script.js saves.
  ['storage keys', (c) => {
    const calls = (verb) => new Set(SHIPPED_JS.flatMap((f) => [...c.read('dist/' + f).matchAll(new RegExp(`localStorage\\.${verb}\\('([^']+)'`, 'g'))].map((m) => m[1])));
    const written = calls('setItem');
    for (const key of calls('getItem')) assert(written.has(key), `localStorage key '${key}' is read but never written`);
  }],
  // A class the stylesheet styles but no page or script uses is dead weight
  // on the critical path, and a sign of a renamed class whose styles were left behind.
  ['unused css', (c) => {
    for (const [sheet, users] of [['styles.css', ['index.html', 'script.js', 'hero.js']], ['404.css', ['404.html', '404.js']]]) {
      const css = c.read('dist/' + sheet).replace(/\/\*[\s\S]*?\*\//g, '');
      const preludes = [...css.matchAll(/(?:^|[{};])([^{};]+)\{/g)].map((m) => m[1]).filter((p) => !p.trim().startsWith('@'));
      const classes = new Set(preludes.flatMap((p) => [...p.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1])));
      const used = users.map((f) => c.read('dist/' + f)).join('\n');
      for (const name of classes) assert(new RegExp(`(^|[^\\w-])${name}(?![\\w-])`).test(used), `.${name} is styled in ${sheet} but used by no page or script`);
      for (const [, name] of css.matchAll(/@keyframes ([\w-]+)/g)) assert(new RegExp(`animation(-name)?:[^;}]*\\b${name}\\b`).test(css) || used.includes(name), `@keyframes ${name} in ${sheet} is never used`);
    }
  }],
  // An orphan is published and cached with nothing pointing at it. Pages
  // are the entry points; everything else must be named by a shipped file.
  ['unreferenced files', (c) => {
    const files = walk(c.root, 'dist').map((f) => f.slice('dist/'.length));
    const text = files.filter((f) => /\.(html|css|js)$/.test(f)).map((f) => c.read('dist/' + f)).join('\n');
    for (const file of files) if (!PAGES.includes(file)) assert(text.includes(path.posix.basename(file)), `dist/${file} is referenced by no page, stylesheet or script`);
  }],
];
