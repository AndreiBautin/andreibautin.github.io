const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('the optional loader only mounts professional controls and never starts a tour', async () => {
  for (const available of [true, false]) {
    const events = [], imports = [], handlers = new Map();
    const context = vm.createContext({
      document: {},
      addEventListener(type, fn) { handlers.set(type, fn); },
      CustomEvent: class { constructor(type) { this.type = type; } },
      dispatchEvent(event) { events.push(event.type); },
      setTimeout() { throw new Error('loader must not schedule navigation'); },
      requestAnimationFrame() { throw new Error('loader must not own an animation loop'); },
    });
    const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../dist/story.js'), 'utf8'), {
      context,
      async importModuleDynamically(name) {
        imports.push(name.split('?')[0]);
        if (!available) throw new Error('work UI unavailable');
        const dependency = new vm.SyntheticModule(['mountWorkUI'], function () {
          this.setExport('mountWorkUI', () => { events.push('mounted'); return { dispose() { events.push('disposed'); } }; });
        }, { context });
        await dependency.link(() => {}); await dependency.evaluate(); return dependency;
      },
    });
    await module.link(() => {}); await module.evaluate();
    for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(imports, ['./work-ui.js']);
    assert.deepEqual(events, available ? ['mounted', 'portfolio:work-ready'] : []);
    handlers.get('pagehide')({ persisted: true });
    assert.equal(events.includes('disposed'), false);
    handlers.get('pagehide')({ persisted: false });
    assert.equal(events.includes('disposed'), available);
  }
});
