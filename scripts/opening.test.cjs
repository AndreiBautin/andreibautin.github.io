const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('the loader imports the overview before selecting the landing and starting its snapshot', async () => {
  for (const introAvailable of [true, false]) {
    const events = [], classes = new Set();
    const replay = {};
    let introImported = false;
    const context = vm.createContext({
      document: { getElementById: () => replay },
      navigator: {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      addEventListener() {},
      CustomEvent: class { constructor(type) { this.type = type; } },
      dispatchEvent(event) { events.push(event.type); if (introAvailable) assert(introImported, 'landing must not precede the overview import'); },
    });
    const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../dist/story.js'), 'utf8'), {
      context,
      async importModuleDynamically(name) {
        const work = name.startsWith('./work-ui.js');
        if (!work && !introAvailable) throw new Error('intro unavailable');
        if (!work) introImported = true;
        const exported = work ? 'mountWorkUI' : 'mountIntro';
        const dependency = new vm.SyntheticModule([exported], function () {
          this.setExport(exported, () => { events.push(work ? 'work-mounted' : 'intro-decided'); if (!work) classes.add('intro-playing'); return { dispose() {} }; });
        }, { context });
        await dependency.link(() => {}); await dependency.evaluate(); return dependency;
      },
    });
    await module.link(() => {}); await module.evaluate();
    for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(events, introAvailable ? ['work-mounted', 'portfolio:work-ready', 'intro-decided'] : ['work-mounted', 'portfolio:work-ready']);
  }
});
