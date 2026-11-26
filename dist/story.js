// Isolated adapters; failed enhancements leave all factual HTML and links usable.
const adapters = [];
let disposed = false;
function mount(factory, ready) {
  if (disposed) return;
  const adapter = factory(document);
  adapters.push(adapter);
  ready?.();
}
import('./intro.js?v=acc7487778').then(module => mount(module.mountIntro, () => {
  const button = document.getElementById('replay-intro');
  button.hidden = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const availability = () => { button.disabled = motion.matches || !!navigator.connection?.saveData; button.title = button.disabled ? 'The intro respects reduced motion and data saving.' : 'Replay the introduction'; };
  motion.addEventListener('change', availability);
  navigator.connection?.addEventListener('change', availability);
  adapters.push({ dispose() { motion.removeEventListener('change', availability); navigator.connection?.removeEventListener('change', availability); } });
  availability();
})).catch(() => {});
import('./experience-effects.js?v=085436df6f').then(module => mount(module.mountExperienceEffects, () => document.querySelectorAll('[data-experience-replay]').forEach(button => { button.hidden = false; }))).catch(() => {});
import('./career.js?v=f0125bc81b').then(module => mount(module.mountCareer, () => { document.getElementById('copy-email').hidden = false; })).catch(() => {});
addEventListener('pagehide', event => { if (event.persisted) return; disposed = true; for (const adapter of adapters) adapter?.dispose(); });
