const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('homepage stays a single scene with experience and contact behind explicit controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
  const homepage = html.replace(/<dialog\b[\s\S]*?<\/dialog>/g, '').replace(/<noscript\b[\s\S]*?<\/noscript>/g, '');
  assert.equal([...homepage.matchAll(/<section\b/g)].length, 1, 'Additional full-page sections change the single-screen composition');
  assert.match(homepage, /<section class="particle-stage"/);
  assert.match(homepage, /<button data-open="about" data-section-link="experience">[\s\S]*?Experience<\/button>/);
  assert.match(homepage, /<button data-open="about" data-contact data-section-link="contact">[\s\S]*?Contact<\/button>/);
  assert.match(homepage, /href="\.\/Andrei_Bautin_Resume\.pdf">(?:<span[^>]*>02<\/span>)?Resume<\/a>/);
  assert.match(html, /<dialog id="about"/);
});
